const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');

/**
 * Name Card Service
 * Handles the business logic for generating conference name cards
 */

class NameCardService {
  constructor() {
    this.cardDimensions = {
      width: 288,  // 4 inches in points (72 points per inch)
      height: 216, // 3 inches in points
      margin: 10
    };
    
    this.universityLogos = new Map(); // Cache for university logos
    this.fontPaths = {
      regular: path.join(__dirname, '../assets/fonts/OpenSans-Regular.ttf'),
      bold: path.join(__dirname, '../assets/fonts/OpenSans-Bold.ttf'),
      italic: path.join(__dirname, '../assets/fonts/OpenSans-Italic.ttf')
    };
  }

  /**
   * Generate name cards PDF for multiple attendees
   * @param {Array} attendeesData - Array of processed attendee data
   * @param {Object} options - Generation options
   * @returns {Buffer} PDF buffer
   */
  async generateNameCardsPDF(attendeesData, options = {}) {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 36,
        info: {
          Title: 'SOBIE Conference Name Cards',
          Author: 'SOBIE Conference System',
          Subject: 'Attendee Name Cards',
          Creator: 'SOBIE Admin Portal'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));

      return new Promise(async (resolve, reject) => {
        doc.on('end', () => {
          logger.info('Name cards PDF generation completed', {
            attendeeCount: attendeesData.length,
            service: 'NameCardService',
            method: 'generateNameCardsPDF'
          });
          resolve(Buffer.concat(chunks));
        });

        try {
          await this.renderNameCardsLayout(doc, attendeesData, options);
          doc.end();
        } catch (error) {
          logger.error('Error generating name cards PDF', {
            error: error.message,
            stack: error.stack,
            service: 'NameCardService',
            method: 'generateNameCardsPDF'
          });
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Error initializing PDF document', {
        error: error.message,
        service: 'NameCardService',
        method: 'generateNameCardsPDF'
      });
      throw error;
    }
  }

  /**
   * Render name cards layout on PDF pages
   * @param {PDFDocument} doc - PDF document instance
   * @param {Array} attendeesData - Attendee data array
   * @param {Object} options - Rendering options
   */
  async renderNameCardsLayout(doc, attendeesData, options) {
    const cardsPerRow = 2;
    const cardsPerCol = 3;
    const cardsPerPage = cardsPerRow * cardsPerCol;
    
    const spacing = {
      horizontal: 18,
      vertical: 18
    };

    let currentCard = 0;

    for (const attendeeData of attendeesData) {
      // Calculate position
      const pageCardIndex = currentCard % cardsPerPage;
      const row = Math.floor(pageCardIndex / cardsPerRow);
      const col = pageCardIndex % cardsPerRow;
      
      const x = 36 + (col * (this.cardDimensions.width + spacing.horizontal));
      const y = 36 + (row * (this.cardDimensions.height + spacing.vertical));

      // Render individual name card
      await this.renderSingleNameCard(doc, attendeeData, x, y, options);

      currentCard++;

      // Add new page if needed
      if (currentCard % cardsPerPage === 0 && currentCard < attendeesData.length) {
        doc.addPage();
      }
    }
  }

  /**
   * Render a single name card
   * @param {PDFDocument} doc - PDF document instance
   * @param {Object} attendeeData - Individual attendee data
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} options - Rendering options
   */
  async renderSingleNameCard(doc, attendeeData, x, y, options = {}) {
    const { width, height, margin } = this.cardDimensions;
    const contentWidth = width - (margin * 2);

    // Card background and border
    this.drawCardBackground(doc, x, y, width, height);

    // Header section
    this.drawCardHeader(doc, attendeeData, x, y, width);

    // Attendee type and status badges
    this.drawStatusBadges(doc, attendeeData, x, y, width);

    // Main content area
    await this.drawMainContent(doc, attendeeData, x, y, width, height, options);

    // University logo (if available and enabled)
    if (options.includeLogos && attendeeData.university) {
      await this.drawUniversityLogo(doc, attendeeData.university, x, y, width, height);
    }

    // Footer with QR code placeholder
    this.drawCardFooter(doc, attendeeData, x, y, width, height);
  }

  /**
   * Draw card background and border
   */
  drawCardBackground(doc, x, y, width, height) {
    // Outer border
    doc.rect(x, y, width, height)
       .strokeColor('#e0e0e0')
       .lineWidth(1)
       .fillColor('#ffffff')
       .fillAndStroke();

    // Inner subtle border
    doc.rect(x + 2, y + 2, width - 4, height - 4)
       .strokeColor('#f5f5f5')
       .lineWidth(0.5)
       .stroke();

    // Corner accents
    const accentSize = 15;
    doc.moveTo(x, y + accentSize)
       .lineTo(x, y)
       .lineTo(x + accentSize, y)
       .strokeColor('#003366')
       .lineWidth(2)
       .stroke();

    doc.moveTo(x + width - accentSize, y)
       .lineTo(x + width, y)
       .lineTo(x + width, y + accentSize)
       .strokeColor('#003366')
       .lineWidth(2)
       .stroke();
  }

  /**
   * Draw card header with conference info
   */
  drawCardHeader(doc, attendeeData, x, y, width) {
    const headerHeight = 35;
    
    // Header background
    doc.rect(x + 2, y + 2, width - 4, headerHeight)
       .fillColor('#f8f9fa')
       .fill();

    // SOBIE logo/text
    doc.fontSize(14)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('SOBIE', x + 10, y + 8, { width: width - 20, align: 'left' });

    // Conference year
    doc.fontSize(11)
       .fillColor('#003366')
       .font('Helvetica')
       .text(attendeeData.conferenceYear, x + 10, y + 22, { width: width - 20, align: 'left' });

    // Conference title (right side)
    doc.fontSize(9)
       .fillColor('#666666')
       .font('Helvetica-Oblique')
       .text('CONFERENCE', x + 10, y + 8, { width: width - 20, align: 'right' });
  }

  /**
   * Draw status badges (attendee type, first-time, etc.)
   */
  drawStatusBadges(doc, attendeeData, x, y, width) {
    const badgeY = y + 45;
    const badgeHeight = 18;
    let badgeX = x + 10;

    // Attendee type badge
    const typeColor = this.getAttendeeTypeColor(attendeeData.attendeeType);
    const typeText = this.getAttendeeTypeDisplayName(attendeeData.attendeeType);
    const typeWidth = this.getTextWidth(doc, typeText, 8) + 12;

    doc.rect(badgeX, badgeY, typeWidth, badgeHeight)
       .fillColor(typeColor)
       .fill();

    doc.fontSize(8)
       .fillColor('#ffffff')
       .font('Helvetica-Bold')
       .text(typeText, badgeX + 6, badgeY + 5);

    badgeX += typeWidth + 8;

    // First-time or repeat attendee badge
    if (attendeeData.isFirstTime) {
      const firstTimeWidth = 65;
      doc.rect(badgeX, badgeY, firstTimeWidth, badgeHeight)
         .fillColor('#ff6b35')
         .fill();

      doc.fontSize(8)
         .fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text('FIRST TIME', badgeX + 6, badgeY + 5);
    } else if (attendeeData.sobieCount > 1) {
      const countText = `${attendeeData.sobieCount}x SOBIE`;
      const countWidth = this.getTextWidth(doc, countText, 8) + 12;
      
      doc.rect(badgeX, badgeY, countWidth, badgeHeight)
         .fillColor('#28a745')
         .fill();

      doc.fontSize(8)
         .fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text(countText, badgeX + 6, badgeY + 5);
    }
  }

  /**
   * Draw main content (name, affiliation, etc.)
   */
  async drawMainContent(doc, attendeeData, x, y, width, height, options) {
    const contentStartY = y + 75;
    const margin = this.cardDimensions.margin;

    // Preferred name (prominent)
    const nameY = contentStartY;
    const nameSize = this.calculateNameFontSize(attendeeData.preferredName, width - (margin * 2));
    
    doc.fontSize(nameSize)
       .fillColor('#000000')
       .font('Helvetica-Bold')
       .text(attendeeData.preferredName, x + margin, nameY, {
         width: width - (margin * 2),
         align: 'center',
         ellipsis: true
       });

    // Affiliation
    const affiliationY = nameY + nameSize + 8;
    doc.fontSize(11)
       .fillColor('#333333')
       .font('Helvetica')
       .text(attendeeData.affiliation, x + margin, affiliationY, {
         width: width - (margin * 2),
         align: 'center',
         ellipsis: true
       });

    // University (if different from affiliation)
    if (attendeeData.university && 
        attendeeData.university !== attendeeData.affiliation &&
        attendeeData.university.length > 0) {
      const universityY = affiliationY + 16;
      doc.fontSize(9)
         .fillColor('#666666')
         .font('Helvetica-Oblique')
         .text(attendeeData.university, x + margin, universityY, {
           width: width - (margin * 2),
           align: 'center',
           ellipsis: true
         });
    }
  }

  /**
   * Draw university logo if available
   */
  async drawUniversityLogo(doc, universityName, x, y, width, height) {
    try {
      const logoUrl = await this.getUniversityLogoUrl(universityName);
      if (logoUrl) {
        const logoBuffer = await this.downloadImage(logoUrl);
        const processedLogo = await this.processLogoImage(logoBuffer);
        
        const logoSize = 25;
        const logoX = x + width - logoSize - 15;
        const logoY = y + height - logoSize - 15;
        
        doc.image(processedLogo, logoX, logoY, {
          width: logoSize,
          height: logoSize,
          fit: [logoSize, logoSize]
        });
      }
    } catch (error) {
      logger.warn('Could not load university logo', {
        university: universityName,
        error: error.message,
        service: 'NameCardService',
        method: 'drawUniversityLogo'
      });
    }
  }

  /**
   * Draw card footer with QR code placeholder
   */
  drawCardFooter(doc, attendeeData, x, y, width, height) {
    // QR code placeholder (future: actual QR code with attendee info)
    const qrSize = 25;
    const qrX = x + 10;
    const qrY = y + height - qrSize - 10;

    doc.rect(qrX, qrY, qrSize, qrSize)
       .strokeColor('#cccccc')
       .lineWidth(0.5)
       .stroke();

    doc.fontSize(6)
       .fillColor('#cccccc')
       .font('Helvetica')
       .text('QR', qrX + 8, qrY + 9);

    // Registration ID (small, for admin reference)
    doc.fontSize(6)
       .fillColor('#cccccc')
       .font('Helvetica')
       .text(`ID: ${attendeeData.registrationId.toString().slice(-6)}`, 
              x + width - 50, y + height - 8);
  }

  /**
   * Get attendee type color
   */
  getAttendeeTypeColor(type) {
    const colors = {
      student: '#007bff',
      academic: '#28a745',
      sobie_affiliate: '#dc3545',
      professional: '#6f42c1',
      industry: '#fd7e14',
      default: '#6c757d'
    };
    return colors[type] || colors.default;
  }

  /**
   * Get attendee type display name
   */
  getAttendeeTypeDisplayName(type) {
    const names = {
      student: 'STUDENT',
      academic: 'ACADEMIC',
      sobie_affiliate: 'SOBIE',
      professional: 'PROFESSIONAL',
      industry: 'INDUSTRY',
      default: 'ATTENDEE'
    };
    return names[type] || names.default;
  }

  /**
   * Calculate appropriate font size for name based on length
   */
  calculateNameFontSize(name, maxWidth) {
    const baseSize = 16;
    const minSize = 12;
    const maxSize = 20;
    
    if (name.length <= 15) return maxSize;
    if (name.length <= 25) return baseSize;
    return minSize;
  }

  /**
   * Get text width for layout calculations
   */
  getTextWidth(doc, text, fontSize) {
    doc.fontSize(fontSize);
    return doc.widthOfString(text);
  }

  /**
   * Get university logo URL (placeholder - integrate with actual logo service)
   */
  async getUniversityLogoUrl(universityName) {
    // This is a placeholder - you would integrate with a university logo API
    // or maintain your own database of university logos
    const logoServices = [
      `https://logo.clearbit.com/${this.getDomainFromUniversity(universityName)}`,
      `https://unavatar.io/${universityName}?type=university`
    ];
    
    return logoServices[0]; // Return first service for now
  }

  /**
   * Extract domain from university name
   */
  getDomainFromUniversity(universityName) {
    // Simple mapping - in production, you'd have a comprehensive database
    const commonMappings = {
      'MIT': 'mit.edu',
      'Harvard University': 'harvard.edu',
      'Stanford University': 'stanford.edu',
      'UC Berkeley': 'berkeley.edu',
      'University of California': 'uc.edu'
    };
    
    return commonMappings[universityName] || 
           universityName.toLowerCase().replace(/\s+/g, '') + '.edu';
  }

  /**
   * Download image from URL
   */
  async downloadImage(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 5000
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Process logo image (resize, format)
   */
  async processLogoImage(imageBuffer) {
    try {
      return await sharp(imageBuffer)
        .resize(50, 50, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer();
    } catch (error) {
      throw new Error(`Failed to process logo image: ${error.message}`);
    }
  }
}

module.exports = new NameCardService();

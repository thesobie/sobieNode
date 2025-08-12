const mongoose = require('mongoose');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

// Import models
const Document = require('./src/models/Document');
const User = require('./src/models/User');

const addDocumentMetadata = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // File details
    const filename = 'sobie2025-program.pdf';
    const filePath = path.join(__dirname, 'uploads/documents/2025/program', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
      console.log('✅ File found:', filePath);
    } catch (error) {
      console.error('❌ File not found:', filePath);
      process.exit(1);
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    console.log('📊 File size:', fileSize, 'bytes');

    // Calculate checksum
    const fileBuffer = await fs.readFile(filePath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log('🔐 File checksum:', checksum);

    // Check for duplicate
    const existingDoc = await Document.findOne({ checksum });
    if (existingDoc) {
      console.log('⚠️  Document with same checksum already exists:', existingDoc.title);
      process.exit(0);
    }

    // Find an admin user to assign as uploader
    const adminUser = await User.findOne({ 
      roles: { $in: ['admin', 'organizer'] },
      isActive: true 
    });
    
    if (!adminUser) {
      console.error('❌ No admin/organizer user found. Please create an admin user first.');
      process.exit(1);
    }

    console.log('👤 Using uploader:', adminUser.email);

    // Create document record
    const document = await Document.create({
      title: 'SOBIE 2025 Conference Program',
      description: 'Official conference program for the 2025 SOBIE Conference including schedules, keynote speakers, session details, and venue information.',
      category: 'program',
      subcategory: 'main_program',
      filename: filename,
      originalName: filename,
      filePath: `uploads/documents/2025/program/${filename}`,
      fileSize: fileSize,
      mimeType: 'application/pdf',
      checksum: checksum,
      conferenceYear: 2025,
      track: 'general',
      isPublic: true,
      allowedRoles: ['attendee', 'presenter', 'reviewer', 'organizer', 'sponsor', 'volunteer'],
      requiredRegistration: false, // Public access
      uploadedBy: adminUser._id,
      publishDate: new Date(),
      keywords: ['conference', 'program', '2025', 'schedule', 'sobie'],
      status: 'active'
    });

    console.log('✅ Document metadata created successfully!');
    console.log('📋 Document details:');
    console.log('   ID:', document._id);
    console.log('   Title:', document.title);
    console.log('   Category:', document.category);
    console.log('   File Path:', document.filePath);
    console.log('   Public URL:', document.publicUrl);
    console.log('   Size:', document.fileSize, 'bytes');
    console.log('   Checksum:', document.checksum.substring(0, 16) + '...');

  } catch (error) {
    console.error('❌ Error adding document metadata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
addDocumentMetadata();

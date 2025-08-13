const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');
const logger = require('../config/logger');

// Import models
const Conference = require('../models/Conference');
const ConferenceRegistration = require('../models/ConferenceRegistration');
const User = require('../models/User');
const ResearchSubmission = require('../models/ResearchSubmission');

/**
 * SOBIE Conference Program Parser
 * Extracts conference data, attendees, presentations, and historical information
 * from SOBIE conference program PDFs
 */

class SOBIEProgramParser {
  constructor() {
    this.extractedData = {
      conference: {},
      attendees: [],
      presentations: [],
      sessions: [],
      committees: [],
      sponsors: [],
      venues: [],
      schedule: []
    };
  }

  /**
   * Parse SOBIE 2023 program PDF and extract all relevant data
   * @param {string} pdfPath - Path to the PDF file
   * @returns {Object} Extracted conference data
   */
  async parseProgramPDF(pdfPath) {
    try {
      logger.info('Starting SOBIE program PDF parsing', {
        pdfPath,
        service: 'SOBIEProgramParser',
        method: 'parseProgramPDF'
      });

      // Read and parse PDF
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfData = await pdfParse(pdfBuffer);
      
      logger.info('PDF parsed successfully', {
        pages: pdfData.numpages,
        textLength: pdfData.text.length,
        service: 'SOBIEProgramParser'
      });

      // Extract different sections
      await this.extractConferenceInfo(pdfData.text);
      await this.extractAttendees(pdfData.text);
      await this.extractPresentations(pdfData.text);
      await this.extractSessions(pdfData.text);
      await this.extractCommittees(pdfData.text);
      await this.extractSponsors(pdfData.text);
      await this.extractSchedule(pdfData.text);
      await this.extractVenueInfo(pdfData.text);

      logger.info('PDF parsing completed', {
        attendeesFound: this.extractedData.attendees.length,
        presentationsFound: this.extractedData.presentations.length,
        sessionsFound: this.extractedData.sessions.length,
        service: 'SOBIEProgramParser'
      });

      return this.extractedData;
    } catch (error) {
      logger.error('Error parsing SOBIE program PDF', {
        error: error.message,
        stack: error.stack,
        pdfPath,
        service: 'SOBIEProgramParser'
      });
      throw error;
    }
  }

  /**
   * Extract conference information
   */
  async extractConferenceInfo(text) {
    try {
      // Extract conference year
      const yearMatch = text.match(/SOBIE\s*(\d{4})/i);
      const year = yearMatch ? parseInt(yearMatch[1]) : 2023;

      // Extract conference title
      const titleMatches = text.match(/SOBIE\s*\d{4}[:\s]*([^\n\r]+)/i);
      const title = titleMatches ? titleMatches[1].trim() : `SOBIE ${year}`;

      // Extract dates
      const datePatterns = [
        /(\w+\s+\d{1,2}[-–]\d{1,2},?\s*\d{4})/g,
        /(\w+\s+\d{1,2},?\s*\d{4})/g,
        /(\d{1,2}[-–]\d{1,2}\s+\w+\s+\d{4})/g
      ];

      let dates = [];
      for (const pattern of datePatterns) {
        const matches = [...text.matchAll(pattern)];
        dates = dates.concat(matches.map(m => m[1]));
      }

      // Extract location/venue
      const locationPatterns = [
        /Sandestin|Destin/i,
        /Miramar Beach/i,
        /Florida|FL/i,
        /Resort/i
      ];

      let location = 'Sandestin Golf and Beach Resort, Miramar Beach, FL';
      for (const pattern of locationPatterns) {
        if (pattern.test(text)) {
          break;
        }
      }

      this.extractedData.conference = {
        year,
        title,
        name: title,
        dates: dates.slice(0, 3), // Top 3 date matches
        location,
        venue: 'Sandestin Golf and Beach Resort',
        city: 'Miramar Beach',
        state: 'Florida',
        country: 'USA'
      };

      logger.info('Conference info extracted', {
        year,
        title,
        datesFound: dates.length,
        service: 'SOBIEProgramParser'
      });

    } catch (error) {
      logger.error('Error extracting conference info', { error: error.message });
    }
  }

  /**
   * Extract attendee information
   */
  async extractAttendees(text) {
    try {
      const attendees = new Set();
      
      // Common patterns for names in academic contexts
      const namePatterns = [
        // "FirstName LastName, Institution"
        /([A-Z][a-z]+\s+[A-Z][a-zA-Z]+),\s*([^,\n\r]+)/g,
        // "LastName, FirstName"
        /([A-Z][a-zA-Z]+),\s+([A-Z][a-z]+)/g,
        // "Dr. FirstName LastName"
        /Dr\.\s+([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)/g,
        // "Prof. FirstName LastName"
        /Prof\.\s+([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)/g
      ];

      for (const pattern of namePatterns) {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
          if (match[1] && match[1].length > 3) {
            const nameInfo = this.parseNameAndAffiliation(match);
            if (nameInfo) {
              attendees.add(JSON.stringify(nameInfo));
            }
          }
        });
      }

      // Extract from author lists (common in academic programs)
      const authorSections = text.match(/Authors?[:\s]*([^]+?)(?=\n\s*\n|\n[A-Z])/gi);
      if (authorSections) {
        authorSections.forEach(section => {
          const authors = this.extractAuthorsFromSection(section);
          authors.forEach(author => attendees.add(JSON.stringify(author)));
        });
      }

      // Extract from presenter lists
      const presenterSections = text.match(/Presenters?[:\s]*([^]+?)(?=\n\s*\n|\n[A-Z])/gi);
      if (presenterSections) {
        presenterSections.forEach(section => {
          const presenters = this.extractPresentersFromSection(section);
          presenters.forEach(presenter => attendees.add(JSON.stringify(presenter)));
        });
      }

      // Convert back to objects and deduplicate
      this.extractedData.attendees = Array.from(attendees)
        .map(str => JSON.parse(str))
        .filter(attendee => this.isValidAttendee(attendee));

      logger.info('Attendees extracted', {
        totalFound: this.extractedData.attendees.length,
        service: 'SOBIEProgramParser'
      });

    } catch (error) {
      logger.error('Error extracting attendees', { error: error.message });
    }
  }

  /**
   * Extract presentation information
   */
  async extractPresentations(text) {
    try {
      const presentations = [];

      // Pattern for presentation titles and abstracts
      const presentationPatterns = [
        // Session presentations
        /(\d+:\d+\s*[-–]\s*\d+:\d+)\s*([^]+?)(?=\d+:\d+|\n\s*\n|$)/g,
        // Numbered presentations
        /(\d+\.)\s*([^]+?)(?=\d+\.|$)/g,
        // Abstract patterns
        /Abstract[:\s]*([^]+?)(?=Abstract|Keywords|References|$)/gi
      ];

      for (const pattern of presentationPatterns) {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
          const presentation = this.parsePresentation(match);
          if (presentation) {
            presentations.push(presentation);
          }
        });
      }

      // Extract poster sessions
      const posterSections = text.match(/Poster\s+Session[^]+?(?=\n\s*\n|[A-Z][^a-z])/gi);
      if (posterSections) {
        posterSections.forEach(section => {
          const posters = this.extractPostersFromSection(section);
          presentations.push(...posters);
        });
      }

      this.extractedData.presentations = presentations.filter(p => this.isValidPresentation(p));

      logger.info('Presentations extracted', {
        totalFound: this.extractedData.presentations.length,
        service: 'SOBIEProgramParser'
      });

    } catch (error) {
      logger.error('Error extracting presentations', { error: error.message });
    }
  }

  /**
   * Extract session information
   */
  async extractSessions(text) {
    try {
      const sessions = [];

      // Session patterns
      const sessionPatterns = [
        /Session\s+(\d+)[:\s]*([^]+?)(?=Session|\n\s*\n|$)/gi,
        /(Keynote|Plenary)[:\s]*([^]+?)(?=Session|\n\s*\n|$)/gi,
        /(Workshop|Tutorial)[:\s]*([^]+?)(?=Session|\n\s*\n|$)/gi
      ];

      for (const pattern of sessionPatterns) {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
          const session = this.parseSession(match);
          if (session) {
            sessions.push(session);
          }
        });
      }

      this.extractedData.sessions = sessions;

      logger.info('Sessions extracted', {
        totalFound: sessions.length,
        service: 'SOBIEProgramParser'
      });

    } catch (error) {
      logger.error('Error extracting sessions', { error: error.message });
    }
  }

  /**
   * Extract committee and organizer information
   */
  async extractCommittees(text) {
    try {
      const committees = [];

      // Committee patterns
      const committeePatterns = [
        /Organizing\s+Committee[:\s]*([^]+?)(?=Committee|\n\s*\n|$)/gi,
        /Program\s+Committee[:\s]*([^]+?)(?=Committee|\n\s*\n|$)/gi,
        /Scientific\s+Committee[:\s]*([^]+?)(?=Committee|\n\s*\n|$)/gi,
        /Advisory\s+Board[:\s]*([^]+?)(?=Committee|\n\s*\n|$)/gi
      ];

      for (const pattern of committeePatterns) {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
          const committee = this.parseCommittee(match);
          if (committee) {
            committees.push(committee);
          }
        });
      }

      this.extractedData.committees = committees;

      logger.info('Committees extracted', {
        totalFound: committees.length,
        service: 'SOBIEProgramParser'
      });

    } catch (error) {
      logger.error('Error extracting committees', { error: error.message });
    }
  }

  /**
   * Extract sponsor information
   */
  async extractSponsors(text) {
    try {
      const sponsors = [];

      // Sponsor patterns
      const sponsorPatterns = [
        /Sponsors?[:\s]*([^]+?)(?=\n\s*\n|[A-Z][^a-z])/gi,
        /Supported\s+by[:\s]*([^]+?)(?=\n\s*\n|[A-Z][^a-z])/gi,
        /Acknowledgments?[:\s]*([^]+?)(?=\n\s*\n|[A-Z][^a-z])/gi
      ];

      for (const pattern of sponsorPatterns) {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
          const sponsorList = this.parseSponsors(match[1]);
          sponsors.push(...sponsorList);
        });
      }

      this.extractedData.sponsors = sponsors;

      logger.info('Sponsors extracted', {
        totalFound: sponsors.length,
        service: 'SOBIEProgramParser'
      });

    } catch (error) {
      logger.error('Error extracting sponsors', { error: error.message });
    }
  }

  /**
   * Extract schedule information
   */
  async extractSchedule(text) {
    try {
      const schedule = [];

      // Time patterns for schedule
      const timePatterns = [
        /(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*([^]+?)(?=\d{1,2}:\d{2}|\n\s*\n|$)/gi
      ];

      for (const pattern of timePatterns) {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
          const scheduleItem = this.parseScheduleItem(match);
          if (scheduleItem) {
            schedule.push(scheduleItem);
          }
        });
      }

      this.extractedData.schedule = schedule;

      logger.info('Schedule extracted', {
        totalFound: schedule.length,
        service: 'SOBIEProgramParser'
      });

    } catch (error) {
      logger.error('Error extracting schedule', { error: error.message });
    }
  }

  /**
   * Extract venue information
   */
  async extractVenueInfo(text) {
    try {
      const venueInfo = {
        name: 'Sandestin Golf and Beach Resort',
        rooms: [],
        facilities: []
      };

      // Room patterns
      const roomPatterns = [
        /(Ballroom|Room|Hall|Conference\s+Center)[:\s]*([^]+?)(?=Room|Hall|\n\s*\n|$)/gi
      ];

      for (const pattern of roomPatterns) {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
          const room = this.parseVenueRoom(match);
          if (room) {
            venueInfo.rooms.push(room);
          }
        });
      }

      this.extractedData.venues = [venueInfo];

      logger.info('Venue info extracted', {
        roomsFound: venueInfo.rooms.length,
        service: 'SOBIEProgramParser'
      });

    } catch (error) {
      logger.error('Error extracting venue info', { error: error.message });
    }
  }

  // Helper methods for parsing specific data types

  parseNameAndAffiliation(match) {
    try {
      let firstName, lastName, affiliation;

      if (match.length >= 3) {
        // "FirstName LastName, Institution" format
        const nameParts = match[1].trim().split(/\s+/);
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
        affiliation = match[2] ? match[2].trim() : '';
      } else {
        // "LastName, FirstName" format
        lastName = match[1] ? match[1].trim() : '';
        firstName = match[2] ? match[2].trim() : '';
        affiliation = '';
      }

      return {
        name: { first: firstName, last: lastName },
        fullName: `${firstName} ${lastName}`.trim(),
        affiliation: this.cleanAffiliation(affiliation),
        extractedFrom: 'sobie2023program'
      };
    } catch (error) {
      return null;
    }
  }

  extractAuthorsFromSection(section) {
    const authors = [];
    const lines = section.split('\n');
    
    lines.forEach(line => {
      const authorMatch = line.match(/([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)/);
      if (authorMatch) {
        const nameParts = authorMatch[1].split(/\s+/);
        authors.push({
          name: { 
            first: nameParts[0], 
            last: nameParts.slice(1).join(' ') 
          },
          fullName: authorMatch[1],
          affiliation: '',
          extractedFrom: 'sobie2023program'
        });
      }
    });

    return authors;
  }

  extractPresentersFromSection(section) {
    return this.extractAuthorsFromSection(section);
  }

  parsePresentation(match) {
    try {
      return {
        title: match[2] ? match[2].trim().substring(0, 200) : '',
        timeSlot: match[1] ? match[1].trim() : '',
        type: this.detectPresentationType(match[0]),
        extractedFrom: 'sobie2023program',
        year: 2023
      };
    } catch (error) {
      return null;
    }
  }

  extractPostersFromSection(section) {
    const posters = [];
    const lines = section.split('\n');
    
    lines.forEach(line => {
      if (line.trim().length > 20) {
        posters.push({
          title: line.trim().substring(0, 200),
          type: 'poster',
          extractedFrom: 'sobie2023program',
          year: 2023
        });
      }
    });

    return posters;
  }

  parseSession(match) {
    try {
      return {
        name: match[1] ? match[1].trim() : '',
        description: match[2] ? match[2].trim().substring(0, 500) : '',
        type: this.detectSessionType(match[0]),
        extractedFrom: 'sobie2023program'
      };
    } catch (error) {
      return null;
    }
  }

  parseCommittee(match) {
    try {
      const members = this.extractCommitteeMembers(match[1]);
      return {
        name: match[0].match(/^[^:]+/)[0].trim(),
        members,
        extractedFrom: 'sobie2023program'
      };
    } catch (error) {
      return null;
    }
  }

  extractCommitteeMembers(text) {
    const members = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      const memberMatch = line.match(/([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)/);
      if (memberMatch) {
        members.push(memberMatch[1]);
      }
    });

    return members;
  }

  parseSponsors(text) {
    const sponsors = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.trim().length > 3) {
        sponsors.push({
          name: line.trim(),
          extractedFrom: 'sobie2023program'
        });
      }
    });

    return sponsors;
  }

  parseScheduleItem(match) {
    try {
      return {
        startTime: match[1] ? match[1].trim() : '',
        endTime: match[2] ? match[2].trim() : '',
        event: match[3] ? match[3].trim().substring(0, 200) : '',
        extractedFrom: 'sobie2023program'
      };
    } catch (error) {
      return null;
    }
  }

  parseVenueRoom(match) {
    try {
      return {
        name: match[1] ? match[1].trim() : '',
        description: match[2] ? match[2].trim().substring(0, 300) : '',
        extractedFrom: 'sobie2023program'
      };
    } catch (error) {
      return null;
    }
  }

  // Utility methods

  cleanAffiliation(affiliation) {
    return affiliation
      .replace(/[^\w\s,.-]/g, '')
      .trim()
      .substring(0, 100);
  }

  detectPresentationType(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('keynote')) return 'keynote';
    if (lowerText.includes('poster')) return 'poster';
    if (lowerText.includes('workshop')) return 'workshop';
    if (lowerText.includes('panel')) return 'panel';
    return 'presentation';
  }

  detectSessionType(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('keynote')) return 'keynote';
    if (lowerText.includes('plenary')) return 'plenary';
    if (lowerText.includes('workshop')) return 'workshop';
    if (lowerText.includes('tutorial')) return 'tutorial';
    return 'session';
  }

  isValidAttendee(attendee) {
    return attendee && 
           attendee.name && 
           attendee.name.first && 
           attendee.name.last &&
           attendee.name.first.length > 1 &&
           attendee.name.last.length > 1;
  }

  isValidPresentation(presentation) {
    return presentation && 
           presentation.title && 
           presentation.title.length > 10;
  }

  /**
   * Save extracted data to database
   */
  async saveToDatabase() {
    try {
      logger.info('Starting database save process', {
        service: 'SOBIEProgramParser',
        method: 'saveToDatabase'
      });

      const savedData = {
        conference: null,
        users: [],
        registrations: [],
        research: []
      };

      // Save or update conference
      savedData.conference = await this.saveConference();

      // Save users and registrations
      savedData.users = await this.saveUsers();
      savedData.registrations = await this.saveRegistrations(savedData.conference);

      // Save research presentations
      savedData.research = await this.saveResearch(savedData.conference);

      logger.info('Database save completed', {
        conferenceId: savedData.conference?._id,
        usersCreated: savedData.users.length,
        registrationsCreated: savedData.registrations.length,
        researchCreated: savedData.research.length,
        service: 'SOBIEProgramParser'
      });

      return savedData;
    } catch (error) {
      logger.error('Error saving to database', {
        error: error.message,
        stack: error.stack,
        service: 'SOBIEProgramParser'
      });
      throw error;
    }
  }

  async saveConference() {
    try {
      const conferenceData = this.extractedData.conference;
      
      // Check if conference already exists
      let conference = await Conference.findOne({ year: conferenceData.year });
      
      if (!conference) {
        conference = new Conference({
          title: conferenceData.title,
          year: conferenceData.year,
          name: conferenceData.name,
          location: {
            venue: conferenceData.venue,
            city: conferenceData.city,
            state: conferenceData.state,
            country: conferenceData.country
          },
          status: 'completed',
          extractedFrom: 'sobie2023program'
        });

        await conference.save();
        logger.info('Conference created', { conferenceId: conference._id });
      } else {
        logger.info('Conference already exists', { conferenceId: conference._id });
      }

      return conference;
    } catch (error) {
      logger.error('Error saving conference', { error: error.message });
      throw error;
    }
  }

  async saveUsers() {
    const savedUsers = [];
    
    for (const attendeeData of this.extractedData.attendees) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [
            { 'name.first': attendeeData.name.first, 'name.last': attendeeData.name.last },
            { email: `${attendeeData.name.first.toLowerCase()}.${attendeeData.name.last.toLowerCase()}@example.com` }
          ]
        });

        if (!existingUser) {
          const user = new User({
            name: attendeeData.name,
            email: `${attendeeData.name.first.toLowerCase()}.${attendeeData.name.last.toLowerCase()}@extracted.sobie.org`,
            profile: {
              affiliation: attendeeData.affiliation,
              extractedFrom: 'sobie2023program',
              isExtractedData: true
            },
            role: 'user',
            isEmailVerified: false
          });

          await user.save();
          savedUsers.push(user);
          logger.debug('User created from program', { userId: user._id, name: attendeeData.fullName });
        }
      } catch (error) {
        logger.warn('Error creating user', { 
          error: error.message, 
          attendee: attendeeData.fullName 
        });
      }
    }

    return savedUsers;
  }

  async saveRegistrations(conference) {
    const savedRegistrations = [];
    
    for (const attendeeData of this.extractedData.attendees) {
      try {
        // Find the user
        const user = await User.findOne({
          'name.first': attendeeData.name.first,
          'name.last': attendeeData.name.last
        });

        if (user && conference) {
          // Check if registration already exists
          const existingRegistration = await ConferenceRegistration.findOne({
            userId: user._id,
            conferenceId: conference._id
          });

          if (!existingRegistration) {
            const registration = new ConferenceRegistration({
              userId: user._id,
              conferenceId: conference._id,
              status: 'confirmed',
              registrationInfo: {
                personalInfo: {
                  fullName: attendeeData.fullName,
                  email: user.email,
                  affiliation: attendeeData.affiliation
                }
              },
              extractedFrom: 'sobie2023program',
              confirmation: {
                confirmed: true,
                confirmedAt: new Date(`${conference.year}-01-01`)
              }
            });

            await registration.save();
            savedRegistrations.push(registration);
            logger.debug('Registration created', { 
              registrationId: registration._id, 
              userId: user._id 
            });
          }
        }
      } catch (error) {
        logger.warn('Error creating registration', { 
          error: error.message, 
          attendee: attendeeData.fullName 
        });
      }
    }

    return savedRegistrations;
  }

  async saveResearch(conference) {
    const savedResearch = [];
    
    for (const presentationData of this.extractedData.presentations) {
      try {
        if (conference && presentationData.title.length > 10) {
          const research = new ResearchSubmission({
            title: presentationData.title,
            type: presentationData.type,
            conference: {
              year: conference.year,
              conferenceId: conference._id
            },
            status: 'accepted',
            extractedFrom: 'sobie2023program',
            submittedAt: new Date(`${conference.year}-01-01`),
            acceptedAt: new Date(`${conference.year}-03-01`)
          });

          await research.save();
          savedResearch.push(research);
          logger.debug('Research created', { 
            researchId: research._id, 
            title: presentationData.title.substring(0, 50) 
          });
        }
      } catch (error) {
        logger.warn('Error creating research', { 
          error: error.message, 
          title: presentationData.title.substring(0, 50) 
        });
      }
    }

    return savedResearch;
  }
}

module.exports = SOBIEProgramParser;

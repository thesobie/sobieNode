const SOBIEProgramParser = require('../services/programParserService');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Program Parser Controller
 * Handles PDF parsing and historical data extraction from SOBIE conference programs
 */

class ProgramParserController {
  
  /**
   * Parse SOBIE program PDF and extract all data
   * @route POST /api/admin/parse-program
   */
  static async parseProgramPDF(req, res) {
    try {
      const { filePath, year } = req.body;

      if (!filePath) {
        return res.status(400).json({
          success: false,
          message: 'PDF file path is required'
        });
      }

      logger.info('Starting program PDF parsing', {
        filePath,
        year,
        userId: req.user.id,
        service: 'ProgramParserController',
        method: 'parseProgramPDF'
      });

      // Validate file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        logger.error('PDF file not found', { filePath, error: error.message });
        return res.status(404).json({
          success: false,
          message: 'PDF file not found',
          filePath
        });
      }

      // Create parser instance and parse PDF
      const parser = new SOBIEProgramParser();
      const extractedData = await parser.parseProgramPDF(filePath);

      // Save to database
      const savedData = await parser.saveToDatabase();

      logger.info('Program PDF parsing completed successfully', {
        filePath,
        attendeesExtracted: extractedData.attendees.length,
        presentationsExtracted: extractedData.presentations.length,
        usersCreated: savedData.users.length,
        registrationsCreated: savedData.registrations.length,
        researchCreated: savedData.research.length,
        conferenceId: savedData.conference?._id,
        service: 'ProgramParserController'
      });

      res.json({
        success: true,
        message: 'Program PDF parsed and data extracted successfully',
        data: {
          extractedData: {
            conference: extractedData.conference,
            attendeesCount: extractedData.attendees.length,
            presentationsCount: extractedData.presentations.length,
            sessionsCount: extractedData.sessions.length,
            committeesCount: extractedData.committees.length,
            sponsorsCount: extractedData.sponsors.length,
            scheduleCount: extractedData.schedule.length
          },
          savedData: {
            conferenceId: savedData.conference?._id,
            usersCreated: savedData.users.length,
            registrationsCreated: savedData.registrations.length,
            researchCreated: savedData.research.length
          },
          summary: {
            filePath,
            processingTimestamp: new Date().toISOString(),
            totalDataPoints: extractedData.attendees.length + 
                           extractedData.presentations.length + 
                           extractedData.sessions.length,
            databaseRecordsCreated: savedData.users.length + 
                                   savedData.registrations.length + 
                                   savedData.research.length
          }
        }
      });

    } catch (error) {
      logger.error('Error in program PDF parsing', {
        error: error.message,
        stack: error.stack,
        filePath: req.body.filePath,
        userId: req.user.id,
        service: 'ProgramParserController'
      });

      res.status(500).json({
        success: false,
        message: 'Error parsing program PDF',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get available program PDFs for parsing
   * @route GET /api/admin/available-programs
   */
  static async getAvailablePrograms(req, res) {
    try {
      logger.info('Retrieving available program PDFs', {
        userId: req.user.id,
        service: 'ProgramParserController',
        method: 'getAvailablePrograms'
      });

      // Define common upload paths
      const uploadPaths = [
        '/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents',
        '/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads',
        '/Users/bcumbie/Desktop/sobie-dev/sobieNode/public/uploads'
      ];

      const programs = [];

      for (const basePath of uploadPaths) {
        try {
          const stats = await fs.stat(basePath);
          if (stats.isDirectory()) {
            await this.scanForPrograms(basePath, programs);
          }
        } catch (error) {
          // Directory doesn't exist, continue
        }
      }

      // Sort by year (descending)
      programs.sort((a, b) => b.year - a.year);

      logger.info('Available programs retrieved', {
        programsFound: programs.length,
        service: 'ProgramParserController'
      });

      res.json({
        success: true,
        message: 'Available program PDFs retrieved',
        data: {
          programs,
          totalFound: programs.length,
          scannedPaths: uploadPaths
        }
      });

    } catch (error) {
      logger.error('Error retrieving available programs', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id,
        service: 'ProgramParserController'
      });

      res.status(500).json({
        success: false,
        message: 'Error retrieving available programs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Recursively scan directory for program PDFs
   */
  static async scanForPrograms(dirPath, programs, depth = 0) {
    if (depth > 5) return; // Prevent infinite recursion

    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          // Recursively scan subdirectories
          await this.scanForPrograms(itemPath, programs, depth + 1);
        } else if (stats.isFile() && item.toLowerCase().endsWith('.pdf')) {
          // Check if it's a program PDF
          const isProgramPDF = this.isProgramPDF(item, itemPath);
          if (isProgramPDF) {
            const year = this.extractYearFromPath(itemPath) || this.extractYearFromFilename(item);
            programs.push({
              filename: item,
              path: itemPath,
              size: stats.size,
              year,
              lastModified: stats.mtime,
              directory: path.dirname(itemPath)
            });
          }
        }
      }
    } catch (error) {
      // Ignore access errors for directories
    }
  }

  /**
   * Check if PDF is likely a program PDF
   */
  static isProgramPDF(filename, filepath) {
    const lowerFilename = filename.toLowerCase();
    const lowerPath = filepath.toLowerCase();

    const programKeywords = [
      'program',
      'proceedings',
      'schedule',
      'agenda',
      'sobie'
    ];

    return programKeywords.some(keyword => 
      lowerFilename.includes(keyword) || lowerPath.includes(keyword)
    );
  }

  /**
   * Extract year from file path
   */
  static extractYearFromPath(filepath) {
    const yearMatch = filepath.match(/\b(20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  }

  /**
   * Extract year from filename
   */
  static extractYearFromFilename(filename) {
    const yearMatch = filename.match(/\b(20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  }

  /**
   * Parse specific program by ID or path
   * @route POST /api/admin/parse-program/:programId
   */
  static async parseSpecificProgram(req, res) {
    try {
      const { programId } = req.params;
      const { filePath } = req.body;

      if (!filePath && !programId) {
        return res.status(400).json({
          success: false,
          message: 'Program file path or ID is required'
        });
      }

      // Use provided filePath or construct from programId
      let targetPath = filePath;
      if (programId && !filePath) {
        // If programId looks like a path, use it directly
        if (programId.includes('/') || programId.includes('\\')) {
          targetPath = programId;
        }
      }

      if (!targetPath) {
        return res.status(400).json({
          success: false,
          message: 'Could not determine file path for parsing'
        });
      }

      // Use the main parsing method
      req.body.filePath = targetPath;
      return await this.parseProgramPDF(req, res);

    } catch (error) {
      logger.error('Error parsing specific program', {
        error: error.message,
        programId: req.params.programId,
        userId: req.user.id,
        service: 'ProgramParserController'
      });

      res.status(500).json({
        success: false,
        message: 'Error parsing specific program',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get parsing history and statistics
   * @route GET /api/admin/parsing-history
   */
  static async getParsingHistory(req, res) {
    try {
      logger.info('Retrieving parsing history', {
        userId: req.user.id,
        service: 'ProgramParserController',
        method: 'getParsingHistory'
      });

      const Conference = require('../models/Conference');
      const User = require('../models/User');
      const ConferenceRegistration = require('../models/ConferenceRegistration');
      const ResearchSubmission = require('../models/ResearchSubmission');

      // Get conferences extracted from programs
      const extractedConferences = await Conference.find({
        extractedFrom: 'sobie2023program'
      }).sort({ year: -1 });

      // Get statistics for each conference
      const history = [];
      for (const conference of extractedConferences) {
        const usersCount = await User.countDocuments({
          'profile.extractedFrom': 'sobie2023program'
        });

        const registrationsCount = await ConferenceRegistration.countDocuments({
          conferenceId: conference._id,
          extractedFrom: 'sobie2023program'
        });

        const researchCount = await ResearchSubmission.countDocuments({
          'conference.conferenceId': conference._id,
          extractedFrom: 'sobie2023program'
        });

        history.push({
          conference: {
            id: conference._id,
            title: conference.title,
            year: conference.year,
            location: conference.location
          },
          statistics: {
            usersExtracted: usersCount,
            registrationsCreated: registrationsCount,
            researchCreated: researchCount,
            totalDataPoints: usersCount + registrationsCount + researchCount
          },
          extractedAt: conference.createdAt
        });
      }

      res.json({
        success: true,
        message: 'Parsing history retrieved',
        data: {
          history,
          totalConferences: extractedConferences.length,
          summary: {
            totalUsers: history.reduce((sum, h) => sum + h.statistics.usersExtracted, 0),
            totalRegistrations: history.reduce((sum, h) => sum + h.statistics.registrationsCreated, 0),
            totalResearch: history.reduce((sum, h) => sum + h.statistics.researchCreated, 0)
          }
        }
      });

    } catch (error) {
      logger.error('Error retrieving parsing history', {
        error: error.message,
        userId: req.user.id,
        service: 'ProgramParserController'
      });

      res.status(500).json({
        success: false,
        message: 'Error retrieving parsing history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = ProgramParserController;

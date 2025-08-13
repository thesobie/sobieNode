const express = require('express');
const router = express.Router();
const ProgramParserController = require('../controllers/programParserController');
const { authMiddleware, requireRole } = require('../middleware/auth');

/**
 * SOBIE Program Parser Routes
 * Handles PDF parsing and historical data extraction
 * All routes require admin authentication
 */

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(requireRole(['admin', 'organizer']));

/**
 * @route   POST /api/admin/parse-program
 * @desc    Parse SOBIE program PDF and extract all data
 * @access  Admin/Organizer
 * @body    { filePath: string, year?: number }
 */
router.post('/parse-program', ProgramParserController.parseProgramPDF);

/**
 * @route   GET /api/admin/available-programs
 * @desc    Get list of available program PDFs for parsing
 * @access  Admin/Organizer
 */
router.get('/available-programs', ProgramParserController.getAvailablePrograms);

/**
 * @route   POST /api/admin/parse-program/:programId
 * @desc    Parse specific program by ID or path
 * @access  Admin/Organizer
 * @params  programId - Program identifier or file path
 * @body    { filePath?: string }
 */
router.post('/parse-program/:programId', ProgramParserController.parseSpecificProgram);

/**
 * @route   GET /api/admin/parsing-history
 * @desc    Get parsing history and statistics
 * @access  Admin/Organizer
 */
router.get('/parsing-history', ProgramParserController.getParsingHistory);

module.exports = router;

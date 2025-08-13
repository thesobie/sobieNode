const express = require('express');
const router = express.Router();
const {
  getHistoricalOverview,
  getYearlyData,
  getOrganizationAnalytics
} = require('../controllers/historicalDataController');

/**
 * Historical Data Analytics Routes
 * Endpoints for accessing SOBIE conference historical data
 */

// @route   GET /api/historical/overview
// @desc    Get comprehensive overview of all historical data
// @access  Public (could be protected later)
router.get('/overview', getHistoricalOverview);

// @route   GET /api/historical/year/:year
// @desc    Get detailed data for a specific conference year
// @access  Public
router.get('/year/:year', getYearlyData);

// @route   GET /api/historical/organizations
// @desc    Get organization analytics across all years
// @access  Public
router.get('/organizations', getOrganizationAnalytics);

module.exports = router;

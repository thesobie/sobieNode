const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Conference = require('../models/Conference');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Get historical timeline of all SOBIE conferences and their documents
router.get('/timeline', async (req, res) => {
  try {
    // Get document timeline
    const documentTimeline = await Document.getConferenceTimeline();
    
    // Get all conferences for context
    const conferences = await Conference.find({})
      .select('year name fullName location officers theme status statistics')
      .sort({ year: -1 });

    // Merge conference data with document data
    const timeline = conferences.map(conference => {
      const docData = documentTimeline.find(d => d._id === conference.year) || {
        documentCount: 0,
        categories: [],
        hasProgram: 0,
        hasProceedings: 0,
        totalSize: 0,
        publicDocuments: 0
      };

      return {
        year: conference.year,
        name: conference.name,
        fullName: conference.fullName,
        location: conference.location,
        president: conference.officers?.president,
        theme: conference.theme,
        status: conference.status,
        statistics: conference.statistics,
        documents: {
          count: docData.documentCount,
          categories: docData.categories,
          hasProgram: docData.hasProgram > 0,
          hasProceedings: docData.hasProceedings > 0,
          totalSizeBytes: docData.totalSize,
          publicCount: docData.publicDocuments
        }
      };
    });

    res.json({
      success: true,
      timeline,
      summary: {
        totalConferences: conferences.length,
        yearRange: {
          earliest: Math.min(...conferences.map(c => c.year)),
          latest: Math.max(...conferences.map(c => c.year))
        },
        documentsAvailable: documentTimeline.length,
        totalDocuments: documentTimeline.reduce((sum, d) => sum + d.documentCount, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching historical timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch historical timeline'
    });
  }
});

// Get documents for a specific year range
router.get('/years/:startYear/:endYear', async (req, res) => {
  try {
    const { startYear, endYear } = req.params;
    const { category, status, public_only } = req.query;

    const options = {};
    if (category) options.category = category;
    if (status) options.status = status;
    if (public_only === 'true') options.isPublic = true;

    const documents = await Document.getHistoricalDocuments(
      parseInt(startYear),
      parseInt(endYear),
      options
    );

    // Group by year
    const documentsByYear = documents.reduce((acc, doc) => {
      const year = doc.conferenceYear;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(doc);
      return acc;
    }, {});

    res.json({
      success: true,
      yearRange: { start: parseInt(startYear), end: parseInt(endYear) },
      totalDocuments: documents.length,
      documentsByYear
    });
  } catch (error) {
    console.error('Error fetching historical documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch historical documents'
    });
  }
});

// Get all documents for a specific year
router.get('/year/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { category } = req.query;

    const query = { conferenceYear: year };
    if (category) query.category = category;

    // Check if user can access non-public documents
    const user = req.user;
    if (!user || (!user.roles.includes('admin') && !user.roles.includes('organizer'))) {
      query.isPublic = true;
    }

    const documents = await Document.find(query)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ category: 1, title: 1 });

    // Get conference info for context
    const conference = await Conference.findOne({ year });

    res.json({
      success: true,
      year,
      conference: conference ? {
        name: conference.name,
        fullName: conference.fullName,
        location: conference.location,
        theme: conference.theme,
        officers: conference.officers
      } : null,
      documents,
      summary: {
        totalDocuments: documents.length,
        categories: [...new Set(documents.map(d => d.category))],
        publicDocuments: documents.filter(d => d.isPublic).length
      }
    });
  } catch (error) {
    console.error('Error fetching documents for year:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents for year'
    });
  }
});

// Get document statistics across all years
router.get('/statistics', async (req, res) => {
  try {
    const stats = await Document.getDocumentStatistics();
    
    // Additional category breakdown
    const categoryStats = await Document.aggregate([
      {
        $match: {
          status: { $in: ['active', 'archived', 'historical'] }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          publicCount: {
            $sum: {
              $cond: ['$isPublic', 1, 0]
            }
          },
          totalDownloads: { $sum: '$downloadCount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      statistics: stats[0] || {},
      categoryBreakdown: categoryStats
    });
  } catch (error) {
    console.error('Error fetching document statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document statistics'
    });
  }
});

// Search historical documents
router.get('/search', async (req, res) => {
  try {
    const { 
      query, 
      year, 
      startYear, 
      endYear, 
      category, 
      public_only 
    } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Build search criteria
    const searchCriteria = {
      $and: [
        {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { keywords: { $in: [new RegExp(query, 'i')] } }
          ]
        }
      ]
    };

    // Year filtering
    if (year) {
      searchCriteria.$and.push({ conferenceYear: parseInt(year) });
    } else if (startYear && endYear) {
      searchCriteria.$and.push({ 
        conferenceYear: { 
          $gte: parseInt(startYear), 
          $lte: parseInt(endYear) 
        } 
      });
    }

    // Category filtering
    if (category) {
      searchCriteria.$and.push({ category });
    }

    // Public only filtering
    if (public_only === 'true') {
      searchCriteria.$and.push({ isPublic: true });
    }

    // Access control for non-admin users
    const user = req.user;
    if (!user || (!user.roles.includes('admin') && !user.roles.includes('organizer'))) {
      searchCriteria.$and.push({ isPublic: true });
    }

    const documents = await Document.find(searchCriteria)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ conferenceYear: -1, title: 1 })
      .limit(50); // Limit results

    res.json({
      success: true,
      query,
      results: documents,
      count: documents.length
    });
  } catch (error) {
    console.error('Error searching historical documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search documents'
    });
  }
});

// Upload historical document (admin/organizer only)
router.post('/upload/:year', 
  authMiddleware, 
  requireRole(['admin', 'organizer']), 
  async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      
      // Validate year is within SOBIE history
      if (year < 1999 || year > new Date().getFullYear() + 5) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conference year'
        });
      }

      // Check if conference exists
      const conference = await Conference.findOne({ year });
      if (!conference) {
        return res.status(400).json({
          success: false,
          message: `Conference for year ${year} not found`
        });
      }

      res.json({
        success: true,
        message: 'Historical document upload endpoint ready',
        year,
        conference: conference.name,
        note: 'Implement actual file upload logic here'
      });
    } catch (error) {
      console.error('Error in historical document upload:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process historical document upload'
      });
    }
  }
);

module.exports = router;

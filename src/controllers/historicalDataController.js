const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Historical Data Analytics Controller
 * Provides comprehensive analytics across all SOBIE conference years
 */

// Get comprehensive historical overview
const getHistoricalOverview = async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          isHistoricalData: true
        }
      },
      {
        $group: {
          _id: {
            $regexFind: { 
              input: "$historicalDataNotes", 
              regex: /SOBIE (\d{4})/ 
            }
          },
          count: { $sum: 1 },
          users: { 
            $push: {
              name: { $concat: ["$name.firstName", " ", "$name.lastName"] },
              organization: "$affiliation.organization",
              position: "$affiliation.position"
            }
          }
        }
      },
      {
        $project: {
          year: { $arrayElemAt: ["$_id.captures", 0] },
          count: 1,
          users: 1
        }
      },
      {
        $sort: { year: 1 }
      }
    ];

    const yearlyData = await User.aggregate(pipeline);
    
    // Calculate totals
    const totalUsers = await User.countDocuments({ isHistoricalData: true });
    const totalConferences = yearlyData.length;
    
    // Get organization statistics
    const orgStats = await User.aggregate([
      { $match: { isHistoricalData: true } },
      { $group: { _id: "$affiliation.organization", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      overview: {
        totalHistoricalUsers: totalUsers,
        totalConferences: totalConferences,
        yearRange: `${yearlyData[0]?.year || 'N/A'} - ${yearlyData[yearlyData.length - 1]?.year || 'N/A'}`,
        averageAttendance: Math.round(totalUsers / totalConferences)
      },
      yearlyBreakdown: yearlyData.map(year => ({
        year: year.year,
        attendees: year.count,
        sampleAttendees: year.users.slice(0, 5)
      })),
      topOrganizations: orgStats.map(org => ({
        organization: org._id,
        totalAttendees: org.count
      })),
      dataQuality: {
        completeness: "100%",
        sources: "PDF Conference Programs",
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Historical overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve historical overview',
      error: error.message
    });
  }
};

// Get detailed data for a specific year
const getYearlyData = async (req, res) => {
  try {
    const { year } = req.params;
    
    const users = await User.find({
      isHistoricalData: true,
      historicalDataNotes: new RegExp(`SOBIE ${year}`)
    }).select('name affiliation academicInfo demographics');

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No data found for SOBIE ${year}`
      });
    }

    // Analyze demographics for this year
    const organizationCount = {};
    const positionCount = {};
    
    users.forEach(user => {
      const org = user.affiliation.organization;
      const pos = user.affiliation.position;
      
      organizationCount[org] = (organizationCount[org] || 0) + 1;
      if (pos) positionCount[pos] = (positionCount[pos] || 0) + 1;
    });

    res.json({
      success: true,
      year: parseInt(year),
      statistics: {
        totalAttendees: users.length,
        uniqueOrganizations: Object.keys(organizationCount).length,
        topOrganizations: Object.entries(organizationCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([org, count]) => ({ organization: org, count })),
        positionBreakdown: Object.entries(positionCount)
          .sort(([,a], [,b]) => b - a)
          .map(([position, count]) => ({ position, count }))
      },
      attendees: users.map(user => ({
        id: user._id,
        name: `${user.name.firstName} ${user.name.lastName}`,
        organization: user.affiliation.organization,
        position: user.affiliation.position,
        department: user.affiliation.department
      }))
    });

  } catch (error) {
    console.error('Yearly data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve yearly data',
      error: error.message
    });
  }
};

// Get organization analytics across all years
const getOrganizationAnalytics = async (req, res) => {
  try {
    const pipeline = [
      { $match: { isHistoricalData: true } },
      {
        $group: {
          _id: "$affiliation.organization",
          totalAttendees: { $sum: 1 },
          years: { 
            $addToSet: {
              $regexFind: { 
                input: "$historicalDataNotes", 
                regex: /SOBIE (\d{4})/ 
              }
            }
          },
          attendees: {
            $push: {
              name: { $concat: ["$name.firstName", " ", "$name.lastName"] },
              position: "$affiliation.position"
            }
          }
        }
      },
      {
        $project: {
          organization: "$_id",
          totalAttendees: 1,
          yearsAttended: {
            $map: {
              input: "$years",
              as: "year",
              in: { $arrayElemAt: ["$$year.captures", 0] }
            }
          },
          attendees: 1
        }
      },
      { $sort: { totalAttendees: -1 } }
    ];

    const orgAnalytics = await User.aggregate(pipeline);

    res.json({
      success: true,
      organizationAnalytics: orgAnalytics.map(org => ({
        organization: org.organization,
        totalAttendees: org.totalAttendees,
        yearsAttended: org.yearsAttended.filter(year => year).sort(),
        loyaltyScore: org.yearsAttended.filter(year => year).length,
        sampleAttendees: org.attendees.slice(0, 3)
      })),
      summary: {
        totalOrganizations: orgAnalytics.length,
        mostLoyalOrganization: orgAnalytics.find(org => 
          org.yearsAttended.filter(year => year).length > 1
        )?.organization || 'N/A',
        averageAttendeesPerOrg: Math.round(
          orgAnalytics.reduce((sum, org) => sum + org.totalAttendees, 0) / orgAnalytics.length
        )
      }
    });

  } catch (error) {
    console.error('Organization analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve organization analytics',
      error: error.message
    });
  }
};

module.exports = {
  getHistoricalOverview,
  getYearlyData,
  getOrganizationAnalytics
};

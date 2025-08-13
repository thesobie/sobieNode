const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const ConferenceRegistration = require('../models/ConferenceRegistration');
const Conference = require('../models/Conference');
const User = require('../models/User');
const emailService = require('../services/emailService');

/**
 * Venue Controller
 * Handles San Destin resort booking integration and discount codes
 */

// @desc    Get San Destin resort information and discount codes
// @route   GET /api/venue/san-destin/:conferenceId
// @access  Authenticated
const getSanDestinInfo = catchAsync(async (req, res) => {
  const { conferenceId } = req.params;
  const userId = req.user.id;

  // Get conference details
  const conference = await Conference.findById(conferenceId);
  if (!conference) {
    throw new AppError('Conference not found', 404);
  }

  // Get user's registration for this conference
  const registration = await ConferenceRegistration.findOne({
    userId,
    conferenceId,
    status: { $in: ['confirmed', 'pending'] }
  });

  // Get venue information
  const venueInfo = await getVenueDetails(conference);
  
  // Get applicable discount codes
  const discountCodes = await getAvailableDiscountCodes(conference, registration);

  logger.info('San Destin venue information retrieved', {
    userId,
    conferenceId,
    hasRegistration: !!registration,
    discountCodesCount: discountCodes.length,
    service: 'VenueService',
    method: 'getSanDestinInfo'
  });

  res.status(200).json({
    success: true,
    data: {
      venue: venueInfo,
      discountCodes,
      registration: registration ? {
        id: registration._id,
        status: registration.status,
        registrationDate: registration.createdAt,
        accommodationPreference: registration.accommodationPreference
      } : null,
      bookingDeadlines: getBookingDeadlines(conference)
    }
  });
});

// @desc    Update accommodation preferences
// @route   PUT /api/venue/accommodation-preference
// @access  Authenticated
const updateAccommodationPreference = catchAsync(async (req, res) => {
  const { registrationId, accommodationType, specialRequests, discountCodeUsed } = req.body;
  const userId = req.user.id;

  // Validate registration belongs to user
  const registration = await ConferenceRegistration.findOne({
    _id: registrationId,
    userId
  });

  if (!registration) {
    throw new AppError('Registration not found or access denied', 404);
  }

  // Update accommodation preferences
  registration.accommodationPreference = {
    type: accommodationType, // 'on-resort', 'off-resort', 'undecided'
    specialRequests: specialRequests || '',
    discountCodeUsed: discountCodeUsed || false,
    updatedAt: new Date()
  };

  await registration.save();

  // Log accommodation preference update
  logger.info('Accommodation preference updated', {
    userId,
    registrationId,
    accommodationType,
    discountCodeUsed,
    service: 'VenueService',
    method: 'updateAccommodationPreference'
  });

  res.status(200).json({
    success: true,
    message: 'Accommodation preferences updated successfully',
    data: {
      accommodationPreference: registration.accommodationPreference
    }
  });
});

// @desc    Get venue booking statistics for admin
// @route   GET /api/admin/venue/statistics/:conferenceId
// @access  Admin
const getVenueStatistics = catchAsync(async (req, res) => {
  const { conferenceId } = req.params;

  const statistics = await generateVenueStatistics(conferenceId);

  logger.info('Venue statistics generated', {
    conferenceId,
    totalRegistrations: statistics.totalRegistrations,
    onResortCount: statistics.onResort,
    offResortCount: statistics.offResort,
    service: 'VenueService',
    method: 'getVenueStatistics'
  });

  res.status(200).json({
    success: true,
    data: statistics
  });
});

// @desc    Send resort information email to registrant
// @route   POST /api/venue/send-resort-info
// @access  Authenticated
const sendResortInfoEmail = catchAsync(async (req, res) => {
  const { registrationId } = req.body;
  const userId = req.user.id;

  // Validate registration
  const registration = await ConferenceRegistration.findOne({
    _id: registrationId,
    userId
  }).populate('conferenceId').populate('userId');

  if (!registration) {
    throw new AppError('Registration not found or access denied', 404);
  }

  // Get venue information and discount codes
  const venueInfo = await getVenueDetails(registration.conferenceId);
  const discountCodes = await getAvailableDiscountCodes(registration.conferenceId, registration);

  // Send resort information email
  await emailService.sendResortInformationEmail({
    user: registration.userId,
    conference: registration.conferenceId,
    venue: venueInfo,
    discountCodes,
    registration
  });

  logger.info('Resort information email sent', {
    userId,
    registrationId,
    email: registration.userId.email,
    service: 'VenueService',
    method: 'sendResortInfoEmail'
  });

  res.status(200).json({
    success: true,
    message: 'Resort information email sent successfully'
  });
});

// Helper function to get venue details
async function getVenueDetails(conference) {
  return {
    name: 'Sandestin Golf and Beach Resort',
    location: {
      address: '9300 Emerald Coast Pkwy W',
      city: 'Miramar Beach',
      state: 'FL',
      zipCode: '32550',
      country: 'USA'
    },
    description: 'Sandestin Golf and Beach Resort is a premier destination resort offering luxury accommodations, world-class golf, beautiful beaches, and comprehensive conference facilities.',
    amenities: [
      'Four championship golf courses',
      'Tennis courts and fitness facilities',
      'Multiple swimming pools and beach access',
      'Spa and wellness services',
      'Various dining options',
      'Conference and meeting facilities',
      'Shuttle service within resort',
      'Water sports and recreational activities'
    ],
    accommodationTypes: [
      {
        type: 'Hotel Rooms',
        description: 'Comfortable hotel-style accommodations within the resort',
        features: ['Daily housekeeping', 'Resort amenities access', 'Conference shuttle']
      },
      {
        type: 'Condominiums',
        description: 'Spacious condo-style units with kitchens and living areas',
        features: ['Full kitchen', 'Separate living areas', 'Washer/dryer', 'Resort amenities']
      },
      {
        type: 'Vacation Rentals',
        description: 'Private homes and villas for larger groups',
        features: ['Multiple bedrooms', 'Full kitchens', 'Private outdoor spaces', 'Premium amenities']
      }
    ],
    conferenceVenues: [
      'Grand Ballroom - Main conference sessions',
      'Breakout rooms - Concurrent sessions',
      'Exhibition halls - Poster sessions and vendors',
      'Outdoor spaces - Networking events'
    ],
    transportationInfo: {
      airport: 'Destin-Fort Walton Beach Airport (VPS) - 15 minutes',
      shuttleService: 'Resort shuttle available from airport (advance booking required)',
      parking: 'Complimentary self-parking for resort guests',
      localTransportation: 'Resort trolley service connects all areas'
    },
    bookingInfo: {
      reservationWebsite: 'https://www.sandestin.com',
      reservationPhone: '1-800-277-0800',
      groupCode: `SOBIE${conference.year}`,
      bookingInstructions: 'Mention SOBIE Conference when booking to receive group rate'
    }
  };
}

// Helper function to get available discount codes
async function getAvailableDiscountCodes(conference, registration) {
  const codes = [];

  // Base SOBIE discount (always available for confirmed registrations)
  if (registration && registration.status === 'confirmed') {
    codes.push({
      code: `SOBIE${conference.year}`,
      type: 'group_rate',
      description: 'SOBIE Conference group rate',
      discount: '15% off standard room rates',
      validFrom: conference.registrationOpenDate,
      validUntil: conference.startDate,
      terms: [
        'Valid for conference dates and 2 days before/after',
        'Subject to availability',
        'Cannot be combined with other offers',
        'Advance reservation required'
      ],
      bookingInstructions: 'Use code when booking online or mention when calling reservations'
    });
  }

  // Early bird discount (if available)
  const earlyBirdDeadline = new Date(conference.startDate);
  earlyBirdDeadline.setDate(earlyBirdDeadline.getDate() - 60); // 60 days before conference

  if (new Date() < earlyBirdDeadline && registration && registration.status === 'confirmed') {
    codes.push({
      code: `SOBIE${conference.year}EARLY`,
      type: 'early_bird',
      description: 'Early bird booking discount',
      discount: 'Additional 10% off group rate',
      validFrom: conference.registrationOpenDate,
      validUntil: earlyBirdDeadline,
      terms: [
        'Must book at least 60 days in advance',
        'Valid with SOBIE group rate',
        'Limited availability',
        'Non-refundable deposit required'
      ],
      bookingInstructions: 'Use in combination with SOBIE group code for maximum savings'
    });
  }

  // Student discount (if applicable)
  if (registration && registration.attendeeType === 'student') {
    codes.push({
      code: `SOBIE${conference.year}STUDENT`,
      type: 'student',
      description: 'Student attendee special rate',
      discount: 'Additional 5% off group rate',
      validFrom: conference.registrationOpenDate,
      validUntil: conference.startDate,
      terms: [
        'Valid student ID required at check-in',
        'Cannot be combined with early bird discount',
        'Limited to shared occupancy',
        'Proof of enrollment required'
      ],
      bookingInstructions: 'Present student ID at check-in to validate discount'
    });
  }

  return codes;
}

// Helper function to get booking deadlines
function getBookingDeadlines(conference) {
  const conferenceStart = new Date(conference.startDate);
  
  return {
    groupRateDeadline: new Date(conferenceStart.getTime() - (30 * 24 * 60 * 60 * 1000)), // 30 days before
    resortBookingDeadline: new Date(conferenceStart.getTime() - (14 * 24 * 60 * 60 * 1000)), // 14 days before
    cancellationDeadline: new Date(conferenceStart.getTime() - (7 * 24 * 60 * 60 * 1000)), // 7 days before
    conferenceStart: conferenceStart,
    conferenceEnd: new Date(conference.endDate)
  };
}

// Helper function to generate venue statistics
async function generateVenueStatistics(conferenceId) {
  const registrations = await ConferenceRegistration.find({
    conferenceId,
    status: 'confirmed'
  });

  const stats = {
    totalRegistrations: registrations.length,
    onResort: 0,
    offResort: 0,
    undecided: 0,
    discountCodeUsage: {
      groupRate: 0,
      earlyBird: 0,
      student: 0,
      none: 0
    },
    specialRequests: [],
    accommodationTypes: {
      hotel: 0,
      condo: 0,
      vacation_rental: 0,
      unspecified: 0
    }
  };

  registrations.forEach(registration => {
    const pref = registration.accommodationPreference;
    
    if (pref) {
      // Count accommodation preferences
      switch (pref.type) {
        case 'on-resort':
          stats.onResort++;
          break;
        case 'off-resort':
          stats.offResort++;
          break;
        default:
          stats.undecided++;
      }

      // Count discount code usage
      if (pref.discountCodeUsed) {
        stats.discountCodeUsage.groupRate++;
      } else {
        stats.discountCodeUsage.none++;
      }

      // Collect special requests
      if (pref.specialRequests && pref.specialRequests.trim()) {
        stats.specialRequests.push({
          registrationId: registration._id,
          request: pref.specialRequests
        });
      }
    } else {
      stats.undecided++;
      stats.discountCodeUsage.none++;
    }
  });

  return stats;
}

module.exports = {
  getSanDestinInfo,
  updateAccommodationPreference,
  getVenueStatistics,
  sendResortInfoEmail
};

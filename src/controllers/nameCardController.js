const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const ConferenceRegistration = require('../models/ConferenceRegistration');
const User = require('../models/User');
const nameCardService = require('../services/nameCardService');

/**
 * Name Card Controller
 * Handles generation of printable name cards for conference attendees
 */

// @desc    Generate name cards for all attendees
// @route   GET /api/admin/name-cards/generate
// @access  Admin
const generateAllNameCards = catchAsync(async (req, res) => {
  const { conferenceId, format = 'pdf', includeLogos = true } = req.query;

  if (!conferenceId) {
    throw new AppError('Conference ID is required', 400);
  }

  // Get all confirmed registrations
  const registrations = await ConferenceRegistration.find({
    conferenceId,
    status: 'confirmed'
  }).populate('userId', 'name email profile');

  if (registrations.length === 0) {
    throw new AppError('No confirmed registrations found for this conference', 404);
  }

  logger.info('Generating name cards for all attendees', {
    conferenceId,
    attendeeCount: registrations.length,
    format,
    includeLogos,
    service: 'NameCardService',
    method: 'generateAllNameCards'
  });

  // Generate PDF with all name cards
  const attendeesData = await Promise.all(
    registrations.map(async (registration) => {
      const attendeeHistory = await getAttendeeHistory(registration.userId._id);
      return await processAttendeeData(registration, attendeeHistory);
    })
  );

  const pdfBuffer = await nameCardService.generateNameCardsPDF(attendeesData, {
    includeLogos: includeLogos === 'true',
    format
  });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="sobie-name-cards-${conferenceId}.pdf"`,
    'Content-Length': pdfBuffer.length
  });

  res.send(pdfBuffer);
});

// @desc    Generate name card for specific attendee
// @route   GET /api/admin/name-cards/attendee/:registrationId
// @access  Admin
const generateSingleNameCard = catchAsync(async (req, res) => {
  const { registrationId } = req.params;
  const { format = 'pdf', includeLogos = true } = req.query;

  const registration = await ConferenceRegistration.findById(registrationId)
    .populate('userId', 'name email profile');

  if (!registration) {
    throw new AppError('Registration not found', 404);
  }

  if (registration.status !== 'confirmed') {
    throw new AppError('Registration is not confirmed', 400);
  }

  logger.info('Generating single name card', {
    registrationId,
    attendeeName: registration.userId.name,
    format,
    includeLogos,
    service: 'NameCardService',
    method: 'generateSingleNameCard'
  });

  const attendeeHistory = await getAttendeeHistory(registration.userId._id);
  const attendeeData = await processAttendeeData(registration, attendeeHistory);

  const pdfBuffer = await nameCardService.generateNameCardsPDF([attendeeData], {
    includeLogos: includeLogos === 'true',
    format
  });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="name-card-${registration.userId.name.first}-${registration.userId.name.last}.pdf"`,
    'Content-Length': pdfBuffer.length
  });

  res.send(pdfBuffer);
});

// @desc    Get name card preview data
// @route   GET /api/admin/name-cards/preview/:registrationId
// @access  Admin
const getNameCardPreview = catchAsync(async (req, res) => {
  const { registrationId } = req.params;

  const registration = await ConferenceRegistration.findById(registrationId)
    .populate('userId', 'name email profile')
    .populate('conferenceId', 'title year');

  if (!registration) {
    throw new AppError('Registration not found', 404);
  }

  // Get attendee history
  const attendeeHistory = await getAttendeeHistory(registration.userId._id);
  
  // Process attendee data for name card
  const nameCardData = await processAttendeeData(registration, attendeeHistory);

  res.status(200).json({
    success: true,
    data: {
      nameCard: nameCardData,
      attendeeHistory: {
        totalSOBIEsAttended: attendeeHistory.totalAttended,
        isFirstTime: attendeeHistory.isFirstTime,
        previousConferences: attendeeHistory.conferences
      }
    }
  });
});

// @desc    Get all attendees for name card generation
// @route   GET /api/admin/name-cards/attendees/:conferenceId
// @access  Admin
const getAttendeesList = catchAsync(async (req, res) => {
  const { conferenceId } = req.params;
  const { page = 1, limit = 50, search = '' } = req.query;

  const query = {
    conferenceId,
    status: 'confirmed'
  };

  let registrations = await ConferenceRegistration.find(query)
    .populate('userId', 'name email profile')
    .sort({ 'userId.name.last': 1, 'userId.name.first': 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  // Apply search filter if provided
  if (search) {
    registrations = registrations.filter(reg => {
      const fullName = `${reg.userId.name.first} ${reg.userId.name.last}`.toLowerCase();
      const affiliation = reg.userId.profile?.affiliation?.toLowerCase() || '';
      return fullName.includes(search.toLowerCase()) || 
             affiliation.includes(search.toLowerCase());
    });
  }

  // Process each attendee
  const attendeesWithNameCardData = await Promise.all(
    registrations.map(async (registration) => {
      const attendeeHistory = await getAttendeeHistory(registration.userId._id);
      const nameCardData = await processAttendeeData(registration, attendeeHistory);
      
      return {
        registrationId: registration._id,
        nameCard: nameCardData,
        selected: false // For bulk generation UI
      };
    })
  );

  const total = await ConferenceRegistration.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      attendees: attendeesWithNameCardData,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
});

// Helper function to get attendee history
async function getAttendeeHistory(userId) {
  const allRegistrations = await ConferenceRegistration.find({
    userId,
    status: 'confirmed'
  }).populate('conferenceId', 'title year').sort({ createdAt: 1 });

  return {
    totalAttended: allRegistrations.length,
    isFirstTime: allRegistrations.length === 1,
    conferences: allRegistrations.map(reg => ({
      year: reg.conferenceId.year,
      title: reg.conferenceId.title
    }))
  };
}

// Helper function to process attendee data for name card
async function processAttendeeData(registration, attendeeHistory) {
  const user = registration.userId;
  
  return {
    preferredName: user.profile?.preferredName || `${user.name.first} ${user.name.last}`,
    fullName: `${user.name.first} ${user.name.last}`,
    affiliation: user.profile?.affiliation || 'Independent',
    university: user.profile?.university || user.profile?.affiliation,
    attendeeType: determineAttendeeType(user, registration),
    isFirstTime: attendeeHistory.isFirstTime,
    sobieCount: attendeeHistory.totalAttended,
    conferenceYear: registration.conferenceId?.year || new Date().getFullYear(),
    email: user.email,
    registrationId: registration._id
  };
}

// Helper function to determine attendee type
function determineAttendeeType(user, registration) {
  // Check user profile or registration data for type
  if (user.profile?.affiliationType) {
    return user.profile.affiliationType;
  }
  
  if (registration.attendeeType) {
    return registration.attendeeType;
  }
  
  // Default logic based on affiliation or email domain
  const affiliation = (user.profile?.affiliation || '').toLowerCase();
  const email = user.email.toLowerCase();
  
  if (affiliation.includes('student') || email.includes('.edu')) {
    return 'student';
  }
  
  if (affiliation.includes('university') || affiliation.includes('college')) {
    return 'academic';
  }
  
  if (affiliation.includes('sobie') || email.includes('sobie')) {
    return 'sobie_affiliate';
  }
  
  return 'professional';
}

module.exports = {
  generateAllNameCards,
  generateSingleNameCard,
  getNameCardPreview,
  getAttendeesList
};

const StudentCompetition = require('../models/StudentCompetition');
const User = require('../models/User');
const ResearchSubmission = require('../models/ResearchSubmission');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * Student Competition Controller
 * Handles student research competitions and awards
 */

class StudentCompetitionController {

  /**
   * Create a new student competition
   * @route POST /api/admin/student-competitions
   */
  static createCompetition = catchAsync(async (req, res) => {
    const {
      title,
      description,
      competitionType,
      category,
      conferenceId,
      submissionDeadline,
      judgingDate,
      announcementDate,
      judgingCriteria,
      settings
    } = req.body;

    const competition = new StudentCompetition({
      title,
      description,
      competitionType,
      category,
      conferenceId,
      submissionDeadline: new Date(submissionDeadline),
      judgingDate: new Date(judgingDate),
      announcementDate: new Date(announcementDate),
      judgingCriteria: judgingCriteria || [
        { criterion: 'Research Quality', weight: 30, description: 'Quality of research methodology and findings' },
        { criterion: 'Presentation Skills', weight: 25, description: 'Clarity and effectiveness of presentation' },
        { criterion: 'Innovation', weight: 25, description: 'Originality and innovation of the work' },
        { criterion: 'Relevance', weight: 20, description: 'Relevance to field and practical applications' }
      ],
      settings: settings || {},
      createdBy: req.user.id
    });

    await competition.save();

    logger.info('Student competition created', {
      competitionId: competition._id,
      title: competition.title,
      type: competition.competitionType,
      createdBy: req.user.id,
      service: 'StudentCompetitionController'
    });

    res.status(201).json({
      success: true,
      message: 'Student competition created successfully',
      data: { competition }
    });
  });

  /**
   * Get all competitions for a conference
   * @route GET /api/student-competitions/:conferenceId
   */
  static getCompetitionsByConference = catchAsync(async (req, res) => {
    const { conferenceId } = req.params;
    const { status, competitionType } = req.query;

    const filter = { conferenceId };
    if (status) filter.status = status;
    if (competitionType) filter.competitionType = competitionType;

    const competitions = await StudentCompetition.find(filter)
      .populate('conferenceId', 'title year')
      .populate('participants.studentId', 'name email profile')
      .populate('judges.judgeId', 'name email profile')
      .sort({ submissionDeadline: 1 });

    res.json({
      success: true,
      message: 'Competitions retrieved successfully',
      data: {
        competitions,
        count: competitions.length
      }
    });
  });

  /**
   * Register student for competition
   * @route POST /api/student-competitions/:competitionId/register
   */
  static registerStudent = catchAsync(async (req, res) => {
    const { competitionId } = req.params;
    const {
      studentId,
      researchSubmissionId,
      mentorId,
      institution
    } = req.body;

    const competition = await StudentCompetition.findById(competitionId);
    if (!competition) {
      throw AppError.notFound('Competition not found');
    }

    if (!competition.isSubmissionOpen) {
      throw AppError.badRequest('Competition submission is closed');
    }

    // Check if student is already registered
    const existingParticipant = competition.participants.find(
      p => p.studentId.toString() === studentId
    );

    if (existingParticipant) {
      throw AppError.badRequest('Student is already registered for this competition');
    }

    // Check capacity
    if (competition.participants.length >= competition.settings.maxParticipants) {
      throw AppError.badRequest('Competition is at capacity');
    }

    // Add participant
    competition.participants.push({
      studentId,
      researchSubmissionId,
      mentorId,
      institution,
      status: 'submitted'
    });

    await competition.save();

    logger.info('Student registered for competition', {
      competitionId,
      studentId,
      institution,
      service: 'StudentCompetitionController'
    });

    res.json({
      success: true,
      message: 'Student registered successfully',
      data: { competition }
    });
  });

  /**
   * Add judge to competition
   * @route POST /api/admin/student-competitions/:competitionId/judges
   */
  static addJudge = catchAsync(async (req, res) => {
    const { competitionId } = req.params;
    const { judgeId, expertise } = req.body;

    const competition = await StudentCompetition.findById(competitionId);
    if (!competition) {
      throw AppError.notFound('Competition not found');
    }

    // Check if judge is already assigned
    const existingJudge = competition.judges.find(
      j => j.judgeId.toString() === judgeId
    );

    if (existingJudge) {
      throw AppError.badRequest('Judge is already assigned to this competition');
    }

    competition.judges.push({
      judgeId,
      expertise: expertise || []
    });

    await competition.save();

    logger.info('Judge added to competition', {
      competitionId,
      judgeId,
      service: 'StudentCompetitionController'
    });

    res.json({
      success: true,
      message: 'Judge added successfully',
      data: { competition }
    });
  });

  /**
   * Submit scores for a participant
   * @route POST /api/student-competitions/:competitionId/score
   */
  static submitScore = catchAsync(async (req, res) => {
    const { competitionId } = req.params;
    const {
      participantId,
      criteriaScores,
      feedback
    } = req.body;

    const competition = await StudentCompetition.findById(competitionId);
    if (!competition) {
      throw AppError.notFound('Competition not found');
    }

    // Verify judge is assigned to this competition
    const judge = competition.judges.find(
      j => j.judgeId.toString() === req.user.id
    );

    if (!judge && req.user.role !== 'admin') {
      throw AppError.forbidden('You are not authorized to judge this competition');
    }

    // Calculate total score
    const totalScore = criteriaScores.reduce((sum, criteria) => {
      const weight = competition.judgingCriteria.find(
        c => c.criterion === criteria.criterion
      )?.weight || 0;
      return sum + (criteria.score * weight / 100);
    }, 0);

    // Check if score already exists
    const existingScoreIndex = competition.scores.findIndex(
      s => s.participantId.toString() === participantId && 
           s.judgeId.toString() === req.user.id
    );

    const scoreData = {
      participantId,
      judgeId: req.user.id,
      criteriaScores,
      totalScore,
      feedback
    };

    if (existingScoreIndex >= 0) {
      // Update existing score
      competition.scores[existingScoreIndex] = scoreData;
    } else {
      // Add new score
      competition.scores.push(scoreData);
    }

    await competition.save();

    logger.info('Score submitted for competition', {
      competitionId,
      participantId,
      judgeId: req.user.id,
      totalScore,
      service: 'StudentCompetitionController'
    });

    res.json({
      success: true,
      message: 'Score submitted successfully',
      data: { 
        score: scoreData,
        isJudgingComplete: competition.isJudgingComplete()
      }
    });
  });

  /**
   * Get competition results and rankings
   * @route GET /api/student-competitions/:competitionId/results
   */
  static getResults = catchAsync(async (req, res) => {
    const { competitionId } = req.params;

    const competition = await StudentCompetition.findById(competitionId)
      .populate('participants.studentId', 'name email profile')
      .populate('judges.judgeId', 'name email profile')
      .populate('awards.recipientId', 'name email profile');

    if (!competition) {
      throw AppError.notFound('Competition not found');
    }

    const finalScores = competition.calculateFinalScores();
    const isComplete = competition.isJudgingComplete();

    res.json({
      success: true,
      message: 'Competition results retrieved',
      data: {
        competition,
        finalScores,
        isJudgingComplete: isComplete,
        awards: competition.awards
      }
    });
  });

  /**
   * Assign awards based on final rankings
   * @route POST /api/admin/student-competitions/:competitionId/awards
   */
  static assignAwards = catchAsync(async (req, res) => {
    const { competitionId } = req.params;
    const { awards } = req.body; // Array of award assignments

    const competition = await StudentCompetition.findById(competitionId);
    if (!competition) {
      throw AppError.notFound('Competition not found');
    }

    if (!competition.isJudgingComplete()) {
      throw AppError.badRequest('Cannot assign awards until judging is complete');
    }

    competition.awards = awards.map(award => ({
      ...award,
      certificate: {
        issued: false
      }
    }));

    competition.status = 'completed';
    await competition.save();

    logger.info('Awards assigned for competition', {
      competitionId,
      awardsCount: awards.length,
      assignedBy: req.user.id,
      service: 'StudentCompetitionController'
    });

    res.json({
      success: true,
      message: 'Awards assigned successfully',
      data: { competition }
    });
  });

  /**
   * Get student's competition history
   * @route GET /api/student-competitions/student/:studentId/history
   */
  static getStudentHistory = catchAsync(async (req, res) => {
    const { studentId } = req.params;

    const competitions = await StudentCompetition.find({
      'participants.studentId': studentId
    })
    .populate('conferenceId', 'title year')
    .select('title competitionType category conferenceId participants awards status');

    const history = competitions.map(comp => {
      const participation = comp.participants.find(
        p => p.studentId.toString() === studentId
      );
      const award = comp.awards.find(
        a => a.recipientId.toString() === studentId
      );

      return {
        competition: {
          id: comp._id,
          title: comp.title,
          type: comp.competitionType,
          category: comp.category,
          conference: comp.conferenceId
        },
        participation,
        award: award || null,
        rank: comp.getParticipantRank(studentId)
      };
    });

    res.json({
      success: true,
      message: 'Student competition history retrieved',
      data: {
        studentId,
        history,
        totalCompetitions: history.length,
        awards: history.filter(h => h.award).length
      }
    });
  });
}

module.exports = StudentCompetitionController;

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const Document = require('../models/Document');
const { catchAsync } = require('../utils/catchAsync');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const { conferenceYear, category } = req.body;
    const dir = Document.getStorageDirectory(conferenceYear || new Date().getFullYear(), category || 'other');
    
    try {
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Only allow PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Single file upload
  }
});

// Calculate file checksum
const calculateChecksum = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// @desc    Upload a new document
// @route   POST /api/documents/upload
// @access  Private (organizer/admin)
const uploadDocument = catchAsync(async (req, res) => {
  upload.single('document')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 50MB.'
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      const {
        title,
        description,
        category,
        subcategory,
        conferenceYear,
        track,
        session,
        isPublic,
        allowedRoles,
        requiredRegistration,
        publishDate,
        expiryDate,
        keywords
      } = req.body;

      // Calculate file checksum for integrity
      const checksum = await calculateChecksum(req.file.path);

      // Check for duplicate files (same checksum)
      const existingDoc = await Document.findOne({ checksum });
      if (existingDoc) {
        // Remove uploaded file since it's a duplicate
        await fs.unlink(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'A document with identical content already exists',
          duplicateDocument: {
            id: existingDoc._id,
            title: existingDoc.title,
            filename: existingDoc.filename
          }
        });
      }

      // Create document record
      const document = await Document.create({
        title: title || req.file.originalname,
        description,
        category: category || 'other',
        subcategory,
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        checksum,
        conferenceYear: conferenceYear || new Date().getFullYear(),
        track,
        session,
        isPublic: isPublic === 'true',
        allowedRoles: allowedRoles ? JSON.parse(allowedRoles) : [],
        requiredRegistration: requiredRegistration !== 'false',
        uploadedBy: req.user._id,
        publishDate: publishDate ? new Date(publishDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        keywords: keywords ? JSON.parse(keywords) : [],
        status: 'active'
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
      });

    } catch (error) {
      // Clean up uploaded file on error
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to cleanup uploaded file:', unlinkError);
      }
      
      console.error('Document upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save document record'
      });
    }
  });
});

// @desc    Get all documents with filtering
// @route   GET /api/documents
// @access  Public/Private (based on document permissions)
const getDocuments = catchAsync(async (req, res) => {
  const {
    conferenceYear,
    category,
    track,
    isPublic,
    page = 1,
    limit = 20,
    search,
    sortBy = 'uploadedAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter query
  const filter = { status: 'active' };
  
  if (conferenceYear) filter.conferenceYear = conferenceYear;
  if (category) filter.category = category;
  if (track) filter.track = track;
  
  // Public documents or user-accessible documents
  if (!req.user) {
    filter.isPublic = true;
  } else if (isPublic === 'true') {
    filter.isPublic = true;
  } else if (!req.user.roles.includes('admin') && !req.user.roles.includes('organizer')) {
    // For regular users, show public docs + docs they can access
    filter.$or = [
      { isPublic: true },
      { allowedRoles: { $in: req.user.roles } },
      { uploadedBy: req.user._id }
    ];
  }

  // Search functionality
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { keywords: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const documents = await Document.find(filter)
    .select('-extractedText') // Don't include extracted text in list view
    .populate('uploadedBy', 'name.firstName name.lastName email')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  const total = await Document.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      documents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

// @desc    Get single document details
// @route   GET /api/documents/:id
// @access  Public/Private (based on document permissions)
const getDocument = catchAsync(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate('uploadedBy', 'name.firstName name.lastName email');

  if (!document || document.status !== 'active') {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check access permissions
  if (!document.canAccess(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to view this document.'
    });
  }

  res.status(200).json({
    success: true,
    data: document
  });
});

// @desc    Download document file
// @route   GET /api/documents/:id/download
// @access  Public/Private (based on document permissions)
const downloadDocument = catchAsync(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document || document.status !== 'active') {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check access permissions
  if (!document.canAccess(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to download this document.'
    });
  }

  try {
    // Check if file exists
    await fs.access(document.filePath);

    // Update download statistics
    document.downloadCount += 1;
    document.lastDownloaded = new Date();
    await document.save();

    // Set proper headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Stream the file
    const fileStream = require('fs').createReadStream(document.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file. File may be corrupted or missing.'
    });
  }
});

// @desc    Update document metadata
// @route   PUT /api/documents/:id
// @access  Private (uploader/admin/organizer)
const updateDocument = catchAsync(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check permissions (uploader, admin, or organizer)
  if (
    document.uploadedBy.toString() !== req.user._id.toString() &&
    !req.user.roles.includes('admin') &&
    !req.user.roles.includes('organizer')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only update documents you uploaded.'
    });
  }

  // Fields that can be updated
  const allowedUpdates = [
    'title', 'description', 'category', 'subcategory', 'track', 'session',
    'isPublic', 'allowedRoles', 'requiredRegistration', 'publishDate',
    'expiryDate', 'keywords', 'status'
  ];

  const updates = {};
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const updatedDocument = await Document.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).populate('uploadedBy', 'name.firstName name.lastName email');

  res.status(200).json({
    success: true,
    message: 'Document updated successfully',
    data: updatedDocument
  });
});

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private (uploader/admin/organizer)
const deleteDocument = catchAsync(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check permissions
  if (
    document.uploadedBy.toString() !== req.user._id.toString() &&
    !req.user.roles.includes('admin') &&
    !req.user.roles.includes('organizer')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only delete documents you uploaded.'
    });
  }

  const { permanent } = req.query;

  if (permanent === 'true' && req.user.roles.includes('admin')) {
    // Permanent deletion (admin only)
    try {
      await fs.unlink(document.filePath);
    } catch (error) {
      console.error('Failed to delete physical file:', error);
    }
    await Document.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Document permanently deleted'
    });
  } else {
    // Soft delete (mark as deleted)
    document.status = 'deleted';
    await document.save();
    
    res.status(200).json({
      success: true,
      message: 'Document moved to trash'
    });
  }
});

// @desc    Get document statistics
// @route   GET /api/documents/stats
// @access  Private (admin/organizer)
const getDocumentStats = catchAsync(async (req, res) => {
  const stats = await Document.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        totalDownloads: { $sum: '$downloadCount' },
        categories: { $push: '$category' },
        conferenceYears: { $push: '$conferenceYear' }
      }
    }
  ]);

  const categoryStats = await Document.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } }
  ]);

  const yearStats = await Document.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$conferenceYear', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } },
    { $sort: { _id: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {
        totalDocuments: 0,
        totalSize: 0,
        totalDownloads: 0
      },
      byCategory: categoryStats,
      byYear: yearStats
    }
  });
});

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  getDocumentStats
};

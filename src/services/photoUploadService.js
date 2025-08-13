const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const cloudinary = require('cloudinary').v2;
const logger = require('../config/logger');

/**
 * Photo Upload Service
 * Handles profile photo uploads with multiple storage options and image processing
 */

// Configure AWS S3 (if credentials are provided)
let s3 = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });
  s3 = new AWS.S3();
}

// Configure Cloudinary (if credentials are provided)
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Storage configuration
const STORAGE_TYPE = process.env.PHOTO_STORAGE_TYPE || 'local'; // 'local', 's3', 'cloudinary'
const UPLOAD_DIR = process.env.PHOTO_UPLOAD_DIR || 'uploads/photos/';
const MAX_FILE_SIZE = parseInt(process.env.PHOTO_MAX_SIZE) || 5 * 1024 * 1024; // 5MB default

// Supported image formats
const SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
const MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

// Image processing configurations
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 }
};

/**
 * File filter for image uploads
 */
const imageFileFilter = (req, file, cb) => {
  // Check file type
  if (!MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`), false);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return cb(new Error(`Invalid file extension. Supported: ${SUPPORTED_FORMATS.join(', ')}`), false);
  }

  cb(null, true);
};

/**
 * Memory storage for processing before uploading to cloud
 */
const memoryStorage = multer.memoryStorage();

/**
 * Local disk storage configuration
 */
const diskStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      // Ensure upload directory exists
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId-uuid-timestamp.ext
    const userId = req.user._id.toString();
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `profile-${userId}-${uniqueId}-${timestamp}${ext}`;
    cb(null, filename);
  }
});

/**
 * Multer configuration
 */
const getMulterConfig = () => {
  const storage = STORAGE_TYPE === 'local' ? diskStorage : memoryStorage;
  
  return multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1 // Only one file at a time
    }
  });
};

/**
 * Process and resize image using Sharp
 */
const processImage = async (buffer, options = {}) => {
  const {
    width = IMAGE_SIZES.medium.width,
    height = IMAGE_SIZES.medium.height,
    quality = 85,
    format = 'jpeg'
  } = options;

  try {
    const processedBuffer = await sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFormat(format, { quality })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

/**
 * Generate multiple image sizes
 */
const generateImageSizes = async (buffer, baseFilename) => {
  const results = {};
  
  for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
    try {
      const processedBuffer = await processImage(buffer, {
        width: dimensions.width,
        height: dimensions.height,
        quality: sizeName === 'thumbnail' ? 80 : 85,
        format: 'jpeg'
      });
      
      const filename = `${baseFilename}-${sizeName}.jpg`;
      results[sizeName] = {
        buffer: processedBuffer,
        filename: filename,
        dimensions: dimensions
      };
    } catch (error) {
      logger.error('Failed to generate image size', { 
        sizeName, 
        error: error.message,
        service: 'PhotoUploadService',
        method: 'processImage'
      });
    }
  }
  
  return results;
};

/**
 * Upload to AWS S3
 */
const uploadToS3 = async (buffer, filename, contentType = 'image/jpeg') => {
  if (!s3) {
    throw new Error('AWS S3 not configured');
  }

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `profile-photos/${filename}`,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
    CacheControl: 'max-age=31536000', // 1 year cache
    Metadata: {
      'uploaded-by': 'sobie-profile-service',
      'upload-date': new Date().toISOString()
    }
  };

  try {
    const result = await s3.upload(params).promise();
    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket
    };
  } catch (error) {
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

/**
 * Upload to Cloudinary
 */
const uploadToCloudinary = async (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'sobie/profile-photos',
        public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 800, height: 800, crop: 'fill', gravity: 'face' }
        ],
        eager: [
          { width: 150, height: 150, crop: 'fill', gravity: 'face' },
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            thumbnailUrl: result.eager[0]?.secure_url,
            mediumUrl: result.eager[1]?.secure_url,
            format: result.format,
            width: result.width,
            height: result.height
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Save to local storage
 */
const saveToLocal = async (buffer, filename) => {
  const fullPath = path.join(UPLOAD_DIR, filename);
  
  try {
    await fs.writeFile(fullPath, buffer);
    
    // Generate URL for local file
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/uploads/photos/${filename}`;
    
    return {
      url: url,
      path: fullPath,
      filename: filename
    };
  } catch (error) {
    throw new Error(`Local storage failed: ${error.message}`);
  }
};

/**
 * Delete photo from storage
 */
const deletePhoto = async (photoData) => {
  try {
    switch (STORAGE_TYPE) {
      case 's3':
        if (s3 && photoData.key) {
          await s3.deleteObject({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: photoData.key
          }).promise();
        }
        break;
        
      case 'cloudinary':
        if (photoData.publicId) {
          await cloudinary.uploader.destroy(photoData.publicId);
        }
        break;
        
      case 'local':
        if (photoData.path && await fs.access(photoData.path).then(() => true).catch(() => false)) {
          await fs.unlink(photoData.path);
        }
        break;
    }
  } catch (error) {
    logger.error('Error deleting photo', { 
      error: error.message,
      photoData,
      service: 'PhotoUploadService',
      method: 'deletePhoto'
    });
    // Don't throw error for deletion failures
  }
};

/**
 * Main upload function
 */
const uploadPhoto = async (buffer, originalFilename, userId) => {
  const timestamp = Date.now();
  const uniqueId = uuidv4();
  const ext = path.extname(originalFilename).toLowerCase();
  const baseFilename = `profile-${userId}-${uniqueId}-${timestamp}`;
  
  try {
    // Process the main image
    const processedBuffer = await processImage(buffer, {
      width: IMAGE_SIZES.large.width,
      height: IMAGE_SIZES.large.height,
      quality: 90,
      format: 'jpeg'
    });

    let result;

    switch (STORAGE_TYPE) {
      case 's3':
        result = await uploadToS3(processedBuffer, `${baseFilename}.jpg`);
        
        // Generate and upload additional sizes
        const sizes = await generateImageSizes(buffer, baseFilename);
        const sizeUrls = {};
        
        for (const [sizeName, sizeData] of Object.entries(sizes)) {
          const sizeResult = await uploadToS3(sizeData.buffer, sizeData.filename);
          sizeUrls[sizeName] = sizeResult.url;
        }
        
        result.sizes = sizeUrls;
        break;

      case 'cloudinary':
        result = await uploadToCloudinary(processedBuffer, `${baseFilename}.jpg`);
        break;

      case 'local':
      default:
        result = await saveToLocal(processedBuffer, `${baseFilename}.jpg`);
        
        // Generate and save additional sizes
        const localSizes = await generateImageSizes(buffer, baseFilename);
        const localSizeUrls = {};
        
        for (const [sizeName, sizeData] of Object.entries(localSizes)) {
          const sizeResult = await saveToLocal(sizeData.buffer, sizeData.filename);
          localSizeUrls[sizeName] = sizeResult.url;
        }
        
        result.sizes = localSizeUrls;
        break;
    }

    // Add metadata
    result.uploadedAt = new Date();
    result.originalFilename = originalFilename;
    result.storageType = STORAGE_TYPE;
    result.userId = userId;

    return result;
  } catch (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }
};

/**
 * Validate image file
 */
const validateImageFile = (file) => {
  const errors = [];

  // Check file existence
  if (!file) {
    errors.push('No file provided');
    return errors;
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size too large. Maximum size: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`);
  }

  // Check mime type
  if (!MIME_TYPES.includes(file.mimetype)) {
    errors.push(`Invalid file type. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (!SUPPORTED_FORMATS.includes(ext)) {
    errors.push(`Invalid file extension. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
  }

  return errors;
};

/**
 * Get image metadata
 */
const getImageMetadata = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels
    };
  } catch (error) {
    throw new Error(`Failed to read image metadata: ${error.message}`);
  }
};

/**
 * Check if storage is properly configured
 */
const checkStorageConfig = () => {
  const config = {
    storageType: STORAGE_TYPE,
    maxFileSize: MAX_FILE_SIZE,
    supportedFormats: SUPPORTED_FORMATS,
    configured: false,
    errors: []
  };

  switch (STORAGE_TYPE) {
    case 's3':
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET) {
        config.errors.push('AWS S3 credentials or bucket not configured');
      } else {
        config.configured = true;
      }
      break;

    case 'cloudinary':
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        config.errors.push('Cloudinary credentials not configured');
      } else {
        config.configured = true;
      }
      break;

    case 'local':
      config.configured = true;
      if (!process.env.BASE_URL) {
        config.errors.push('BASE_URL not configured for local storage URLs');
      }
      break;

    default:
      config.errors.push(`Invalid storage type: ${STORAGE_TYPE}`);
  }

  return config;
};

module.exports = {
  getMulterConfig,
  uploadPhoto,
  deletePhoto,
  validateImageFile,
  getImageMetadata,
  processImage,
  generateImageSizes,
  checkStorageConfig,
  
  // Constants
  STORAGE_TYPE,
  MAX_FILE_SIZE,
  SUPPORTED_FORMATS,
  IMAGE_SIZES
};

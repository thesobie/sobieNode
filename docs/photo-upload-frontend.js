// SOBIE Profile Photo Upload - Frontend Implementation Guide

/**
 * Complete frontend implementation for profile photo upload with preview,
 * drag & drop, progress tracking, and error handling.
 */

// 1. React Component for Photo Upload
import React, { useState, useRef, useCallback } from 'react';

const ProfilePhotoUpload = ({ currentPhoto, onPhotoUpdate, onPhotoRemove }) => {
  const [uploadState, setUploadState] = useState({
    uploading: false,
    progress: 0,
    error: null,
    preview: null,
    dragActive: false
  });
  
  const [config, setConfig] = useState(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  // Fetch upload configuration on component mount
  useEffect(() => {
    fetchUploadConfig();
  }, []);

  const fetchUploadConfig = async () => {
    try {
      const response = await fetch('/api/profile/me/photo/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch upload config:', error);
    }
  };

  const validateFile = (file) => {
    const errors = [];

    if (!file) {
      errors.push('No file selected');
      return errors;
    }

    // Check file size
    if (config && file.size > config.maxFileSize) {
      errors.push(`File too large. Maximum size: ${config.maxFileSizeMB}MB`);
    }

    // Check file type
    if (config && !config.supportedFormats.some(format => 
      file.type.includes(format) || file.name.toLowerCase().endsWith(`.${format}`)
    )) {
      errors.push(`Invalid file type. Supported: ${config.supportedFormats.join(', ')}`);
    }

    // Check minimum dimensions (we'll do this on the client side)
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          if (img.width < 100 || img.height < 100) {
            errors.push('Image too small. Minimum size: 100x100 pixels');
          }
          resolve(errors);
        };
        img.onerror = () => {
          errors.push('Invalid image file');
          resolve(errors);
        };
        img.src = URL.createObjectURL(file);
      } else {
        resolve(errors);
      }
    });
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    const errors = await validateFile(file);
    if (errors.length > 0) {
      setUploadState(prev => ({ ...prev, error: errors.join('. ') }));
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setUploadState(prev => ({ 
      ...prev, 
      preview: previewUrl, 
      error: null 
    }));

    // Upload file
    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploadState(prev => ({ ...prev, uploading: true, progress: 0 }));

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadState(prev => ({ ...prev, progress }));
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        const response = JSON.parse(xhr.responseText);
        
        if (xhr.status === 200 && response.success) {
          setUploadState(prev => ({ 
            ...prev, 
            uploading: false, 
            progress: 100,
            preview: null 
          }));
          
          // Clean up preview URL
          if (uploadState.preview) {
            URL.revokeObjectURL(uploadState.preview);
          }
          
          // Notify parent component
          onPhotoUpdate(response.data.photo);
        } else {
          setUploadState(prev => ({ 
            ...prev, 
            uploading: false, 
            error: response.message || 'Upload failed',
            preview: null 
          }));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setUploadState(prev => ({ 
          ...prev, 
          uploading: false, 
          error: 'Network error during upload',
          preview: null 
        }));
      });

      // Send request
      xhr.open('POST', '/api/profile/me/photo');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);

    } catch (error) {
      setUploadState(prev => ({ 
        ...prev, 
        uploading: false, 
        error: error.message,
        preview: null 
      }));
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const response = await fetch('/api/profile/me/photo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        onPhotoRemove();
      } else {
        setUploadState(prev => ({ ...prev, error: result.message }));
      }
    } catch (error) {
      setUploadState(prev => ({ ...prev, error: 'Failed to remove photo' }));
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(prev => ({ ...prev, dragActive: true }));
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(prev => ({ ...prev, dragActive: false }));
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(prev => ({ ...prev, dragActive: false }));

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  // Get photo URL with size option
  const getPhotoUrl = (photo, size = 'medium') => {
    if (!photo) return null;
    
    if (typeof photo === 'string') {
      return photo; // Legacy URL format
    }
    
    if (photo.sizes && photo.sizes[size]) {
      return photo.sizes[size];
    }
    
    return photo.url; // Main photo URL
  };

  return (
    <div className="profile-photo-upload">
      <div className="photo-upload-header">
        <h3>Profile Photo</h3>
        {config && (
          <div className="upload-info">
            <span>Max size: {config.maxFileSizeMB}MB</span>
            <span>Formats: {config.supportedFormats.join(', ')}</span>
          </div>
        )}
      </div>

      <div className="photo-display">
        {/* Current Photo Display */}
        {(currentPhoto || uploadState.preview) && (
          <div className="current-photo">
            <img 
              src={uploadState.preview || getPhotoUrl(currentPhoto, 'medium')} 
              alt="Profile" 
              className="photo-preview"
            />
            {!uploadState.uploading && !uploadState.preview && (
              <button 
                onClick={handleRemovePhoto}
                className="remove-photo-btn"
                title="Remove photo"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Upload Area */}
        <div 
          ref={dropRef}
          className={`upload-area ${uploadState.dragActive ? 'drag-active' : ''} ${uploadState.uploading ? 'uploading' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !uploadState.uploading && fileInputRef.current?.click()}
        >
          {uploadState.uploading ? (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadState.progress}%` }}
                ></div>
              </div>
              <span>Uploading... {uploadState.progress}%</span>
            </div>
          ) : (
            <div className="upload-prompt">
              <div className="upload-icon">📷</div>
              <div className="upload-text">
                <p><strong>Click to upload</strong> or drag and drop</p>
                <p>JPEG, PNG, WebP, GIF up to {config?.maxFileSizeMB || 5}MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </div>

      {/* Error Display */}
      {uploadState.error && (
        <div className="upload-error">
          <span className="error-icon">⚠️</span>
          <span>{uploadState.error}</span>
          <button 
            onClick={() => setUploadState(prev => ({ ...prev, error: null }))}
            className="dismiss-error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Photo Sizes Info (for current photo) */}
      {currentPhoto && typeof currentPhoto === 'object' && currentPhoto.sizes && (
        <div className="photo-sizes">
          <h4>Available Sizes:</h4>
          <div className="size-options">
            {Object.entries(currentPhoto.sizes).map(([sizeName, url]) => (
              <a 
                key={sizeName} 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="size-link"
              >
                {sizeName}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 2. CSS Styles for Photo Upload Component
const photoUploadStyles = `
.profile-photo-upload {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.photo-upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.photo-upload-header h3 {
  margin: 0;
  color: #333;
}

.upload-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.photo-display {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.current-photo {
  position: relative;
  flex-shrink: 0;
}

.photo-preview {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #f0f0f0;
}

.remove-photo-btn {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ff4444;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.remove-photo-btn:hover {
  background: #cc0000;
}

.upload-area {
  flex: 1;
  min-height: 120px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 20px;
}

.upload-area:hover {
  border-color: #007cba;
  background: #f8fcff;
}

.upload-area.drag-active {
  border-color: #007cba;
  background: #e6f3ff;
  transform: scale(1.02);
}

.upload-area.uploading {
  cursor: not-allowed;
  border-color: #007cba;
  background: #f0f8ff;
}

.upload-prompt {
  text-align: center;
}

.upload-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.upload-text p {
  margin: 4px 0;
}

.upload-text p:first-child {
  font-size: 16px;
  color: #333;
}

.upload-text p:last-child {
  font-size: 12px;
  color: #666;
}

.upload-progress {
  text-align: center;
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007cba, #00a0e6);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.upload-error {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffe6e6;
  color: #cc0000;
  padding: 12px;
  border-radius: 6px;
  margin-top: 16px;
  border-left: 4px solid #cc0000;
}

.error-icon {
  flex-shrink: 0;
}

.dismiss-error {
  background: none;
  border: none;
  color: #cc0000;
  cursor: pointer;
  font-weight: bold;
  margin-left: auto;
}

.photo-sizes {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.photo-sizes h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.size-options {
  display: flex;
  gap: 12px;
}

.size-link {
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  text-decoration: none;
  color: #333;
  font-size: 12px;
  text-transform: uppercase;
}

.size-link:hover {
  background: #e0e0e0;
}

/* Responsive design */
@media (max-width: 600px) {
  .photo-display {
    flex-direction: column;
    align-items: center;
  }
  
  .current-photo {
    margin-bottom: 16px;
  }
  
  .upload-area {
    width: 100%;
    min-height: 100px;
  }
}
`;

// 3. Integration with Profile Form
const ProfileForm = () => {
  const [profile, setProfile] = useState(null);
  
  const handlePhotoUpdate = (newPhoto) => {
    setProfile(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        photo: newPhoto
      }
    }));
    
    // Optionally show success message
    showSuccessMessage('Profile photo updated successfully!');
  };

  const handlePhotoRemove = () => {
    setProfile(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        photo: null
      }
    }));
    
    showSuccessMessage('Profile photo removed successfully!');
  };

  return (
    <div className="profile-form">
      <ProfilePhotoUpload
        currentPhoto={profile?.profile?.photo}
        onPhotoUpdate={handlePhotoUpdate}
        onPhotoRemove={handlePhotoRemove}
      />
      
      {/* Other profile form fields */}
    </div>
  );
};

// 4. API Integration Helper
const photoAPI = {
  // Get upload configuration
  async getConfig() {
    const response = await fetch('/api/profile/me/photo/config', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  },

  // Upload photo
  async upload(file, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('photo', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded * 100) / event.total);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          resolve(response);
        } else {
          reject(new Error(response.message || 'Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.open('POST', '/api/profile/me/photo');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);
    });
  },

  // Remove photo
  async remove() {
    const response = await fetch('/api/profile/me/photo', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  }
};

// 5. Usage Examples

// Basic usage in a React component
const ExampleUsage = () => {
  const [userPhoto, setUserPhoto] = useState(null);

  return (
    <ProfilePhotoUpload
      currentPhoto={userPhoto}
      onPhotoUpdate={(photo) => setUserPhoto(photo)}
      onPhotoRemove={() => setUserPhoto(null)}
    />
  );
};

// Usage with form validation
const FormWithPhotoValidation = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Require photo for certain user types
    if (formData.userType === 'presenter' && !formData.photo) {
      newErrors.photo = 'Profile photo is required for presenters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (validateForm()) {
        // Submit form
      }
    }}>
      <ProfilePhotoUpload
        currentPhoto={formData.photo}
        onPhotoUpdate={(photo) => {
          setFormData(prev => ({ ...prev, photo }));
          setErrors(prev => ({ ...prev, photo: null }));
        }}
        onPhotoRemove={() => {
          setFormData(prev => ({ ...prev, photo: null }));
        }}
      />
      {errors.photo && <div className="error">{errors.photo}</div>}
    </form>
  );
};

export {
  ProfilePhotoUpload,
  photoUploadStyles,
  photoAPI,
  ExampleUsage,
  FormWithPhotoValidation
};

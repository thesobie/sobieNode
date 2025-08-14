/**
 * SOBIE Conference Platform - API Client
 * RESTful API communication using Fetch API
 * 
 * This module handles all backend communication with proper error handling,
 * loading states, and response processing.
 */

class SobieAPI {
    constructor() {
        // Set base URL - configured for your SOBIE backend
        this.baseURL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : '/api';
        
        // Backend server info
        this.serverURL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : '';
            
        // Default headers
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        // Auth token storage
        this.authToken = localStorage.getItem('sobie_auth_token');
        this.userRole = localStorage.getItem('sobie_user_role');
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        this.setupInterceptors();
    }

    /**
     * Setup default request/response interceptors
     */
    setupInterceptors() {
        // Add auth token to requests
        this.addRequestInterceptor((config) => {
            if (this.authToken) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${this.authToken}`
                };
            }
            return config;
        });

        // Handle authentication errors
        this.addResponseInterceptor(null, (error) => {
            if (error.status === 401) {
                this.clearAuth();
                // Check if we're already on a login page to avoid redirect loops
                if (!window.location.pathname.includes('/login.html') && 
                    !window.location.pathname.includes('/register.html') &&
                    !window.location.pathname.includes('/magic-login.html')) {
                    window.location.href = '/public/login.html';
                }
            }
            return Promise.reject(error);
        });
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(fulfilled, rejected = null) {
        this.requestInterceptors.push({ fulfilled, rejected });
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(fulfilled, rejected = null) {
        this.responseInterceptors.push({ fulfilled, rejected });
    }

    /**
     * Main request method
     */
    async request(url, options = {}) {
        // Prepare config
        let config = {
            method: 'GET',
            headers: { ...this.defaultHeaders },
            ...options
        };

        // Apply request interceptors
        for (const interceptor of this.requestInterceptors) {
            try {
                config = interceptor.fulfilled ? interceptor.fulfilled(config) : config;
            } catch (error) {
                if (interceptor.rejected) {
                    return interceptor.rejected(error);
                }
                throw error;
            }
        }

        try {
            const response = await fetch(`${this.baseURL}${url}`, config);
            
            // Apply response interceptors (success)
            let result = response;
            for (const interceptor of this.responseInterceptors) {
                if (interceptor.fulfilled) {
                    result = await interceptor.fulfilled(result);
                }
            }

            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.response = response;
                throw error;
            }

            // Parse response based on content type
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }

        } catch (error) {
            // Apply response interceptors (error)
            for (const interceptor of this.responseInterceptors) {
                if (interceptor.rejected) {
                    error = await interceptor.rejected(error);
                }
            }
            throw error;
        }
    }

    /* ========================================
       AUTHENTICATION METHODS
    ======================================== */

    async login(email, password) {
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            // Handle the backend response structure
            if (response.data && response.data.tokens && response.data.user) {
                this.setAuth(response.data.tokens.access, response.data.user.roles[0]);
                
                // Return flattened structure for frontend compatibility
                return {
                    success: response.success,
                    message: response.message,
                    user: response.data.user,
                    tokens: response.data.tokens,
                    token: response.data.tokens.access
                };
            }

            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
        }
    }

    async register(userData) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async requestMagicLink(email) {
        return await this.request('/auth/magic-link', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async magicLogin(token) {
        try {
            const response = await this.request('/auth/magic-login', {
                method: 'POST',
                body: JSON.stringify({ token })
            });

            // Handle the backend response structure
            if (response.data && response.data.tokens && response.data.user) {
                this.setAuth(response.data.tokens.access, response.data.user.roles[0]);
                
                // Return flattened structure for frontend compatibility
                return {
                    success: response.success,
                    message: response.message,
                    user: response.data.user,
                    tokens: response.data.tokens,
                    token: response.data.tokens.access
                };
            }

            return response;
        } catch (error) {
            console.error('Magic login failed:', error);
            throw error;
        }
    }

    async forgotPassword(email) {
        return await this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async resetPassword(token, newPassword) {
        return await this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword })
        });
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    async changePassword(currentPassword, newPassword) {
        return await this.request('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    setAuth(token, role) {
        this.authToken = token;
        this.userRole = role;
        localStorage.setItem('sobie_auth_token', token);
        localStorage.setItem('sobie_user_role', role);
    }

    clearAuth() {
        this.authToken = null;
        this.userRole = null;
        localStorage.removeItem('sobie_auth_token');
        localStorage.removeItem('sobie_user_role');
    }

    isAuthenticated() {
        return !!this.authToken;
    }

    getUserRole() {
        return this.userRole;
    }

    /* ========================================
       RESEARCH PAPERS METHODS
    ======================================== */

    async getResearchPapers(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const url = queryParams ? `/research?${queryParams}` : '/research';
        return await this.request(url);
    }

    async getResearchPaper(id) {
        return await this.request(`/research/${id}`);
    }

    async createResearchPaper(paperData) {
        return await this.request('/research', {
            method: 'POST',
            body: JSON.stringify(paperData)
        });
    }

    async updateResearchPaper(id, paperData) {
        return await this.request(`/research/${id}`, {
            method: 'PUT',
            body: JSON.stringify(paperData)
        });
    }

    async deleteResearchPaper(id) {
        return await this.request(`/research/${id}`, {
            method: 'DELETE'
        });
    }

    async uploadResearchFile(id, file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        return await this.uploadFile(`/research/${id}/upload`, formData, onProgress);
    }

    /* ========================================
       PROGRAMS METHODS
    ======================================== */

    async getPrograms(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const url = queryParams ? `/programs?${queryParams}` : '/programs';
        return await this.request(url);
    }

    async getProgram(id) {
        return await this.request(`/programs/${id}`);
    }

    async createProgram(programData) {
        return await this.request('/programs', {
            method: 'POST',
            body: JSON.stringify(programData)
        });
    }

    async updateProgram(id, programData) {
        return await this.request(`/programs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(programData)
        });
    }

    async deleteProgram(id) {
        return await this.request(`/programs/${id}`, {
            method: 'DELETE'
        });
    }

    /* ========================================
       USER MANAGEMENT METHODS
    ======================================== */

    async getUsers(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const url = queryParams ? `/users?${queryParams}` : '/users';
        return await this.request(url);
    }

    async getUser(id) {
        return await this.request(`/users/${id}`);
    }

    async updateUser(id, userData) {
        return await this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(id) {
        return await this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    async updateProfile(profileData) {
        return await this.request('/profiles/me', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    /* ========================================
       RESEARCH SUBMISSION METHODS
    ======================================== */

    async getUserSubmissions() {
        return await this.request('/research-submission/my-submissions');
    }

    async createSubmission(submissionData) {
        return await this.request('/research-submission', {
            method: 'POST',
            body: JSON.stringify(submissionData)
        });
    }

    async getSubmission(id) {
        return await this.request(`/research-submission/${id}`);
    }

    async updateSubmission(id, submissionData) {
        return await this.request(`/research-submission/${id}`, {
            method: 'PUT',
            body: JSON.stringify(submissionData)
        });
    }

    async deleteSubmission(id) {
        return await this.request(`/research-submission/${id}`, {
            method: 'DELETE'
        });
    }

    async submitForReview(id) {
        return await this.request(`/research-submission/${id}/submit`, {
            method: 'POST'
        });
    }

    /* ========================================
       CONFERENCE MANAGEMENT METHODS
    ======================================== */

    async getConferences() {
        return await this.request('/conferences');
    }

    async getConference(id) {
        return await this.request(`/conferences/${id}`);
    }

    async getCurrentConference() {
        return await this.request('/conference/current');
    }

    async createConference(conferenceData) {
        return await this.request('/conferences', {
            method: 'POST',
            body: JSON.stringify(conferenceData)
        });
    }

    async updateConference(id, conferenceData) {
        return await this.request(`/conferences/${id}`, {
            method: 'PUT',
            body: JSON.stringify(conferenceData)
        });
    }

    async deleteConference(id) {
        return await this.request(`/conferences/${id}`, {
            method: 'DELETE'
        });
    }

    /* ========================================
       FILE UPLOAD METHODS
    ======================================== */

    async uploadFile(endpoint, formData, onProgress = null) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Add auth header if available
            if (this.authToken) {
                xhr.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
            }

            // Track upload progress
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });

            xhr.open('POST', `${this.baseURL}${endpoint}`);
            xhr.send(formData);
        });
    }

    /* ========================================
       SEARCH METHODS
    ======================================== */

    async search(query, filters = {}) {
        const searchData = { query, ...filters };
        return await this.request('/search', {
            method: 'POST',
            body: JSON.stringify(searchData)
        });
    }

    async searchAuthors(query) {
        return await this.request(`/search/authors?q=${encodeURIComponent(query)}`);
    }

    async searchInstitutions(query) {
        return await this.request(`/search/institutions?q=${encodeURIComponent(query)}`);
    }

    async searchKeywords(query) {
        return await this.request(`/search/keywords?q=${encodeURIComponent(query)}`);
    }

    /* ========================================
       UTILITY METHODS
    ======================================== */

    async healthCheck() {
        try {
            const response = await fetch(`${this.serverURL}/health`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'error', message: error.message };
        }
    }

    async getStats() {
        return await this.request('/stats');
    }

    /* ========================================
       ERROR HANDLING UTILITIES
    ======================================== */

    handleApiError(error, context = '') {
        console.error(`API Error${context ? ` (${context})` : ''}:`, error);
        
        let userMessage = 'An unexpected error occurred';
        
        if (error.status) {
            switch (error.status) {
                case 400:
                    userMessage = 'Invalid request. Please check your input.';
                    break;
                case 401:
                    userMessage = 'Authentication required. Please log in.';
                    break;
                case 403:
                    userMessage = 'Access denied. You do not have permission.';
                    break;
                case 404:
                    userMessage = 'Resource not found.';
                    break;
                case 422:
                    userMessage = 'Validation error. Please check your data.';
                    break;
                case 500:
                    userMessage = 'Server error. Please try again later.';
                    break;
                default:
                    userMessage = `Error ${error.status}: ${error.message}`;
            }
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            userMessage = 'Network error. Please check your connection.';
        }

        return userMessage;
    }

    // ================================
    // CONTENT MANAGEMENT METHODS
    // ================================

    /**
     * Get content blocks for a specific page
     * @param {string} page - Page name (home, about, conference, etc.)
     * @param {number} conferenceYear - Optional conference year filter
     * @returns {Promise<Array>} Content blocks
     */
    async getPageContent(page, conferenceYear = null) {
        const url = conferenceYear 
            ? `/content/page/${page}?conferenceYear=${conferenceYear}`
            : `/content/page/${page}`;
        return this.get(url);
    }

    /**
     * Get a specific content block by key
     * @param {string} key - Content block key
     * @param {number} conferenceYear - Optional conference year filter
     * @returns {Promise<Object>} Content block
     */
    async getContentByKey(key, conferenceYear = null) {
        const url = conferenceYear 
            ? `/content/key/${key}?conferenceYear=${conferenceYear}`
            : `/content/key/${key}`;
        return this.get(url);
    }

    /**
     * Get content blocks by category
     * @param {string} category - Content category
     * @param {number} conferenceYear - Optional conference year filter
     * @returns {Promise<Array>} Content blocks
     */
    async getContentByCategory(category, conferenceYear = null) {
        const url = conferenceYear 
            ? `/content/category/${category}?conferenceYear=${conferenceYear}`
            : `/content/category/${category}`;
        return this.get(url);
    }

    /**
     * Get current conference with associated content
     * @returns {Promise<Object>} Conference and content data
     */
    async getCurrentConferenceContent() {
        return this.get('/content/current-conference');
    }

    // ADMIN CONTENT MANAGEMENT METHODS

    /**
     * Get all content blocks (admin only)
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Content blocks with pagination
     */
    async getAllContentBlocks(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const url = params ? `/content/admin/all?${params}` : '/content/admin/all';
        return this.get(url);
    }

    /**
     * Create a new content block (admin only)
     * @param {Object} contentData - Content block data
     * @returns {Promise<Object>} Created content block
     */
    async createContentBlock(contentData) {
        return this.post('/content/admin/create', contentData);
    }

    /**
     * Update a content block (admin only)
     * @param {string} id - Content block ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} Updated content block
     */
    async updateContentBlock(id, updateData) {
        return this.put(`/content/admin/${id}`, updateData);
    }

    /**
     * Delete a content block (admin only)
     * @param {string} id - Content block ID
     * @returns {Promise<Object>} Success message
     */
    async deleteContentBlock(id) {
        return this.delete(`/content/admin/${id}`);
    }

    /**
     * Rollback content block to previous version (admin only)
     * @param {string} id - Content block ID
     * @param {number} versionIndex - Version index to rollback to
     * @returns {Promise<Object>} Updated content block
     */
    async rollbackContentBlock(id, versionIndex) {
        return this.post(`/content/admin/${id}/rollback`, { versionIndex });
    }

    /**
     * Get content block edit history (admin only)
     * @param {string} id - Content block ID
     * @returns {Promise<Object>} Edit history
     */
    async getContentBlockHistory(id) {
        return this.get(`/content/admin/${id}/history`);
    }
}

// Create global API instance
window.sobieAPI = new SobieAPI();

// Note: Using window assignment instead of ES6 export for browser compatibility

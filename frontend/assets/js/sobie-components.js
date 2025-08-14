/**
 * SOBIE Conference Platform - Interactive Components
 * 
 * This module handles all interactive UI components including:
 * - Inline editing
 * - Drag & drop functionality
 * - Filter buttons
 * - Mobile navigation
 * - Tree structures
 * - Research cards
 */

class SobieComponents {
    constructor() {
        this.initializeComponents();
        this.setupEventListeners();
    }

    /* ========================================
       INITIALIZATION
    ======================================== */

    initializeComponents() {
        this.draggedElement = null;
        this.editingElement = null;
        this.activeFilters = new Set();
        this.searchDebounceTimer = null;
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.initializeInlineEditing();
        this.initializeDragAndDrop();
        this.initializeFilterButtons();
        this.initializeMobileNavigation();
        this.initializeTreeStructures();
        this.initializeSearchFunctionality();
        this.initializeTooltips();
    }

    setupEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalKeyboard(e));
        
        // Click outside to close editing
        document.addEventListener('click', (e) => this.handleDocumentClick(e));
        
        // Window resize handling
        window.addEventListener('resize', () => this.handleWindowResize());
    }

    /* ========================================
       INLINE EDITING
    ======================================== */

    initializeInlineEditing() {
        document.addEventListener('click', (e) => {
            const editableField = e.target.closest('.editable-field');
            if (editableField && !editableField.classList.contains('editing')) {
                this.startEditing(editableField);
            }
        });
    }

    startEditing(element) {
        // Close any existing editing
        this.stopEditing();

        this.editingElement = element;
        element.classList.add('editing');
        
        const originalText = element.textContent.trim();
        const fieldType = element.dataset.fieldType || 'text';
        
        // Create input element
        const input = document.createElement(fieldType === 'textarea' ? 'textarea' : 'input');
        input.className = 'edit-input';
        input.value = originalText;
        input.dataset.originalValue = originalText;
        
        if (fieldType === 'textarea') {
            input.rows = 3;
        } else {
            input.type = fieldType === 'email' ? 'email' : 'text';
        }

        // Create controls
        const controls = document.createElement('div');
        controls.className = 'edit-controls';
        controls.innerHTML = `
            <button class="btn btn-success btn-sm btn-save" title="Save">✓</button>
            <button class="btn btn-secondary btn-sm btn-cancel" title="Cancel">✗</button>
        `;

        // Replace content
        element.innerHTML = '';
        element.appendChild(input);
        element.appendChild(controls);

        // Focus input and select text
        input.focus();
        input.select();

        // Setup control handlers
        controls.querySelector('.btn-save').addEventListener('click', () => this.saveEdit());
        controls.querySelector('.btn-cancel').addEventListener('click', () => this.cancelEdit());
        
        // Handle Enter/Escape keys
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEdit();
            }
        });
    }

    async saveEdit() {
        if (!this.editingElement) return;

        const input = this.editingElement.querySelector('.edit-input');
        const newValue = input.value.trim();
        const originalValue = input.dataset.originalValue;

        if (newValue === originalValue) {
            this.cancelEdit();
            return;
        }

        // Show loading state
        const saveBtn = this.editingElement.querySelector('.btn-save');
        const originalSaveHtml = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="loading-spinner"></span>';
        saveBtn.disabled = true;

        try {
            // Get field information
            const fieldName = this.editingElement.dataset.field;
            const recordId = this.editingElement.dataset.recordId;
            const recordType = this.editingElement.dataset.recordType;

            // Prepare update data
            const updateData = { [fieldName]: newValue };

            // Call appropriate API method
            let response;
            switch (recordType) {
                case 'research':
                    response = await window.sobieAPI.updateResearchPaper(recordId, updateData);
                    break;
                case 'program':
                    response = await window.sobieAPI.updateProgram(recordId, updateData);
                    break;
                case 'user':
                    response = await window.sobieAPI.updateUser(recordId, updateData);
                    break;
                case 'conference':
                    response = await window.sobieAPI.updateConference(recordId, updateData);
                    break;
                default:
                    throw new Error('Unknown record type');
            }

            // Update display
            this.editingElement.textContent = newValue;
            this.editingElement.classList.add('fade-in');
            
            // Show success feedback
            this.showToast('Updated successfully', 'success');
            
        } catch (error) {
            console.error('Save failed:', error);
            this.showToast(window.sobieAPI.handleApiError(error, 'saving changes'), 'error');
            
            // Restore original value
            this.editingElement.textContent = originalValue;
        } finally {
            this.stopEditing();
        }
    }

    cancelEdit() {
        if (!this.editingElement) return;

        const input = this.editingElement.querySelector('.edit-input');
        const originalValue = input.dataset.originalValue;

        this.editingElement.textContent = originalValue;
        this.stopEditing();
    }

    stopEditing() {
        if (this.editingElement) {
            this.editingElement.classList.remove('editing');
            this.editingElement = null;
        }
    }

    /* ========================================
       DRAG & DROP
    ======================================== */

    initializeDragAndDrop() {
        // Make research cards draggable
        this.makeDraggable('.research-card');
        
        // Setup drop zones
        this.setupDropZones('.drop-zone');
    }

    makeDraggable(selector) {
        document.addEventListener('dragstart', (e) => {
            const element = e.target.closest(selector);
            if (element) {
                this.draggedElement = element;
                element.classList.add('dragging');
                
                // Set drag data
                const recordId = element.dataset.recordId;
                const recordType = element.dataset.recordType;
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    recordId,
                    recordType,
                    sourceZone: element.closest('.drop-zone')?.dataset.zone
                }));
                
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        document.addEventListener('dragend', (e) => {
            if (this.draggedElement) {
                this.draggedElement.classList.remove('dragging');
                this.draggedElement = null;
            }
        });

        // Make elements draggable
        document.querySelectorAll(selector).forEach(el => {
            el.draggable = true;
        });
    }

    setupDropZones(selector) {
        document.addEventListener('dragover', (e) => {
            const dropZone = e.target.closest(selector);
            if (dropZone) {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            const dropZone = e.target.closest(selector);
            if (dropZone && !dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', (e) => {
            const dropZone = e.target.closest(selector);
            if (dropZone) {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                
                try {
                    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                    this.handleDrop(dropZone, dragData);
                } catch (error) {
                    console.error('Drop failed:', error);
                    this.showToast('Drop operation failed', 'error');
                }
            }
        });
    }

    async handleDrop(dropZone, dragData) {
        const targetZone = dropZone.dataset.zone;
        const sourceZone = dragData.sourceZone;

        if (targetZone === sourceZone) {
            return; // Same zone, no action needed
        }

        try {
            // Show loading state
            const loadingEl = document.createElement('div');
            loadingEl.innerHTML = '<span class="loading-spinner"></span> Moving...';
            dropZone.appendChild(loadingEl);

            // Update the record's category/status
            const updateData = { category: targetZone };
            
            let response;
            switch (dragData.recordType) {
                case 'research':
                    response = await window.sobieAPI.updateResearchPaper(dragData.recordId, updateData);
                    break;
                case 'program':
                    response = await window.sobieAPI.updateProgram(dragData.recordId, updateData);
                    break;
                default:
                    throw new Error('Unsupported record type for drop');
            }

            // Move the element visually
            if (this.draggedElement) {
                dropZone.appendChild(this.draggedElement);
                dropZone.classList.add('has-content');
            }

            this.showToast('Item moved successfully', 'success');

        } catch (error) {
            console.error('Drop operation failed:', error);
            this.showToast(window.sobieAPI.handleApiError(error, 'moving item'), 'error');
        } finally {
            // Remove loading indicator
            const loadingEl = dropZone.querySelector('.loading-spinner')?.parentElement;
            if (loadingEl) {
                loadingEl.remove();
            }
        }
    }

    /* ========================================
       FILTER BUTTONS
    ======================================== */

    initializeFilterButtons() {
        document.addEventListener('click', (e) => {
            const filterBtn = e.target.closest('.filter-btn');
            if (filterBtn) {
                this.toggleFilter(filterBtn);
            }
        });
    }

    toggleFilter(button) {
        const filterValue = button.dataset.filter;
        const isMultiSelect = button.closest('.filter-buttons').dataset.multiSelect === 'true';

        if (button.classList.contains('active')) {
            // Deactivate filter
            button.classList.remove('active');
            this.activeFilters.delete(filterValue);
        } else {
            if (!isMultiSelect) {
                // Single select - clear other filters
                button.parentElement.querySelectorAll('.filter-btn.active').forEach(btn => {
                    btn.classList.remove('active');
                });
                this.activeFilters.clear();
            }
            
            // Activate filter
            button.classList.add('active');
            this.activeFilters.add(filterValue);
        }

        // Update other buttons for visual feedback
        this.updateFilterButtonStates(button.parentElement);
        
        // Apply filters
        this.applyFilters();
    }

    updateFilterButtonStates(container) {
        const buttons = container.querySelectorAll('.filter-btn');
        const hasActiveFilters = this.activeFilters.size > 0;

        buttons.forEach(btn => {
            const isActive = btn.classList.contains('active');
            
            if (hasActiveFilters && !isActive) {
                btn.classList.add('deselected');
            } else {
                btn.classList.remove('deselected');
            }
        });
    }

    async applyFilters() {
        const filtersArray = Array.from(this.activeFilters);
        const filterableElements = document.querySelectorAll('[data-filterable]');

        if (filtersArray.length === 0) {
            // Show all elements
            filterableElements.forEach(el => {
                el.style.display = '';
                el.classList.add('fade-in');
            });
            return;
        }

        // Filter elements
        filterableElements.forEach(el => {
            const elementFilters = el.dataset.filterable.split(',').map(f => f.trim());
            const matches = filtersArray.some(filter => elementFilters.includes(filter));
            
            if (matches) {
                el.style.display = '';
                el.classList.add('fade-in');
            } else {
                el.style.display = 'none';
                el.classList.remove('fade-in');
            }
        });

        // Update result count if counter exists
        const counter = document.querySelector('.results-counter');
        if (counter) {
            const visibleCount = Array.from(filterableElements).filter(el => 
                el.style.display !== 'none'
            ).length;
            counter.textContent = `${visibleCount} items`;
        }
    }

    /* ========================================
       MOBILE NAVIGATION
    ======================================== */

    initializeMobileNavigation() {
        // Highlight current page in mobile nav
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.mobile-bottom-nav .nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath || (currentPath === '/' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    /* ========================================
       TREE STRUCTURES
    ======================================== */

    initializeTreeStructures() {
        document.addEventListener('click', (e) => {
            const toggle = e.target.closest('.tree-toggle');
            if (toggle) {
                this.toggleTreeNode(toggle);
            }
        });

        // Initialize tree state
        document.querySelectorAll('.tree-toggle').forEach(toggle => {
            const isExpanded = toggle.dataset.expanded === 'true';
            this.setTreeNodeState(toggle, isExpanded);
        });
    }

    toggleTreeNode(toggle) {
        const isExpanded = toggle.classList.contains('expanded');
        this.setTreeNodeState(toggle, !isExpanded);
    }

    setTreeNodeState(toggle, expanded) {
        const children = toggle.parentElement.querySelector('.tree-children');
        
        if (expanded) {
            toggle.classList.add('expanded');
            toggle.classList.remove('collapsed');
            if (children) {
                children.classList.remove('collapsed');
            }
        } else {
            toggle.classList.remove('expanded');
            toggle.classList.add('collapsed');
            if (children) {
                children.classList.add('collapsed');
            }
        }
        
        toggle.dataset.expanded = expanded;
    }

    /* ========================================
       SEARCH FUNCTIONALITY
    ======================================== */

    initializeSearchFunctionality() {
        const searchInputs = document.querySelectorAll('[data-search]');
        
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = setTimeout(() => {
                    this.performSearch(e.target);
                }, 300);
            });
        });
    }

    async performSearch(input) {
        const query = input.value.trim();
        const searchType = input.dataset.search;
        const resultsContainer = document.querySelector(input.dataset.results);

        if (!resultsContainer) return;

        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }

        // Show loading
        resultsContainer.innerHTML = '<div class="p-3"><span class="loading-spinner"></span> Searching...</div>';

        try {
            let results;
            switch (searchType) {
                case 'authors':
                    results = await window.sobieAPI.searchAuthors(query);
                    break;
                case 'institutions':
                    results = await window.sobieAPI.searchInstitutions(query);
                    break;
                case 'keywords':
                    results = await window.sobieAPI.searchKeywords(query);
                    break;
                case 'general':
                    results = await window.sobieAPI.search(query);
                    break;
                default:
                    throw new Error('Unknown search type');
            }

            this.renderSearchResults(resultsContainer, results, searchType);

        } catch (error) {
            console.error('Search failed:', error);
            resultsContainer.innerHTML = `
                <div class="p-3 text-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Search failed. Please try again.
                </div>
            `;
        }
    }

    renderSearchResults(container, results, searchType) {
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="p-3 text-muted">No results found</div>';
            return;
        }

        const items = results.map(result => {
            switch (searchType) {
                case 'authors':
                    return `
                        <div class="search-result-item p-2 border-bottom clickable-author" 
                             data-author-id="${result._id}">
                            <strong>${result.name}</strong>
                            ${result.institution ? `<br><small class="text-muted">${result.institution}</small>` : ''}
                        </div>
                    `;
                case 'institutions':
                    return `
                        <div class="search-result-item p-2 border-bottom clickable-institution" 
                             data-institution-id="${result._id}">
                            <strong>${result.name}</strong>
                            ${result.location ? `<br><small class="text-muted">${result.location}</small>` : ''}
                        </div>
                    `;
                case 'keywords':
                    return `
                        <div class="search-result-item p-2 border-bottom clickable-keyword" 
                             data-keyword="${result.keyword}">
                            <span class="keyword-tag">${result.keyword}</span>
                            <small class="text-muted ms-2">(${result.count} papers)</small>
                        </div>
                    `;
                default:
                    return `
                        <div class="search-result-item p-2 border-bottom" 
                             data-result-id="${result._id}">
                            <strong>${result.title}</strong>
                            <br><small class="text-muted">${result.type}</small>
                        </div>
                    `;
            }
        }).join('');

        container.innerHTML = items;

        // Add click handlers for search results
        container.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.search-result-item');
            if (resultItem) {
                this.handleSearchResultClick(resultItem, searchType);
            }
        });
    }

    handleSearchResultClick(item, searchType) {
        // Handle different types of search result clicks
        switch (searchType) {
            case 'authors':
                const authorId = item.dataset.authorId;
                this.filterByAuthor(authorId);
                break;
            case 'institutions':
                const institutionId = item.dataset.institutionId;
                this.filterByInstitution(institutionId);
                break;
            case 'keywords':
                const keyword = item.dataset.keyword;
                this.filterByKeyword(keyword);
                break;
            default:
                const resultId = item.dataset.resultId;
                window.location.href = `/view.html?id=${resultId}`;
        }
    }

    /* ========================================
       UTILITY METHODS
    ======================================== */

    initializeTooltips() {
        // Simple tooltip implementation
        document.addEventListener('mouseenter', (e) => {
            const element = e.target.closest('[title]');
            if (element && !element.dataset.tooltipInitialized) {
                element.dataset.tooltipInitialized = 'true';
                // Bootstrap tooltips would be initialized here if using Bootstrap JS
            }
        });
    }

    showToast(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1050';
            document.body.appendChild(container);
        }

        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        onclick="this.closest('.toast').remove()"></button>
            </div>
        `;

        container.appendChild(toast);

        // Auto-remove toast
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    handleGlobalKeyboard(e) {
        // Global keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    if (this.editingElement) {
                        this.saveEdit();
                    }
                    break;
                case 'f':
                    e.preventDefault();
                    const searchInput = document.querySelector('[data-search="general"]');
                    if (searchInput) {
                        searchInput.focus();
                    }
                    break;
            }
        }

        if (e.key === 'Escape') {
            if (this.editingElement) {
                this.cancelEdit();
            }
        }
    }

    handleDocumentClick(e) {
        // Close editing if clicking outside
        if (this.editingElement && !this.editingElement.contains(e.target)) {
            this.cancelEdit();
        }
    }

    handleWindowResize() {
        // Handle responsive adjustments
        // This could include adjusting card layouts, etc.
    }

    /* ========================================
       PUBLIC API METHODS
    ======================================== */

    filterByAuthor(authorId) {
        // Implementation for filtering by author
        console.log('Filter by author:', authorId);
    }

    filterByInstitution(institutionId) {
        // Implementation for filtering by institution
        console.log('Filter by institution:', institutionId);
    }

    filterByKeyword(keyword) {
        // Implementation for filtering by keyword
        console.log('Filter by keyword:', keyword);
    }

    refreshCards() {
        // Re-initialize drag and drop for new cards
        this.makeDraggable('.research-card');
    }

    clearAllFilters() {
        this.activeFilters.clear();
        document.querySelectorAll('.filter-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.filter-btn.deselected').forEach(btn => {
            btn.classList.remove('deselected');
        });
        this.applyFilters();
    }
}

// Initialize components when DOM is ready
window.sobieComponents = new SobieComponents();

// Note: Using window assignment instead of ES6 export for browser compatibility

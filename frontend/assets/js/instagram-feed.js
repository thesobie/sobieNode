// Instagram Feed Integration for SOBIE Conference Platform
// This is a placeholder for future Instagram API integration

class InstagramFeed {
    constructor() {
        this.apiKey = null; // Would need actual Instagram API key
        this.accessToken = null; // Would need Instagram access token
    }

    /**
     * Mock Instagram posts for testing
     * In production, this would call the Instagram Basic Display API
     */
    async getMockPosts(hashtag, count = 6) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockPosts = [
            {
                id: '1',
                media_type: 'IMAGE',
                media_url: 'https://via.placeholder.com/300x300/007bff/ffffff?text=SOBIE+2025',
                permalink: 'https://instagram.com/p/mock1',
                caption: `Excited for #${hashtag}! Looking forward to presenting our latest research. 🔬📊 #biomedicalengineering #research`,
                timestamp: new Date().toISOString(),
                thumbnail_url: 'https://via.placeholder.com/150x150/007bff/ffffff?text=SOBIE',
                username: 'researcher_jane'
            },
            {
                id: '2',
                media_type: 'IMAGE', 
                media_url: 'https://via.placeholder.com/300x300/28a745/ffffff?text=Lab+Work',
                permalink: 'https://instagram.com/p/mock2',
                caption: `Final preparations for #${hashtag} presentation! 🧪⚗️ #lablife #science`,
                timestamp: new Date().toISOString(),
                thumbnail_url: 'https://via.placeholder.com/150x150/28a745/ffffff?text=Lab',
                username: 'bio_engineer_mike'
            },
            {
                id: '3',
                media_type: 'IMAGE',
                media_url: 'https://via.placeholder.com/300x300/ffc107/ffffff?text=Team+Photo',
                permalink: 'https://instagram.com/p/mock3',
                caption: `Our research team is ready for #${hashtag}! Can't wait to network with fellow researchers. 👥🎓`,
                timestamp: new Date().toISOString(),
                thumbnail_url: 'https://via.placeholder.com/150x150/ffc107/ffffff?text=Team',
                username: 'university_research'
            }
        ];

        return mockPosts.slice(0, count);
    }

    /**
     * Render Instagram posts in the marquee
     */
    async renderFeed(containerId, hashtag, count = 3) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('Instagram feed container not found:', containerId);
            return;
        }

        try {
            // Show loading state
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="bg-white bg-opacity-25 rounded p-3">
                        <div class="spinner-border spinner-border-sm text-white mb-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <div class="small text-white">Loading #${hashtag}...</div>
                    </div>
                </div>
            `;

            const posts = await this.getMockPosts(hashtag, count);
            
            if (posts && posts.length > 0) {
                container.innerHTML = posts.map(post => `
                    <div class="col-4">
                        <a href="${post.permalink}" target="_blank" class="text-decoration-none">
                            <div class="bg-white bg-opacity-25 rounded p-2 text-center h-100" 
                                 style="min-height: 100px; transition: all 0.3s ease;">
                                <div class="instagram-thumbnail mb-2" 
                                     style="width: 40px; height: 40px; background: url('${post.thumbnail_url}') center/cover; 
                                            border-radius: 8px; margin: 0 auto; border: 2px solid rgba(255,255,255,0.3);"></div>
                                <div class="small text-white fw-medium">@${post.username}</div>
                                <div class="small text-white-50" style="font-size: 0.7rem;">${this.truncateCaption(post.caption)}</div>
                            </div>
                        </a>
                    </div>
                `).join('');

                // Add hover effects
                container.querySelectorAll('.bg-white').forEach(element => {
                    element.addEventListener('mouseenter', () => {
                        element.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                        element.style.transform = 'translateY(-2px)';
                    });
                    element.addEventListener('mouseleave', () => {
                        element.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                        element.style.transform = 'translateY(0)';
                    });
                });

            } else {
                // Fallback content
                container.innerHTML = `
                    <div class="col-4">
                        <div class="bg-white bg-opacity-25 rounded p-2 text-center">
                            <i class="bi bi-instagram fs-4 mb-2"></i>
                            <div class="small">Follow</div>
                            <div class="small">#${hashtag}</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="bg-white bg-opacity-25 rounded p-2 text-center">
                            <i class="bi bi-camera fs-4 mb-2"></i>
                            <div class="small">Share your</div>
                            <div class="small">moments</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="bg-white bg-opacity-25 rounded p-2 text-center">
                            <i class="bi bi-people fs-4 mb-2"></i>
                            <div class="small">Connect</div>
                            <div class="small">with peers</div>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading Instagram feed:', error);
            // Show error state with fallback content
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="bg-white bg-opacity-25 rounded p-3">
                        <i class="bi bi-instagram fs-4 mb-2"></i>
                        <div class="small">Follow #${hashtag}</div>
                        <div class="small text-white-50">on Instagram</div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Truncate caption for display
     */
    truncateCaption(caption, maxLength = 30) {
        if (!caption) return '';
        const cleanCaption = caption.replace(/#\w+/g, '').replace(/@\w+/g, '').trim();
        return cleanCaption.length > maxLength ? 
            cleanCaption.substring(0, maxLength) + '...' : 
            cleanCaption;
    }

    /**
     * Future method for real Instagram API integration
     * This would require:
     * 1. Instagram Basic Display API setup
     * 2. App registration with Instagram
     * 3. User authentication flow
     * 4. Access token management
     */
    async getRealPosts(hashtag, accessToken) {
        // Implementation would go here for real Instagram API
        // const response = await fetch(`https://graph.instagram.com/me/media?fields=id,media_type,media_url,permalink,caption,timestamp&access_token=${accessToken}`);
        // return await response.json();
        throw new Error('Real Instagram API integration not implemented yet');
    }
}

// Export for use in main application
window.InstagramFeed = InstagramFeed;

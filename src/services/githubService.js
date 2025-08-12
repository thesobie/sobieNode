const { Octokit } = require('@octokit/rest');

class GitHubService {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      userAgent: 'SOBIE-Conference-App v1.0.0'
    });
    
    this.owner = 'thesobie';
    this.repo = 'sobieNode';
  }

  /**
   * Create a GitHub issue from a bug report
   * @param {Object} bugReport - The bug report object
   * @returns {Object} GitHub issue data
   */
  async createIssueFromBugReport(bugReport) {
    try {
      if (!process.env.GITHUB_TOKEN) {
        throw new Error('GitHub token not configured');
      }

      // Generate issue title
      const title = `[Bug Report] ${bugReport.title}`;
      
      // Generate issue body
      const body = bugReport.generateGithubIssueBody();
      
      // Generate labels
      const labels = bugReport.generateGithubLabels();
      
      // Create the issue
      const response = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        labels,
        assignees: this.getDefaultAssignees(bugReport)
      });

      return {
        success: true,
        issue: {
          number: response.data.number,
          url: response.data.html_url,
          id: response.data.id,
          state: response.data.state,
          createdAt: response.data.created_at
        }
      };
    } catch (error) {
      console.error('Error creating GitHub issue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update a GitHub issue
   * @param {Number} issueNumber - The GitHub issue number
   * @param {Object} updates - Updates to apply
   * @returns {Object} Result
   */
  async updateIssue(issueNumber, updates) {
    try {
      const response = await this.octokit.rest.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        ...updates
      });

      return {
        success: true,
        issue: response.data
      };
    } catch (error) {
      console.error('Error updating GitHub issue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Close a GitHub issue
   * @param {Number} issueNumber - The GitHub issue number
   * @param {String} reason - Reason for closing
   * @returns {Object} Result
   */
  async closeIssue(issueNumber, reason = '') {
    try {
      // Add a comment with the reason if provided
      if (reason) {
        await this.addCommentToIssue(issueNumber, `**Issue resolved:** ${reason}`);
      }

      const response = await this.octokit.rest.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        state: 'closed'
      });

      return {
        success: true,
        issue: response.data
      };
    } catch (error) {
      console.error('Error closing GitHub issue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add a comment to a GitHub issue
   * @param {Number} issueNumber - The GitHub issue number
   * @param {String} comment - Comment text
   * @returns {Object} Result
   */
  async addCommentToIssue(issueNumber, comment) {
    try {
      const response = await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: comment
      });

      return {
        success: true,
        comment: response.data
      };
    } catch (error) {
      console.error('Error adding comment to GitHub issue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add labels to a GitHub issue
   * @param {Number} issueNumber - The GitHub issue number
   * @param {Array} labels - Array of label names
   * @returns {Object} Result
   */
  async addLabelsToIssue(issueNumber, labels) {
    try {
      const response = await this.octokit.rest.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        labels
      });

      return {
        success: true,
        labels: response.data
      };
    } catch (error) {
      console.error('Error adding labels to GitHub issue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get issue details from GitHub
   * @param {Number} issueNumber - The GitHub issue number
   * @returns {Object} Issue details
   */
  async getIssue(issueNumber) {
    try {
      const response = await this.octokit.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber
      });

      return {
        success: true,
        issue: response.data
      };
    } catch (error) {
      console.error('Error getting GitHub issue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search for existing issues
   * @param {String} query - Search query
   * @returns {Object} Search results
   */
  async searchIssues(query) {
    try {
      const response = await this.octokit.rest.search.issuesAndPullRequests({
        q: `${query} repo:${this.owner}/${this.repo} is:issue`,
        sort: 'created',
        order: 'desc'
      });

      return {
        success: true,
        issues: response.data.items,
        totalCount: response.data.total_count
      };
    } catch (error) {
      console.error('Error searching GitHub issues:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if there's a similar existing issue
   * @param {Object} bugReport - The bug report to check
   * @returns {Object} Similar issues if found
   */
  async findSimilarIssues(bugReport) {
    try {
      // Search for issues with similar title or keywords
      const searchTerms = bugReport.title.split(' ').filter(word => word.length > 3).slice(0, 3);
      const query = searchTerms.join(' ') + ` label:bug`;
      
      const result = await this.searchIssues(query);
      
      if (result.success && result.issues.length > 0) {
        // Filter for open issues only
        const openIssues = result.issues.filter(issue => issue.state === 'open');
        return {
          success: true,
          similarIssues: openIssues.slice(0, 5), // Return top 5 similar issues
          hasSimilar: openIssues.length > 0
        };
      }
      
      return {
        success: true,
        similarIssues: [],
        hasSimilar: false
      };
    } catch (error) {
      console.error('Error finding similar issues:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get default assignees based on bug category
   * @param {Object} bugReport - The bug report
   * @returns {Array} Array of GitHub usernames to assign
   */
  getDefaultAssignees(bugReport) {
    // Map categories to default assignees
    const assigneeMap = {
      'ui_ux': [],
      'functionality': [],
      'performance': [],
      'data': [],
      'security': [],
      'mobile': [],
      'integration': [],
      'other': []
    };

    // Return assignees based on category, or empty array for automatic assignment
    return assigneeMap[bugReport.category] || [];
  }

  /**
   * Create repository labels if they don't exist
   * @returns {Object} Result
   */
  async ensureLabelsExist() {
    const requiredLabels = [
      { name: 'bug', color: 'd73a4a', description: 'Something isn\'t working' },
      { name: 'user-reported', color: '0075ca', description: 'Reported by application users' },
      { name: 'category:ui_ux', color: 'e99695', description: 'User interface or user experience issues' },
      { name: 'category:functionality', color: 'f9d0c4', description: 'Feature functionality problems' },
      { name: 'category:performance', color: 'fef2c0', description: 'Performance and speed issues' },
      { name: 'category:data', color: 'c2e0c6', description: 'Data consistency or corruption issues' },
      { name: 'category:security', color: 'bfd4f2', description: 'Security vulnerabilities' },
      { name: 'category:mobile', color: 'd4c5f9', description: 'Mobile-specific issues' },
      { name: 'category:integration', color: 'c5def5', description: 'Third-party integration issues' },
      { name: 'category:other', color: 'ededed', description: 'Other uncategorized issues' },
      { name: 'severity:low', color: '28a745', description: 'Low severity issue' },
      { name: 'severity:medium', color: 'ffc107', description: 'Medium severity issue' },
      { name: 'severity:high', color: 'fd7e14', description: 'High severity issue' },
      { name: 'severity:critical', color: 'dc3545', description: 'Critical severity issue' },
      { name: 'priority:high', color: 'ff6b6b', description: 'High priority' },
      { name: 'priority:urgent', color: 'e74c3c', description: 'Urgent priority' }
    ];

    try {
      for (const label of requiredLabels) {
        try {
          await this.octokit.rest.issues.createLabel({
            owner: this.owner,
            repo: this.repo,
            name: label.name,
            color: label.color,
            description: label.description
          });
          console.log(`Created label: ${label.name}`);
        } catch (error) {
          if (error.status === 422) {
            // Label already exists, that's okay
            console.log(`Label ${label.name} already exists`);
          } else {
            console.error(`Error creating label ${label.name}:`, error.message);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error ensuring labels exist:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate GitHub configuration
   * @returns {Object} Validation result
   */
  async validateConfiguration() {
    try {
      if (!process.env.GITHUB_TOKEN) {
        return {
          valid: false,
          error: 'GITHUB_TOKEN environment variable not set'
        };
      }

      // Test API access by getting repository info
      const response = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo
      });

      return {
        valid: true,
        repository: {
          name: response.data.name,
          fullName: response.data.full_name,
          url: response.data.html_url,
          hasIssues: response.data.has_issues
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = new GitHubService();

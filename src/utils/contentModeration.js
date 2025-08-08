const profanityList = require('./profanityList');

/**
 * Content Moderation Utilities for SOBIE Conference Platform
 * 
 * This module provides content filtering and validation for user-generated content
 * to maintain professional standards appropriate for an academic conference.
 */

class ContentModerator {
  constructor() {
    // Basic profanity patterns (expandable)
    this.profanityPatterns = [
      // Common profanity patterns - add more as needed
      /\b(damn|hell|crap|shit|fuck|bitch|ass|bastard)\b/gi,
      // Academic-inappropriate terms
      /\b(stupid|idiot|moron|dumb|retard)\b/gi,
      // Spam-like patterns
      /\b(viagra|casino|lottery|money\s*back|click\s*here|free\s*money)\b/gi,
      // Excessive repetition
      /(.)\1{4,}/g, // 5+ repeated characters
      /\b(\w+)\s+\1\s+\1\b/gi // repeated words 3+ times
    ];

    // Academic professionalism patterns
    this.unprofessionalPatterns = [
      /\b(lol|lmao|wtf|omg|brb|ttyl|u\b|ur\b|2\b|4\b)\b/gi, // text speak
      /[!]{3,}/g, // excessive exclamation
      /[?]{3,}/g, // excessive question marks
      /[A-Z]{10,}/g // excessive caps (10+ consecutive caps)
    ];

    // Contact info patterns (to prevent sharing personal info inappropriately)
    this.personalInfoPatterns = [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // phone numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
      /\b\d{1,5}\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court)\b/gi // addresses
    ];
  }

  /**
   * Check if content contains profanity or inappropriate language
   * @param {string} text - Text to check
   * @returns {object} - { isClean: boolean, violations: string[], cleanedText: string }
   */
  checkContent(text) {
    if (!text || typeof text !== 'string') {
      return { isClean: true, violations: [], cleanedText: text };
    }

    const violations = [];
    let cleanedText = text;

    // Check for profanity
    this.profanityPatterns.forEach((pattern, index) => {
      if (pattern.test(text)) {
        violations.push('inappropriate_language');
        cleanedText = cleanedText.replace(pattern, match => '*'.repeat(match.length));
      }
    });

    // Check for unprofessional language
    this.unprofessionalPatterns.forEach((pattern) => {
      if (pattern.test(text)) {
        violations.push('unprofessional_language');
      }
    });

    // Check for personal info in inappropriate fields
    this.personalInfoPatterns.forEach((pattern) => {
      if (pattern.test(text)) {
        violations.push('personal_information');
      }
    });

    // Check for HTML/script injection attempts
    if (/<script|<iframe|javascript:|data:/gi.test(text)) {
      violations.push('potential_injection');
    }

    const uniqueViolations = [...new Set(violations)];
    
    return {
      isClean: uniqueViolations.length === 0,
      violations: uniqueViolations,
      cleanedText: cleanedText,
      severity: this.calculateSeverity(uniqueViolations)
    };
  }

  /**
   * Calculate severity level of violations
   * @param {string[]} violations 
   * @returns {string} - 'low', 'medium', 'high'
   */
  calculateSeverity(violations) {
    if (violations.includes('potential_injection')) return 'high';
    if (violations.includes('inappropriate_language')) return 'medium';
    if (violations.includes('personal_information')) return 'medium';
    if (violations.includes('unprofessional_language')) return 'low';
    return 'none';
  }

  /**
   * Validate array of strings (like interests, expertise areas)
   * @param {string[]} items 
   * @returns {object}
   */
  checkArray(items) {
    if (!Array.isArray(items)) {
      return { isClean: true, violations: [], cleanedItems: items };
    }

    const violations = [];
    const cleanedItems = [];

    items.forEach(item => {
      const result = this.checkContent(item);
      if (!result.isClean) {
        violations.push(...result.violations);
      }
      cleanedItems.push(result.cleanedText);
    });

    return {
      isClean: violations.length === 0,
      violations: [...new Set(violations)],
      cleanedItems: cleanedItems
    };
  }

  /**
   * Moderate social links for appropriate content
   * @param {object[]} socialLinks 
   * @returns {object}
   */
  checkSocialLinks(socialLinks) {
    if (!Array.isArray(socialLinks)) {
      return { isClean: true, violations: [], cleanedLinks: socialLinks };
    }

    const violations = [];
    const cleanedLinks = [];

    socialLinks.forEach(link => {
      const linkViolations = [];
      
      // Check title
      const titleCheck = this.checkContent(link.title);
      if (!titleCheck.isClean) {
        linkViolations.push(...titleCheck.violations);
      }

      // Check description
      const descCheck = this.checkContent(link.description);
      if (!descCheck.isClean) {
        linkViolations.push(...descCheck.violations);
      }

      // Check custom category
      const categoryCheck = this.checkContent(link.customCategory);
      if (!categoryCheck.isClean) {
        linkViolations.push(...categoryCheck.violations);
      }

      // Check URL for suspicious patterns
      if (link.url && this.isSuspiciousUrl(link.url)) {
        linkViolations.push('suspicious_url');
      }

      violations.push(...linkViolations);

      cleanedLinks.push({
        ...link,
        title: titleCheck.cleanedText,
        description: descCheck.cleanedText,
        customCategory: categoryCheck.cleanedText
      });
    });

    return {
      isClean: violations.length === 0,
      violations: [...new Set(violations)],
      cleanedLinks: cleanedLinks
    };
  }

  /**
   * Check if URL is suspicious
   * @param {string} url 
   * @returns {boolean}
   */
  isSuspiciousUrl(url) {
    const suspiciousPatterns = [
      /bit\.ly|tinyurl|t\.co|goo\.gl|short\.link/i, // URL shorteners (could hide malicious links)
      /\.(tk|ml|ga|cf)$/i, // Free suspicious TLDs
      /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i, // IP addresses instead of domains
      /(casino|poker|gambling|viagra|pharmacy|loan|crypto)/i // Common spam topics
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Generate user-friendly error messages for violations
   * @param {string[]} violations 
   * @returns {string[]}
   */
  getViolationMessages(violations) {
    const messages = {
      'inappropriate_language': 'Content contains inappropriate language for a professional academic environment.',
      'unprofessional_language': 'Please use professional language appropriate for an academic conference.',
      'personal_information': 'Please avoid including personal contact information in this field.',
      'potential_injection': 'Content contains potentially harmful code and cannot be accepted.',
      'suspicious_url': 'URL appears suspicious and may not be appropriate for professional profiles.'
    };

    return violations.map(violation => messages[violation] || 'Content does not meet community standards.');
  }
}

module.exports = new ContentModerator();

const ContentModerator = require('../../src/utils/contentModeration');

describe('Content Moderation', () => {
  describe('checkContent', () => {
    test('should pass clean academic content', () => {
      const cleanText = 'I am a professor of computer science with expertise in machine learning.';
      const result = ContentModerator.checkContent(cleanText);
      
      expect(result.isClean).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.severity).toBe('none');
    });

    test('should detect inappropriate language', () => {
      const dirtyText = 'This is some shit content with fucking bad language.';
      const result = ContentModerator.checkContent(dirtyText);
      
      expect(result.isClean).toBe(false);
      expect(result.violations).toContain('inappropriate_language');
      expect(result.severity).toBe('medium');
      expect(result.cleanedText).toContain('****');
    });

    test('should detect unprofessional language', () => {
      const unprofessionalText = 'lol this is so cool omg wtf!!!!!!';
      const result = ContentModerator.checkContent(unprofessionalText);
      
      expect(result.isClean).toBe(false);
      expect(result.violations).toContain('unprofessional_language');
      expect(result.severity).toBe('low');
    });

    test('should detect personal information', () => {
      const personalText = 'Call me at 555-123-4567 or email john@example.com';
      const result = ContentModerator.checkContent(personalText);
      
      expect(result.isClean).toBe(false);
      expect(result.violations).toContain('personal_information');
      expect(result.severity).toBe('medium');
    });

    test('should detect potential injection attempts', () => {
      const maliciousText = 'Check out this <script>alert("hack")</script> cool site';
      const result = ContentModerator.checkContent(maliciousText);
      
      expect(result.isClean).toBe(false);
      expect(result.violations).toContain('potential_injection');
      expect(result.severity).toBe('high');
    });
  });

  describe('checkArray', () => {
    test('should pass clean array of interests', () => {
      const cleanInterests = ['machine learning', 'artificial intelligence', 'data science'];
      const result = ContentModerator.checkArray(cleanInterests);
      
      expect(result.isClean).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should detect inappropriate content in arrays', () => {
      const dirtyInterests = ['machine learning', 'fucking computers', 'data science'];
      const result = ContentModerator.checkArray(dirtyInterests);
      
      expect(result.isClean).toBe(false);
      expect(result.violations).toContain('inappropriate_language');
      expect(result.cleanedItems[1]).toContain('*******');
    });
  });

  describe('checkSocialLinks', () => {
    test('should pass clean social links', () => {
      const cleanLinks = [
        {
          url: 'https://github.com/johndoe',
          title: 'My GitHub Profile',
          description: 'Repository of my research code',
          category: 'github',
          customCategory: '',
          isPublic: true
        }
      ];
      const result = ContentModerator.checkSocialLinks(cleanLinks);
      
      expect(result.isClean).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should detect inappropriate content in social links', () => {
      const dirtyLinks = [
        {
          url: 'https://example.com',
          title: 'Some fucking awesome site',
          description: 'This is a damn good resource',
          category: 'other',
          customCategory: 'shit category',
          isPublic: true
        }
      ];
      const result = ContentModerator.checkSocialLinks(dirtyLinks);
      
      expect(result.isClean).toBe(false);
      expect(result.violations).toContain('inappropriate_language');
    });

    test('should detect suspicious URLs', () => {
      const suspiciousLinks = [
        {
          url: 'https://bit.ly/suspicious',
          title: 'My Profile',
          description: 'Check this out',
          category: 'website',
          customCategory: '',
          isPublic: true
        }
      ];
      const result = ContentModerator.checkSocialLinks(suspiciousLinks);
      
      expect(result.isClean).toBe(false);
      expect(result.violations).toContain('suspicious_url');
    });
  });

  describe('getViolationMessages', () => {
    test('should return user-friendly error messages', () => {
      const violations = ['inappropriate_language', 'unprofessional_language'];
      const messages = ContentModerator.getViolationMessages(violations);
      
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('inappropriate language');
      expect(messages[1]).toContain('professional language');
    });
  });
});

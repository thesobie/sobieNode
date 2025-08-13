const mongoose = require('mongoose');
const User = require('../../src/models/User');
const connectDB = require('../../src/config/database');

describe('User Content Moderation Integration', () => {
  beforeAll(async () => {
    try {
      await connectDB();
    } catch (err) {
      console.error('Test DB connection failed:', err);
      throw err;
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  test('should allow user with clean content to save', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: {
        firstName: 'John',
        lastName: 'Doe'
      },
      userType: 'academic',
      affiliation: {
        organization: 'University of Example'
      },
      profile: {
        bio: 'I am a computer science professor with expertise in machine learning.',
        interests: ['machine learning', 'artificial intelligence'],
        expertiseAreas: ['data science', 'neural networks']
      }
    };

    const user = new User(userData);
    await expect(user.save()).resolves.toBeDefined();
  });

  test('should reject user with high-severity inappropriate content', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: {
        firstName: 'John',
        lastName: 'Doe'
      },
      userType: 'academic',
      affiliation: {
        organization: 'University of Example'
      },
      profile: {
        bio: 'This is some <script>alert("hack")</script> malicious content.',
        interests: ['machine learning']
      }
    };

    const user = new User(userData);
    await expect(user.save()).rejects.toThrow(/Content moderation failed/);
  });

  test('should clean medium-severity inappropriate content and save', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: {
        firstName: 'John',
        lastName: 'Doe'
      },
      userType: 'academic',
      affiliation: {
        organization: 'University of Example'
      },
      profile: {
        bio: 'I am a damn good professor with expertise in fucking awesome machine learning.',
        interests: ['machine learning', 'artificial intelligence']
      }
    };

    const user = new User(userData);
    await user.save();
    
    // Bio should be cleaned (profanity replaced with asterisks)
    expect(user.profile.bio).toContain('****');
    expect(user.profile.bio).not.toContain('damn');
    expect(user.profile.bio).not.toContain('fucking');
  });

  test('should reject social links with high-severity violations', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: {
        firstName: 'John',
        lastName: 'Doe'
      },
      userType: 'academic',
      affiliation: {
        organization: 'University of Example'
      },
      profile: {
        socialLinks: [
          {
            url: 'https://example.com',
            title: 'Check this <script>alert("hack")</script> out',
            description: 'My profile',
            category: 'website'
          }
        ]
      }
    };

    const user = new User(userData);
    await expect(user.save()).rejects.toThrow(/Content moderation failed/);
  });

  test('should clean custom name fields with inappropriate content', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: {
        firstName: 'John',
        lastName: 'Doe',
        prefix: 'other',
        prefixCustom: 'Damn Dr.',
        suffix: 'other',
        suffixCustom: 'Fucking Ph.D.'
      },
      userType: 'academic',
      affiliation: {
        organization: 'University of Example'
      }
    };

    const user = new User(userData);
    await user.save();
    
    // Custom fields should be cleaned
    expect(user.name.prefixCustom).toContain('****');
    expect(user.name.suffixCustom).toContain('*******');
  });

  test('runContentModerationCheck method should identify violations', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: {
        firstName: 'John',
        lastName: 'Doe'
      },
      userType: 'academic',
      affiliation: {
        organization: 'University of Example'
      },
      profile: {
        bio: 'I study machine learning lol and wtf neural networks.',
        interests: ['damn good AI', 'machine learning']
      }
    };

    const user = new User(userData);
    const moderationResult = user.runContentModerationCheck();
    
    expect(moderationResult.isClean).toBe(false);
    expect(moderationResult.hasWarnings).toBe(true);
    expect(moderationResult.warnings.length).toBeGreaterThan(0);
    expect(moderationResult.userMessages.length).toBeGreaterThan(0);
  });
});

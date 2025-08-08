# Content Moderation System for SOBIE Conference Platform

## Overview

The SOBIE Conference Platform includes a comprehensive content moderation system designed to maintain professional academic standards while preventing inappropriate, harmful, or unprofessional content from being displayed in user profiles and community interactions.

## Features

### 🔍 **Content Detection Categories**

1. **Inappropriate Language Detection**
   - Profanity and vulgar language
   - Offensive terms and slurs
   - Common variations and derivatives (e.g., "fucking", "damned")
   - **Severity**: Medium
   - **Action**: Content is automatically cleaned (replaced with asterisks)

2. **Unprofessional Language Detection**
   - Text speak (lol, omg, wtf, etc.)
   - Excessive punctuation (!!!, ???)
   - Excessive capitalization
   - **Severity**: Low
   - **Action**: Warning logged, content flagged for review

3. **Personal Information Detection**
   - Phone numbers (various formats)
   - Email addresses
   - Physical addresses
   - **Severity**: Medium
   - **Action**: Content flagged, user warned about privacy

4. **Security Threat Detection**
   - Script injection attempts (`<script>`, `<iframe>`)
   - JavaScript execution attempts
   - Data URLs and suspicious protocols
   - **Severity**: High
   - **Action**: Content rejected, save operation fails

5. **Suspicious URL Detection**
   - URL shorteners (bit.ly, tinyurl, etc.)
   - Suspicious TLDs (.tk, .ml, .ga, .cf)
   - IP addresses instead of domain names
   - Common spam-related domains
   - **Severity**: Medium to High
   - **Action**: URLs flagged or rejected

### 🛡️ **Protected User Fields**

The content moderation system automatically checks the following user profile fields:

#### Personal Information
- `profile.bio` - User biography
- `profile.interests` - Array of interest tags
- `profile.expertiseAreas` - Array of expertise areas
- `name.prefixCustom` - Custom title prefix
- `name.suffixCustom` - Custom suffix/credentials
- `name.pronounsCustom` - Custom pronouns
- `nametag.preferredSalutation` - Conference nametag salutation
- `nametag.displayName` - Alternative display name
- `affiliation.jobTitle` - Professional job title
- `affiliation.position` - Position description

#### Social Links
- `profile.socialLinks[].title` - Link titles
- `profile.socialLinks[].description` - Link descriptions
- `profile.socialLinks[].customCategory` - Custom category names
- `profile.socialLinks[].url` - URLs (checked for suspicious patterns)

## 🔧 **Integration Points**

### 1. **Automatic Pre-Save Validation**
Content moderation runs automatically during the Mongoose `pre('save')` middleware:

```javascript
// High-severity violations reject the entire save operation
if (moderationErrors.length > 0) {
  return next(new Error('Content moderation failed: ' + moderationErrors.join(' ')));
}

// Medium-severity violations clean the content automatically
this.profile.bio = bioCheck.cleanedText;
```

### 2. **Manual Content Review**
Administrators can run manual content checks using the User model method:

```javascript
const user = await User.findById(userId);
const moderationResult = user.runContentModerationCheck();

if (!moderationResult.isClean) {
  console.log('Violations found:', moderationResult.violations);
  console.log('User-friendly messages:', moderationResult.userMessages);
}
```

### 3. **API Integration**
Content moderation can be used independently in API endpoints:

```javascript
const contentModerator = require('../utils/contentModeration');

// Check individual content
const result = contentModerator.checkContent(userInput);
if (!result.isClean && result.severity === 'high') {
  return res.status(400).json({ error: 'Content not acceptable' });
}

// Check arrays of content
const arrayResult = contentModerator.checkArray(interests);

// Check social links
const linksResult = contentModerator.checkSocialLinks(socialLinks);
```

## 📋 **Severity Levels and Actions**

| Severity | Trigger Conditions | Automatic Action | User Impact |
|----------|-------------------|------------------|-------------|
| **None** | Clean content | Content saved as-is | No impact |
| **Low** | Unprofessional language | Content saved, flagged for review | No immediate impact |
| **Medium** | Profanity, personal info | Content cleaned automatically | Profanity replaced with asterisks |
| **High** | Script injection, malicious content | Save operation rejected | User receives error message |

## ⚙️ **Configuration and Customization**

### Adding New Profanity Patterns
Edit `src/utils/contentModeration.js`:

```javascript
this.profanityPatterns = [
  /\b(your|new|words|here)\b/gi,
  // Add new patterns here
];
```

### Adding New Suspicious URL Patterns
```javascript
const suspiciousPatterns = [
  /newspam\.domain/i,
  // Add new suspicious domains
];
```

### Customizing Severity Levels
```javascript
calculateSeverity(violations) {
  if (violations.includes('your_new_high_severity_type')) return 'high';
  // Add custom severity rules
}
```

## 🔍 **Testing and Validation**

### Manual Testing
```bash
# Test content moderation directly
node -e "
const cm = require('./src/utils/contentModeration');
console.log(cm.checkContent('test content here'));
"
```

### Automated Testing
Run the included test suite:
```bash
npm test -- --testPathPattern=contentModeration
```

## 🚀 **Production Considerations**

### 1. **Enhanced Word Lists**
For production use, consider integrating with professional content moderation services:
- AWS Comprehend Detect Toxic Content
- Microsoft Content Moderator
- Google Cloud Natural Language API
- OpenAI Moderation API

### 2. **Performance Optimization**
- Cache moderation results for repeated content
- Implement rate limiting for content checks
- Consider async moderation for non-critical content

### 3. **Logging and Monitoring**
```javascript
// Add to your logging system
if (!moderationResult.isClean) {
  logger.warn('Content moderation violation', {
    userId: user._id,
    violations: moderationResult.violations,
    severity: moderationResult.severity,
    field: 'profile.bio'
  });
}
```

### 4. **Administrative Tools**
Consider building admin interfaces for:
- Reviewing flagged content
- Updating moderation rules
- Handling false positives
- User appeals process

## 📚 **API Reference**

### `contentModerator.checkContent(text)`
**Parameters:**
- `text` (string): Content to check

**Returns:**
```javascript
{
  isClean: boolean,
  violations: string[],
  cleanedText: string,
  severity: 'none' | 'low' | 'medium' | 'high'
}
```

### `contentModerator.checkArray(items)`
**Parameters:**
- `items` (string[]): Array of content to check

**Returns:**
```javascript
{
  isClean: boolean,
  violations: string[],
  cleanedItems: string[]
}
```

### `contentModerator.checkSocialLinks(links)`
**Parameters:**
- `links` (object[]): Array of social link objects

**Returns:**
```javascript
{
  isClean: boolean,
  violations: string[],
  cleanedLinks: object[]
}
```

### `user.runContentModerationCheck()`
**Returns:**
```javascript
{
  isClean: boolean,
  hasViolations: boolean,
  hasWarnings: boolean,
  violations: object[],
  warnings: object[],
  userMessages: string[]
}
```

## 🔒 **Privacy and Compliance**

- Content moderation only processes text for pattern matching
- No user content is stored by the moderation system
- Cleaned content maintains user intent while removing inappropriate language
- All moderation actions can be logged for audit purposes
- Users are informed when content is automatically modified

## 📞 **Support and Maintenance**

- Regularly update profanity word lists
- Monitor false positive rates
- Review and update regex patterns
- Consider user feedback for moderation improvements
- Test moderation rules with real-world content samples

---

**Note**: This content moderation system is designed for academic conference environments and prioritizes professional communication standards while balancing user expression with community safety.

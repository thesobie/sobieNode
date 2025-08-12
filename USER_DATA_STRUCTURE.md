# SOBIE User Data Structure Documentation

This document outlines the complete user data object structure for the SOBIE conference platform, including required fields, allowed values, validation rules, and examples.

## Table of Contents
- [Overview](#overview)
- [Authentication Fields](#authentication-fields)
- [Name Information](#name-information)
- [Conference Nametag](#conference-nametag)
- [User Type and Roles](#user-type-and-roles)
- [Affiliation Information](#affiliation-information)
- [Contact Information](#contact-information)
- [Profile Information](#profile-information)
- [Conference Preferences](#conference-preferences)
- [SOBIE Participation Interest](#sobie-participation-interest)
- [Privacy Settings](#privacy-settings)
- [SOBIE History](#sobie-history)
- [System Fields](#system-fields)
- [Virtual Properties](#virtual-properties)
- [Instance Methods](#instance-methods)

## Overview

The User model supports comprehensive profile management for SOBIE conference participants, including authentication, personal information, professional affiliations, conference preferences, and privacy controls. The system includes content moderation, multiple role support, and flexible privacy settings.

---

## Authentication Fields

### `email` (Required)
- **Type**: String
- **Required**: Yes
- **Unique**: Yes
- **Validation**: Must be valid email format
- **Transform**: Converted to lowercase
- **Example**: `"john.doe@university.edu"`

### `secondaryEmail` (Optional)
- **Type**: String
- **Required**: No
- **Validation**: Must be valid email format if provided
- **Transform**: Converted to lowercase
- **Example**: `"j.doe@gmail.com"`

### `password` (Conditional)
- **Type**: String
- **Required**: Yes, unless `magicLinkEnabled` is true
- **Minimum Length**: 6 characters
- **Security**: Excluded from queries by default
- **Example**: `"mySecurePassword123"`

### `magicLinkEnabled` (Optional)
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enables passwordless magic link authentication

### Authentication Tokens (System Fields)
- `magicLinkToken` (String, excluded from queries)
- `magicLinkExpires` (Date, excluded from queries)

---

## Name Information

All name fields are nested under the `name` object:

### `name.firstName` (Required)
- **Type**: String
- **Required**: Yes
- **Max Length**: 50 characters
- **Transform**: Trimmed
- **Example**: `"John"`

### `name.lastName` (Required)
- **Type**: String
- **Required**: Yes
- **Max Length**: 50 characters
- **Transform**: Trimmed
- **Example**: `"Doe"`

### `name.middleName` (Optional)
- **Type**: String
- **Max Length**: 50 characters
- **Transform**: Trimmed
- **Example**: `"Michael"`

### `name.prefix` (Optional)
- **Type**: String
- **Allowed Values**: `['Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.', 'Mx.', 'other', '']`
- **Default**: `''`
- **Example**: `"Dr."`

### `name.prefixCustom` (Conditional)
- **Type**: String
- **Required**: When `prefix` is `'other'`
- **Max Length**: 20 characters
- **Transform**: Trimmed
- **Example**: `"Rev."`

### `name.suffix` (Optional)
- **Type**: String
- **Allowed Values**: `['Jr.', 'Sr.', 'II', 'III', 'IV', 'Ph.D.', 'M.D.', 'J.D.', 'Ed.D.', 'M.A.', 'M.S.', 'B.A.', 'B.S.', 'other', '']`
- **Default**: `''`
- **Example**: `"Ph.D."`

### `name.suffixCustom` (Conditional)
- **Type**: String
- **Required**: When `suffix` is `'other'`
- **Max Length**: 20 characters
- **Transform**: Trimmed
- **Example**: `"Esq."`

### `name.preferredName` (Optional)
- **Type**: String
- **Max Length**: 50 characters
- **Transform**: Trimmed
- **Example**: `"Johnny"`

### `name.pronouns` (Optional)
- **Type**: String
- **Allowed Values**: `['he/him', 'she/her', 'they/them', 'ze/zir', 'prefer not to say', 'other']`
- **Default**: `'prefer not to say'`
- **Example**: `"they/them"`

### `name.pronounsCustom` (Conditional)
- **Type**: String
- **Required**: When `pronouns` is `'other'`
- **Max Length**: 20 characters
- **Transform**: Trimmed
- **Example**: `"xe/xir"`

---

## Conference Nametag

### `nametag.preferredSalutation` (Optional)
- **Type**: String
- **Max Length**: 100 characters
- **Transform**: Trimmed
- **Description**: Used for conference nametag display
- **Example**: `"Dr. Smith"`

### `nametag.displayName` (Optional)
- **Type**: String
- **Max Length**: 100 characters
- **Transform**: Trimmed
- **Description**: Alternative display name for nametag
- **Example**: `"Johnny Doe"`

---

## User Type and Roles

### `userType` (Required)
- **Type**: String
- **Required**: Yes
- **Allowed Values**: `['student', 'academic', 'other']`
- **Example**: `"academic"`

### `studentLevel` (Conditional)
- **Type**: String
- **Required**: When `userType` is `'student'`
- **Allowed Values**: `['undergraduate', 'graduate', 'doctorate']`
- **Example**: `"graduate"`

### `roles` (Required)
- **Type**: Array of Strings
- **Required**: Yes (automatically defaults to `['user']`)
- **Allowed Values**: `['user', 'reviewer', 'committee', 'admin', 'editor', 'conference-chairperson', 'president']`
- **Validation**: Must have at least one role
- **Multiple Roles**: Users can have multiple roles simultaneously
- **Example**: `["editor", "conference-chairperson"]`

---

## Affiliation Information

### `affiliation.organization` (Required)
- **Type**: String
- **Required**: Yes
- **Max Length**: 200 characters
- **Transform**: Trimmed
- **Example**: `"University of Technology"`

### `affiliation.college` (Optional)
- **Type**: String
- **Max Length**: 200 characters
- **Transform**: Trimmed
- **Example**: `"College of Engineering"`

### `affiliation.department` (Optional)
- **Type**: String
- **Max Length**: 200 characters
- **Transform**: Trimmed
- **Example**: `"Computer Science Department"`

### `affiliation.jobTitle` (Optional)
- **Type**: String
- **Max Length**: 100 characters
- **Transform**: Trimmed
- **Example**: `"Associate Professor"`

### `affiliation.position` (Optional)
- **Type**: String
- **Max Length**: 100 characters
- **Transform**: Trimmed
- **Example**: `"Department Head"`

---

## Contact Information

### Phone Numbers (`contact.phones`)
Array of phone objects with the following structure:

#### `contact.phones[].number` (Required)
- **Type**: String
- **Required**: Yes
- **Validation**: Must match phone number pattern
- **Transform**: Trimmed
- **Example**: `"+1-555-123-4567"`

#### `contact.phones[].type` (Required)
- **Type**: String
- **Required**: Yes
- **Allowed Values**: `['mobile', 'work', 'home']`
- **Example**: `"mobile"`

#### `contact.phones[].primary` (Optional)
- **Type**: Boolean
- **Default**: `false`
- **Note**: Only one phone can be marked as primary

### Addresses (`contact.addresses`)
Array of address objects with the following structure:

#### `contact.addresses[].street` (Required)
- **Type**: String
- **Required**: Yes
- **Max Length**: 200 characters
- **Transform**: Trimmed
- **Example**: `"123 University Ave"`

#### `contact.addresses[].city` (Required)
- **Type**: String
- **Required**: Yes
- **Max Length**: 100 characters
- **Transform**: Trimmed
- **Example**: `"Boston"`

#### `contact.addresses[].state` (Required)
- **Type**: String
- **Required**: Yes
- **Max Length**: 50 characters
- **Transform**: Trimmed
- **Example**: `"MA"`

#### `contact.addresses[].zipCode` (Required)
- **Type**: String
- **Required**: Yes
- **Max Length**: 20 characters
- **Transform**: Trimmed
- **Example**: `"02101"`

#### `contact.addresses[].country` (Required)
- **Type**: String
- **Required**: Yes
- **Max Length**: 100 characters
- **Transform**: Trimmed
- **Example**: `"United States"`

#### `contact.addresses[].type` (Required)
- **Type**: String
- **Required**: Yes
- **Allowed Values**: `['work', 'home']`
- **Example**: `"work"`

#### `contact.addresses[].primary` (Optional)
- **Type**: Boolean
- **Default**: `false`
- **Note**: Only one address can be marked as primary

### Professional Links

#### `contact.website` (Optional)
- **Type**: String
- **Validation**: Must be valid URL starting with http:// or https://
- **Transform**: Trimmed
- **Example**: `"https://www.johndoe.com"`

#### `contact.linkedIn` (Optional)
- **Type**: String
- **Transform**: Trimmed
- **Example**: `"https://linkedin.com/in/johndoe"`

#### `contact.orcid` (Optional)
- **Type**: String
- **Validation**: Must match ORCID format (0000-0000-0000-0000)
- **Transform**: Trimmed
- **Example**: `"0000-0002-1825-0097"`

#### `contact.googleScholar` (Optional)
- **Type**: String
- **Transform**: Trimmed
- **Example**: `"https://scholar.google.com/citations?user=ABC123"`

#### `contact.researchGate` (Optional)
- **Type**: String
- **Transform**: Trimmed
- **Example**: `"https://www.researchgate.net/profile/John-Doe"`

#### `contact.academia` (Optional)
- **Type**: String
- **Transform**: Trimmed
- **Example**: `"https://university.academia.edu/JohnDoe"`

---

## Profile Information

### `profile.photo` (Optional)
- **Type**: String
- **Description**: URL/path to uploaded photo
- **Transform**: Trimmed
- **Example**: `"https://storage.example.com/photos/user123.jpg"`

### `profile.bio` (Optional)
- **Type**: String
- **Max Length**: 1000 characters
- **Transform**: Trimmed
- **Content Moderation**: Automatically checked and cleaned
- **Example**: `"Dr. John Doe is an Associate Professor specializing in AI and machine learning..."`

### `profile.interests` (Optional)
- **Type**: Array of Strings
- **Max Items**: 10
- **Content Moderation**: Automatically checked and cleaned
- **Example**: `["Artificial Intelligence", "Machine Learning", "Data Science"]`

### `profile.expertiseAreas` (Optional)
- **Type**: Array of Strings
- **Max Items**: 10
- **Content Moderation**: Automatically checked and cleaned
- **Example**: `["Deep Learning", "Computer Vision", "Natural Language Processing"]`

### Social Links (`profile.socialLinks`)
Array of social link objects with the following structure:

#### `profile.socialLinks[].url` (Required)
- **Type**: String
- **Required**: Yes
- **Validation**: Must be valid URL starting with http:// or https://
- **Transform**: Trimmed
- **Example**: `"https://github.com/johndoe"`

#### `profile.socialLinks[].title` (Required)
- **Type**: String
- **Required**: Yes
- **Max Length**: 100 characters
- **Transform**: Trimmed
- **Example**: `"GitHub Profile"`

#### `profile.socialLinks[].description` (Optional)
- **Type**: String
- **Max Length**: 200 characters
- **Transform**: Trimmed
- **Example**: `"My open source projects"`

#### `profile.socialLinks[].category` (Optional)
- **Type**: String
- **Allowed Values**: `['website', 'portfolio', 'github', 'publication', 'social', 'academic', 'blog', 'other']`
- **Default**: `'other'`
- **Example**: `"github"`

#### `profile.socialLinks[].customCategory` (Conditional)
- **Type**: String
- **Required**: When `category` is `'other'`
- **Max Length**: 50 characters
- **Transform**: Trimmed
- **Example**: `"Research Lab"`

#### `profile.socialLinks[].isPublic` (Optional)
- **Type**: Boolean
- **Default**: `true`
- **Description**: Individual privacy setting for each link

**Validation**: Maximum 10 social links per user

---

## Conference Preferences

### `preferences.accessibility` (Optional)
- **Type**: String
- **Max Length**: 500 characters
- **Transform**: Trimmed
- **Example**: `"Wheelchair accessible seating required"`

### Communication Preferences (`preferences.communicationPreferences`)

#### `preferences.communicationPreferences.email`
- **Type**: Boolean
- **Default**: `true`

#### `preferences.communicationPreferences.sms`
- **Type**: Boolean
- **Default**: `false`

#### `preferences.communicationPreferences.textMessagesOk`
- **Type**: Boolean
- **Default**: `false`

#### `preferences.communicationPreferences.emailCommunications`
- **Type**: Boolean
- **Default**: `true`

#### `preferences.communicationPreferences.newsletter`
- **Type**: Boolean
- **Default**: `true`

### `preferences.newsletter` (Optional)
- **Type**: Boolean
- **Default**: `true`

---

## SOBIE Participation Interest

All fields are Boolean with default `false`:

- `participationInterest.conferenceTrackChair`
- `participationInterest.panelParticipant`
- `participationInterest.moderator`
- `participationInterest.reviewer`
- `participationInterest.socialEventCoordinator`
- `participationInterest.editor`
- `participationInterest.conferenceChairperson`
- `participationInterest.presidentRole`

**Example**:
```json
{
  "conferenceTrackChair": true,
  "panelParticipant": false,
  "moderator": true,
  "reviewer": true,
  "socialEventCoordinator": false,
  "editor": false,
  "conferenceChairperson": false,
  "presidentRole": false
}
```

---

## Privacy Settings

Controls what information is visible to other SOBIE community members.

### `privacySettings.name`
- **Type**: Boolean
- **Default**: `true`

### `privacySettings.photo`
- **Type**: Boolean
- **Default**: `true`

### Contact Information Privacy (`privacySettings.contactInfo`)
- `privacySettings.contactInfo.email` (Boolean, default: `false`)
- `privacySettings.contactInfo.phone` (Boolean, default: `false`)
- `privacySettings.contactInfo.address` (Boolean, default: `false`)

### `privacySettings.bio`
- **Type**: Boolean
- **Default**: `true`

### `privacySettings.socialLinks`
- **Type**: Boolean
- **Default**: `true`

### SOBIE History Privacy (`privacySettings.sobieHistory`)
- `privacySettings.sobieHistory.attendance` (Boolean, default: `true`)
- `privacySettings.sobieHistory.service` (Boolean, default: `true`)
- `privacySettings.sobieHistory.publications` (Boolean, default: `true`)

### `privacySettings.affiliation`
- **Type**: Boolean
- **Default**: `true`

---

## SOBIE History

### Attendance History (`sobieHistory.attendance`)
Array of attendance objects:
- `year` (Number)
- `role` (String) - e.g., "attendee", "presenter", "keynote"
- `sessionsAttended` (Array of Strings)

### Service History (`sobieHistory.service`)
Array of service objects:
- `year` (Number)
- `role` (String) - e.g., "reviewer", "track chair", "committee member"
- `description` (String)

### Publications History (`sobieHistory.publications`)
Array of publication objects:
- `year` (Number)
- `title` (String)
- `type` (String) - e.g., "paper", "poster", "presentation"
- `coAuthors` (Array of Strings)
- `abstract` (String)

---

## System Fields

### Account Status
- `isActive` (Boolean, default: `true`)
- `isEmailVerified` (Boolean, default: `false`)
- `lastLogin` (Date)
- `profileCreatedDate` (Date, default: current date)

### Security
- `loginAttempts` (Number, default: `0`)
- `lockUntil` (Date)
- `emailVerificationToken` (String, excluded from queries)
- `emailVerificationExpires` (Date, excluded from queries)

### Timestamps
- `createdAt` (Date, automatically managed)
- `updatedAt` (Date, automatically managed)

---

## Virtual Properties

These are computed properties that don't exist in the database but are calculated on-the-fly:

### Name Virtuals
- `fullName` - Complete formatted name with prefix/suffix
- `displayNameForNametag` - Name to display on conference nametag
- `username` - Returns the email (used as username)

### Role Checking Virtuals
- `isAdmin` - Boolean indicating admin role
- `isEditor` - Boolean indicating editor role
- `isConferenceChairperson` - Boolean indicating conference chairperson role
- `isPresident` - Boolean indicating president role
- `isReviewer` - Boolean indicating reviewer role
- `isCommitteeMember` - Boolean indicating committee role
- `primaryRole` - Returns highest priority role for display

### Contact Virtuals
- `primaryPhone` - Returns the primary phone number
- `primaryAddress` - Returns the primary address

### Status Virtuals
- `isLocked` - Boolean indicating if account is locked
- `isActiveUser` - Boolean indicating if user logged in within 2 years

---

## Instance Methods

### Role Management
- `hasRole(role)` - Check if user has specific role
- `addRole(role)` - Add role to user (prevents duplicates)
- `removeRole(role)` - Remove role from user (maintains at least 'user' role)
- `getRoleDisplayNames()` - Get formatted role names for display

### Authentication
- `incLoginAttempts()` - Increment failed login attempts (locks after 5 attempts)
- `updateLastLogin()` - Update last login timestamp and reset login attempts

### Profile Management
- `getPublicProfile()` - Get filtered profile based on privacy settings
- `runContentModerationCheck()` - Check profile content for violations

### Security
- `toJSON()` - Transform output to exclude sensitive fields

---

## Example Complete User Object

```json
{
  "email": "sarah.wilson@university.edu",
  "secondaryEmail": "s.wilson@gmail.com",
  "name": {
    "firstName": "Sarah",
    "lastName": "Wilson",
    "prefix": "Dr.",
    "suffix": "Ph.D.",
    "pronouns": "she/her"
  },
  "nametag": {
    "preferredSalutation": "Dr. Sarah Wilson"
  },
  "userType": "academic",
  "roles": ["editor", "conference-chairperson"],
  "affiliation": {
    "organization": "University of Technology",
    "college": "College of Engineering",
    "department": "Computer Science Department",
    "jobTitle": "Associate Professor"
  },
  "contact": {
    "phones": [{
      "number": "+1-555-123-4567",
      "type": "work",
      "primary": true
    }],
    "addresses": [{
      "street": "123 University Ave",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02101",
      "country": "United States",
      "type": "work",
      "primary": true
    }],
    "website": "https://www.sarahwilson.com",
    "orcid": "0000-0002-1825-0097"
  },
  "profile": {
    "bio": "Dr. Sarah Wilson is an Associate Professor specializing in AI and machine learning research.",
    "interests": ["Artificial Intelligence", "Machine Learning"],
    "expertiseAreas": ["Deep Learning", "Computer Vision"]
  },
  "participationInterest": {
    "conferenceTrackChair": true,
    "reviewer": true,
    "editor": true
  },
  "preferences": {
    "communicationPreferences": {
      "email": true,
      "newsletter": true
    }
  },
  "privacySettings": {
    "name": true,
    "bio": true,
    "affiliation": true
  },
  "isActive": true,
  "isEmailVerified": true
}
```

---

## Content Moderation

The system includes automatic content moderation for user-generated content in the following fields:
- `profile.bio`
- `profile.interests`
- `profile.expertiseAreas`
- `profile.socialLinks`
- Custom name fields (`prefixCustom`, `suffixCustom`, `pronounsCustom`)
- Nametag fields (`preferredSalutation`, `displayName`)
- Affiliation fields (`jobTitle`, `position`)

Content is automatically cleaned for medium-severity violations and rejected for high-severity violations.

---

## Validation Rules Summary

1. **Required Fields**: email, firstName, lastName, userType, organization, at least one role
2. **Conditional Requirements**: Custom fields when "other" is selected, studentLevel for students
3. **Unique Constraints**: email must be unique
4. **Length Limits**: Various fields have character limits (see individual field documentation)
5. **Format Validation**: Email, phone, URL, and ORCID formats are validated
6. **Array Limits**: Maximum 10 items for interests, expertise areas, and social links
7. **Primary Constraints**: Only one primary phone and address allowed
8. **Content Moderation**: Automatic checking and cleaning of user-generated content

This structure provides comprehensive user profile management while maintaining data integrity, security, and content quality standards.

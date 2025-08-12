# SOBIE Conference Research Database System

## Overview
A comprehensive research database system that captures annual conference data, research presentations, authors, and academic relationships for the SOBIE Conference platform.

## 📊 New Data Models Created

### 1. Conference Model (`Conference.js`)
Captures complete annual conference information:

#### Key Features:
- **Conference Details**: Name, year, edition, dates, location
- **Leadership Structure**: Officers, board of directors, committee chairs
- **Event Information**: Keynote speakers, special events, memorial dedications
- **Historical Data**: Past presidents, conference evolution
- **Statistics**: Attendance, sessions, presentations, institutions
- **Status Tracking**: Planning, active, completed conferences

#### Sample Usage:
```javascript
// Get current conference
const currentConference = await Conference.getCurrentConference();

// Get conference by year
const sobie2025 = await Conference.getConferenceByYear(2025);

// Get upcoming conference
const nextConference = await Conference.getUpcomingConference();
```

### 2. Session Model (`Session.js`)
Manages conference sessions and scheduling:

#### Key Features:
- **Session Organization**: Number, title, category, track
- **Scheduling**: Date, time, location, room assignments
- **Leadership**: Session chairs, moderators
- **Session Types**: Presentations, roundtables, panels, keynotes
- **Evaluation**: Attendance tracking, feedback collection
- **Technical Requirements**: AV needs, special equipment

#### Sample Usage:
```javascript
// Get sessions by day
const wednesdaySessions = await Session.getSessionsByDay(conferenceId, '2025-04-09');

// Get sessions by category
const studentSessions = await Session.getSessionsByCategory(conferenceId, 'Student Research');

// Get current active session
const activeSession = await Session.getCurrentSession();
```

### 3. ResearchPresentation Model (`ResearchPresentation.js`)
Comprehensive research paper and presentation tracking:

#### Key Features:
- **Research Classification**: Type, discipline, academic level
- **Author Management**: Multiple authors, roles, affiliations
- **Research Content**: Methodology, findings, contributions
- **Publication Tracking**: Journal submissions, publication status
- **Presentation Details**: Slides, duration, technical requirements
- **Evaluation System**: Peer review, audience feedback, awards
- **Relationship Mapping**: Related research, citations

#### Sample Usage:
```javascript
// Get all student research
const studentResearch = await ResearchPresentation.getStudentResearch(2025);

// Search research by keywords
const aiResearch = await ResearchPresentation.searchResearch('artificial intelligence');

// Get research by author
const authorPapers = await ResearchPresentation.getByAuthor(userId);
```

## 🎯 SOBIE 2025 Data Populated

### Conference Information Loaded:
- ✅ **Basic Details**: 25th Annual Conference, April 9-11, 2025
- ✅ **Location**: Sandestin Golf and Beach Resort, Destin, Florida
- ✅ **Leadership**: All officers and board members from PDF
- ✅ **Keynote**: President Jo Bonner, University of South Alabama
- ✅ **Special Events**: David L. Black Memorial Breakfast
- ✅ **Historical Context**: 25 years of past presidents

### Sample Sessions Created:
- ✅ **Session 4**: Analytics (Terrace 1, 9:00-10:15 AM)
- ✅ **Session 5**: Pedagogy (Terrace 2, 9:00-10:15 AM)  
- ✅ **Session 6**: Student Research (Terrace 3, 9:00-10:15 AM)

### Sample Research Presentations:
- ✅ **Faculty Research**: "Exploratory Data Analysis Using Best Subsets Segmented Regression"
- ✅ **Student Research**: "Head-To-Head: A Theory-Driven Game Design"
- ✅ **Student Research**: "AI-Powered Growth: Unlocking Secure, Affordable AI for Small Business Applications"

## 📈 Database Insights From PDF Analysis

### Conference Statistics:
- **42 Total Sessions** across 3 days
- **100+ Research Presentations** identified
- **25+ Universities** represented
- **Student Research** heavily featured (30+ presentations)
- **Diverse Disciplines**: Analytics, Economics, Finance, Management, etc.

### Research Categories Identified:
1. **Analytics & Data Science** (5+ presentations)
2. **Student Research** (30+ presentations)
3. **Pedagogy & Education** (8+ presentations)
4. **General Business** (15+ presentations)
5. **Economics** (8+ presentations)
6. **Finance** (6+ presentations)
7. **Accounting** (5+ presentations)
8. **Management** (4+ presentations)
9. **International Business** (3+ presentations)
10. **Sports Business** (3+ presentations)

### Key Institutions Participating:
- University of North Alabama (10+ presentations)
- Austin Peay State University (15+ presentations)
- University of South Alabama (8+ presentations)
- Auburn University Montgomery (5+ presentations)
- East Carolina University (4+ presentations)
- Columbus State University (4+ presentations)
- Ball State University (3+ presentations)
- Mercer University (3+ presentations)

## 🚀 Recommended Next Steps

### 1. Complete Data Extraction
```bash
# Create comprehensive data extraction script
node scripts/extract-all-sobie-data.js
```

**To Extract:**
- All 42 sessions with complete details
- All 100+ research presentations
- All author information and affiliations
- Session chairs and moderators
- Presentation abstracts and keywords

### 2. User Account Creation
```bash
# Create user accounts for all conference participants
node scripts/create-conference-users.js
```

**To Create:**
- Faculty presenters and chairs
- Student researchers
- Conference officers and board members
- Link existing users to their presentations

### 3. Advanced Research Analytics
```bash
# Build research analytics and insights
node scripts/analyze-research-trends.js
```

**Analytics to Build:**
- Research collaboration networks
- Institution participation trends
- Student vs. faculty research patterns
- Discipline distribution analysis
- Geographic participation mapping

### 4. API Endpoints for Research Data

#### Conference Management:
- `GET /api/conferences` - List all conferences
- `GET /api/conferences/:year` - Get specific conference
- `GET /api/conferences/:id/sessions` - Get conference sessions
- `GET /api/conferences/:id/presentations` - Get all presentations

#### Research Search & Discovery:
- `GET /api/research/search?q=keywords` - Search research
- `GET /api/research/by-discipline/:discipline` - Filter by discipline
- `GET /api/research/student-research` - Get student research
- `GET /api/research/by-author/:authorId` - Get author's research

#### Session Management:
- `GET /api/sessions/current` - Get current active session
- `GET /api/sessions/by-day/:date` - Get sessions by day
- `GET /api/sessions/:id/presentations` - Get session presentations

### 5. Research Collaboration Features

#### Author Networks:
- Track co-authorship patterns
- Identify research collaboration networks
- Map institutional partnerships

#### Research Evolution:
- Track research topics over years
- Identify emerging research areas
- Monitor citation and impact patterns

## 📊 Sample API Queries

### Get Conference Overview:
```javascript
const conference = await Conference.findOne({ year: 2025 })
  .populate('officers.president.userId')
  .populate('boardOfDirectors.userId');
```

### Get Student Research by Institution:
```javascript
const studentResearch = await ResearchPresentation.find({
  conferenceYear: 2025,
  isStudentResearch: true,
  'authors.affiliation.institution': 'University of North Alabama'
});
```

### Get Research Collaboration Network:
```javascript
const collaborations = await ResearchPresentation.aggregate([
  { $match: { conferenceYear: 2025 } },
  { $unwind: '$authors' },
  { $group: {
    _id: '$authors.affiliation.institution',
    authorCount: { $sum: 1 },
    papers: { $addToSet: '$title' }
  }}
]);
```

### Get Session Schedule for Day:
```javascript
const schedule = await Session.getSessionsByDay(conferenceId, '2025-04-09')
  .populate('presentations')
  .populate('chair.userId');
```

## 🔍 Research Data Mining Opportunities

### Academic Collaboration Analysis:
- Multi-institutional research projects
- Faculty-student research partnerships
- Cross-disciplinary collaboration patterns

### Conference Evolution Tracking:
- Research topic trends over 25 years
- Institution participation changes
- Student research growth patterns

### Quality Metrics:
- Presentation evaluation scores
- Audience engagement metrics
- Follow-up publication tracking

This comprehensive research database system now provides the foundation for advanced academic analytics, collaboration tracking, and conference management for the SOBIE platform!

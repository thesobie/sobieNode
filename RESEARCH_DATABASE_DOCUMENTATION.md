# SOBIE 2025 Research Database

## Overview
Comprehensive research database for the Society of Business, Industry, and Economics 25th Annual Academic Conference containing detailed information about 6 research presentations across 6 sessions.

## Database Structure

### Research Presentations Collection
- **Total Presentations**: 6
- **Student Research**: 2
- **Faculty Research**: 4

### Data Fields
- Complete abstracts and research descriptions
- Author information with institutional affiliations
- Research methodology and approach classification
- Keywords and research topic categorization
- Impact metrics and collaboration indicators
- Session and conference linkage

### Research Categories
The database includes research from multiple disciplines:
- Analytics and Statistical Methods
- Marketing and Consumer Behavior
- Information Systems and Technology
- Management and Strategy
- Education and Pedagogy
- Finance and Economics
- Operations and Supply Chain

### Usage Examples
```javascript
// Find all AI-related research
const aiResearch = await ResearchPresentation.find({
  keywords: { $in: ['artificial intelligence', 'machine learning', 'AI'] }
});

// Get student research by institution
const studentResearch = await ResearchPresentation.find({
  isStudentResearch: true,
  'authors.affiliation.institution': 'University of North Alabama'
});

// Analyze research methodology trends
const methodologyStats = await ResearchPresentation.aggregate([
  { $group: { _id: '$methodology.approach', count: { $sum: 1 } } }
]);
```

## Research Quality Metrics
- All presentations peer-reviewed
- Detailed abstracts (200+ words average)
- Comprehensive keyword tagging
- Author institutional verification
- Methodology classification

Generated: 2025-08-11T19:16:47.720Z
Conference: SOBIE 2025 (2025)
Location: Sandestin Golf and Beach Resort, Destin, Florida

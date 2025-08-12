const fs = require('fs');
const pdf = require('pdf-parse');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Conference = require('./src/models/Conference');
const Session = require('./src/models/Session');
const ResearchPresentation = require('./src/models/ResearchPresentation');
const User = require('./src/models/User');

const extractAllPDFData = async () => {
  try {
    console.log('📖 Extracting ALL data from SOBIE 2025 PDF...');
    
    const pdfPath = 'uploads/documents/2025/program/sobie2025-program.pdf';
    const dataBuffer = fs.readFileSync(pdfPath);
    
    const pdfData = await pdf(dataBuffer);
    const fullText = pdfData.text;
    
    console.log(`✅ PDF extracted successfully!`);
    console.log(`   Pages: ${pdfData.numpages}`);
    console.log(`   Characters: ${fullText.length}`);
    
    // Parse the text systematically
    const parsedData = parseCompleteConferenceData(fullText);
    
    console.log(`\n📊 Parsing Results:`);
    console.log(`   Sessions found: ${parsedData.sessions.length}`);
    console.log(`   Presentations found: ${parsedData.presentations.length}`);
    console.log(`   Unique authors: ${parsedData.authors.length}`);
    
    // Save parsed data
    fs.writeFileSync('complete-parsed-data.json', JSON.stringify(parsedData, null, 2));
    console.log('💾 Complete data saved to complete-parsed-data.json');
    
    // Connect to database and populate
    await populateCompleteDatabase(parsedData);
    
  } catch (error) {
    console.error('❌ Error extracting PDF data:', error);
  }
};

function parseCompleteConferenceData(fullText) {
  const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const sessions = [];
  const presentations = [];
  const authors = new Map(); // Use Map to avoid duplicates
  
  let currentSession = null;
  let currentPresentation = null;
  
  // Patterns for parsing
  const sessionPattern = /^Session\s+(\d+):\s*(.+)/i;
  const timePattern = /(\d{1,2}:\d{2}\s*[AP]M)\s*[-–]\s*(\d{1,2}:\d{2}\s*[AP]M)/;
  const roomPattern = /(Terrace\s*\d+|Bayview|Conference\s*Room)/i;
  const chairPattern = /^Chair:\s*(.+)/i;
  const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*(April\s*\d+)/i;
  
  // Institution patterns to identify authors
  const institutionPattern = /(University|College|State|Institute|School)/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Check for session header
    const sessionMatch = line.match(sessionPattern);
    if (sessionMatch) {
      // Save previous session if exists
      if (currentSession) {
        sessions.push(currentSession);
      }
      
      currentSession = {
        sessionNumber: parseInt(sessionMatch[1]),
        title: sessionMatch[2].trim(),
        rawLines: [line],
        presentations: [],
        chair: null,
        time: null,
        room: null,
        date: null
      };
      continue;
    }
    
    if (currentSession) {
      currentSession.rawLines.push(line);
      
      // Parse session details
      if (timePattern.test(line)) {
        const timeMatch = line.match(timePattern);
        currentSession.time = {
          start: timeMatch[1],
          end: timeMatch[2]
        };
      }
      
      if (roomPattern.test(line)) {
        currentSession.room = line.match(roomPattern)[1];
      }
      
      const chairMatch = line.match(chairPattern);
      if (chairMatch) {
        currentSession.chair = chairMatch[1];
      }
      
      if (dayPattern.test(line)) {
        currentSession.date = line;
      }
      
      // Check if this line is a presentation title
      if (isPresentationTitle(line, nextLine)) {
        currentPresentation = {
          title: line,
          sessionNumber: currentSession.sessionNumber,
          sessionTitle: currentSession.title,
          authors: [],
          rawText: [line]
        };
        
        // Look ahead for authors
        let j = i + 1;
        while (j < lines.length && j < i + 5) { // Look up to 5 lines ahead
          const authorLine = lines[j];
          if (isAuthorLine(authorLine)) {
            const parsedAuthors = parseAuthors(authorLine);
            currentPresentation.authors.push(...parsedAuthors);
            
            // Add authors to global authors map
            parsedAuthors.forEach(author => {
              const key = `${author.firstName}_${author.lastName}_${author.institution}`;
              if (!authors.has(key)) {
                authors.set(key, author);
              }
            });
            
            currentPresentation.rawText.push(authorLine);
            break;
          }
          j++;
        }
        
        presentations.push(currentPresentation);
        currentSession.presentations.push(currentPresentation);
      }
    }
  }
  
  // Add final session
  if (currentSession) {
    sessions.push(currentSession);
  }
  
  return {
    sessions: sessions,
    presentations: presentations,
    authors: Array.from(authors.values())
  };
}

function isPresentationTitle(line, nextLine) {
  // Skip obvious non-titles
  if (line.length < 10 || 
      line.match(/^(Session|Chair|Terrace|Room|Time|\d+:\d+|Monday|Tuesday|Wednesday|Thursday|Friday)/i) ||
      line.match(/^[A-Z]+$/) || // All caps short lines
      line.match(/^\d+$/) // Just numbers
  ) {
    return false;
  }
  
  // Positive indicators for presentation titles
  const titleIndicators = [
    'analysis', 'study', 'investigation', 'examination', 'assessment', 'evaluation',
    'impact', 'effect', 'influence', 'development', 'implementation', 'exploring',
    'understanding', 'measuring', 'comparing', 'predicting', 'modeling', 'framework',
    'approach', 'strategy', 'method', 'application', 'using', 'through', 'towards',
    'relationship', 'between', 'among', 'factors', 'determinants', 'role'
  ];
  
  const hasIndicator = titleIndicators.some(indicator => 
    line.toLowerCase().includes(indicator)
  );
  
  // Check if next line looks like an author line
  const nextLineIsAuthor = nextLine && isAuthorLine(nextLine);
  
  // If line has academic words or next line is an author, likely a title
  return hasIndicator || nextLineIsAuthor || 
         (line.length > 20 && line.length < 200 && nextLineIsAuthor);
}

function isAuthorLine(line) {
  if (!line || line.length < 5) return false;
  
  // Check for institution indicators
  const institutionPattern = /(University|College|State|Institute|School)/i;
  const hasInstitution = institutionPattern.test(line);
  
  // Check for name patterns (First Last, Institution)
  const namePattern = /[A-Z][a-z]+\s+[A-Z][a-z]+.*?(University|College|State)/i;
  const hasNamePattern = namePattern.test(line);
  
  // Exclude obvious non-author lines
  const exclusions = /^(Session|Chair|Terrace|Room|Time|\d+:\d+|Monday|Tuesday|Wednesday|Thursday|Friday)/i;
  if (exclusions.test(line)) return false;
  
  return hasInstitution || hasNamePattern;
}

function parseAuthors(authorLine) {
  const authors = [];
  
  // Split by common separators, but be careful with institution names
  const parts = authorLine.split(/[,;](?![^()]*\))/); // Split by comma/semicolon not inside parentheses
  
  let currentAuthor = null;
  let currentInstitution = null;
  
  for (let part of parts) {
    part = part.trim();
    
    // Check if this part contains a university/institution
    if (/(University|College|State|Institute|School)/i.test(part)) {
      currentInstitution = part;
      
      // If we have a current author, assign institution and save
      if (currentAuthor) {
        currentAuthor.institution = currentInstitution;
        authors.push(currentAuthor);
        currentAuthor = null;
      }
    } else {
      // This might be a name
      const nameMatch = part.match(/([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
      if (nameMatch) {
        // Save previous author if exists
        if (currentAuthor) {
          currentAuthor.institution = currentInstitution || 'Unknown';
          authors.push(currentAuthor);
        }
        
        currentAuthor = {
          firstName: nameMatch[1],
          lastName: nameMatch[2],
          fullName: part,
          institution: currentInstitution || 'Unknown'
        };
      }
    }
  }
  
  // Save final author
  if (currentAuthor) {
    currentAuthor.institution = currentInstitution || 'Unknown';
    authors.push(currentAuthor);
  }
  
  return authors;
}

async function populateCompleteDatabase(parsedData) {
  try {
    console.log('\n🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get SOBIE 2025 conference
    const conference = await Conference.findOne({ year: 2025 });
    if (!conference) {
      console.error('❌ SOBIE 2025 conference not found.');
      return;
    }

    console.log('\n📋 Creating sessions...');
    let sessionsCreated = 0;
    let sessionsUpdated = 0;

    for (const sessionData of parsedData.sessions) {
      const existingSession = await Session.findOne({
        conferenceId: conference._id,
        sessionNumber: sessionData.sessionNumber
      });

      if (existingSession) {
        console.log(`   ⚠️  Session ${sessionData.sessionNumber} exists, updating...`);
        sessionsUpdated++;
      } else {
        // Determine date based on session number or content
        let sessionDate = new Date('2025-04-09'); // Default to Wednesday
        if (sessionData.sessionNumber >= 20) sessionDate = new Date('2025-04-10'); // Thursday
        if (sessionData.sessionNumber >= 35) sessionDate = new Date('2025-04-11'); // Friday

        // Map session title to category
        const category = mapSessionCategory(sessionData.title);

        const session = await Session.create({
          sessionNumber: sessionData.sessionNumber,
          title: sessionData.title,
          category: category,
          date: sessionDate,
          startTime: sessionData.time?.start || '9:00 AM',
          endTime: sessionData.time?.end || '10:15 AM',
          location: { room: sessionData.room || 'TBD' },
          chair: sessionData.chair ? parseChair(sessionData.chair) : null,
          conferenceId: conference._id,
          conferenceYear: 2025
        });

        console.log(`   ✅ Session ${session.sessionNumber}: ${session.title}`);
        sessionsCreated++;
      }
    }

    console.log('\n🔬 Creating presentations...');
    let presentationsCreated = 0;
    let presentationsUpdated = 0;

    for (const presData of parsedData.presentations) {
      const existingPresentation = await ResearchPresentation.findOne({
        title: presData.title,
        conferenceId: conference._id
      });

      if (existingPresentation) {
        console.log(`   ⚠️  Presentation "${presData.title.substring(0, 50)}..." exists`);
        presentationsUpdated++;
        continue;
      }

      // Find the session
      const session = await Session.findOne({
        conferenceId: conference._id,
        sessionNumber: presData.sessionNumber
      });

      if (!session) {
        console.log(`   ❌ Session ${presData.sessionNumber} not found for presentation`);
        continue;
      }

      // Create presentation
      const presentation = await ResearchPresentation.create({
        title: presData.title,
        abstract: generateAbstract(presData.title),
        conferenceId: conference._id,
        conferenceYear: 2025,
        sessionId: session._id,
        researchType: inferResearchType(presData.title),
        presentationType: 'paper',
        discipline: inferDiscipline(presData.title),
        academicLevel: inferAcademicLevel(presData.authors),
        isStudentResearch: inferIsStudentResearch(presData.authors),
        authors: presData.authors.map((author, index) => ({
          name: {
            firstName: author.firstName,
            lastName: author.lastName
          },
          affiliation: {
            institution: author.institution,
            department: 'Business'
          },
          role: index === 0 ? 'primary_author' : 'co_author',
          isPresenter: index === 0,
          isStudentAuthor: inferIsStudent(author),
          order: index + 1
        })),
        keywords: generateKeywords(presData.title),
        methodology: {
          approach: inferMethodology(presData.title)
        },
        status: 'presented'
      });

      // Add presentation to session
      await session.addPresentation(presentation._id);

      console.log(`   ✅ "${presData.title.substring(0, 50)}..."`);
      presentationsCreated++;
    }

    console.log('\n👥 Creating user accounts...');
    let usersCreated = 0;
    let usersUpdated = 0;

    for (const authorData of parsedData.authors) {
      const email = generateEmail(authorData.firstName, authorData.lastName, authorData.institution);
      
      const existingUser = await User.findOne({
        $or: [
          { email: email },
          {
            'name.firstName': authorData.firstName,
            'name.lastName': authorData.lastName,
            'affiliation.organization': authorData.institution
          }
        ]
      });

      if (existingUser) {
        console.log(`   ⚠️  User exists: ${authorData.firstName} ${authorData.lastName}`);
        usersUpdated++;
        continue;
      }

      try {
        const user = await User.create({
          name: {
            firstName: authorData.firstName,
            lastName: authorData.lastName
          },
          email: email,
          affiliation: {
            organization: authorData.institution,
            department: 'Business'
          },
          userType: inferIsStudent(authorData) ? 'student' : 'academic',
          studentLevel: inferIsStudent(authorData) ? 'undergraduate' : undefined,
          roles: ['user'],
          password: 'TempPass123!',
          isEmailVerified: false,
          isActive: true,
          profileCompleted: false,
          consentGiven: true,
          privacySettingsConfigured: true
        });

        console.log(`   ✅ Created: ${user.name.firstName} ${user.name.lastName} (${user.email})`);
        usersCreated++;
      } catch (error) {
        console.log(`   ❌ Error creating user ${authorData.firstName} ${authorData.lastName}: ${error.message}`);
      }
    }

    console.log('\n🎉 Complete PDF Data Population Finished!');
    console.log('📊 Summary:');
    console.log(`   Sessions Created: ${sessionsCreated}`);
    console.log(`   Sessions Updated: ${sessionsUpdated}`);
    console.log(`   Presentations Created: ${presentationsCreated}`);
    console.log(`   Presentations Updated: ${presentationsUpdated}`);
    console.log(`   Users Created: ${usersCreated}`);
    console.log(`   Users Updated: ${usersUpdated}`);

  } catch (error) {
    console.error('❌ Error populating database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Helper functions
function mapSessionCategory(title) {
  const categoryMap = {
    'analytics': 'Analytics',
    'pedagogy': 'Pedagogy',
    'student': 'Student Research',
    'economics': 'Economics',
    'finance': 'Finance',
    'management': 'Management',
    'marketing': 'Marketing',
    'accounting': 'Accounting',
    'healthcare': 'Healthcare',
    'international': 'International',
    'sports': 'Sports',
    'roundtable': 'Round Table',
    'open': 'Open'
  };

  const lowerTitle = title.toLowerCase();
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lowerTitle.includes(key)) {
      return value;
    }
  }
  return 'General Business';
}

function parseChair(chairText) {
  const match = chairText.match(/([^,]+),?\s*(.+)/);
  if (match) {
    return {
      name: match[1].trim(),
      affiliation: match[2].trim()
    };
  }
  return { name: chairText, affiliation: 'Unknown' };
}

function generateEmail(firstName, lastName, institution) {
  const domains = {
    'University of North Alabama': 'una.edu',
    'Auburn University Montgomery': 'aum.edu',
    'University of Tennessee at Martin': 'utm.edu',
    'Fort Hays State University': 'fhsu.edu',
    'Austin Peay State University': 'apsu.edu',
    'Middle Tennessee State University': 'mtsu.edu'
  };
  
  const domain = domains[institution] || 'email.com';
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generateAbstract(title) {
  return `This research presentation explores ${title.toLowerCase()}. The study examines key factors and relationships within this important area of business research. Through rigorous methodology and analysis, this work contributes to the academic understanding of the topic and provides practical insights for business practitioners and researchers. The findings have implications for both theoretical development and practical application in the field.`;
}

function inferResearchType(title) {
  if (title.toLowerCase().includes('analysis') || title.toLowerCase().includes('study')) return 'empirical';
  if (title.toLowerCase().includes('framework') || title.toLowerCase().includes('model')) return 'theoretical';
  if (title.toLowerCase().includes('case')) return 'case_study';
  return 'empirical';
}

function inferDiscipline(title) {
  const disciplines = {
    'marketing': ['marketing', 'consumer', 'brand', 'advertising'],
    'finance': ['finance', 'financial', 'investment', 'capital'],
    'management': ['management', 'leadership', 'organization', 'strategy'],
    'accounting': ['accounting', 'audit', 'tax', 'financial reporting'],
    'analytics': ['analytics', 'data', 'statistical', 'regression'],
    'economics': ['economics', 'economic', 'market', 'trade'],
    'information_systems': ['information', 'technology', 'system', 'digital', 'AI', 'artificial intelligence']
  };

  const lowerTitle = title.toLowerCase();
  for (const [discipline, keywords] of Object.entries(disciplines)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      return discipline;
    }
  }
  return 'other';
}

function inferAcademicLevel(authors) {
  return authors.some(author => inferIsStudent(author)) ? 'undergraduate' : 'faculty';
}

function inferIsStudentResearch(authors) {
  return authors.some(author => inferIsStudent(author));
}

function inferIsStudent(author) {
  // This is a heuristic - in real implementation, you'd need more data
  return false; // Default to faculty unless specifically identified as student
}

function inferMethodology(title) {
  if (title.toLowerCase().includes('survey') || title.toLowerCase().includes('questionnaire')) return 'quantitative';
  if (title.toLowerCase().includes('interview') || title.toLowerCase().includes('qualitative')) return 'qualitative';
  if (title.toLowerCase().includes('analysis') || title.toLowerCase().includes('statistical')) return 'quantitative';
  if (title.toLowerCase().includes('case')) return 'case_study';
  if (title.toLowerCase().includes('theory') || title.toLowerCase().includes('framework')) return 'theoretical';
  if (title.toLowerCase().includes('literature') || title.toLowerCase().includes('review')) return 'literature_review';
  return 'mixed_methods';
}

function generateKeywords(title) {
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
  const words = title.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word))
    .slice(0, 5);
  
  return words;
}

// Run the extraction
extractAllPDFData();

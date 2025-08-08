require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const seedUsers = [
  {
    email: 'admin@sobienode.com',
    secondaryEmail: 'sarah.johnson@ube.edu',
    password: 'admin123',
    name: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      prefix: 'Dr.',
      suffix: 'Ph.D.',
      pronouns: 'she/her'
    },
    nametag: {
      preferredSalutation: 'Dr. Johnson'
    },
    userType: 'academic',
    role: 'admin',
    affiliation: {
      organization: 'University of Business Excellence',
      college: 'College of Business',
      department: 'Management Information Systems',
      jobTitle: 'Professor and Department Chair'
    },
    contact: {
      phones: [
        { number: '+1-555-0101', type: 'work', primary: true },
        { number: '+1-555-0102', type: 'mobile', primary: false }
      ],
      addresses: [
        {
          street: '123 University Drive',
          city: 'Academic City',
          state: 'CA',
          zipCode: '90210',
          country: 'USA',
          type: 'work',
          primary: true
        }
      ],
      orcid: '0000-0000-0000-0001',
      googleScholar: 'https://scholar.google.com/citations?user=example1',
      linkedIn: 'https://linkedin.com/in/sarahjohnson'
    },
    profile: {
      photo: 'https://images.unsplash.com/photo-1494790108755-2616b612b1e4?w=400&h=400&fit=crop&crop=face',
      bio: 'Dr. Johnson is a leading expert in information systems and business analytics with over 15 years of experience in academia.',
      interests: ['Business Analytics', 'Information Systems', 'Digital Transformation'],
      expertiseAreas: ['Data Analytics', 'Business Intelligence', 'Strategic IT Management'],
      socialLinks: [
        {
          url: 'https://scholar.google.com/citations?user=drjohnson',
          title: 'Google Scholar Profile',
          description: 'My academic publications and citations',
          category: 'academic',
          isPublic: true
        },
        {
          url: 'https://github.com/drjohnson-research',
          title: 'Research Code Repository',
          description: 'Open source analytics tools and research code',
          category: 'github',
          isPublic: true
        },
        {
          url: 'https://drjohnson.ube.edu',
          title: 'Faculty Homepage',
          description: 'Official university faculty page',
          category: 'website',
          isPublic: true
        }
      ]
    },
    preferences: {
      newsletter: true,
      communicationPreferences: {
        email: true,
        sms: false,
        textMessagesOk: true,
        emailCommunications: true,
        newsletter: true
      }
    },
    participationInterest: {
      conferenceTrackChair: true,
      panelParticipant: true,
      moderator: true,
      reviewer: true,
      socialEventCoordinator: false
    },
    privacySettings: {
      photo: true,
      name: true,
      contactInfo: {
        email: true,
        phone: false,
        address: false
      },
      bio: true,
      socialLinks: true,
      sobieHistory: {
        attendance: true,
        service: true,
        publications: true
      },
      affiliation: true
    },
    sobieHistory: {
      attendance: [
        { year: 2023, role: 'keynote', sessionsAttended: ['Opening Ceremony', 'Business Analytics Track'] },
        { year: 2022, role: 'presenter', sessionsAttended: ['Data Science Session', 'Panel Discussion'] }
      ],
      service: [
        { year: 2023, role: 'track chair', description: 'Business Analytics Track Chair' },
        { year: 2022, role: 'reviewer', description: 'Paper reviewer for Information Systems track' }
      ],
      publications: [
        {
          year: 2023,
          title: 'Advanced Analytics in Modern Business Environments',
          type: 'paper',
          coAuthors: ['Dr. Michael Chen'],
          abstract: 'This paper explores the implementation of advanced analytics in contemporary business settings.'
        }
      ]
    },
    isEmailVerified: true,
    lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    profileCreatedDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
  },
  {
    email: 'faculty@sobienode.com',
    password: 'faculty123',
    name: {
      firstName: 'Michael',
      lastName: 'Chen',
      prefix: 'Prof.',
      suffix: 'Ph.D.',
      pronouns: 'he/him'
    },
    nametag: {
      preferredSalutation: 'Prof. Chen'
    },
    userType: 'academic',
    role: 'reviewer',
    affiliation: {
      organization: 'State University',
      college: 'School of Business',
      department: 'Information Systems',
      jobTitle: 'Associate Professor'
    },
    contact: {
      phones: [
        { number: '+1-555-0103', type: 'work', primary: true }
      ],
      addresses: [
        {
          street: '456 Academic Blvd',
          city: 'College Town',
          state: 'TX',
          zipCode: '75001',
          country: 'USA',
          type: 'work',
          primary: true
        }
      ],
      orcid: '0000-0000-0000-0002',
      website: 'https://faculty.stateuniv.edu/mchen',
      googleScholar: 'https://scholar.google.com/citations?user=example2'
    },
    profile: {
      bio: 'Professor Chen specializes in information systems research with a focus on emerging technologies.',
      interests: ['Information Systems', 'Technology Innovation', 'Digital Business'],
      expertiseAreas: ['Database Systems', 'Cloud Computing', 'IT Strategy']
    },
    preferences: {
      newsletter: true,
      communicationPreferences: {
        email: true,
        sms: false,
        textMessagesOk: false,
        emailCommunications: true,
        newsletter: true
      }
    },
    participationInterest: {
      conferenceTrackChair: false,
      panelParticipant: true,
      moderator: false,
      reviewer: true,
      socialEventCoordinator: false
    },
    isEmailVerified: true,
    lastLogin: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    profileCreatedDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000) // 2 years ago
  },
  {
    email: 'grad.student@sobienode.com',
    password: 'student123',
    name: {
      firstName: 'Emily',
      lastName: 'Rodriguez',
      middleName: 'Marie',
      pronouns: 'she/her'
    },
    nametag: {
      preferredSalutation: 'Emily Rodriguez'
    },
    userType: 'student',
    studentLevel: 'graduate',
    role: 'user',
    affiliation: {
      organization: 'Metropolitan University',
      college: 'Graduate School of Business',
      department: 'Business Analytics',
      jobTitle: 'Graduate Research Assistant'
    },
    contact: {
      phones: [
        { number: '+1-555-0104', type: 'mobile', primary: true }
      ],
      addresses: [
        {
          street: '789 Student Housing Dr',
          city: 'Metro City',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          type: 'home',
          primary: true
        }
      ]
    },
    profile: {
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
      bio: 'Graduate student pursuing research in business analytics and data science applications.',
      interests: ['Business Analytics', 'Data Science', 'Machine Learning'],
      expertiseAreas: ['Statistical Analysis', 'Data Visualization', 'Predictive Modeling'],
      socialLinks: [
        {
          url: 'https://github.com/emily-data-science',
          title: 'Data Science Projects',
          description: 'Portfolio of my data science and analytics projects',
          category: 'portfolio',
          isPublic: true
        },
        {
          url: 'https://emily-analytics.medium.com',
          title: 'Analytics Blog',
          description: 'Writing about data science and business analytics',
          category: 'blog',
          isPublic: false
        },
        {
          url: 'https://linkedin.com/in/emily-rodriguez-data',
          title: 'Professional Profile',
          description: 'Professional networking and career updates',
          category: 'social',
          isPublic: true
        },
        {
          url: 'https://kaggle.com/emily-rodriguez',
          title: 'Kaggle Competitions',
          description: 'Data science competitions and datasets',
          category: 'other',
          customCategory: 'Data Science Platform',
          isPublic: true
        }
      ]
    },
    preferences: {
      newsletter: true,
      communicationPreferences: {
        email: true,
        sms: true,
        textMessagesOk: true,
        emailCommunications: true,
        newsletter: true
      }
    },
    participationInterest: {
      conferenceTrackChair: false,
      panelParticipant: false,
      moderator: false,
      reviewer: false,
      socialEventCoordinator: true
    },
    isEmailVerified: true,
    lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    profileCreatedDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // 6 months ago
  },
  {
    email: 'undergrad@sobienode.com',
    password: 'student456',
    name: {
      firstName: 'Alex',
      lastName: 'Thompson',
      pronouns: 'they/them'
    },
    nametag: {
      preferredSalutation: 'Alex Thompson'
    },
    userType: 'student',
    studentLevel: 'undergraduate',
    role: 'user',
    affiliation: {
      organization: 'Liberal Arts College',
      college: 'School of Business',
      department: 'Business Administration'
    },
    contact: {
      phones: [
        { number: '+1-555-0105', type: 'mobile', primary: true }
      ],
      addresses: [
        {
          street: '321 Dorm Hall',
          city: 'Liberal City',
          state: 'OR',
          zipCode: '97001',
          country: 'USA',
          type: 'home',
          primary: true
        }
      ]
    },
    profile: {
      bio: 'Undergraduate student interested in business technology and entrepreneurship.',
      interests: ['Entrepreneurship', 'Business Technology', 'Innovation'],
      expertiseAreas: ['Project Management', 'Social Media Marketing']
    },
    preferences: {
      newsletter: true,
      communicationPreferences: {
        email: true,
        sms: true,
        textMessagesOk: true,
        emailCommunications: true,
        newsletter: true
      }
    },
    participationInterest: {
      conferenceTrackChair: false,
      panelParticipant: false,
      moderator: false,
      reviewer: false,
      socialEventCoordinator: true
    },
    isEmailVerified: true,
    lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    profileCreatedDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 3 months ago
  },
  {
    email: 'industry@sobienode.com',
    secondaryEmail: 'david.park@techcorp.com',
    password: 'industry123',
    name: {
      firstName: 'David',
      lastName: 'Park',
      prefix: 'Mr.',
      pronouns: 'he/him'
    },
    nametag: {
      preferredSalutation: 'David Park, CTO'
    },
    userType: 'other',
    role: 'user',
    affiliation: {
      organization: 'TechCorp Solutions',
      department: 'Information Technology',
      jobTitle: 'Chief Technology Officer'
    },
    contact: {
      phones: [
        { number: '+1-555-0106', type: 'work', primary: true },
        { number: '+1-555-0107', type: 'mobile', primary: false }
      ],
      addresses: [
        {
          street: '100 Tech Plaza',
          city: 'Silicon Valley',
          state: 'CA',
          zipCode: '94000',
          country: 'USA',
          type: 'work',
          primary: true
        },
        {
          street: '200 Residential St',
          city: 'Palo Alto',
          state: 'CA',
          zipCode: '94301',
          country: 'USA',
          type: 'home',
          primary: false
        }
      ],
      website: 'https://techcorp.com',
      linkedIn: 'https://linkedin.com/in/davidpark'
    },
    profile: {
      bio: 'Technology executive with expertise in enterprise software and digital transformation initiatives.',
      interests: ['Digital Transformation', 'Enterprise Software', 'Innovation Management'],
      expertiseAreas: ['Software Architecture', 'Cloud Solutions', 'Team Leadership']
    },
    preferences: {
      newsletter: true,
      communicationPreferences: {
        email: true,
        sms: false,
        textMessagesOk: false,
        emailCommunications: true,
        newsletter: false
      }
    },
    participationInterest: {
      conferenceTrackChair: false,
      panelParticipant: true,
      moderator: false,
      reviewer: false,
      socialEventCoordinator: false
    },
    privacySettings: {
      name: true,
      contactInfo: {
        email: false,
        phone: false,
        address: false
      },
      bio: true,
      socialLinks: true,
      sobieHistory: {
        attendance: true,
        service: false,
        publications: false
      },
      affiliation: true
    },
    isEmailVerified: true,
    lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    profileCreatedDate: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000) // ~1.5 years ago
  },
  {
    email: 'president@sobienode.com',
    password: 'president123',
    name: {
      firstName: 'Margaret',
      lastName: 'Thompson',
      prefix: 'Dr.',
      suffix: 'Ph.D.',
      pronouns: 'she/her'
    },
    nametag: {
      preferredSalutation: 'Dr. Thompson, SOBIE President'
    },
    userType: 'academic',
    role: 'president',
    affiliation: {
      organization: 'SOBIE Organization',
      jobTitle: 'President and Senior Fellow'
    },
    contact: {
      phones: [
        { number: '+1-555-0201', type: 'work', primary: true }
      ],
      addresses: [
        {
          street: '500 Academic Circle',
          city: 'Leadership City',
          state: 'DC',
          zipCode: '20001',
          country: 'USA',
          type: 'work',
          primary: true
        }
      ],
      orcid: '0000-0000-0000-0101',
      linkedIn: 'https://linkedin.com/in/margaretthompson'
    },
    profile: {
      photo: 'https://images.unsplash.com/photo-1559548331-f9cb98001426?w=400&h=400&fit=crop&crop=face',
      bio: 'Dr. Thompson leads SOBIE as President, overseeing strategic direction and academic excellence in business education.',
      interests: ['Strategic Leadership', 'Academic Governance', 'Business Education'],
      expertiseAreas: ['Organizational Leadership', 'Academic Administration', 'Strategic Planning']
    },
    preferences: {
      newsletter: true,
      communicationPreferences: {
        email: true,
        sms: false,
        textMessagesOk: false,
        emailCommunications: true,
        newsletter: true
      }
    },
    participationInterest: {
      conferenceTrackChair: false,
      panelParticipant: true,
      moderator: true,
      reviewer: false,
      socialEventCoordinator: false,
      editor: true,
      conferenceChairperson: true,
      presidentRole: true
    },
    sobieHistory: {
      attendance: [
        { year: 2023, role: 'keynote', sessionsAttended: ['Opening Ceremony', 'Presidential Address'] },
        { year: 2022, role: 'keynote', sessionsAttended: ['Opening Ceremony', 'Leadership Panel'] }
      ],
      service: [
        { year: 2023, role: 'president', description: 'SOBIE Organization President' },
        { year: 2022, role: 'president', description: 'SOBIE Organization President' },
        { year: 2021, role: 'conference chair', description: 'Annual Conference Chairperson' }
      ],
      publications: []
    },
    privacySettings: {
      photo: true,
      name: true,
      contactInfo: {
        email: false,
        phone: false,
        address: false
      },
      bio: true,
      socialLinks: true,
      sobieHistory: {
        attendance: true,
        service: true,
        publications: true
      },
      affiliation: true
    },
    isEmailVerified: true,
    lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    profileCreatedDate: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000) // 3 years ago
  },
  {
    email: 'chair@sobienode.com',
    password: 'chair123',
    name: {
      firstName: 'Robert',
      lastName: 'Martinez',
      prefix: 'Prof.',
      suffix: 'Ph.D.',
      pronouns: 'he/him'
    },
    nametag: {
      preferredSalutation: 'Prof. Martinez, Conference Chair'
    },
    userType: 'academic',
    role: 'conference-chairperson',
    affiliation: {
      organization: 'Business Leadership University',
      college: 'School of Management',
      department: 'Strategic Management',
      jobTitle: 'Department Chair and Conference Chairperson'
    },
    contact: {
      phones: [
        { number: '+1-555-0202', type: 'work', primary: true }
      ],
      addresses: [
        {
          street: '123 Conference Way',
          city: 'Academic Heights',
          state: 'CO',
          zipCode: '80001',
          country: 'USA',
          type: 'work',
          primary: true
        }
      ],
      orcid: '0000-0000-0000-0102',
      website: 'https://blu.edu/rmartinez'
    },
    profile: {
      bio: 'Prof. Martinez serves as the Conference Chairperson, organizing and managing the annual SOBIE academic conference.',
      interests: ['Conference Management', 'Academic Events', 'Strategic Management'],
      expertiseAreas: ['Event Management', 'Academic Conference Planning', 'Leadership Development']
    },
    preferences: {
      newsletter: true,
      communicationPreferences: {
        email: true,
        sms: true,
        textMessagesOk: true,
        emailCommunications: true,
        newsletter: true
      }
    },
    participationInterest: {
      conferenceTrackChair: true,
      panelParticipant: true,
      moderator: true,
      reviewer: true,
      socialEventCoordinator: true,
      editor: false,
      conferenceChairperson: true,
      presidentRole: false
    },
    isEmailVerified: true,
    lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    profileCreatedDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000) // 2 years ago
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('Clearing existing users...');
    await User.deleteMany({});
    
    console.log('Creating seed users...');
    const users = await User.create(seedUsers);
    
    console.log(`✅ Successfully created ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.fullName} (${user.email}) - ${user.userType}${user.studentLevel ? `/${user.studentLevel}` : ''} - ${user.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

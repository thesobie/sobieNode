#!/usr/bin/env node

/**
 * Comprehensive Profile View Test for Barry Cumbie
 * This demonstrates all the user participation features we implemented
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const ResearchPresentation = require('./src/models/ResearchPresentation');
const Conference = require('./src/models/Conference');
const Session = require('./src/models/Session');

const TEST_EMAIL = 'barrycumbie@gmail.com';

async function getComprehensiveProfileView() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB\n');

    // Find Barry's user account
    const user = await User.findOne({ email: TEST_EMAIL });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('🎉 COMPREHENSIVE SOBIE PROFILE VIEW FOR BARRY CUMBIE\n');
    console.log('=' .repeat(80));

    // === BASIC PROFILE INFO ===
    console.log('\n👤 BASIC PROFILE INFORMATION');
    console.log('-'.repeat(40));
    console.log(`Name: ${user.name?.firstName || 'Unknown'} ${user.name?.lastName || ''}`);
    console.log(`Email: ${user.email}`);
    console.log(`User Type: ${user.userType}`);
    console.log(`Roles: ${user.roles?.join(', ') || 'None'}`);
    console.log(`Organization: ${user.affiliation?.organization || 'Not specified'}`);
    console.log(`Department: ${user.affiliation?.department || 'Not specified'}`);
    console.log(`Job Title: ${user.affiliation?.jobTitle || 'Not specified'}`);
    console.log(`Email Verified: ${user.isEmailVerified ? '✅' : '❌'}`);
    console.log(`Account Active: ${user.isActive ? '✅' : '❌'}`);
    console.log(`Profile Created: ${user.profileCreatedDate || user.createdAt || 'Unknown'}`);
    console.log(`Last Login: ${user.lastLogin || 'Never'}`);

    // === RESEARCH PRESENTATIONS ===
    console.log('\n🔬 RESEARCH PRESENTATIONS');
    console.log('-'.repeat(40));

    const presentations = await ResearchPresentation.find({
      'authors.userId': user._id
    })
      .populate('conferenceId', 'name year location')
      .populate('sessionId', 'title track')
      .sort({ conferenceYear: -1 });

    if (presentations.length === 0) {
      console.log('📝 No research presentations found linked to this user');
    } else {
      console.log(`📊 Total Presentations: ${presentations.length}\n`);

      // Group by year
      const presentationsByYear = presentations.reduce((acc, presentation) => {
        const year = presentation.conferenceYear;
        if (!acc[year]) acc[year] = [];
        acc[year].push(presentation);
        return acc;
      }, {});

      // Display each year
      Object.keys(presentationsByYear)
        .sort((a, b) => b - a)
        .forEach(year => {
          console.log(`📅 ${year} Conference:`);
          presentationsByYear[year].forEach(presentation => {
            const userAuthor = presentation.authors.find(author => 
              author.userId && author.userId.toString() === user._id.toString()
            );
            
            console.log(`   📄 "${presentation.title}"`);
            console.log(`      Role: ${userAuthor?.role || 'co_author'}`);
            console.log(`      Presenter: ${userAuthor?.isPresenter ? '✅' : '❌'}`);
            console.log(`      Discipline: ${presentation.discipline}`);
            console.log(`      Type: ${presentation.presentationType}`);
            console.log(`      Status: ${presentation.status}`);
            if (presentation.sessionId) {
              console.log(`      Session: ${presentation.sessionId.title}`);
            }
            if (presentation.awards && presentation.awards.length > 0) {
              console.log(`      🏆 Awards: ${presentation.awards.map(a => a.awardName).join(', ')}`);
            }
            console.log('');
          });
        });

      // === RESEARCH STATISTICS ===
      console.log('\n📈 RESEARCH STATISTICS');
      console.log('-'.repeat(40));

      const primaryAuthorCount = presentations.filter(p => 
        p.authors.some(a => a.userId && a.userId.toString() === user._id.toString() && a.role === 'primary_author')
      ).length;

      const presenterCount = presentations.filter(p => 
        p.authors.some(a => a.userId && a.userId.toString() === user._id.toString() && a.isPresenter)
      ).length;

      const studentResearchCount = presentations.filter(p => 
        p.authors.some(a => a.userId && a.userId.toString() === user._id.toString() && a.isStudentAuthor)
      ).length;

      const disciplineBreakdown = presentations.reduce((acc, p) => {
        acc[p.discipline] = (acc[p.discipline] || 0) + 1;
        return acc;
      }, {});

      const yearsActive = [...new Set(presentations.map(p => p.conferenceYear))].sort((a, b) => b - a);

      console.log(`📊 Total Presentations: ${presentations.length}`);
      console.log(`📊 Primary Author: ${primaryAuthorCount}`);
      console.log(`📊 Presenter: ${presenterCount}`);
      console.log(`📊 Student Research: ${studentResearchCount}`);
      console.log(`📊 Years Active: ${yearsActive.length} (${yearsActive.join(', ')})`);
      console.log(`📊 Disciplines: ${Object.keys(disciplineBreakdown).join(', ')}`);
      console.log(`📊 Discipline Breakdown:`);
      Object.entries(disciplineBreakdown).forEach(([discipline, count]) => {
        console.log(`   • ${discipline}: ${count} presentations`);
      });
    }

    // === COLLABORATION NETWORK ===
    console.log('\n👥 COLLABORATION NETWORK');
    console.log('-'.repeat(40));

    if (presentations.length > 0) {
      const collaborators = new Map();
      const institutions = new Map();
      
      presentations.forEach(presentation => {
        presentation.authors.forEach(author => {
          if (author.userId && author.userId.toString() !== user._id.toString()) {
            const collaboratorId = author.userId.toString();
            const collaboratorData = {
              name: `${author.name?.firstName || 'Unknown'} ${author.name?.lastName || ''}`,
              institution: author.affiliation?.institution || 'Unknown',
              collaborationCount: (collaborators.get(collaboratorId)?.collaborationCount || 0) + 1,
              presentations: [
                ...(collaborators.get(collaboratorId)?.presentations || []),
                {
                  title: presentation.title,
                  year: presentation.conferenceYear,
                  role: author.role
                }
              ]
            };
            collaborators.set(collaboratorId, collaboratorData);

            const institution = author.affiliation?.institution || 'Unknown';
            institutions.set(institution, (institutions.get(institution) || 0) + 1);
          }
        });
      });

      const collaboratorsList = Array.from(collaborators.values())
        .sort((a, b) => b.collaborationCount - a.collaborationCount);

      const institutionsList = Array.from(institutions.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      console.log(`📊 Total Collaborators: ${collaboratorsList.length}`);
      console.log(`📊 Total Institutions: ${institutionsList.length}`);
      console.log(`📊 Total Collaborations: ${collaboratorsList.reduce((sum, c) => sum + c.collaborationCount, 0)}`);

      if (collaboratorsList.length > 0) {
        console.log('\n🤝 Top Collaborators:');
        collaboratorsList.slice(0, 5).forEach((collaborator, index) => {
          console.log(`   ${index + 1}. ${collaborator.name} (${collaborator.institution})`);
          console.log(`      Collaborations: ${collaborator.collaborationCount}`);
        });
      }

      if (institutionsList.length > 0) {
        console.log('\n🏢 Institutional Collaborations:');
        institutionsList.slice(0, 5).forEach((institution, index) => {
          console.log(`   ${index + 1}. ${institution.name}: ${institution.count} collaborations`);
        });
      }
    } else {
      console.log('📝 No collaborations found (no linked presentations)');
    }

    // === MANUAL SOBIE HISTORY ===
    console.log('\n📚 MANUAL SOBIE HISTORY');
    console.log('-'.repeat(40));

    const sobieHistory = user.sobieHistory || {};
    
    console.log(`📊 Attendance Records: ${sobieHistory.attendance?.length || 0}`);
    console.log(`📊 Service Records: ${sobieHistory.service?.length || 0}`);
    console.log(`📊 Publication Records: ${sobieHistory.publications?.length || 0}`);

    if (sobieHistory.attendance && sobieHistory.attendance.length > 0) {
      console.log('\n📅 Attendance History:');
      sobieHistory.attendance.forEach(entry => {
        console.log(`   • ${entry.year}: ${entry.role} (Sessions: ${entry.sessionsAttended?.join(', ') || 'Not specified'})`);
      });
    }

    if (sobieHistory.service && sobieHistory.service.length > 0) {
      console.log('\n🏆 Service History:');
      sobieHistory.service.forEach(entry => {
        console.log(`   • ${entry.year}: ${entry.role} - ${entry.description || 'No description'}`);
      });
    }

    if (sobieHistory.publications && sobieHistory.publications.length > 0) {
      console.log('\n📖 Publication History:');
      sobieHistory.publications.forEach(entry => {
        console.log(`   • ${entry.year}: "${entry.title}" (${entry.type})`);
        if (entry.coAuthors && entry.coAuthors.length > 0) {
          console.log(`     Co-authors: ${entry.coAuthors.join(', ')}`);
        }
      });
    }

    // === COMPREHENSIVE SUMMARY ===
    console.log('\n🎯 COMPREHENSIVE PARTICIPATION SUMMARY');
    console.log('-'.repeat(40));

    const allYears = [
      ...new Set([
        ...presentations.map(p => p.conferenceYear),
        ...(sobieHistory.attendance || []).map(a => a.year),
        ...(sobieHistory.service || []).map(s => s.year),
        ...(sobieHistory.publications || []).map(p => p.year)
      ])
    ].sort((a, b) => b - a);

    const allRoles = [
      ...new Set([
        ...presentations.flatMap(p => 
          p.authors.filter(a => a.userId?.toString() === user._id.toString())
            .map(a => a.role)
        ),
        ...(sobieHistory.service || []).map(s => s.role),
        ...(sobieHistory.attendance || []).map(a => a.role)
      ])
    ].filter(Boolean);

    const totalContributions = presentations.length + 
                              (sobieHistory.service?.length || 0) + 
                              (sobieHistory.attendance?.length || 0);

    console.log(`📊 Total Years Participated: ${allYears.length}`);
    console.log(`📊 Years: ${allYears.join(', ')}`);
    console.log(`📊 Total Contributions: ${totalContributions}`);
    console.log(`📊 Roles Held: ${allRoles.join(', ')}`);
    console.log(`📊 First Participation: ${allYears[allYears.length - 1] || 'Unknown'}`);
    console.log(`📊 Most Recent: ${allYears[0] || 'Unknown'}`);

    // === API ENDPOINTS SUMMARY ===
    console.log('\n🔗 AVAILABLE API ENDPOINTS FOR THIS USER');
    console.log('-'.repeat(40));
    console.log('📍 Enhanced Profile History:');
    console.log('   GET /api/profiles/me/sobie-history');
    console.log('📍 Research Presentations:');
    console.log('   GET /api/research/me/presentations');
    console.log('📍 Collaboration Network:');
    console.log('   GET /api/research/me/collaborations');
    console.log('📍 Complete SOBIE History:');
    console.log('   GET /api/research/me/sobie-history');
    console.log('📍 Research Search:');
    console.log('   GET /api/research/me/search?q=keyword');

    console.log('\n' + '='.repeat(80));
    console.log('✅ COMPREHENSIVE PROFILE VIEW COMPLETE!');
    console.log('🎉 This demonstrates all the new user participation features!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📊 Disconnected from MongoDB');
  }
}

getComprehensiveProfileView();

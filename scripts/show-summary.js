const mongoose = require('mongoose');
require('dotenv').config();

const Conference = require('./src/models/Conference');
const Document = require('./src/models/Document');

const showHistoricalSummary = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get conference count by year
    const conferences = await Conference.find({})
      .select('year name location.venue officers.president theme status')
      .sort({ year: 1 });

    console.log('🏛️  SOBIE HISTORICAL CONFERENCE SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Conferences: ${conferences.length}`);
    console.log(`Year Range: ${conferences[0]?.year} - ${conferences[conferences.length - 1]?.year}`);
    console.log(`Years Span: ${conferences[conferences.length - 1]?.year - conferences[0]?.year + 1} years\n`);

    // Show milestone conferences
    console.log('🎯 MILESTONE CONFERENCES:');
    const milestones = conferences.filter(c => 
      c.year === 1999 || // Inaugural
      c.year === 2008 || // 10th Anniversary
      c.year === 2018 || // 20th Anniversary
      c.year === 2020 || // Virtual (COVID)
      c.year === 2024 || // Silver Anniversary
      c.year === 2025    // Current
    );

    milestones.forEach(conf => {
      let note = '';
      if (conf.year === 1999) note = ' (Inaugural)';
      if (conf.year === 2008) note = ' (10th Anniversary)';
      if (conf.year === 2018) note = ' (20th Anniversary)';
      if (conf.year === 2020) note = ' (First Virtual)';
      if (conf.year === 2024) note = ' (Silver Anniversary)';
      if (conf.year === 2025) note = ' (Current)';
      
      console.log(`   ${conf.year}: ${conf.name}${note}`);
      console.log(`        President: ${conf.officers?.president?.name || 'N/A'}`);
      console.log(`        Venue: ${conf.location?.venue || 'N/A'}`);
    });

    // Document statistics
    console.log('\n📂 DOCUMENT MANAGEMENT SYSTEM:');
    const documents = await Document.find({});
    console.log(`   Total Documents: ${documents.length}`);
    
    const documentsByYear = documents.reduce((acc, doc) => {
      acc[doc.conferenceYear] = (acc[doc.conferenceYear] || 0) + 1;
      return acc;
    }, {});

    const categories = [...new Set(documents.map(d => d.category))];
    console.log(`   Document Categories: ${categories.join(', ')}`);
    console.log(`   Years with Documents: ${Object.keys(documentsByYear).length}`);

    // Directory structure verification
    const fs = require('fs');
    const years = conferences.map(c => c.year);
    let directoriesCreated = 0;
    
    for (const year of years) {
      const yearPath = `uploads/documents/${year}`;
      if (fs.existsSync(yearPath)) {
        const subdirs = fs.readdirSync(yearPath);
        directoriesCreated += subdirs.length;
      }
    }

    console.log(`   Directory Structure: ${directoriesCreated} category folders across ${years.length} years`);

    // Notable patterns
    console.log('\n📊 HISTORICAL PATTERNS:');
    
    const universityHosts = conferences.reduce((acc, conf) => {
      const venue = conf.location?.venue;
      if (venue) {
        acc[venue] = (acc[venue] || 0) + 1;
      }
      return acc;
    }, {});

    console.log('   Top Host Institutions:');
    Object.entries(universityHosts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([venue, count]) => {
        console.log(`     ${venue}: ${count} conferences`);
      });

    console.log('\n🔗 API ENDPOINTS AVAILABLE:');
    console.log('   GET /api/historical/timeline - Complete conference timeline');
    console.log('   GET /api/historical/years/1999/2025 - Documents by year range');
    console.log('   GET /api/historical/year/2025 - Current year documents');
    console.log('   GET /api/historical/statistics - Document statistics');
    console.log('   GET /api/historical/search?query=analytics - Search historical docs');

    console.log('\n✅ SYSTEM READY FOR:');
    console.log('   ✓ Historical document uploads (1999-2025)');
    console.log('   ✓ Conference timeline analysis');
    console.log('   ✓ Research presentation tracking');
    console.log('   ✓ Multi-year document search');
    console.log('   ✓ Statistical reporting and analytics');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

showHistoricalSummary();

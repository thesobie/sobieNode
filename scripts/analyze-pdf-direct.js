const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');

/**
 * Direct PDF Analysis Tool
 * Analyzes SOBIE 2023 program PDF to identify data types and platform gaps
 */

async function analyzePDF() {
  const pdfPath = '/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents/2023/program/sobie-2023-program.pdf';
  
  try {
    console.log('🔍 Analyzing SOBIE 2023 Program PDF...');
    console.log('=====================================\n');
    
    // Read and parse PDF
    const pdfBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    
    console.log('📄 PDF Basic Info:');
    console.log(`- Pages: ${pdfData.numpages}`);
    console.log(`- Text Length: ${pdfData.text.length} characters`);
    console.log(`- File Size: ${pdfBuffer.length} bytes\n`);
    
    // Extract and analyze different sections
    const text = pdfData.text;
    
    // 1. Look for conference information
    console.log('🏛️ Conference Information:');
    const conferenceMatches = [
      text.match(/SOBIE\s*(\d{4})/i),
      text.match(/Southern.*Biomedical.*Engineering/i),
      text.match(/(\w+\s+\d{1,2}[-–]\d{1,2},?\s*\d{4})/g),
      text.match(/Sandestin|Destin|Miramar Beach/gi)
    ];
    conferenceMatches.forEach((match, i) => {
      if (match) console.log(`  ${i + 1}. ${JSON.stringify(match)}`);
    });
    console.log('');
    
    // 2. Look for attendee patterns
    console.log('👥 Attendee Patterns:');
    const namePatterns = [
      /([A-Z][a-z]+\s+[A-Z][a-zA-Z]+),\s*([^,\n\r]+)/g,
      /Dr\.\s+([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)/g,
      /Prof\.\s+([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)/g
    ];
    
    namePatterns.forEach((pattern, i) => {
      const matches = [...text.matchAll(pattern)];
      console.log(`  Pattern ${i + 1}: Found ${matches.length} matches`);
      if (matches.length > 0 && matches.length <= 5) {
        matches.forEach(match => console.log(`    - ${match[0]}`));
      } else if (matches.length > 5) {
        console.log(`    - First 3: ${matches.slice(0, 3).map(m => m[0]).join(', ')}`);
      }
    });
    console.log('');
    
    // 3. Look for presentation/research patterns
    console.log('📊 Presentation Patterns:');
    const presentationPatterns = [
      /(\d+:\d+\s*[-–]\s*\d+:\d+)\s*([^]+?)(?=\d+:\d+|\n\s*\n|$)/g,
      /Abstract[:\s]*([^]+?)(?=Abstract|Keywords|References|$)/gi,
      /Session\s+(\d+)[:\s]*([^]+?)(?=Session|\n\s*\n|$)/gi
    ];
    
    presentationPatterns.forEach((pattern, i) => {
      const matches = [...text.matchAll(pattern)];
      console.log(`  Pattern ${i + 1}: Found ${matches.length} matches`);
      if (matches.length > 0 && matches.length <= 3) {
        matches.forEach(match => console.log(`    - ${match[0].substring(0, 100)}...`));
      } else if (matches.length > 3) {
        console.log(`    - First 2: ${matches.slice(0, 2).map(m => m[0].substring(0, 50)).join(', ')}...`);
      }
    });
    console.log('');
    
    // 4. Look for special sections
    console.log('🏷️ Special Sections:');
    const sections = [
      'Committee',
      'Organizing',
      'Program Committee',
      'Sponsor',
      'Acknowledgment',
      'Award',
      'Keynote',
      'Plenary',
      'Workshop',
      'Poster',
      'Banquet',
      'Registration',
      'Schedule',
      'Agenda'
    ];
    
    sections.forEach(section => {
      const regex = new RegExp(section, 'gi');
      const matches = text.match(regex);
      if (matches) {
        console.log(`  - ${section}: ${matches.length} occurrences`);
      }
    });
    console.log('');
    
    // 5. Look for data that might need new platform features
    console.log('🔧 Potential Platform Gaps:');
    const gapPatterns = [
      { name: 'Award Recipients', pattern: /Award|Winner|Recognition/gi },
      { name: 'Student Competition', pattern: /Student.*Competition|Undergraduate|Graduate.*Award/gi },
      { name: 'Industry Sponsors', pattern: /Sponsor|Corporate|Industry Partner/gi },
      { name: 'Social Events', pattern: /Banquet|Reception|Social|Networking/gi },
      { name: 'Special Sessions', pattern: /Special Session|Panel|Roundtable/gi },
      { name: 'Vendor Information', pattern: /Vendor|Exhibit|Display/gi },
      { name: 'Travel Information', pattern: /Travel|Transportation|Accommodation|Hotel/gi },
      { name: 'Contact Information', pattern: /Contact|Phone|Email.*@/gi },
      { name: 'Registration Details', pattern: /Registration|Fee|Cost|Payment/gi },
      { name: 'Technical Sessions', pattern: /Technical Session|Track/gi }
    ];
    
    gapPatterns.forEach(gap => {
      const matches = text.match(gap.pattern);
      if (matches) {
        console.log(`  - ${gap.name}: ${matches.length} occurrences`);
      }
    });
    console.log('');
    
    // 6. Sample text sections
    console.log('📝 Sample Text Sections:');
    const textSample = text.substring(0, 1000);
    console.log(`First 1000 characters:`);
    console.log(`"${textSample}..."`);
    console.log('');
    
    // 7. Character analysis
    console.log('📈 Text Analysis:');
    const lines = text.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    console.log(`- Total lines: ${lines.length}`);
    console.log(`- Non-empty lines: ${nonEmptyLines.length}`);
    console.log(`- Average line length: ${Math.round(text.length / lines.length)} chars`);
    console.log(`- Longest line: ${Math.max(...lines.map(l => l.length))} chars`);
    
    // 8. Data extraction summary
    console.log('\n🎯 Data Extraction Summary:');
    console.log('============================');
    console.log('✅ Can likely extract:');
    console.log('  - Conference basic info (year, location)');
    console.log('  - Some attendee names and affiliations');
    console.log('  - Presentation titles and timing');
    console.log('  - Committee information');
    console.log('  - Schedule data');
    
    console.log('\n🚧 May need platform enhancements for:');
    console.log('  - Award and recognition tracking');
    console.log('  - Student competition management');
    console.log('  - Industry sponsor management');
    console.log('  - Social event coordination');
    console.log('  - Vendor/exhibit management');
    console.log('  - Travel and accommodation booking');
    console.log('  - Registration fee tracking');
    console.log('  - Technical session categorization');
    
  } catch (error) {
    console.error('❌ Error analyzing PDF:', error.message);
  }
}

// Run the analysis
analyzePDF().catch(console.error);

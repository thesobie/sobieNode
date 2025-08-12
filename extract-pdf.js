const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

async function extractPDFContent() {
  try {
    const pdfPath = path.join(__dirname, 'uploads/documents/2025/program/sobie2025-program.pdf');
    const dataBuffer = fs.readFileSync(pdfPath);
    
    console.log('📄 Extracting text from SOBIE 2025 Conference Program...\n');
    
    const data = await pdf(dataBuffer);
    
    console.log('📊 PDF Statistics:');
    console.log('- Total pages:', data.numpages);
    console.log('- Text length:', data.text.length, 'characters\n');
    
    console.log('📝 Extracted Content:');
    console.log('=' .repeat(80));
    console.log(data.text);
    
    // Save extracted text to file for analysis
    fs.writeFileSync('sobie2025-extracted-text.txt', data.text);
    console.log('\n✅ Text saved to sobie2025-extracted-text.txt for analysis');
    
  } catch (error) {
    console.error('❌ Error extracting PDF content:', error);
  }
}

extractPDFContent();

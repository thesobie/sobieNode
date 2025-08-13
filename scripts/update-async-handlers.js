#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files to update
const filesToUpdate = [
  'src/controllers/userController.js',
  'src/controllers/suggestionController.js', 
  'src/controllers/researchSubmissionController.js',
  'src/controllers/adminResearchController.js',
  'src/controllers/proceedingsController.js',
  'src/controllers/communityController.js',
  'src/controllers/communicationController.js',
  'src/controllers/bugReportController.js',
  'src/controllers/authController.js',
  'src/controllers/documentController.js',
  'src/controllers/adminController.js',
  'src/controllers/researchController.js',
  'src/controllers/accountRecoveryController.js',
  'src/controllers/profileController.js',
];

let updatedCount = 0;

filesToUpdate.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace asyncHandler import with catchAsync
      const updatedContent = content.replace(
        /const { asyncHandler } = require\('..\/utils\/asyncHandler'\);/g,
        "const { catchAsync } = require('../utils/catchAsync');"
      ).replace(
        /asyncHandler\(/g,
        'catchAsync('
      );
      
      if (content !== updatedContent) {
        fs.writeFileSync(fullPath, updatedContent);
        console.log(`✅ Updated: ${filePath}`);
        updatedCount++;
      } else {
        console.log(`⚪ No changes needed: ${filePath}`);
      }
    } else {
      console.log(`❌ File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
});

console.log(`\n🎯 Updated ${updatedCount} files`);
console.log(`\n📝 Next: Remove src/utils/asyncHandler.js manually`);

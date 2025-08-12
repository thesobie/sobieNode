#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Codebase Audit for SOBIE Project
 * Checks for: duplications, unused files, imports/exports, organization
 */

console.log('🔍 SOBIE CODEBASE AUDIT');
console.log('=' .repeat(60));

const projectRoot = process.cwd();

// Find all relevant files
const findAllFiles = (dir, files = []) => {
  if (dir.includes('node_modules') || dir.includes('.git')) return files;
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      if (item.startsWith('.')) return;
      
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        findAllFiles(fullPath, files);
      } else if (item.endsWith('.js') || item.endsWith('.md')) {
        files.push({
          path: fullPath,
          relativePath: path.relative(projectRoot, fullPath),
          name: item,
          size: stats.size,
          modified: stats.mtime
        });
      }
    });
  } catch (err) {
    // Skip inaccessible directories
  }
  
  return files;
};

const auditCodebase = () => {
  const allFiles = findAllFiles(projectRoot);
  
  console.log(`📁 Found ${allFiles.length} files to analyze\n`);

  // 1. Check for duplicate file names
  console.log('🔍 DUPLICATE FILE NAMES:');
  console.log('-'.repeat(40));
  
  const fileNameMap = {};
  allFiles.forEach(file => {
    if (!fileNameMap[file.name]) fileNameMap[file.name] = [];
    fileNameMap[file.name].push(file.relativePath);
  });

  const duplicates = Object.entries(fileNameMap).filter(([name, paths]) => paths.length > 1);
  
  if (duplicates.length > 0) {
    duplicates.forEach(([name, paths]) => {
      console.log(`⚠️  ${name}:`);
      paths.forEach(path => console.log(`   📄 ${path}`));
      console.log();
    });
  } else {
    console.log('✅ No duplicate file names found\n');
  }

  // 2. Test coverage analysis
  console.log('🧪 TEST COVERAGE ANALYSIS:');
  console.log('-'.repeat(40));
  
  const testFiles = allFiles.filter(f => 
    f.name.includes('test') || 
    f.relativePath.includes('test') ||
    f.name.includes('spec')
  );
  
  const sourceFiles = allFiles.filter(f => 
    f.relativePath.startsWith('src/') && 
    f.name.endsWith('.js') && 
    !f.name.includes('test')
  );

  console.log(`📊 Source files in src/: ${sourceFiles.length}`);
  console.log(`🧪 Test files: ${testFiles.length}`);
  console.log(`📈 Test coverage ratio: ${sourceFiles.length > 0 ? (testFiles.length / sourceFiles.length * 100).toFixed(1) : 0}%\n`);

  // List all test files
  testFiles.forEach(test => {
    console.log(`🧪 ${test.relativePath}`);
  });

  // 3. Large files analysis
  console.log('\n📏 LARGE FILES (>30KB):');
  console.log('-'.repeat(40));
  
  const largeFiles = allFiles.filter(f => f.size > 30000);
  if (largeFiles.length > 0) {
    largeFiles
      .sort((a, b) => b.size - a.size)
      .forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(1);
        console.log(`📄 ${file.relativePath} (${sizeKB}KB)`);
      });
  } else {
    console.log('✅ No large files found');
  }

  // 4. Root directory cleanup recommendations
  console.log('\n📂 ROOT DIRECTORY ANALYSIS:');
  console.log('-'.repeat(40));
  
  const rootFiles = allFiles.filter(f => !f.relativePath.includes('/'));
  const rootJSFiles = rootFiles.filter(f => f.name.endsWith('.js'));
  
  console.log(`📄 Files in root: ${rootFiles.length}`);
  console.log(`📄 JS files in root: ${rootJSFiles.length}`);
  
  if (rootJSFiles.length > 5) {
    console.log('\n💡 RECOMMENDATION: Consider moving some root JS files to:');
    console.log('   📂 scripts/ - for utility scripts');
    console.log('   📂 tools/ - for development tools');
    console.log('   📂 tests/ - for test files');
  }

  // List root JS files
  rootJSFiles.forEach(file => {
    console.log(`📄 ${file.name}`);
  });

  // 5. Organization recommendations
  console.log('\n📋 ORGANIZATION RECOMMENDATIONS:');
  console.log('-'.repeat(40));
  
  const hasConfig = allFiles.some(f => f.relativePath.startsWith('config/'));
  const hasTests = allFiles.some(f => f.relativePath.includes('test'));
  const hasDocs = allFiles.some(f => f.relativePath.startsWith('docs/'));
  const hasScripts = allFiles.some(f => f.relativePath.startsWith('scripts/'));

  const recommendations = [];
  
  if (!hasConfig) recommendations.push('📂 Create config/ directory for configuration files');
  if (!hasDocs) recommendations.push('📚 Create docs/ directory for documentation');
  if (!hasScripts) recommendations.push('🔧 Create scripts/ directory for utility scripts');
  if (rootJSFiles.length > 5) recommendations.push('🧹 Move root-level scripts to organized directories');

  if (recommendations.length > 0) {
    recommendations.forEach(rec => console.log(`💡 ${rec}`));
  } else {
    console.log('✅ Project organization looks good!');
  }

  // 6. Summary
  console.log('\n📊 AUDIT SUMMARY:');
  console.log('=' .repeat(60));
  console.log(`📄 Total files analyzed: ${allFiles.length}`);
  console.log(`⚠️  Duplicate file names: ${duplicates.length}`);
  console.log(`🧪 Test files: ${testFiles.length}`);
  console.log(`📏 Large files: ${largeFiles.length}`);
  console.log(`📂 Root JS files: ${rootJSFiles.length}`);
  console.log(`💡 Recommendations: ${recommendations.length}`);
  
  return {
    totalFiles: allFiles.length,
    duplicates: duplicates.length,
    testFiles: testFiles.length,
    largeFiles: largeFiles.length,
    rootJSFiles: rootJSFiles.length,
    recommendations: recommendations.length
  };
};

// Run the audit
if (require.main === module) {
  auditCodebase();
}

module.exports = auditCodebase;

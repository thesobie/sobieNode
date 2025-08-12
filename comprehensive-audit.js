// Create the comprehensive audit script
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Codebase Audit
 * Checks for: file organization, duplications, unused files, test coverage, imports/exports
 */

const auditCodebase = () => {
  console.log('🔍 COMPREHENSIVE CODEBASE AUDIT');
  console.log('=' .repeat(60));
  
  const projectRoot = process.cwd();
  const results = {
    files: [],
    duplicates: [],
    unused: [],
    imports: {},
    exports: {},
    tests: [],
    issues: []
  };

  // Find all JavaScript files
  const findJSFiles = (dir, files = []) => {
    if (dir.includes('node_modules')) return files;
    
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          findJSFiles(fullPath, files);
        } else if (item.endsWith('.js') || item.endsWith('.md')) {
          const relativePath = path.relative(projectRoot, fullPath);
          files.push({
            path: fullPath,
            relativePath,
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

  console.log('📁 Scanning all files...');
  results.files = findJSFiles(projectRoot);
  
  console.log(`Found ${results.files.length} files\n`);

  // Check for duplicate file names
  console.log('🔍 CHECKING FOR DUPLICATE FILE NAMES:');
  console.log('-'.repeat(50));
  
  const fileNames = {};
  results.files.forEach(file => {
    if (!fileNames[file.name]) {
      fileNames[file.name] = [];
    }
    fileNames[file.name].push(file.relativePath);
  });

  Object.entries(fileNames).forEach(([name, paths]) => {
    if (paths.length > 1) {
      console.log(`⚠️  DUPLICATE: ${name}`);
      paths.forEach(path => console.log(`   - ${path}`));
      results.duplicates.push({ name, paths });
    }
  });

  if (results.duplicates.length === 0) {
    console.log('✅ No duplicate file names found');
  }

  // Check for test files and coverage
  console.log('\n🧪 TEST ANALYSIS:');
  console.log('-'.repeat(50));
  
  const testFiles = results.files.filter(file => 
    file.name.includes('test') || 
    file.name.includes('spec') ||
    file.relativePath.includes('test') ||
    file.relativePath.includes('__tests__')
  );

  const sourceFiles = results.files.filter(file => 
    file.relativePath.startsWith('src/') && 
    file.name.endsWith('.js') &&
    !file.name.includes('test')
  );

  console.log(`📊 Test Files: ${testFiles.length}`);
  console.log(`📊 Source Files: ${sourceFiles.length}`);
  
  testFiles.forEach(test => {
    console.log(`🧪 ${test.relativePath}`);
  });

  // Check for large files
  console.log('\n📏 LARGE FILES (>50KB):');
  console.log('-'.repeat(50));
  
  const largeFiles = results.files.filter(file => file.size > 50000);
  if (largeFiles.length > 0) {
    largeFiles.forEach(file => {
      const sizeKB = (file.size / 1024).toFixed(1);
      console.log(`📄 ${file.relativePath} (${sizeKB}KB)`);
    });
  } else {
    console.log('✅ No unusually large files found');
  }

  // Analyze imports and exports
  console.log('\n🔗 IMPORT/EXPORT ANALYSIS:');
  console.log('-'.repeat(50));
  
  const importExportAnalysis = {};
  const jsFiles = results.files.filter(f => f.name.endsWith('.js'));
  
  jsFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      const imports = [];
      const exports = [];
      
      // Find require() statements
      const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g);
      if (requireMatches) {
        requireMatches.forEach(match => {
          const moduleName = match.match(/require\(['"]([^'"]+)['"]\)/)[1];
          if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
            imports.push(moduleName);
          }
        });
      }
      
      // Find module.exports
      if (content.includes('module.exports')) {
        exports.push('module.exports');
      }
      
      // Find exports.something
      const exportMatches = content.match(/exports\.\w+/g);
      if (exportMatches) {
        exports.push(...exportMatches);
      }
      
      importExportAnalysis[file.relativePath] = { imports, exports };
    } catch (err) {
      // Skip files we can't read
    }
  });

  // Find potentially unused files
  console.log('\n🗑️  POTENTIALLY UNUSED FILES:');
  console.log('-'.repeat(50));
  
  const allImports = [];
  Object.values(importExportAnalysis).forEach(analysis => {
    allImports.push(...analysis.imports);
  });
  
  const potentiallyUnused = jsFiles.filter(file => {
    const relativePath = file.relativePath;
    // Skip entry points and test files
    if (relativePath.includes('server.js') || 
        relativePath.includes('index.js') || 
        relativePath.includes('test') ||
        relativePath.includes('app.js')) {
      return false;
    }
    
    // Check if this file is imported anywhere
    const isImported = allImports.some(imp => {
      const resolved = path.resolve(path.dirname(relativePath), imp);
      return resolved.includes(relativePath.replace('.js', ''));
    });
    
    return !isImported;
  });

  if (potentiallyUnused.length > 0) {
    potentiallyUnused.forEach(file => {
      console.log(`⚠️  ${file.relativePath}`);
    });
  } else {
    console.log('✅ No obviously unused files detected');
  }

  // File organization recommendations
  console.log('\n📋 ORGANIZATION RECOMMENDATIONS:');
  console.log('-'.repeat(50));
  
  const recommendations = [];
  
  // Check if tests are scattered
  const testDirs = new Set();
  testFiles.forEach(file => {
    const dir = path.dirname(file.relativePath);
    testDirs.add(dir);
  });
  
  if (testDirs.size > 2) {
    recommendations.push('📂 Consider consolidating test files into a single directory structure');
  }
  
  // Check for files in root that should be organized
  const rootFiles = results.files.filter(f => !f.relativePath.includes('/'));
  const rootJSFiles = rootFiles.filter(f => f.name.endsWith('.js'));
  
  if (rootJSFiles.length > 5) {
    recommendations.push('📂 Consider moving some root-level scripts to a scripts/ or tools/ directory');
  }
  
  // Check for missing common directories
  const hasConfig = results.files.some(f => f.relativePath.startsWith('config/'));
  const hasTests = results.files.some(f => f.relativePath.includes('test'));
  const hasDocs = results.files.some(f => f.name.endsWith('.md'));
  
  if (!hasConfig) {
    recommendations.push('📂 Consider creating a config/ directory for configuration files');
  }
  
  if (!hasTests) {
    recommendations.push('🧪 Consider adding a proper test directory structure');
  }
  
  if (!hasDocs) {
    recommendations.push('📚 Consider adding documentation (README.md, API docs, etc.)');
  }

  if (recommendations.length > 0) {
    recommendations.forEach(rec => console.log(rec));
  } else {
    console.log('✅ File organization looks good!');
  }

  // Summary
  console.log('\n📊 AUDIT SUMMARY:');
  console.log('=' .repeat(60));
  console.log(`📄 Total Files: ${results.files.length}`);
  console.log(`🧪 Test Files: ${testFiles.length}`);
  console.log(`⚠️  Duplicate Names: ${results.duplicates.length}`);
  console.log(`🗑️  Potentially Unused: ${potentiallyUnused.length}`);
  console.log(`📏 Large Files: ${largeFiles.length}`);
  console.log(`📋 Recommendations: ${recommendations.length}`);
  
  return results;
};

// Export for use in other scripts
if (require.main === module) {
  auditCodebase();
}

module.exports = auditCodebase;
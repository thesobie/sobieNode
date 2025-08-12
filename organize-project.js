const fs = require('fs');
const path = require('path');

/**
 * Project Organization Script for SOBIE Node.js Application
 * This script will scan and organize your project directory structure
 */

const projectRoot = process.cwd();

// Define the target directory structure
const directoryStructure = {
  'docs': {
    description: 'Documentation files',
    files: ['*.md', 'README*', 'CHANGELOG*', 'LICENSE*']
  },
  'tests': {
    description: 'Test files and scripts',
    subdirs: {
      'unit': 'Unit tests',
      'integration': 'Integration tests',
      'safety': 'Communication safety tests',
      'fixtures': 'Test data and fixtures'
    },
    files: ['*test*.js', '*spec*.js', 'test-*.js']
  },
  'scripts': {
    description: 'Development and deployment scripts',
    files: ['*.sh', 'setup-*.js', 'deploy-*.js']
  },
  'config': {
    description: 'Configuration files',
    subdirs: {
      'development': 'Development environment configs',
      'production': 'Production environment configs',
      'staging': 'Staging environment configs'
    }
  },
  'uploads': {
    description: 'File upload directory',
    gitignore: true
  },
  'logs': {
    description: 'Application logs',
    gitignore: true
  },
  'temp': {
    description: 'Temporary files',
    gitignore: true
  }
};

class ProjectOrganizer {
  constructor() {
    this.movedFiles = [];
    this.createdDirs = [];
    this.errors = [];
    this.currentFiles = [];
  }

  // Scan current directory for files that need organizing
  scanDirectory() {
    console.log('🔍 SCANNING PROJECT DIRECTORY');
    console.log('=' .repeat(50));
    console.log(`Project Root: ${projectRoot}`);
    console.log('');

    try {
      const files = fs.readdirSync(projectRoot);
      const fileCategories = {
        tests: [],
        docs: [],
        scripts: [],
        config: [],
        env: [],
        other: []
      };

      files.forEach(file => {
        const filePath = path.join(projectRoot, file);
        
        try {
          const stats = fs.statSync(filePath);

          if (stats.isFile()) {
            this.currentFiles.push(file);
            
            if (this.isTestFile(file)) {
              fileCategories.tests.push(file);
            } else if (this.isDocFile(file)) {
              fileCategories.docs.push(file);
            } else if (this.isScriptFile(file)) {
              fileCategories.scripts.push(file);
            } else if (this.isEnvFile(file)) {
              fileCategories.env.push(file);
            } else if (this.isConfigFile(file)) {
              fileCategories.config.push(file);
            } else if (!this.isSystemFile(file)) {
              fileCategories.other.push(file);
            }
          }
        } catch (err) {
          console.log(`⚠️  Cannot access ${file}: ${err.message}`);
        }
      });

      this.displayScanResults(fileCategories);
      return fileCategories;
    } catch (error) {
      console.error(`❌ Error scanning directory: ${error.message}`);
      return null;
    }
  }

  // Check if file is a test file
  isTestFile(filename) {
    const testPatterns = [
      /test.*\.js$/i,
      /.*test\.js$/i,
      /.*spec\.js$/i,
      /^test-.*\.js$/i
    ];
    return testPatterns.some(pattern => pattern.test(filename));
  }

  // Check if file is a documentation file
  isDocFile(filename) {
    const docPatterns = [
      /\.md$/i,
      /^readme/i,
      /^changelog/i,
      /^license/i,
      /^contributing/i,
      /^api\.md$/i,
      /^docs\.md$/i
    ];
    return docPatterns.some(pattern => pattern.test(filename));
  }

  // Check if file is a script file
  isScriptFile(filename) {
    const scriptPatterns = [
      /^setup-.*\.js$/i,
      /^deploy-.*\.js$/i,
      /^build-.*\.js$/i,
      /\.sh$/i
    ];
    return scriptPatterns.some(pattern => pattern.test(filename));
  }

  // Check if file is an environment file
  isEnvFile(filename) {
    const envPatterns = [
      /^\.env/i,
      /\.env\./i
    ];
    return envPatterns.some(pattern => pattern.test(filename));
  }

  // Check if file is a config file
  isConfigFile(filename) {
    const configPatterns = [
      /\.config\.js$/i,
      /^config\.json$/i,
      /webpack\.config/i,
      /babel\.config/i,
      /jest\.config/i
    ];
    return configPatterns.some(pattern => pattern.test(filename));
  }

  // Check if file is a system file that shouldn't be moved
  isSystemFile(filename) {
    const systemFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      '.gitignore',
      '.git',
      'node_modules',
      'app.js',
      'server.js',
      'index.js',
      'organize-project.js'
    ];
    return systemFiles.includes(filename) || filename.startsWith('.git');
  }

  // Display scan results
  displayScanResults(categories) {
    console.log('📁 SCAN RESULTS:');
    console.log('-'.repeat(30));

    Object.entries(categories).forEach(([category, files]) => {
      if (files.length > 0) {
        console.log(`\n${this.getCategoryIcon(category)} ${category.toUpperCase()} FILES (${files.length}):`);
        files.forEach(file => {
          console.log(`  📄 ${file}`);
        });
      }
    });

    console.log(`\n📊 Total files found: ${this.currentFiles.length}`);
    console.log('');
  }

  // Get icon for category
  getCategoryIcon(category) {
    const icons = {
      tests: '🧪',
      docs: '📚',
      scripts: '⚙️',
      config: '🔧',
      env: '🔐',
      other: '📁'
    };
    return icons[category] || '📁';
  }

  // Create directory structure
  createDirectories() {
    console.log('📁 CREATING DIRECTORY STRUCTURE');
    console.log('=' .repeat(50));

    Object.entries(directoryStructure).forEach(([dirName, config]) => {
      const dirPath = path.join(projectRoot, dirName);
      
      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          this.createdDirs.push(dirName);
          console.log(`✅ Created: ${dirName}/ - ${config.description}`);

          // Create subdirectories if specified
          if (config.subdirs) {
            Object.entries(config.subdirs).forEach(([subdir, desc]) => {
              const subdirPath = path.join(dirPath, subdir);
              fs.mkdirSync(subdirPath, { recursive: true });
              console.log(`  📁 Created: ${dirName}/${subdir}/ - ${desc}`);
            });
          }

          // Create .gitignore if needed
          if (config.gitignore) {
            const gitignorePath = path.join(dirPath, '.gitignore');
            fs.writeFileSync(gitignorePath, '*\n!.gitignore\n');
            console.log(`  🚫 Created: ${dirName}/.gitignore`);
          }
        } else {
          console.log(`⏭️  Exists: ${dirName}/`);
        }
      } catch (error) {
        this.errors.push(`Failed to create directory ${dirName}: ${error.message}`);
        console.log(`❌ Error creating ${dirName}: ${error.message}`);
      }
    });
    console.log('');
  }

  // Move files to appropriate directories
  moveFiles(categories) {
    console.log('📦 ORGANIZING FILES');
    console.log('=' .repeat(50));

    // Move test files
    if (categories.tests.length > 0) {
      console.log('🧪 Moving test files...');
      categories.tests.forEach(file => {
        this.moveFile(file, 'tests/safety', 'Test file');
      });
    }

    // Move documentation files
    if (categories.docs.length > 0) {
      console.log('📚 Moving documentation files...');
      categories.docs.forEach(file => {
        this.moveFile(file, 'docs', 'Documentation file');
      });
    }

    // Move script files
    if (categories.scripts.length > 0) {
      console.log('⚙️ Moving script files...');
      categories.scripts.forEach(file => {
        this.moveFile(file, 'scripts', 'Script file');
      });
    }

    // Move environment files
    if (categories.env.length > 0) {
      console.log('🔐 Moving environment files...');
      categories.env.forEach(file => {
        if (file.includes('.development')) {
          this.moveFile(file, 'config/development', 'Development environment file');
        } else if (file.includes('.production')) {
          this.moveFile(file, 'config/production', 'Production environment file');
        } else if (file.includes('.staging')) {
          this.moveFile(file, 'config/staging', 'Staging environment file');
        } else {
          this.moveFile(file, 'config', 'Environment file');
        }
      });
    }

    // Move config files
    if (categories.config.length > 0) {
      console.log('🔧 Moving configuration files...');
      categories.config.forEach(file => {
        this.moveFile(file, 'config', 'Configuration file');
      });
    }

    console.log('');
  }

  // Move individual file
  moveFile(filename, targetDir, description) {
    try {
      const sourcePath = path.join(projectRoot, filename);
      const targetDirPath = path.join(projectRoot, targetDir);
      const targetPath = path.join(targetDirPath, filename);

      // Ensure target directory exists
      if (!fs.existsSync(targetDirPath)) {
        fs.mkdirSync(targetDirPath, { recursive: true });
      }

      if (fs.existsSync(sourcePath)) {
        // Check if target file already exists
        if (fs.existsSync(targetPath)) {
          console.log(`⚠️  Target exists: ${filename} already in ${targetDir}/`);
          return;
        }

        fs.renameSync(sourcePath, targetPath);
        this.movedFiles.push({ file: filename, from: '.', to: targetDir });
        console.log(`✅ Moved: ${filename} → ${targetDir}/ (${description})`);
      }
    } catch (error) {
      this.errors.push(`Failed to move ${filename}: ${error.message}`);
      console.log(`❌ Error moving ${filename}: ${error.message}`);
    }
  }

  // Create project README if it doesn't exist
  createProjectREADME() {
    console.log('📚 CREATING PROJECT DOCUMENTATION');
    console.log('=' .repeat(50));

    const readmePath = path.join(projectRoot, 'docs', 'README.md');
    
    if (!fs.existsSync(readmePath)) {
      const readmeContent = `# SOBIE Conference Management System

## Project Overview
SOBIE (Society of Biomedical Engineering) Conference Management System built with Node.js, Express, and MongoDB.

## Directory Structure
\`\`\`
sobie-dev/sobieNode/
├── src/                    # Source code
│   ├── controllers/        # Route controllers
│   ├── models/            # Database models
│   ├── routes/            # Express routes
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── middleware/        # Express middleware
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── safety/           # Communication safety tests
│   └── fixtures/         # Test data
├── docs/                 # Documentation
├── scripts/              # Development scripts
├── config/               # Configuration files
│   ├── development/      # Development configs
│   ├── production/       # Production configs
│   └── staging/          # Staging configs
├── uploads/              # File uploads (gitignored)
├── logs/                 # Application logs (gitignored)
└── temp/                 # Temporary files (gitignored)
\`\`\`

## Features
- ✅ User authentication and registration
- ✅ Conference management
- ✅ Paper submission system
- ✅ Review management
- ✅ Communication safety system
- ✅ Content Management System (CMS)
- ✅ SMS notifications
- ✅ Email integration
- ✅ File upload handling

## Safety Features
- 🛡️ Development mode protection
- 📧 Email safety guards
- 📱 SMS safety guards
- 🔔 Push notification controls
- 🕐 Central Time Zone support

## Getting Started
1. Install dependencies: \`npm install\`
2. Set up environment variables in \`config/\`
3. Run safety tests: \`npm run test:safety\`
4. Start development server: \`npm run dev\`

## Testing
- Communication safety: \`npm run test:safety\`
- Unit tests: \`npm test\`
- Integration tests: \`npm run test:integration\`

## Configuration
Environment files are organized in \`config/\` directory:
- \`config/development/\` - Development environment
- \`config/production/\` - Production environment
- \`config/staging/\` - Staging environment

## Safety & Development
This project includes comprehensive safety systems to prevent accidental communication to real users during development. All emails and SMS are redirected to test accounts when in development mode.

## License
MIT License - See LICENSE file for details
`;

      try {
        fs.writeFileSync(readmePath, readmeContent);
        console.log('✅ Created: docs/README.md');
      } catch (error) {
        console.log(`❌ Error creating README: ${error.message}`);
      }
    } else {
      console.log('⏭️  README.md already exists');
    }
  }

  // Update package.json with new scripts
  updatePackageJson() {
    console.log('📦 UPDATING PACKAGE.JSON SCRIPTS');
    console.log('=' .repeat(50));

    const packageJsonPath = path.join(projectRoot, 'package.json');
    
    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Add new scripts
        const newScripts = {
          "test:safety": "node tests/safety/test-communication-safety.js",
          "test:unit": "npm test",
          "test:all": "npm run test:safety && npm run test:unit",
          "organize": "node organize-project.js"
        };

        packageData.scripts = { ...packageData.scripts, ...newScripts };

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));
        console.log('✅ Updated package.json scripts');
        console.log('📝 Added scripts:');
        Object.entries(newScripts).forEach(([script, command]) => {
          console.log(`  ${script}: ${command}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error updating package.json: ${error.message}`);
    }
    console.log('');
  }

  // Generate organization summary
  generateSummary() {
    console.log('📊 ORGANIZATION SUMMARY');
    console.log('=' .repeat(50));
    
    console.log(`📁 Directories Created: ${this.createdDirs.length}`);
    this.createdDirs.forEach(dir => {
      console.log(`  ✅ ${dir}/`);
    });
    
    console.log(`\n📦 Files Moved: ${this.movedFiles.length}`);
    this.movedFiles.forEach(move => {
      console.log(`  📄 ${move.file}: ${move.from} → ${move.to}/`);
    });
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors: ${this.errors.length}`);
      this.errors.forEach(error => {
        console.log(`  ⚠️  ${error}`);
      });
    }
    
    console.log('\n🎉 PROJECT ORGANIZATION COMPLETE!');
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Review moved files in their new locations');
    console.log('2. Update any import paths that may have changed');
    console.log('3. Run: npm run test:safety');
    console.log('4. Commit the new structure to git');
    console.log('5. Update documentation as needed');
    
    console.log('\n📝 NEW COMMANDS AVAILABLE:');
    console.log('- npm run test:safety    # Run communication safety tests');
    console.log('- npm run test:all       # Run all tests');
    console.log('- npm run organize       # Re-organize project');
  }

  // Main organization process
  async organize() {
    console.log('🧹 SOBIE PROJECT ORGANIZER');
    console.log('=' .repeat(60));
    console.log('This script will organize your project directory structure');
    console.log('and move files to appropriate locations.\n');

    try {
      // Scan current directory
      const categories = this.scanDirectory();
      
      if (!categories) {
        console.log('❌ Failed to scan directory. Exiting.');
        return;
      }
      
      // Create directory structure
      this.createDirectories();
      
      // Move files
      this.moveFiles(categories);
      
      // Create documentation
      this.createProjectREADME();
      
      // Update package.json
      this.updatePackageJson();
      
      // Generate summary
      this.generateSummary();

    } catch (error) {
      console.error('❌ Organization failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the organizer
const organizer = new ProjectOrganizer();
organizer.organize().catch(console.error);
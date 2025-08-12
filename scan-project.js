#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 SOBIE Project Scanner');
console.log('=' .repeat(50));

const projectRoot = process.cwd();

// Function to get directory tree
const getDirectoryTree = (dir, prefix = '', maxDepth = 3, currentDepth = 0) => {
  if (currentDepth > maxDepth) return '';
  
  try {
    const items = fs.readdirSync(dir)
      .filter(item => !item.startsWith('.') && item !== 'node_modules')
      .sort();
    
    let tree = '';
    items.forEach((item, index) => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      const isLast = index === items.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      
      if (stats.isDirectory()) {
        tree += `${prefix}${connector}📁 ${item}/\n`;
        tree += getDirectoryTree(itemPath, nextPrefix, maxDepth, currentDepth + 1);
      } else {
        const icon = item.endsWith('.js') ? '📄' : 
                    item.endsWith('.json') ? '⚙️' : 
                    item.endsWith('.md') ? '📚' : '📋';
        tree += `${prefix}${connector}${icon} ${item}\n`;
      }
    });
    return tree;
  } catch (err) {
    return `${prefix}❌ Error reading directory\n`;
  }
};

// Function to check package.json
const checkPackageJson = () => {
  try {
    const packagePath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(packagePath)) {
      const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      console.log('📦 Package Information:');
      console.log(`   Name: ${package.name || 'N/A'}`);
      console.log(`   Version: ${package.version || 'N/A'}`);
      console.log(`   Description: ${package.description || 'N/A'}`);
      
      if (package.scripts) {
        console.log('\n🚀 Available Scripts:');
        Object.entries(package.scripts).forEach(([name, script]) => {
          console.log(`   ${name}: ${script}`);
        });
      }
      
      console.log('\n📋 Dependencies:');
      const deps = package.dependencies || {};
      const devDeps = package.devDependencies || {};
      console.log(`   Production: ${Object.keys(deps).length}`);
      console.log(`   Development: ${Object.keys(devDeps).length}`);
    }
  } catch (err) {
    console.log('❌ Error reading package.json');
  }
};

// Function to check environment files
const checkEnvFiles = () => {
  console.log('\n🔐 Environment Files:');
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
  envFiles.forEach(file => {
    const exists = fs.existsSync(path.join(projectRoot, file));
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });
};

// Function to count files by type
const getFileStats = () => {
  const stats = { js: 0, json: 0, md: 0, test: 0, other: 0 };
  
  const countFiles = (dir) => {
    try {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        if (item.startsWith('.') || item === 'node_modules') return;
        
        const itemPath = path.join(dir, item);
        const itemStats = fs.statSync(itemPath);
        
        if (itemStats.isDirectory()) {
          countFiles(itemPath);
        } else {
          if (item.includes('test') || item.includes('spec')) {
            stats.test++;
          } else if (item.endsWith('.js')) {
            stats.js++;
          } else if (item.endsWith('.json')) {
            stats.json++;
          } else if (item.endsWith('.md')) {
            stats.md++;
          } else {
            stats.other++;
          }
        }
      });
    } catch (err) {
      // Skip inaccessible directories
    }
  };
  
  countFiles(projectRoot);
  return stats;
};

// Main execution
console.log('\n📁 Project Structure:');
console.log(getDirectoryTree(projectRoot));

checkPackageJson();
checkEnvFiles();

console.log('\n📊 File Statistics:');
const stats = getFileStats();
Object.entries(stats).forEach(([type, count]) => {
  const icon = type === 'js' ? '📄' : type === 'json' ? '⚙️' : 
               type === 'md' ? '📚' : type === 'test' ? '🧪' : '📋';
  console.log(`   ${icon} ${type.toUpperCase()}: ${count}`);
});

console.log('\n✨ Scan complete!');

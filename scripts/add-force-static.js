/**
 * This script adds the force-static export to all API routes
 */
const fs = require('fs');
const path = require('path');

// Path to the API routes directory
const apiDir = path.join(__dirname, '../src/app/api');

// Function to recursively process directories
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Recursively process subdirectories
      processDirectory(itemPath);
    } else if (item === 'route.ts' || item === 'route.js') {
      // Process route files
      addForceStatic(itemPath);
    }
  }
}

// Function to add force-static to a route file
function addForceStatic(filePath) {
  console.log(`Processing: ${filePath}`);
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if force-static is already added
  if (content.includes('export const dynamic = \'force-static\'') || 
      content.includes('export const dynamic = "force-static"')) {
    console.log(`  Already has force-static: ${filePath}`);
    return;
  }
  
  // Find the first import statement
  const importRegex = /^import.*?;/m;
  const importMatch = content.match(importRegex);
  
  if (importMatch) {
    // Add force-static after the first import
    const importStatement = importMatch[0];
    const importIndex = content.indexOf(importStatement) + importStatement.length;
    
    const newContent = 
      content.slice(0, importIndex) + 
      '\n\nexport const dynamic = \'force-static\';\n' + 
      content.slice(importIndex);
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, newContent);
    console.log(`  Added force-static: ${filePath}`);
  } else {
    console.log(`  No import statement found: ${filePath}`);
  }
}

// Start processing
console.log('Adding force-static to API routes...');
processDirectory(apiDir);
console.log('Done!'); 
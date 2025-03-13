/**
 * This script adds generateStaticParams to all dynamic API routes
 */
const fs = require('fs');
const path = require('path');

// Path to the API routes directory
const apiDir = path.join(__dirname, '../src/app/api');

// Function to recursively process directories
function processDirectory(dirPath, parentParams = []) {
  const items = fs.readdirSync(dirPath);
  
  // Check if this directory contains a route.ts file
  const routeFile = path.join(dirPath, 'route.ts');
  const hasRouteFile = fs.existsSync(routeFile);
  
  // Get the current directory name
  const dirName = path.basename(dirPath);
  
  // Check if this is a dynamic route (has brackets in the name)
  const isDynamicRoute = dirName.includes('[') && dirName.includes(']');
  
  // If this is a dynamic route with a route file, process it
  if (isDynamicRoute && hasRouteFile) {
    // Extract the parameter name from the route name
    const paramName = dirName.replace(/\[|\]/g, '');
    
    // Add this parameter to the list
    const currentParams = [...parentParams, paramName];
    
    // Process the route file
    addStaticParams(routeFile, currentParams);
  }
  
  // Recursively process subdirectories
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Pass along any parent parameters
      const currentParams = isDynamicRoute 
        ? [...parentParams, dirName.replace(/\[|\]/g, '')]
        : parentParams;
      
      processDirectory(itemPath, currentParams);
    }
  }
}

// Function to add generateStaticParams to a route file
function addStaticParams(filePath, paramNames) {
  console.log(`Processing dynamic route: ${filePath} with params: ${paramNames.join(', ')}`);
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if generateStaticParams is already added
  if (content.includes('export function generateStaticParams')) {
    console.log(`  Already has generateStaticParams: ${filePath}`);
    return;
  }
  
  // Create the return object for the function
  const paramsObject = paramNames.reduce((obj, param) => {
    obj[param] = 'placeholder';
    return obj;
  }, {});
  
  // Add generateStaticParams function
  const staticParamsFunc = `
export function generateStaticParams() {
  // This is a placeholder function to satisfy static export requirements
  // In a real app, you would generate all possible parameter values
  return [${JSON.stringify(paramsObject)}];
}
`;
  
  // Find the position to insert the function (after imports and exports)
  const lastImportIndex = content.lastIndexOf('import');
  const lastImportEndIndex = content.indexOf(';', lastImportIndex) + 1;
  
  // Find the position of the dynamic export
  const dynamicExportIndex = content.indexOf('export const dynamic');
  
  // Determine where to insert the function
  let insertIndex;
  if (dynamicExportIndex > -1) {
    // Insert after the dynamic export
    insertIndex = content.indexOf('\n', dynamicExportIndex) + 1;
  } else {
    // Insert after the last import
    insertIndex = lastImportEndIndex;
  }
  
  // Insert the function
  const newContent = 
    content.slice(0, insertIndex) + 
    staticParamsFunc + 
    content.slice(insertIndex);
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, newContent);
  console.log(`  Added generateStaticParams: ${filePath}`);
}

// Start processing
console.log('Adding generateStaticParams to dynamic API routes...');
processDirectory(apiDir);
console.log('Done!'); 
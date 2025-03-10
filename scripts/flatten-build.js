/**
 * This script takes the Next.js static export and flattens it
 * to work better with GoDaddy hosting
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const outDir = path.join(__dirname, '../out');
const tempDir = path.join(__dirname, '../flat-build');

console.log('Starting the flattening process...');

// Ensure temp directory exists
if (fs.existsSync(tempDir)) {
  console.log('Cleaning up previous temp directory...');
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

// First, check if the out directory exists
if (!fs.existsSync(outDir)) {
  console.error('Error: The "out" directory does not exist. Make sure to run "next build" first.');
  process.exit(1);
}

// Create a flat structure
console.log('Creating flat structure...');

// Function to copy files recursively but flatten the structure
function copyAndFlatten(sourcePath, destPath, isRoot = true) {
  const items = fs.readdirSync(sourcePath);
  
  for (const item of items) {
    const srcItemPath = path.join(sourcePath, item);
    const stats = fs.statSync(srcItemPath);
    
    // Skip the _next directory at the root level - we'll handle it specially
    if (isRoot && item === '_next') {
      continue;
    }
    
    if (stats.isDirectory()) {
      // For directories, recursively process but mark as not root
      copyAndFlatten(srcItemPath, destPath, false);
    } else {
      // For files, copy directly to destination
      const destFilePath = path.join(destPath, item);
      fs.copyFileSync(srcItemPath, destFilePath);
    }
  }
}

// Copy special Next.js folders - these need to maintain their structure
function copyNextFolder() {
  const nextSrcDir = path.join(outDir, '_next');
  const nextDestDir = path.join(tempDir, '_next');
  
  // Create _next directory
  fs.mkdirSync(nextDestDir, { recursive: true });
  
  // Use a system command to copy the directory structure - more reliable for large dirs
  try {
    if (process.platform === 'win32') {
      // Windows
      execSync(`xcopy "${nextSrcDir}" "${nextDestDir}" /E /I /H /Y`);
    } else {
      // macOS/Linux
      execSync(`cp -R "${nextSrcDir}/"* "${nextDestDir}/"`);
    }
    console.log('Successfully copied _next directory');
  } catch (error) {
    console.error('Error copying _next directory:', error);
  }
}

// Copy everything except _next with flattened structure
copyAndFlatten(outDir, tempDir);

// Copy _next directory with structure intact
copyNextFolder();

// Now replace the original out directory with our flattened version
console.log('Replacing original build with flattened version...');
fs.rmSync(outDir, { recursive: true, force: true });
fs.renameSync(tempDir, outDir);

// Create a .htaccess file to handle routing correctly
const htaccessContent = `# Ensure proper handling of files
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # If the request is not for an existing file, directory or symbolic link,
  # serve the requested HTML file or index.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteCond %{REQUEST_URI} !\\.[a-zA-Z0-9]{2,4}$
  RewriteRule (.*) $1.html [L]
  
  # If the .html version doesn't exist either, serve index.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Set correct MIME types
<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType text/css .css
  AddType image/svg+xml .svg
</IfModule>

# Enable CORS for font files
<FilesMatch "\\.(ttf|otf|eot|woff|woff2)$">
  <IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
  </IfModule>
</FilesMatch>

# Set caching for static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault "access plus 1 month"
  ExpiresByType text/html "access plus 1 hour"
  ExpiresByType text/css "access plus 1 week"
  ExpiresByType application/javascript "access plus 1 week"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType font/ttf "access plus 1 month"
  ExpiresByType font/otf "access plus 1 month"
  ExpiresByType font/woff "access plus 1 month"
  ExpiresByType font/woff2 "access plus 1 month"
</IfModule>
`;

// Write the .htaccess file
fs.writeFileSync(path.join(outDir, '.htaccess'), htaccessContent);

console.log('✅ Build flattening completed successfully!');
console.log(`The site is ready for deployment in: ${outDir}`); 
// Script to verify build output before Git commit
const fs = require('fs');
const path = require('path');

// Configuration
const outDir = path.resolve(__dirname, '../out');
const criticalFiles = [
  'index.html',
  '.htaccess',
  '_next',
  'index.php'
];

// Function to check if critical files exist
function checkCriticalFiles() {
  console.log('=== VERIFYING BUILD OUTPUT ===');
  
  if (!fs.existsSync(outDir)) {
    console.error(`❌ ERROR: Output directory "${outDir}" does not exist!`);
    console.log('   Run "npm run build" to generate the output directory.');
    return false;
  }
  
  console.log(`✅ Output directory exists: ${outDir}`);
  
  let missingFiles = [];
  
  // Check each critical file
  criticalFiles.forEach(file => {
    const filePath = path.join(outDir, file);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      console.log(`✅ Found: ${file}`);
    } else {
      console.log(`❌ Missing: ${file}`);
      missingFiles.push(file);
    }
  });
  
  let fixedAll = true;
  
  // Check for .htaccess specifically (hidden files need special handling)
  const htaccessPath = path.join(outDir, '.htaccess');
  if (!fs.existsSync(htaccessPath)) {
    console.log('ℹ️ Creating default .htaccess file...');
    
    const defaultHtaccess = `# Allow access to all files and directories
<Files *>
  Order allow,deny
  Allow from all
</Files>

<Directory />
  Options Indexes FollowSymLinks
  AllowOverride All
  Require all granted
</Directory>

# Ensure proper file handling
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # If the request is not for an existing file, directory or symbolic link,
  # serve the requested HTML file
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteCond %{REQUEST_URI} !\.[a-zA-Z0-9]{2,4}$
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
<FilesMatch "\.(ttf|otf|eot|woff|woff2)$">
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

# Default document
DirectoryIndex index.html index.php`;
    
    try {
      fs.writeFileSync(htaccessPath, defaultHtaccess);
      console.log('✅ Created: .htaccess');
      // Remove .htaccess from missing files list
      missingFiles = missingFiles.filter(file => file !== '.htaccess');
    } catch (error) {
      console.error(`❌ Failed to create .htaccess: ${error.message}`);
      fixedAll = false;
    }
  }
  
  // Create index.php if it doesn't exist
  const indexPhpPath = path.join(outDir, 'index.php');
  if (!fs.existsSync(indexPhpPath)) {
    console.log('ℹ️ Creating default index.php redirect file...');
    try {
      fs.writeFileSync(indexPhpPath, '<?php header("Location: index.html"); ?>');
      console.log('✅ Created: index.php');
      // Remove index.php from missing files list
      missingFiles = missingFiles.filter(file => file !== 'index.php');
    } catch (error) {
      console.error(`❌ Failed to create index.php: ${error.message}`);
      fixedAll = false;
    }
  }
  
  // Final check for any still-missing files
  const remainingMissing = missingFiles.filter(file => 
    !['index.php', '.htaccess'].includes(file)
  );
  
  if (remainingMissing.length === 0 && fixedAll) {
    console.log('\n✅ All critical files are present or were created successfully!');
    console.log('\nYou can now commit these files to Git and GoDaddy will deploy them correctly.');
    return true;
  } else {
    console.log('\n❌ Some critical files are still missing:');
    remainingMissing.forEach(file => console.log(`   - ${file}`));
    console.log('Please run "npm run build" to regenerate the output directory.');
    return false;
  }
}

// Run verification
const result = checkCriticalFiles();
if (!result) {
  process.exit(1);
} 
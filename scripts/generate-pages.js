const fs = require('fs');
const path = require('path');

const routes = [
  { path: '/', file: 'index.html' },
  { path: '/admin', file: 'admin.html' },
  { path: '/admin/dashboard', file: 'admin/dashboard.html' },
  { path: '/contact', file: 'contact.html' },
  { path: '/waitlist-confirmation', file: 'waitlist-confirmation.html' }
];

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFile(source, target) {
  try {
    ensureDirectoryExists(path.dirname(target));
    fs.copyFileSync(source, target);
    console.log(`✓ Generated: ${target}`);
  } catch (error) {
    console.error(`✗ Failed to generate ${target}:`, error.message);
  }
}

console.log('Starting page generation...');

const outDir = path.join(__dirname, '../out');
const nextDir = path.join(__dirname, '../.next/server/app');

routes.forEach(route => {
  const sourcePath = path.join(nextDir, route.path === '/' ? 'page.html' : `${route.path}/page.html`);
  const targetPath = path.join(outDir, route.file);
  
  if (fs.existsSync(sourcePath)) {
    copyFile(sourcePath, targetPath);
  } else {
    // If the source doesn't exist, create a basic HTML file that redirects to index
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Studio Clay</title>
  <script>window.location.href = '/';</script>
</head>
<body>
  <p>Redirecting to home page...</p>
</body>
</html>`;
    
    ensureDirectoryExists(path.dirname(targetPath));
    fs.writeFileSync(targetPath, html);
    console.log(`✓ Created redirect file: ${targetPath}`);
  }
});

console.log('✅ Page generation completed!'); 
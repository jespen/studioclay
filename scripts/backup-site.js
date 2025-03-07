/**
 * Backup script to create a ZIP archive of the built site
 * This runs after the build and creates a backup in the 'backups' directory
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure directories exist
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Get current date for filename
const now = new Date();
const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
const backupFileName = `studioclay_backup_${dateStr}_${timeStr}.zip`;
const backupPath = path.join(backupDir, backupFileName);

// Create zip archive of the out directory
try {
  console.log(`Creating backup of the site at ${backupPath}...`);
  
  // Check if out directory exists
  const outDir = path.join(__dirname, '../out');
  if (!fs.existsSync(outDir)) {
    console.error('Error: The "out" directory does not exist. Make sure to run "npm run export" first.');
    process.exit(1);
  }

  // Create zip archive
  if (process.platform === 'darwin' || process.platform === 'linux') {
    // macOS/Linux
    execSync(`cd "${outDir}" && zip -r "${backupPath}" .`);
  } else {
    // Windows
    // Using powershell's Compress-Archive
    execSync(`powershell -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${backupPath}' -Force"`);
  }
  
  console.log(`✅ Backup created successfully: ${backupPath}`);
  console.log(`Total size: ${(fs.statSync(backupPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  // Keep only the 5 most recent backups
  const files = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('studioclay_backup_'))
    .map(file => path.join(backupDir, file))
    .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
  
  if (files.length > 5) {
    console.log('Removing older backups to save space...');
    files.slice(5).forEach(file => {
      fs.unlinkSync(file);
      console.log(`Removed old backup: ${path.basename(file)}`);
    });
  }
} catch (error) {
  console.error('Error creating backup:', error);
  process.exit(1);
} 
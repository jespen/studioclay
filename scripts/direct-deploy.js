/**
 * Direct FTP Deployment Script for Studio Clay
 * 
 * This script builds the Next.js site, flattens the structure,
 * and deploys it directly to GoDaddy via FTP, bypassing Git deployment.
 */
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execPromise = promisify(exec);
const readline = require('readline');
const FtpClient = require('ftp');

// Configuration - Update these with your GoDaddy credentials
let config = {
  host: 'ftp.example.com', // Your GoDaddy FTP host
  user: 'username',         // Your GoDaddy username
  password: '',             // Will prompt for this
  remoteRoot: '/public_html', // Remote directory to upload to
  port: 21
};

const outDir = path.join(__dirname, '../out');
const tempDir = path.join(__dirname, '../flat-build');

// Function to build the Next.js site
async function buildSite() {
  console.log('Building Next.js site...');
  try {
    await execPromise('npm run build');
    console.log('✅ Site built successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error building site:', error);
    return false;
  }
}

// Function to flatten the site structure
async function flattenSite() {
  console.log('Flattening site structure...');
  try {
    // This should already be done by the postbuild script
    // But we'll check that the out directory exists
    if (!fs.existsSync(outDir)) {
      console.error('❌ Error: The "out" directory does not exist!');
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Error flattening site:', error);
    return false;
  }
}

// Function to prompt for password securely
function promptForPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Use * character for password masking
    const stdin = process.openStdin();
    process.stdout.write('Enter FTP password: ');
    
    let password = '';
    stdin.on('data', (char) => {
      char = char.toString();
      switch (char) {
        case "\n": case "\r": case "\u0004":
          stdin.pause();
          break;
        default:
          process.stdout.write('*');
          password += char;
          break;
      }
    });
    
    stdin.on('end', () => {
      console.log('\nPassword entered');
      resolve(password.trim());
    });
  });
}

// Function to prompt for FTP configuration
async function promptForConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  
  config.host = await question(`FTP Host [${config.host}]: `) || config.host;
  config.user = await question(`FTP Username [${config.user}]: `) || config.user;
  config.remoteRoot = await question(`Remote Directory [${config.remoteRoot}]: `) || config.remoteRoot;
  config.port = parseInt(await question(`FTP Port [${config.port}]: `)) || config.port;
  
  rl.close();
  
  // Prompt for password
  config.password = await promptForPassword();
}

// Function to upload files via FTP
async function uploadViaFTP() {
  console.log('Starting FTP upload...');
  
  const ftp = new FtpClient();
  
  // Get all files and directories to upload
  const filesToUpload = [];
  
  function readDirectoryRecursive(dir, baseDir = '') {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      const relativePath = path.join(baseDir, item);
      
      if (stats.isDirectory()) {
        filesToUpload.push({
          type: 'directory',
          path: relativePath,
          fullPath: itemPath
        });
        readDirectoryRecursive(itemPath, relativePath);
      } else {
        filesToUpload.push({
          type: 'file',
          path: relativePath,
          fullPath: itemPath
        });
      }
    }
  }
  
  readDirectoryRecursive(outDir);
  
  return new Promise((resolve, reject) => {
    ftp.on('ready', async () => {
      try {
        console.log(`Connected to FTP server at ${config.host}`);
        console.log(`Total files and directories to upload: ${filesToUpload.length}`);
        
        // First, create all directories
        for (const item of filesToUpload.filter(i => i.type === 'directory')) {
          try {
            const remotePath = path.join(config.remoteRoot, item.path).replace(/\\/g, '/');
            await new Promise((resolveDir, rejectDir) => {
              ftp.mkdir(remotePath, true, (err) => {
                if (err) {
                  console.warn(`Warning: Could not create directory ${remotePath}:`, err.message);
                } else {
                  console.log(`Created directory: ${remotePath}`);
                }
                resolveDir();
              });
            });
          } catch (err) {
            console.warn(`Warning: Error processing directory ${item.path}:`, err.message);
          }
        }
        
        // Then upload all files
        let uploaded = 0;
        for (const item of filesToUpload.filter(i => i.type === 'file')) {
          try {
            const remotePath = path.join(config.remoteRoot, item.path).replace(/\\/g, '/');
            await new Promise((resolveFile, rejectFile) => {
              ftp.put(item.fullPath, remotePath, (err) => {
                if (err) {
                  console.error(`Error uploading file ${remotePath}:`, err.message);
                  rejectFile(err);
                } else {
                  uploaded++;
                  if (uploaded % 10 === 0 || uploaded === filesToUpload.filter(i => i.type === 'file').length) {
                    console.log(`Uploaded ${uploaded}/${filesToUpload.filter(i => i.type === 'file').length} files`);
                  }
                  resolveFile();
                }
              });
            });
          } catch (err) {
            console.warn(`Warning: Error uploading file ${item.path}:`, err.message);
          }
        }
        
        console.log('✅ Upload completed successfully!');
        ftp.end();
        resolve(true);
      } catch (error) {
        console.error('❌ Error during FTP upload:', error);
        ftp.end();
        reject(error);
      }
    });
    
    ftp.on('error', (err) => {
      console.error('❌ FTP connection error:', err);
      reject(err);
    });
    
    // Connect to the FTP server
    ftp.connect(config);
  });
}

// Main function to run the deployment
async function deploy() {
  console.log('=== STARTING DIRECT DEPLOYMENT TO GODADDY ===');
  
  try {
    // Prompt for FTP configuration
    await promptForConfig();
    
    // Build the site
    const buildSuccess = await buildSite();
    if (!buildSuccess) {
      console.error('❌ Deployment failed at build stage');
      return;
    }
    
    // Flatten the site structure
    const flattenSuccess = await flattenSite();
    if (!flattenSuccess) {
      console.error('❌ Deployment failed at flatten stage');
      return;
    }
    
    // Upload via FTP
    const uploadSuccess = await uploadViaFTP();
    if (!uploadSuccess) {
      console.error('❌ Deployment failed at upload stage');
      return;
    }
    
    console.log('🎉 Deployment completed successfully!');
    console.log(`Your site is now live at: http://${config.host.replace('ftp.', '')}`);
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  }
}

// Run the deployment
deploy(); 
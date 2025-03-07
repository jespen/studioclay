/**
 * Simple FTP Deployment Script for Studio Clay
 * Using the more robust ftp-deploy package
 */

const FtpDeploy = require('ftp-deploy');
const ftpDeploy = new FtpDeploy();
const path = require('path');
const readline = require('readline');

// Default config - will be updated via prompts
let config = {
  user: "username",           // Your GoDaddy FTP username
  password: "",               // Will prompt for this
  host: "ftp.example.com",    // Your GoDaddy FTP host
  port: 21,
  localRoot: path.join(__dirname, "../out"), // Local out directory
  remoteRoot: "/public_html", // Remote directory on GoDaddy
  include: ["*", "**/*"],     // Include all files
  exclude: [],                // Don't exclude anything
  deleteRemote: true,         // Delete existing files on the remote
  forcePasv: true             // Use passive mode
};

// Function to prompt for configuration
async function promptForConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  
  console.log("=== FTP DEPLOYMENT CONFIGURATION ===");
  
  config.host = await question(`FTP Host [${config.host}]: `) || config.host;
  config.user = await question(`FTP Username [${config.user}]: `) || config.user;
  config.remoteRoot = await question(`Remote Directory [${config.remoteRoot}]: `) || config.remoteRoot;
  config.password = await question("FTP Password: ");
  
  const deleteRemote = await question(`Delete existing files on server? (yes/no) [${config.deleteRemote ? 'yes' : 'no'}]: `);
  if (deleteRemote.toLowerCase() === 'no') {
    config.deleteRemote = false;
  } else if (deleteRemote.toLowerCase() === 'yes') {
    config.deleteRemote = true;
  }
  
  rl.close();
}

// Main function to run the deployment
async function deploy() {
  console.log("=== STARTING SIMPLE FTP DEPLOYMENT ===");
  
  try {
    // Prompt for configuration
    await promptForConfig();
    
    console.log("Starting FTP deployment...");
    console.log(`Uploading from: ${config.localRoot}`);
    console.log(`Uploading to: ${config.host}${config.remoteRoot}`);
    
    // Set up event listeners
    ftpDeploy.on("uploading", function(data) {
      const progress = data.totalFilesCount ? 
        Math.round((data.transferredFileCount / data.totalFilesCount) * 100) : 0;
      console.log(`Uploading: ${data.filename} (${progress}% complete)`);
    });
    
    ftpDeploy.on("uploaded", function(data) {
      console.log(`Uploaded: ${data.filename}`);
    });
    
    ftpDeploy.on("log", function(data) {
      console.log(data);
    });
    
    ftpDeploy.on("upload-error", function(data) {
      console.error(`Error uploading: ${data.filename}`);
      console.error(data.err);
    });
    
    // Start the deployment
    await ftpDeploy.deploy(config);
    
    console.log("🎉 Deployment completed successfully!");
    console.log(`Your site is now live at: http://${config.host.replace('ftp.', '')}`);
  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
}

// Run the deployment
deploy(); 
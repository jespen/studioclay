// Simple script to start Next.js server
const { spawn } = require('child_process');
const path = require('path');

// Log startup
console.log('Starting Next.js server...');
console.log('Current directory:', process.cwd());

// Define port - use environment variable or default to 8080
const port = process.env.PORT || 8080;
console.log(`Using port: ${port}`);

// Start Next.js
const nextStart = spawn('node_modules/.bin/next', ['start', '-p', port.toString()], {
  stdio: 'inherit',
  shell: true
});

nextStart.on('close', (code) => {
  console.log(`Next.js process exited with code ${code}`);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  nextStart.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  nextStart.kill('SIGTERM');
  process.exit(0);
}); 
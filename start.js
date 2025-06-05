// Simple start script with explicit port configuration
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load settings to know which port to use
let primaryPort = 49494;
try {
  const settingsPath = path.join(__dirname, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (settings.serverSettings && settings.serverSettings.primaryPort) {
      primaryPort = settings.serverSettings.primaryPort;
      console.log(`✅ Using primaryPort ${primaryPort} from settings.json`);
    }
  }
} catch (err) {
  console.error('Error reading settings.json:', err);
}

// Launch the server with explicit port
console.log(`🚀 Starting SiLynkr on port ${primaryPort}...`);
const server = spawn('node', ['server.js'], {
  env: {
    ...process.env,
    PORT: primaryPort.toString(),
    NODE_ENV: process.env.NODE_ENV || 'development'
  },
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

console.log(`✓ Server process started with PID: ${server.pid}`); 
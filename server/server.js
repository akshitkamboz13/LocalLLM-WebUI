const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const net = require('net');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load settings from settings.json if available
let serverSettings = {
  primaryPort: 49494,
  fallbackPorts: [49049, 49994, 51951, 54321, 3006, 6969],
  portNames: {
    "49494": "Primary",
    "49049": "Fallback #1 (Mirror-style symmetry)",
    "49994": "Fallback #2 (Maxed out pattern)",
    "51951": "Fallback #3 (Si4k-inspired)",
    "54321": "Fallback #4 (Debug/Test)",
    "3006": "Dev environment",
    "6969": "UI Testing"
  }
};

try {
  const settingsPath = path.join(__dirname, '..', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    const settingsFile = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(settingsFile);
    if (settings.serverSettings) {
      console.log('✅ Loaded server settings from settings.json');
      serverSettings = settings.serverSettings;
    }
  }
} catch (error) {
  console.error('❌ Error loading settings.json:', error);
}

// Explicitly log any environment PORT variable overrides
const envPort = process.env.PORT;
if (envPort && envPort !== serverSettings.primaryPort.toString()) {
  console.log(`⚠️ Environment PORT=${envPort} is overriding settings.json primaryPort=${serverSettings.primaryPort}`);
}

// Port configuration from settings
const PRIMARY_PORT = parseInt(process.env.PORT || serverSettings.primaryPort.toString(), 10);
const FALLBACK_PORTS = serverSettings.fallbackPorts || [49049, 49994, 51951, 54321, 3006, 6969];
const PORT_NAMES = serverSettings.portNames || {
  "49494": "Primary",
  "49049": "Fallback #1",
  "49994": "Fallback #2",
  "51951": "Fallback #3",
  "54321": "Fallback #4",
  "3006": "Dev",
  "6969": "UI Testing"
};

// Check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Find an available port
async function findAvailablePort() {
  try {
    if (await isPortAvailable(PRIMARY_PORT)) {
      console.log(`✅ Primary port ${PRIMARY_PORT} is available`);
      const portStr = PRIMARY_PORT.toString();
      return { port: PRIMARY_PORT, name: PORT_NAMES[portStr] || "Primary" };
    }
    
    console.log(`⚠️ Primary port ${PRIMARY_PORT} is in use, trying fallbacks...`);
    
    for (const port of FALLBACK_PORTS) {
      if (await isPortAvailable(port)) {
        const portStr = port.toString();
        console.log(`✅ Using fallback port ${port}`);
        return { port, name: PORT_NAMES[portStr] || `Fallback (${port})` };
      }
      console.log(`⚠️ Fallback port ${port} is also in use`);
    }
    
    console.error('❌ No available ports found in the configured list!');
    return { port: 3000, name: 'Default fallback (3000)' };
  } catch (error) {
    console.error('Error checking port availability:', error);
    return { port: 3000, name: 'Error fallback (3000)' };
  }
}

const app = express();

// Initialize server
async function startServer() {
  const { port, name } = await findAvailablePort();
  
  // Middleware
  app.use(cors({
    origin: [`http://localhost:${port}`, 'http://localhost:3000'], // Allow both Next.js app URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }));
  app.use(express.json());
  
  // MongoDB Connection
  const MONGODB_URI = process.env.MONGODB_URI || '';
  
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('MongoDB connected');
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  } else {
    console.log('No MongoDB URI provided. The Next.js client will use local storage fallback.');
  }
  
  // Routes
  app.use('/api/conversations', require('./routes/conversations'));
  app.use('/api/folders', require('./routes/folders'));
  app.use('/api/tags', require('./routes/tags'));
  
  // Port info endpoint
  app.get('/api/server-info', (req, res) => {
    res.json({ port, name });
  });
  
  // Start server
  app.listen(port, () => {
    // Create a colorful port message
    const colorGreen = '\x1b[32m';
    const colorYellow = '\x1b[33m';
    const colorReset = '\x1b[0m';
    const colorBlue = '\x1b[34m';
    const boxChar = '█';
    
    console.log('\n');
    console.log(`${colorBlue}${boxChar.repeat(60)}${colorReset}`);
    console.log(`${colorGreen}SiLynkr API Server running! 🚀${colorReset}`);
    console.log(`${colorYellow}> Running on Port: ${port} (${name})${colorReset}`);
    console.log(`${colorGreen}> API URL: http://localhost:${port}${colorReset}`);
    console.log(`${colorBlue}${boxChar.repeat(60)}${colorReset}`);
    console.log('\n');
    
    // Store port info globally
    global.serverPort = { port, name };
  });
}

startServer();
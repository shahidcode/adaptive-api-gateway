// Steady Service - Mock Backend

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;
const SERVICE_NAME = 'Steady Service';

app.use(express.json());

// Request counter for generating IDs
let requestCount = 0;

// Simulate processing latency
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate mock user data
function generateUser(id) {
  return {
    id: id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    status: 'active',
    createdAt: new Date().toISOString()
  };
}

// GET /api/users
app.get('/api/users', async (req, res) => {
  const requestId = ++requestCount;
  const startTime = Date.now();
  
  // Simulate processing time: 50-100ms
  const latency = 50 + Math.random() * 50;
  await sleep(latency);
  
  // 0.5% chance of random error
  if (Math.random() < 0.005) {
    const processingTime = Date.now() - startTime;
    console.log(`[${SERVICE_NAME}] Request ${requestId} - ERROR 500 (${processingTime}ms)`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Random service error',
      requestId: requestId
    });
  }
  
  // Generate mock data
  const users = Array.from({ length: 10 }, (_, i) => generateUser(i + 1));
  
  const processingTime = Date.now() - startTime;
  console.log(`[${SERVICE_NAME}] Request ${requestId} - 200 OK (${processingTime}ms)`);
  
  res.json({
    service: SERVICE_NAME,
    data: users,
    count: users.length,
    requestId: requestId,
    processingTime: processingTime,
    timestamp: new Date().toISOString()
  });
});

// GET /api/users/:id
app.get('/api/users/:id', async (req, res) => {
  const requestId = ++requestCount;
  const userId = parseInt(req.params.id);
  
  // Simulate processing time: 30-80ms
  const latency = 30 + Math.random() * 50;
  await sleep(latency);
  
  res.json({
    service: SERVICE_NAME,
    data: generateUser(userId),
    requestId: requestId,
    processingTime: latency,
    timestamp: new Date().toISOString()
  });
});

// POST /api/users
app.post('/api/users', async (req, res) => {
  const requestId = ++requestCount;
  
  // Simulate processing time: 60-120ms (write operations slower)
  const latency = 60 + Math.random() * 60;
  await sleep(latency);
  
  const newUser = {
    id: Math.floor(Math.random() * 10000),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  console.log(`[${SERVICE_NAME}] Request ${requestId} - POST 201 (${latency}ms)`);
  
  res.status(201).json({
    service: SERVICE_NAME,
    data: newUser,
    requestId: requestId,
    processingTime: latency,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${SERVICE_NAME} started`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Characteristics: Low latency (50-100ms), <1% errors`);
  console.log(`   Endpoints:`);
  console.log(`     GET  /api/users`);
  console.log(`     GET  /api/users/:id`);
  console.log(`     POST /api/users`);
  console.log(`     GET  /health`);
  console.log(`\nReady to accept requests\n`);
});

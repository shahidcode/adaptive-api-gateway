// Slow Service - Mock Backend

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3002;
const SERVICE_NAME = 'Slow Service';

app.use(express.json());

// Request counter
let requestCount = 0;

// Simulate processing latency
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate mock order data
function generateOrder(id) {
  return {
    id: id,
    customerId: Math.floor(Math.random() * 1000),
    items: Math.floor(Math.random() * 5) + 1,
    total: (Math.random() * 500 + 50).toFixed(2),
    status: ['pending', 'processing', 'completed'][Math.floor(Math.random() * 3)],
    createdAt: new Date().toISOString()
  };
}

// GET /api/orders
app.get('/api/orders', async (req, res) => {
  const requestId = ++requestCount;
  const startTime = Date.now();
  
  // Simulate high latency: 500-2000ms
  const latency = 500 + Math.random() * 1500;
  await sleep(latency);
  
  // 10% chance of service error (simulating overload)
  if (Math.random() < 0.10) {
    const processingTime = Date.now() - startTime;
    console.log(`[${SERVICE_NAME}] Request ${requestId} - ERROR 503 (${processingTime}ms)`);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Service is experiencing high load',
      requestId: requestId,
      retryAfter: 5
    });
  }
  
  // 5% chance of timeout-like error
  if (Math.random() < 0.05) {
    const processingTime = Date.now() - startTime;
    console.log(`[${SERVICE_NAME}] Request ${requestId} - ERROR 500 (${processingTime}ms)`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Database query timeout',
      requestId: requestId
    });
  }
  
  // Generate mock data (slower operation)
  const orders = Array.from({ length: 20 }, (_, i) => generateOrder(i + 1));
  
  const processingTime = Date.now() - startTime;
  console.log(`[${SERVICE_NAME}] Request ${requestId} - 200 OK (${processingTime}ms)`);
  
  res.json({
    service: SERVICE_NAME,
    data: orders,
    count: orders.length,
    requestId: requestId,
    processingTime: processingTime,
    warning: 'Service experiencing degraded performance',
    timestamp: new Date().toISOString()
  });
});

// GET /api/orders/:id
app.get('/api/orders/:id', async (req, res) => {
  const requestId = ++requestCount;
  const orderId = parseInt(req.params.id);
  
  // Simulate high latency
  const latency = 400 + Math.random() * 1200;
  await sleep(latency);
  
  // 8% error rate
  if (Math.random() < 0.08) {
    console.log(`[${SERVICE_NAME}] Request ${requestId} - ERROR 500 (${latency}ms)`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch order details',
      requestId: requestId
    });
  }
  
  console.log(`[${SERVICE_NAME}] Request ${requestId} - 200 OK (${latency}ms)`);
  
  res.json({
    service: SERVICE_NAME,
    data: generateOrder(orderId),
    requestId: requestId,
    processingTime: latency,
    timestamp: new Date().toISOString()
  });
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  const requestId = ++requestCount;
  
  // Write operations are even slower: 800-2500ms
  const latency = 800 + Math.random() * 1700;
  await sleep(latency);
  
  // 12% error rate for writes
  if (Math.random() < 0.12) {
    console.log(`[${SERVICE_NAME}] Request ${requestId} - ERROR 503 (${latency}ms)`);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Unable to process order at this time',
      requestId: requestId
    });
  }
  
  const newOrder = {
    id: Math.floor(Math.random() * 100000),
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  console.log(`[${SERVICE_NAME}] Request ${requestId} - POST 201 (${latency}ms)`);
  
  res.status(201).json({
    service: SERVICE_NAME,
    data: newOrder,
    requestId: requestId,
    processingTime: latency,
    warning: 'Order processing delayed due to high load',
    timestamp: new Date().toISOString()
  });
});

// Health check (also slow!)
app.get('/health', async (req, res) => {
  // Even health check is slow
  await sleep(200 + Math.random() * 300);
  
  res.json({
    service: SERVICE_NAME,
    status: 'degraded',
    uptime: process.uptime(),
    warning: 'Service experiencing high latency',
    avgLatency: '1200ms',
    errorRate: '10%',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${SERVICE_NAME} started`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Characteristics: HIGH latency (500-2000ms), ~10% errors`);
  console.log(`   Purpose: Test adaptive rate limiting under degradation`);
  console.log(`   Endpoints:`);
  console.log(`     GET  /api/orders`);
  console.log(`     GET  /api/orders/:id`);
  console.log(`     POST /api/orders`);
  console.log(`     GET  /health`);
  console.log(`\nService in degraded state\n`);
});

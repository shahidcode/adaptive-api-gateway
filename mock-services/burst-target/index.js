// Burst Target Service - Mock Backend

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3003;
const SERVICE_NAME = 'Burst Target Service';

app.use(express.json());

// Concurrency tracking
const MAX_CONCURRENT = 50;
let currentConcurrent = 0;
let totalRequests = 0;
let rejectedRequests = 0;

// Request counter
let requestCount = 0;

// Simulate processing latency
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate mock product data
function generateProduct(id) {
  return {
    id: id,
    name: `Product ${id}`,
    category: ['Electronics', 'Clothing', 'Books', 'Home'][Math.floor(Math.random() * 4)],
    price: (Math.random() * 200 + 10).toFixed(2),
    inStock: Math.random() > 0.2,
    rating: (Math.random() * 2 + 3).toFixed(1)
  };
}

// Calculate latency based on current load
function calculateLatency() {
  const loadFactor = currentConcurrent / MAX_CONCURRENT;
  
  if (loadFactor < 0.5) {
    // Under 50% capacity: fast response
    return 50 + Math.random() * 50; // 50-100ms
  } else if (loadFactor < 0.8) {
    // 50-80% capacity: moderate slowdown
    return 100 + Math.random() * 100; // 100-200ms
  } else {
    // Over 80% capacity: significant degradation
    return 200 + Math.random() * 300; // 200-500ms
  }
}

// Middleware to track concurrency
app.use((req, res, next) => {
  totalRequests++;
  
  // Check if at capacity
  if (currentConcurrent >= MAX_CONCURRENT) {
    rejectedRequests++;
    const requestId = ++requestCount;
    
    console.log(`[${SERVICE_NAME}] Request ${requestId} - REJECTED 503 (concurrent: ${currentConcurrent}/${MAX_CONCURRENT})`);
    
    return res.status(503).json({
      error: 'Service Overloaded',
      message: 'Maximum concurrent requests reached',
      currentLoad: currentConcurrent,
      maxCapacity: MAX_CONCURRENT,
      requestId: requestId,
      retryAfter: 1
    });
  }
  
  // Accept request
  currentConcurrent++;
  
  // Cleanup when response finishes
  res.on('finish', () => {
    currentConcurrent--;
  });
  
  next();
});

// GET /api/products
app.get('/api/products', async (req, res) => {
  const requestId = ++requestCount;
  const startTime = Date.now();
  
  // Latency depends on current load
  const latency = calculateLatency();
  await sleep(latency);
  
  // 3% chance of random error (even when not overloaded)
  if (Math.random() < 0.03) {
    const processingTime = Date.now() - startTime;
    console.log(`[${SERVICE_NAME}] Request ${requestId} - ERROR 500 (${processingTime}ms, load: ${currentConcurrent}/${MAX_CONCURRENT})`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Random service error',
      requestId: requestId
    });
  }
  
  // Generate mock data
  const products = Array.from({ length: 15 }, (_, i) => generateProduct(i + 1));
  
  const processingTime = Date.now() - startTime;
  
  console.log(`[${SERVICE_NAME}] Request ${requestId} - 200 OK (${processingTime}ms, load: ${currentConcurrent}/${MAX_CONCURRENT})`);
  
  res.json({
    service: SERVICE_NAME,
    data: products,
    count: products.length,
    requestId: requestId,
    processingTime: processingTime,
    serverLoad: {
      current: currentConcurrent,
      max: MAX_CONCURRENT,
      utilizationPercent: Math.round((currentConcurrent / MAX_CONCURRENT) * 100)
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
  const requestId = ++requestCount;
  const productId = parseInt(req.params.id);
  
  const latency = calculateLatency();
  await sleep(latency);
  
  console.log(`[${SERVICE_NAME}] Request ${requestId} - 200 OK (${latency}ms, load: ${currentConcurrent}/${MAX_CONCURRENT})`);
  
  res.json({
    service: SERVICE_NAME,
    data: generateProduct(productId),
    requestId: requestId,
    processingTime: latency,
    serverLoad: {
      current: currentConcurrent,
      max: MAX_CONCURRENT
    },
    timestamp: new Date().toISOString()
  });
});

// POST /api/products
app.post('/api/products', async (req, res) => {
  const requestId = ++requestCount;
  
  // Write operations slower: 1.5x the read latency
  const latency = calculateLatency() * 1.5;
  await sleep(latency);
  
  const newProduct = {
    id: Math.floor(Math.random() * 10000),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  console.log(`[${SERVICE_NAME}] Request ${requestId} - POST 201 (${latency}ms, load: ${currentConcurrent}/${MAX_CONCURRENT})`);
  
  res.status(201).json({
    service: SERVICE_NAME,
    data: newProduct,
    requestId: requestId,
    processingTime: latency,
    serverLoad: {
      current: currentConcurrent,
      max: MAX_CONCURRENT
    },
    timestamp: new Date().toISOString()
  });
});

// GET /stats
app.get('/stats', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    stats: {
      currentConcurrent: currentConcurrent,
      maxConcurrent: MAX_CONCURRENT,
      utilizationPercent: Math.round((currentConcurrent / MAX_CONCURRENT) * 100),
      totalRequests: totalRequests,
      rejectedRequests: rejectedRequests,
      acceptedRequests: totalRequests - rejectedRequests,
      rejectionRate: totalRequests > 0 ? (rejectedRequests / totalRequests * 100).toFixed(2) + '%' : '0%'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  const utilizationPercent = (currentConcurrent / MAX_CONCURRENT) * 100;
  
  res.json({
    service: SERVICE_NAME,
    status: utilizationPercent > 80 ? 'degraded' : utilizationPercent > 50 ? 'warning' : 'healthy',
    uptime: process.uptime(),
    currentLoad: currentConcurrent,
    maxCapacity: MAX_CONCURRENT,
    utilizationPercent: Math.round(utilizationPercent),
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${SERVICE_NAME} started`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Characteristics: Load-dependent latency, ${MAX_CONCURRENT} concurrent limit`);
  console.log(`   Purpose: Test burst handling and adaptive response`);
  console.log(`   Endpoints:`);
  console.log(`     GET  /api/products`);
  console.log(`     GET  /api/products/:id`);
  console.log(`     POST /api/products`);
  console.log(`     GET  /stats`);
  console.log(`     GET  /health`);
  console.log(`\nReady for burst traffic\n`);
});

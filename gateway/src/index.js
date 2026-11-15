// Adaptive API Gateway

import express from 'express';
import cors from 'cors';
import { routeConfig, getRouteConfig, getAllRoutes } from './config/routes.js';
import { createProxy } from './proxy/handler.js';
import { MetricsCollector } from './metrics/collector.js';
import { SystemResourceMonitor } from './metrics/systemMonitor.js';
import { RateLimiterManager } from './middleware/rateLimiter/index.js';
import healthRouter from './routes/health.js';
import { createMetricsRouter } from './routes/metrics.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const clientId = req.headers['x-client-id'] || req.ip;
  console.log(`[${timestamp}] ${req.method} ${req.path} - Client: ${clientId}`);
  metricsCollector.addLog('INFO', 'Gateway', `${req.method} ${req.path} — client: ${clientId}`);
  next();
});

// Initialize metrics collector
const metricsCollector = new MetricsCollector();

// Initialize system resource monitor
const systemMonitor = new SystemResourceMonitor(metricsCollector);

// Initialize rate limiter manager
const rateLimiterManager = new RateLimiterManager(routeConfig, metricsCollector);

// Health check endpoint
app.use(healthRouter);

// Metrics endpoint
app.use(createMetricsRouter(metricsCollector, rateLimiterManager, systemMonitor));

// Set up proxies for each configured route
const configuredRoutes = getAllRoutes();
console.log('\nConfiguring routes:');

for (const route of configuredRoutes) {
  const config = routeConfig[route];
  
  console.log(`   ${route} -> ${config.target} [${config.rateLimit.algorithm}]`);
  
  // Apply rate limiting middleware
  app.use(route, (req, res, next) => {
    const clientId = req.headers['x-client-id'] || req.ip;
    
    const allowed = rateLimiterManager.allowRequest(clientId, route);
    
    if (!allowed) {
      const retryAfter = rateLimiterManager.getRetryAfter(clientId, route);
      
      res.set('X-RateLimit-Limit', rateLimiterManager.getCurrentLimit(route));
      res.set('X-RateLimit-Remaining', 0);
      res.set('Retry-After', retryAfter);

      metricsCollector.addLog('WARN', 'RateLimiter', `429 — ${route} — client: ${clientId} — retryAfter: ${retryAfter}s`);
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: retryAfter,
        route: route,
        clientId: clientId
      });
    }
    
    // Add rate limit headers
    res.set('X-RateLimit-Limit', rateLimiterManager.getCurrentLimit(route));
    res.set('X-RateLimit-Algorithm', config.rateLimit.algorithm);
    
    next();
  });
  
  // Apply proxy middleware
  app.use(route, createProxy(config.target, route, metricsCollector));
}

// 404 handler for unconfigured routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Route not configured in gateway',
    path: req.path,
    configuredRoutes: configuredRoutes
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Gateway Error]', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\nAdaptive API Gateway Started');
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Metrics: http://localhost:${PORT}/metrics`);
  console.log('\nConfigured Routes:');
  
  for (const route of configuredRoutes) {
    const config = routeConfig[route];
    console.log(`   ${route}`);
    console.log(`      Target: ${config.target}`);
    console.log(`      Algorithm: ${config.rateLimit.algorithm}`);
    console.log(`      Description: ${config.description}`);
  }
  
  console.log('\nGateway ready to accept requests\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});

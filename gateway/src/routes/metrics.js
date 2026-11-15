// Metrics endpoint for dashboard consumption

import express from 'express';

const router = express.Router();

// GET /metrics
export function createMetricsRouter(metricsCollector, rateLimiterManager, systemMonitor) {
  router.get('/metrics', (req, res) => {
    const allMetrics = metricsCollector.getAllMetrics();
    const rateLimitStatus = rateLimiterManager.getStatus();
    
    res.json({
      timestamp: Date.now(),
      routes: allMetrics,
      rateLimits: rateLimitStatus,
      gateway: {
        totalRequests: metricsCollector.getTotalRequests(),
        totalErrors: metricsCollector.getTotalErrors(),
        uptime: metricsCollector.getUptime()
      }
    });
  });

  // GET /metrics/system
  router.get('/metrics/system', (req, res) => {
    res.json(systemMonitor ? systemMonitor.getSnapshot() : { cpu: 0, memory: 0, disk: 0 });
  });

  // GET /metrics/logs
  router.get('/metrics/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 200;
    res.json({ logs: metricsCollector.getLogs(limit) });
  });
  
  // GET /metrics/:route
  router.get('/metrics/:route', (req, res) => {
    const route = '/' + req.params.route;
    const metrics = metricsCollector.getRouteMetrics(route);
    
    if (!metrics) {
      return res.status(404).json({
        error: 'Route not found',
        route: route
      });
    }
    
    res.json({
      timestamp: Date.now(),
      route: route,
      metrics: metrics
    });
  });
  
  return router;
}

export default createMetricsRouter;

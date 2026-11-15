// Metrics Collector

import { MetricsStore } from './store.js';

export class MetricsCollector {
  constructor(windowMs = 60000) {
    this.store = new MetricsStore(windowMs);
  }
  
  // Record a request
  recordRequest(route, latencyMs, isError, statusCode = 200) {
    this.store.record(route, latencyMs, isError, statusCode);
  }
  
  // Get health metrics for a route
  getRouteHealth(route) {
    return this.store.getRouteMetrics(route);
  }
  
  // Get metrics for a specific route
  getRouteMetrics(route) {
    return this.store.getRouteMetrics(route);
  }
  
  // Get all metrics
  getAllMetrics() {
    return this.store.getAllMetrics();
  }
  
  // Get total requests
  getTotalRequests() {
    return this.store.getTotalRequests();
  }
  
  // Get total errors
  getTotalErrors() {
    return this.store.getTotalErrors();
  }
  
  // Get uptime
  getUptime() {
    return this.store.getUptime();
  }
  
  // Get summary statistics across all routes
  getSummary() {
    const allMetrics = this.getAllMetrics();
    const routes = Object.keys(allMetrics);
    
    if (routes.length === 0) {
      return {
        totalRoutes: 0,
        totalRequests: 0,
        totalErrors: 0,
        avgErrorRate: 0,
        avgThroughput: 0
      };
    }
    
    let totalRequests = 0;
    let totalErrors = 0;
    let totalThroughput = 0;
    
    for (const route of routes) {
      const metrics = allMetrics[route];
      totalRequests += metrics.totalRequests;
      totalErrors += Math.round(metrics.errorRate * metrics.totalRequests);
      totalThroughput += metrics.throughput;
    }
    
    return {
      totalRoutes: routes.length,
      totalRequests: totalRequests,
      totalErrors: totalErrors,
      avgErrorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      avgThroughput: totalThroughput / routes.length
    };
  }
  
  // Add a structured log entry
  addLog(level, component, message) {
    this.store.addLog(level, component, message);
  }

  // Get recent log entries
  getLogs(limit = 200) {
    return this.store.getLogs(limit);
  }

  // Reset all metrics
  reset() {
    this.store.reset();
  }
  
  // Destroy collector
  destroy() {
    this.store.destroy();
  }
}

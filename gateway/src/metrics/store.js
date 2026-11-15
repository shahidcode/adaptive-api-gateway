// Metrics Storage

export class MetricsStore {
  constructor(windowMs = 60000) {
    this.windowMs = windowMs; // 60 seconds default
    
    // Map: route -> { latencies: [], errors: 0, successes: 0, statusCodes: {} }
    this.routeData = new Map();
    
    // Global counters
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.startTime = Date.now();
    
    // Structured log buffer (capped at 500 entries)
    this.logBuffer = [];
    this.maxLogSize = 500;
    
    // Cleanup old data every 10 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 10000);
  }

  // Append a structured log entry
  addLog(level, component, message) {
    const entry = {
      timestamp: Date.now(),
      level,
      component,
      message
    };
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxLogSize) {
      this.logBuffer.shift();
    }
  }

  // Return the last N log entries (default all)
  getLogs(limit = 200) {
    return this.logBuffer.slice(-limit);
  }
  
  // Record a request metric
  record(route, latencyMs, isError, statusCode) {
    const now = Date.now();
    
    // Get or create route data
    let data = this.routeData.get(route);
    if (!data) {
      data = {
        latencies: [],
        errors: 0,
        successes: 0,
        statusCodes: {},
        firstRequest: now,
        lastRequest: now
      };
      this.routeData.set(route, data);
    }
    
    // Record latency with timestamp
    data.latencies.push({
      timestamp: now,
      value: latencyMs
    });
    
    // Record error/success
    if (isError) {
      data.errors++;
      this.totalErrors++;
    } else {
      data.successes++;
    }
    
    // Track status codes
    data.statusCodes[statusCode] = (data.statusCodes[statusCode] || 0) + 1;
    
    // Update last request time
    data.lastRequest = now;
    
    // Global counter
    this.totalRequests++;
  }
  
  // Get metrics for a specific route
  getRouteMetrics(route) {
    const data = this.routeData.get(route);
    if (!data) {
      return null;
    }
    
    // Prune old data first
    this.pruneRouteData(data);
    
    const latencies = data.latencies.map(l => l.value).sort((a, b) => a - b);
    const total = data.errors + data.successes;
    
    if (latencies.length === 0) {
      return {
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 0,
        throughput: 0,
        totalRequests: total,
        statusCodes: data.statusCodes
      };
    }
    
    return {
      p50Latency: this.percentile(latencies, 50),
      p95Latency: this.percentile(latencies, 95),
      p99Latency: this.percentile(latencies, 99),
      errorRate: total > 0 ? data.errors / total : 0,
      throughput: (latencies.length / (this.windowMs / 1000)), // req/s
      totalRequests: total,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      minLatency: latencies[0],
      maxLatency: latencies[latencies.length - 1],
      statusCodes: { ...data.statusCodes }
    };
  }
  
  // Get all routes metrics
  getAllMetrics() {
    const metrics = {};
    
    for (const route of this.routeData.keys()) {
      metrics[route] = this.getRouteMetrics(route);
    }
    
    return metrics;
  }
  
  // Calculate percentile from sorted array
  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    
    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }
  
  // Prune old data from route
  pruneRouteData(data) {
    const cutoff = Date.now() - this.windowMs;
    
    data.latencies = data.latencies.filter(l => l.timestamp > cutoff);
  }
  
  // Cleanup old data from all routes
  cleanup() {
    const cutoff = Date.now() - this.windowMs;
    
    for (const [route, data] of this.routeData.entries()) {
      // Prune latencies
      data.latencies = data.latencies.filter(l => l.timestamp > cutoff);
      
      // Remove route if no recent activity
      if (data.latencies.length === 0 && (Date.now() - data.lastRequest) > this.windowMs * 2) {
        this.routeData.delete(route);
      }
    }
  }
  
  // Get total requests count
  getTotalRequests() {
    return this.totalRequests;
  }
  
  // Get total errors count
  getTotalErrors() {
    return this.totalErrors;
  }
  
  // Get uptime in seconds
  getUptime() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
  
  // Reset all metrics (for testing)
  reset() {
    this.routeData.clear();
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.startTime = Date.now();
  }
  
  // Destroy store (cleanup interval)
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Fixed Window Rate Limiter

export class FixedWindowRateLimiter {
  constructor(config) {
    this.maxRequests = config.maxRequests || 100;
    this.windowMs = config.windowMs || 60000; // 1 minute default
    
    // Map: key -> { count, windowStart }
    // key format: "clientId:route"
    this.windows = new Map();
    
    // Cleanup old windows every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }
  
  // Check if request is allowed
  allowRequest(clientId, route) {
    const key = `${clientId}:${route}`;
    const now = Date.now();
    const currentWindowStart = Math.floor(now / this.windowMs) * this.windowMs;
    
    let windowData = this.windows.get(key);
    
    // New window or first request
    if (!windowData || windowData.windowStart !== currentWindowStart) {
      windowData = {
        count: 0,
        windowStart: currentWindowStart
      };
      this.windows.set(key, windowData);
    }
    
    // Check if limit exceeded
    if (windowData.count >= this.maxRequests) {
      return false;
    }
    
    // Increment counter
    windowData.count++;
    return true;
  }
  
  // Get remaining requests in current window
  getRemaining(clientId, route) {
    const key = `${clientId}:${route}`;
    const now = Date.now();
    const currentWindowStart = Math.floor(now / this.windowMs) * this.windowMs;
    
    const windowData = this.windows.get(key);
    
    if (!windowData || windowData.windowStart !== currentWindowStart) {
      return this.maxRequests;
    }
    
    return Math.max(0, this.maxRequests - windowData.count);
  }
  
  // Get retry-after time in seconds
  getRetryAfter(clientId, route) {
    const key = `${clientId}:${route}`;
    const now = Date.now();
    const currentWindowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const windowEnd = currentWindowStart + this.windowMs;
    
    return Math.ceil((windowEnd - now) / 1000);
  }
  
  // Get current limit (fixed)
  getCurrentLimit() {
    return this.maxRequests;
  }
  
  // Get algorithm name
  getAlgorithm() {
    return 'fixed-window';
  }
  
  // Get status for metrics
  getStatus() {
    return {
      algorithm: this.getAlgorithm(),
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      activeWindows: this.windows.size
    };
  }
  
  // Cleanup old windows
  cleanup() {
    const now = Date.now();
    const cutoff = now - (this.windowMs * 2); // Keep 2 windows worth of data
    
    for (const [key, data] of this.windows.entries()) {
      if (data.windowStart < cutoff) {
        this.windows.delete(key);
      }
    }
  }
  
  // Destroy limiter (cleanup interval)
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
  
  // Reset all windows (for testing)
  reset() {
    this.windows.clear();
  }
}

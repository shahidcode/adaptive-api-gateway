// Rate Limiter Manager

import { FixedWindowRateLimiter } from './fixedWindow.js';
import { TokenBucketRateLimiter } from './tokenBucket.js';
import { AdaptiveRateLimiter } from './adaptiveController.js';

export class RateLimiterManager {
  constructor(routeConfig, metricsCollector) {
    this.limiters = new Map(); // route -> limiter instance
    this.metricsCollector = metricsCollector;
    
    // Initialize limiters for each route
    for (const [route, config] of Object.entries(routeConfig)) {
      this.limiters.set(route, this.createLimiter(route, config.rateLimit));
    }
  }
  
  // Create appropriate limiter based on algorithm
  createLimiter(route, config) {
    const algorithm = config.algorithm || 'token';
    
    switch (algorithm) {
      case 'fixed':
      case 'fixed-window':
        return new FixedWindowRateLimiter({
          maxRequests: config.maxRequests,
          windowMs: config.windowMs
        });
      
      case 'token':
      case 'token-bucket':
        return new TokenBucketRateLimiter({
          tokensPerInterval: config.tokensPerInterval,
          interval: config.interval,
          maxTokens: config.maxTokens
        });
      
      case 'adaptive':
        return new AdaptiveRateLimiter({
          tokensPerInterval: config.tokensPerInterval,
          interval: config.interval,
          maxTokens: config.maxTokens,
          adaptive: config.adaptive
        }, route, this.metricsCollector);
      
      default:
        console.warn(`Unknown algorithm "${algorithm}" for route ${route}, defaulting to token-bucket`);
        return new TokenBucketRateLimiter({
          tokensPerInterval: config.tokensPerInterval,
          interval: config.interval,
          maxTokens: config.maxTokens
        });
    }
  }
  
  // Check if request is allowed
  allowRequest(clientId, route) {
    const limiter = this.limiters.get(route);
    
    if (!limiter) {
      console.warn(`No limiter configured for route: ${route}`);
      return true; // Allow by default if no limiter
    }
    
    return limiter.allowRequest(clientId, route);
  }
  
  // Get remaining requests/tokens
  getRemaining(clientId, route) {
    const limiter = this.limiters.get(route);
    return limiter ? limiter.getRemaining(clientId, route) : 0;
  }
  
  // Get retry-after time
  getRetryAfter(clientId, route) {
    const limiter = this.limiters.get(route);
    return limiter ? limiter.getRetryAfter(clientId, route) : 0;
  }
  
  // Get current limit for route
  getCurrentLimit(route) {
    const limiter = this.limiters.get(route);
    return limiter ? limiter.getCurrentLimit() : 0;
  }
  
  // Get status of all limiters
  getStatus() {
    const status = {};
    
    for (const [route, limiter] of this.limiters.entries()) {
      status[route] = limiter.getStatus();
    }
    
    return status;
  }
  
  // Get limiter for a route (useful for testing)
  getLimiter(route) {
    return this.limiters.get(route);
  }
  
  // Destroy all limiters
  destroy() {
    for (const limiter of this.limiters.values()) {
      if (limiter.destroy) {
        limiter.destroy();
      }
    }
  }
  
  // Reset all limiters (for testing)
  reset() {
    for (const limiter of this.limiters.values()) {
      if (limiter.reset) {
        limiter.reset();
      }
    }
  }
}

// Export individual limiters for testing
export { FixedWindowRateLimiter } from './fixedWindow.js';
export { TokenBucketRateLimiter } from './tokenBucket.js';
export { AdaptiveRateLimiter } from './adaptiveController.js';

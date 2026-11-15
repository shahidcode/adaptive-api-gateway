// Token Bucket Rate Limiter

export class TokenBucketRateLimiter {
  constructor(config) {
    this.tokensPerInterval = config.tokensPerInterval || 50;
    this.interval = config.interval || 1000; // milliseconds
    this.maxTokens = config.maxTokens || 100;
    
    // Derived: tokens per millisecond
    this.refillRate = this.tokensPerInterval / this.interval;
    
    // Map: key -> { tokens, lastRefill }
    // key format: "clientId:route"
    this.buckets = new Map();
    
    // Cleanup old buckets every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }
  
  // Refill tokens for a bucket based on elapsed time
  refillTokens(bucket) {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    
    if (elapsed > 0) {
      const tokensToAdd = elapsed * this.refillRate;
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }
  
  // Check if request is allowed
  allowRequest(clientId, route) {
    const key = `${clientId}:${route}`;
    
    // Get or create bucket
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: this.maxTokens,
        lastRefill: Date.now()
      };
      this.buckets.set(key, bucket);
    }
    
    // Refill tokens
    this.refillTokens(bucket);
    
    // Check if token available
    if (bucket.tokens < 1) {
      return false;
    }
    
    // Consume token
    bucket.tokens -= 1;
    return true;
  }
  
  // Get remaining tokens
  getRemaining(clientId, route) {
    const key = `${clientId}:${route}`;
    const bucket = this.buckets.get(key);
    
    if (!bucket) {
      return this.maxTokens;
    }
    
    // Refill before checking
    this.refillTokens(bucket);
    return Math.floor(bucket.tokens);
  }
  
  // Get retry-after time in seconds
  getRetryAfter(clientId, route) {
    const key = `${clientId}:${route}`;
    const bucket = this.buckets.get(key);
    
    if (!bucket) {
      return 0;
    }
    
    // Refill before calculating
    this.refillTokens(bucket);
    
    // Time to get 1 token
    const tokensNeeded = 1 - bucket.tokens;
    if (tokensNeeded <= 0) return 0;
    
    const msToWait = tokensNeeded / this.refillRate;
    return Math.ceil(msToWait / 1000);
  }
  
  // Get current limit (tokens per second)
  getCurrentLimit() {
    return Math.floor(this.refillRate * 1000); // Convert to tokens per second
  }
  
  // Get algorithm name
  getAlgorithm() {
    return 'token-bucket';
  }
  
  // Get status for metrics
  getStatus() {
    return {
      algorithm: this.getAlgorithm(),
      tokensPerInterval: this.tokensPerInterval,
      interval: this.interval,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      activeBuckets: this.buckets.size
    };
  }
  
  // Cleanup stale buckets
  cleanup() {
    const now = Date.now();
    const staleTime = 300000; // 5 minutes
    
    for (const [key, bucket] of this.buckets.entries()) {
      // Remove buckets that haven't been accessed in 5 minutes
      if (now - bucket.lastRefill > staleTime) {
        this.buckets.delete(key);
      }
    }
  }
  
  // Destroy limiter (cleanup interval)
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
  
  // Reset all buckets (for testing)
  reset() {
    this.buckets.clear();
  }
  
  // Update refill rate (used by adaptive controller)
  setRefillRate(tokensPerSecond) {
    this.refillRate = tokensPerSecond / 1000; // Convert to tokens per ms
    this.tokensPerInterval = tokensPerSecond;
  }
  
  // Get refill rate (tokens per second)
  getRefillRate() {
    return this.refillRate * 1000;
  }
}

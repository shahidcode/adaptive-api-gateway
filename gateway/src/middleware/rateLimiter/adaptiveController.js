// Adaptive Rate Limiter

import { TokenBucketRateLimiter } from './tokenBucket.js';

export class AdaptiveRateLimiter extends TokenBucketRateLimiter {
  constructor(config, route, metricsCollector) {
    // Initialize base token bucket
    super({
      tokensPerInterval: config.tokensPerInterval,
      interval: config.interval,
      maxTokens: config.maxTokens
    });
    
    this.route = route;
    this.metricsCollector = metricsCollector;
    
    // Adaptive configuration
    const adaptive = config.adaptive || {};
    this.minRate = adaptive.minRate || 10;
    this.maxRate = adaptive.maxRate || 1000;
    this.adjustInterval = adaptive.adjustInterval || 5000; // 5 seconds
    this.latencyThresholdHigh = adaptive.latencyThresholdHigh || 200; // ms
    this.latencyThresholdLow = adaptive.latencyThresholdLow || 100; // ms
    this.errorThreshold = adaptive.errorThreshold || 0.05; // 5%
    this.decreaseFactor = adaptive.decreaseFactor || 0.8; // Reduce by 20%
    this.increaseFactor = adaptive.increaseFactor || 1.1; // Increase by 10%
    
    // Track adjustment history for debugging
    this.adjustmentHistory = [];
    this.maxHistorySize = 100;
    
    // Start adaptive adjustment loop
    this.adjustmentTimer = setInterval(() => {
      this.adjustRateLimit();
    }, this.adjustInterval);
    
    console.log(`[Adaptive] Initialized for route ${route} - Rate: ${this.getCurrentLimit()} req/s`);
  }
  
  // Adjust rate limit based on backend health
  adjustRateLimit() {
    if (!this.metricsCollector) {
      return;
    }
    
    const health = this.metricsCollector.getRouteHealth(this.route);
    
    // Skip if no data yet
    if (!health || health.totalRequests === 0) {
      return;
    }
    
    const currentRate = this.getRefillRate();
    let newRate = currentRate;
    let reason = 'stable';
    
    // Decision logic: Check for degradation first
    if (health.p95Latency > this.latencyThresholdHigh) {
      // Backend is slow - decrease rate
      newRate = currentRate * this.decreaseFactor;
      reason = `high_latency (p95: ${Math.round(health.p95Latency)}ms > ${this.latencyThresholdHigh}ms)`;
      
    } else if (health.errorRate > this.errorThreshold) {
      // Backend has errors - decrease rate more aggressively
      newRate = currentRate * (this.decreaseFactor * 0.9);
      reason = `high_error_rate (${(health.errorRate * 100).toFixed(2)}% > ${this.errorThreshold * 100}%)`;
      
    } else if (health.p95Latency < this.latencyThresholdLow && health.errorRate < this.errorThreshold * 0.5) {
      // Backend is healthy - increase rate
      newRate = currentRate * this.increaseFactor;
      reason = `healthy (p95: ${Math.round(health.p95Latency)}ms, errors: ${(health.errorRate * 100).toFixed(2)}%)`;
    }
    
    // Clamp to min/max bounds
    newRate = Math.max(this.minRate, Math.min(this.maxRate, newRate));
    
    // Only update if change is significant (>1% difference)
    const changePercent = Math.abs((newRate - currentRate) / currentRate);
    if (changePercent > 0.01) {
      this.setRefillRate(newRate);
      
      // Log adjustment
      const adjustment = {
        timestamp: Date.now(),
        route: this.route,
        oldRate: Math.round(currentRate),
        newRate: Math.round(newRate),
        change: Math.round(((newRate - currentRate) / currentRate) * 100),
        reason: reason,
        health: {
          p50: Math.round(health.p50Latency),
          p95: Math.round(health.p95Latency),
          p99: Math.round(health.p99Latency),
          errorRate: (health.errorRate * 100).toFixed(2),
          throughput: Math.round(health.throughput)
        }
      };
      
      this.adjustmentHistory.push(adjustment);
      
      // Keep history bounded
      if (this.adjustmentHistory.length > this.maxHistorySize) {
        this.adjustmentHistory.shift();
      }
      
      console.log(`[Adaptive] ${this.route}: ${adjustment.oldRate} → ${adjustment.newRate} req/s (${adjustment.change > 0 ? '+' : ''}${adjustment.change}%) - ${reason}`);

      // Emit structured log so dashboard can show it
      if (this.metricsCollector && this.metricsCollector.addLog) {
        const arrow = adjustment.change > 0 ? '▲' : '▼';
        this.metricsCollector.addLog(
          adjustment.change < 0 ? 'WARN' : 'INFO',
          'AdaptiveController',
          `${this.route}: ${adjustment.oldRate} ${arrow} ${adjustment.newRate} req/s (${adjustment.change > 0 ? '+' : ''}${adjustment.change}%) — ${reason}`
        );
      }
    }
  }
  
  // Get algorithm name
  getAlgorithm() {
    return 'adaptive';
  }
  
  // Get detailed status including adaptive state
  getStatus() {
    const baseStatus = super.getStatus();
    
    const health = this.metricsCollector 
      ? this.metricsCollector.getRouteHealth(this.route)
      : null;
    
    return {
      ...baseStatus,
      algorithm: 'adaptive',
      adaptive: {
        currentRate: Math.round(this.getRefillRate()),
        minRate: this.minRate,
        maxRate: this.maxRate,
        adjustInterval: this.adjustInterval,
        thresholds: {
          latencyHigh: this.latencyThresholdHigh,
          latencyLow: this.latencyThresholdLow,
          errorRate: this.errorThreshold
        }
      },
      backendHealth: health ? {
        p50Latency: Math.round(health.p50Latency),
        p95Latency: Math.round(health.p95Latency),
        p99Latency: Math.round(health.p99Latency),
        errorRate: health.errorRate,
        throughput: Math.round(health.throughput),
        totalRequests: health.totalRequests
      } : null,
      recentAdjustments: this.adjustmentHistory.slice(-5) // Last 5 adjustments
    };
  }
  
  // Get adjustment history (for analysis/debugging)
  getAdjustmentHistory() {
    return [...this.adjustmentHistory];
  }
  
  // Override destroy to cleanup adjustment timer
  destroy() {
    if (this.adjustmentTimer) {
      clearInterval(this.adjustmentTimer);
      this.adjustmentTimer = null;
    }
    super.destroy();
  }
  
  // Override reset to clear adjustment history
  reset() {
    super.reset();
    this.adjustmentHistory = [];
  }
  
  // Manually trigger rate adjustment (for testing)
  triggerAdjustment() {
    this.adjustRateLimit();
  }
  
  // Update adaptive configuration (for tuning experiments)
  updateConfig(newConfig) {
    if (newConfig.minRate !== undefined) this.minRate = newConfig.minRate;
    if (newConfig.maxRate !== undefined) this.maxRate = newConfig.maxRate;
    if (newConfig.latencyThresholdHigh !== undefined) this.latencyThresholdHigh = newConfig.latencyThresholdHigh;
    if (newConfig.latencyThresholdLow !== undefined) this.latencyThresholdLow = newConfig.latencyThresholdLow;
    if (newConfig.errorThreshold !== undefined) this.errorThreshold = newConfig.errorThreshold;
    if (newConfig.decreaseFactor !== undefined) this.decreaseFactor = newConfig.decreaseFactor;
    if (newConfig.increaseFactor !== undefined) this.increaseFactor = newConfig.increaseFactor;
    
    console.log(`[Adaptive] Config updated for route ${this.route}`);
  }
}

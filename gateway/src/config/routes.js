// Route configuration for the API Gateway

const STEADY_URL = process.env.STEADY_URL || 'http://localhost:3001';
const SLOW_URL   = process.env.SLOW_URL   || 'http://localhost:3002';
const BURST_URL  = process.env.BURST_URL  || 'http://localhost:3003';

export const routeConfig = {
  '/api/users': {
    target: STEADY_URL,
    description: 'User service - steady response times',
    rateLimit: {
      algorithm: 'adaptive', // 'fixed' | 'token' | 'adaptive'

      // Fixed Window settings
      // Set to 3000 per 60s (= 50 req/s) to match Token Bucket's tokensPerInterval
      // so all three algorithms operate at an equivalent throughput ceiling
      maxRequests: 3000,
      windowMs: 60000, // 1 minute

      // Token Bucket settings
      tokensPerInterval: 50,
      interval: 1000, // 1 second
      maxTokens: 100,

      // Adaptive settings
      adaptive: {
        minRate: 10,
        maxRate: 1000,
        adjustInterval: 5000,
        latencyThresholdHigh: 200,
        latencyThresholdLow: 100,
        errorThreshold: 0.05,
        decreaseFactor: 0.8,
        increaseFactor: 1.1
      }
    }
  },

  '/api/orders': {
    target: SLOW_URL,
    description: 'Order service - slow/degraded response times',
    rateLimit: {
      algorithm: 'adaptive',
      maxRequests: 2400,   // 40 req/s × 60s — matches tokensPerInterval: 40
      windowMs: 60000,
      tokensPerInterval: 40,
      interval: 1000,
      maxTokens: 80,
      adaptive: {
        minRate: 5,
        maxRate: 500,
        adjustInterval: 5000,
        latencyThresholdHigh: 300,
        latencyThresholdLow: 150,
        errorThreshold: 0.08,
        decreaseFactor: 0.7,
        increaseFactor: 1.05
      }
    }
  },

  '/api/products': {
    target: BURST_URL,
    description: 'Product service - burst target',
    rateLimit: {
      algorithm: 'adaptive',
      maxRequests: 3600,   // 60 req/s × 60s — matches tokensPerInterval: 60
      windowMs: 60000,
      tokensPerInterval: 60,
      interval: 1000,
      maxTokens: 150,
      adaptive: {
        minRate: 20,
        maxRate: 800,
        adjustInterval: 5000,
        latencyThresholdHigh: 200,
        latencyThresholdLow: 100,
        errorThreshold: 0.05,
        decreaseFactor: 0.8,
        increaseFactor: 1.15
      }
    }
  }
};

// Get route configuration by path
export function getRouteConfig(path) {
  // Find exact match first
  if (routeConfig[path]) {
    return routeConfig[path];
  }
  
  // Find prefix match
  for (const [route, config] of Object.entries(routeConfig)) {
    if (path.startsWith(route)) {
      return config;
    }
  }
  
  return null;
}

// Get all configured routes
export function getAllRoutes() {
  return Object.keys(routeConfig);
}

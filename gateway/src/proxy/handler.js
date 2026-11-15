// Request proxy handler

import { createProxyMiddleware } from 'http-proxy-middleware';

// Create a proxy middleware for a specific target
export function createProxy(targetUrl, route, metricsCollector) {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    
    // Record timing when request starts
    onProxyReq: (proxyReq, req, res) => {
      req.proxyStartTime = Date.now();
    },
    
    // Record metrics when response received
    onProxyRes: (proxyRes, req, res) => {
      const latency = Date.now() - req.proxyStartTime;
      const isError = proxyRes.statusCode >= 500;
      
      if (metricsCollector) {
        metricsCollector.recordRequest(route, latency, isError, proxyRes.statusCode);
      }
      
      // Add custom headers for debugging
      res.setHeader('X-Gateway-Latency', latency);
      res.setHeader('X-Gateway-Route', route);
    },
    
    // Handle proxy errors
    onError: (err, req, res) => {
      const latency = Date.now() - req.proxyStartTime;
      
      if (metricsCollector) {
        metricsCollector.recordRequest(route, latency, true, 503);
      }
      
      console.error(`[Proxy Error] Route: ${route}, Error: ${err.message}`);
      
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Backend service is not responding',
        route: route
      });
    },
    
    // Timeout after 10 seconds
    proxyTimeout: 10000
  });
}

// Manual proxy handler (alternative to middleware)
export async function manualProxy(req, res, targetUrl, route, metricsCollector) {
  const startTime = Date.now();
  const fullUrl = `${targetUrl}${req.path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;
  
  try {
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    
    const latency = Date.now() - startTime;
    const isError = response.status >= 500;
    
    if (metricsCollector) {
      metricsCollector.recordRequest(route, latency, isError, response.status);
    }
    
    // Copy response
    const body = await response.json().catch(() => ({}));
    
    res.status(response.status)
      .set('X-Gateway-Latency', latency)
      .set('X-Gateway-Route', route)
      .json(body);
      
  } catch (error) {
    const latency = Date.now() - startTime;
    
    if (metricsCollector) {
      metricsCollector.recordRequest(route, latency, true, 503);
    }
    
    console.error(`[Proxy Error] Route: ${route}, Error: ${error.message}`);
    
    res.status(503).json({
      error: 'Service Unavailable',
      message: error.message,
      route: route
    });
  }
}

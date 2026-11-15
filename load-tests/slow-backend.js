// Slow Backend Test

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const backendErrors = new Rate('backend_errors');
const rateLimited = new Rate('rate_limited');
const latencyTrend = new Trend('latency');
const timeoutErrors = new Counter('timeout_errors');

// Per-client counters for Jain's Fairness Index calculation
const clientCounters = {
  'slow-test-1': new Counter('reqs_slow_client_1'),
  'slow-test-2': new Counter('reqs_slow_client_2'),
  'slow-test-3': new Counter('reqs_slow_client_3'),
  'slow-test-4': new Counter('reqs_slow_client_4'),
};

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 15 },  // Ramp up
    { duration: '4m', target: 15 },   // Sustained load on slow service
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // Allow for slow backend
    'backend_errors': ['rate<0.15'],     // Backend errors should be controlled
  },
};

const BASE_URL = 'http://localhost:3000';
const CLIENT_IDS = ['slow-test-1', 'slow-test-2', 'slow-test-3', 'slow-test-4'];

export default function () {
  const clientId = CLIENT_IDS[Math.floor(Math.random() * CLIENT_IDS.length)];
  
  // Focus all traffic on slow service
  const endpoint = `${BASE_URL}/api/orders`;
  
  const params = {
    headers: {
      'X-Client-Id': clientId,
      'Content-Type': 'application/json',
    },
    tags: {
      route: 'orders',
      clientId: clientId,
    },
    timeout: '10s', // Allow for slow responses
  };
  
  const startTime = new Date().getTime();
  const response = http.get(endpoint, params);
  const latency = new Date().getTime() - startTime;
  
  latencyTrend.add(latency);
  
  const isSuccess = response.status === 200;
  const isRateLimited = response.status === 429;
  const isBackendError = response.status === 500 || response.status === 503;
  const isTimeout = response.status === 0; // Request timeout
  
  check(response, {
    'status is 200, 429, or 5xx': (r) => 
      r.status === 200 || r.status === 429 || r.status >= 500,
    'not timeout': (r) => r.status !== 0,
  });
  
  if (isRateLimited) {
    rateLimited.add(1);
    const retryAfter = response.headers['Retry-After'] || '?';
    console.log(`[RATE LIMITED] Client: ${clientId}, Retry-After: ${retryAfter}s, Current limit: ${response.headers['X-RateLimit-Limit']}`);
  } else {
    rateLimited.add(0);
  }
  
  if (isBackendError) {
    backendErrors.add(1);
    console.log(`[BACKEND ERROR] ${response.status} - Client: ${clientId}, Latency: ${latency}ms`);
  } else {
    backendErrors.add(0);
  }
  
  if (isTimeout) {
    timeoutErrors.add(1);
    console.log(`[TIMEOUT] Client: ${clientId}`);
  }
  
  errorRate.add(!isSuccess && !isRateLimited);

  // Increment per-client counter for fairness tracking
  clientCounters[clientId].add(1);
  
  // Log slow responses (even successful ones)
  if (isSuccess && latency > 1500) {
    console.log(`[SLOW RESPONSE] ${latency}ms - Client: ${clientId}, Limit: ${response.headers['X-RateLimit-Limit']}`);
  }
  
  // Realistic delay between requests
  sleep(0.3);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const rateLimitRate = metrics.rate_limited?.values.rate || 0;
  const backendErrorRate = metrics.backend_errors?.values.rate || 0;

  // Per-client counts for Jain's Fairness Index
  const perClient = [
    { clientId: 'slow-test-1', requests: metrics['reqs_slow_client_1']?.values?.count ?? 0 },
    { clientId: 'slow-test-2', requests: metrics['reqs_slow_client_2']?.values?.count ?? 0 },
    { clientId: 'slow-test-3', requests: metrics['reqs_slow_client_3']?.values?.count ?? 0 },
    { clientId: 'slow-test-4', requests: metrics['reqs_slow_client_4']?.values?.count ?? 0 },
  ];

  // Jain's Fairness Index: (Σxi)² / (n × Σxi²)
  const counts = perClient.map((c) => c.requests).filter((v) => v > 0);
  let jainsIndex = null;
  if (counts.length > 1) {
    const sum   = counts.reduce((a, b) => a + b, 0);
    const sumSq = counts.reduce((a, b) => a + b * b, 0);
    jainsIndex  = parseFloat(((sum * sum) / (counts.length * sumSq)).toFixed(4));
  }

  const summary = {
    test: 'slow-backend',
    timestamp: new Date().toISOString(),
    targetService: 'orders (slow service)',
    metrics: {
      totalRequests:       metrics.http_reqs.values.count,
      requestsPerSecond:   metrics.http_reqs.values.rate,
      rateLimited:         Math.round(rateLimitRate * metrics.http_reqs.values.count),
      rateLimitedPercent:  (rateLimitRate * 100).toFixed(2),
      backendErrors:       Math.round(backendErrorRate * metrics.http_reqs.values.count),
      backendErrorRate:    (backendErrorRate * 100).toFixed(2),
      timeouts:            metrics.timeout_errors?.values.count || 0,
      latency: {
        p50: metrics.http_req_duration.values['p(50)'],
        p95: metrics.http_req_duration.values['p(95)'],
        p99: metrics.http_req_duration.values['p(99)'],
        avg: metrics.http_req_duration.values.avg,
      },
    },
    fairness: {
      perClientThroughput: perClient,
      jainsIndex: jainsIndex,
      note: "Jain's Fairness Index — 1.0 = perfectly equal distribution across clients",
    },
    analysis: {
      adaptiveEffectiveness: backendErrorRate < 0.15 ? 'GOOD' : 'NEEDS_TUNING',
      protectionMechanism:   rateLimitRate > 0.1 ? 'ACTIVE' : 'INACTIVE',
    },
  };

  return {
    'results/slow-backend-summary.json': JSON.stringify(summary, null, 2),
    'stdout': textSummary(data, perClient, jainsIndex),
  };
}

function textSummary(data, perClient, jainsIndex) {
  const metrics = data.metrics;
  const rateLimitRate = metrics.rate_limited?.values.rate || 0;
  const backendErrorRate = metrics.backend_errors?.values.rate || 0;

  const clientRows = perClient
    .map((c) => `   ${c.clientId.padEnd(14)}${String(c.requests).padStart(5)} requests`)
    .join('\n');

  return `
======================================================
  SLOW BACKEND TEST RESULTS
======================================================
  Target: /api/orders (500-2000ms latency, 8-10% error rate)

Request Statistics:
   Total Requests:       ${metrics.http_reqs.values.count}
   Rate Limited (429):   ${Math.round(rateLimitRate * metrics.http_reqs.values.count)} (${(rateLimitRate * 100).toFixed(1)}%)
   Backend Errors (5xx): ${Math.round(backendErrorRate * metrics.http_reqs.values.count)} (${(backendErrorRate * 100).toFixed(1)}%)
   Timeouts:             ${metrics.timeout_errors?.values.count || 0}
   Requests/sec:         ${metrics.http_reqs.values.rate.toFixed(2)}

⏱Latency:
   p50: ${metrics.http_req_duration.values['p(50)'].toFixed(2)}ms
   p95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
   p99: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
   avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms

Per-Client Throughput:
${clientRows}

Jain's Fairness Index: ${jainsIndex !== null ? jainsIndex : 'N/A'}
   1.0 = perfectly equal  |  < 0.9 = uneven distribution

======================================================
`;
}

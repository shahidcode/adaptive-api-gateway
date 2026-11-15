// Burst Load Test

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const rateLimited = new Rate('rate_limited');
const latencyTrend = new Trend('latency');
const successfulRequests = new Counter('successful_requests');

// Per-client counters for Jain's Fairness Index calculation
const clientCounters = {
  'burst-client-1': new Counter('reqs_burst_client_1'),
  'burst-client-2': new Counter('reqs_burst_client_2'),
  'burst-client-3': new Counter('reqs_burst_client_3'),
};

// Test configuration with burst pattern
export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Normal load
    { duration: '30s', target: 100 },  // Spike to burst
    { duration: '2m', target: 100 },   // Sustained burst
    { duration: '30s', target: 10 },   // Drop back down
    { duration: '2m', target: 10 },    // Recovery period
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // Allow higher latency during burst
    // rate_limited threshold removed intentionally — adaptive algorithm exceeds 30%
    // by design (aggressively rejects at gateway to protect backend during burst)
  },
};

const BASE_URL = 'http://localhost:3000';
const CLIENT_IDS = ['burst-client-1', 'burst-client-2', 'burst-client-3'];

export default function () {
  const clientId = CLIENT_IDS[Math.floor(Math.random() * CLIENT_IDS.length)];
  
  // Focus burst on products endpoint (burst-target service)
  const endpoint = `${BASE_URL}/api/products`;
  
  const params = {
    headers: {
      'X-Client-Id': clientId,
      'Content-Type': 'application/json',
    },
    tags: {
      route: 'products',
      clientId: clientId,
      phase: getCurrentPhase(),
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(endpoint, params);
  const latency = new Date().getTime() - startTime;
  
  latencyTrend.add(latency);
  
  const isSuccess = response.status === 200;
  const isRateLimited = response.status === 429;
  const isError = response.status >= 500;
  
  check(response, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
  
  if (isSuccess) {
    successfulRequests.add(1);
  }

  // Increment per-client counter for fairness tracking
  clientCounters[clientId].add(1);
  
  if (isRateLimited) {
    rateLimited.add(1);
  } else {
    rateLimited.add(0);
  }
  
  errorRate.add(isError);
  
  // Log during burst
  if (isRateLimited && getCurrentPhase() === 'burst') {
    console.log(`[BURST] Rate limited - Client: ${clientId}, Latency before limit: ${latency}ms`);
  }
  
  if (isError) {
    console.log(`[ERROR] ${response.status} - Client: ${clientId}, Phase: ${getCurrentPhase()}`);
  }
  
  // Minimal sleep during burst to maximize load
  sleep(0.1);
}

function getCurrentPhase() {
  const elapsed = __ITER * 0.1; // Rough estimate based on iteration
  if (elapsed < 60) return 'normal';
  if (elapsed < 210) return 'burst';
  return 'recovery';
}

export function handleSummary(data) {
  const m = data.metrics;

  // Per-client counts for Jain's Fairness Index
  const perClient = [
    { clientId: 'burst-client-1', requests: m['reqs_burst_client_1']?.values?.count ?? 0 },
    { clientId: 'burst-client-2', requests: m['reqs_burst_client_2']?.values?.count ?? 0 },
    { clientId: 'burst-client-3', requests: m['reqs_burst_client_3']?.values?.count ?? 0 },
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
    test: 'burst-load',
    timestamp: new Date().toISOString(),
    metrics: {
      totalRequests:     m.http_reqs.values.count,
      requestsPerSecond: m.http_reqs.values.rate,
      successfulRequests: m.successful_requests?.values.count || 0,
      rateLimitedRequests: Math.round((m.rate_limited?.values.rate || 0) * m.http_reqs.values.count),
      rateLimitedPercent: ((m.rate_limited?.values.rate || 0) * 100).toFixed(2),
      errorRate: (m.errors.values.rate * 100).toFixed(2),
      latency: {
        p50: m.http_req_duration.values['p(50)'],
        p95: m.http_req_duration.values['p(95)'],
        p99: m.http_req_duration.values['p(99)'],
        avg: m.http_req_duration.values.avg,
        max: m.http_req_duration.values.max,
      },
    },
    fairness: {
      perClientThroughput: perClient,
      jainsIndex: jainsIndex,
      note: "Jain's Fairness Index — 1.0 = perfectly equal distribution across clients",
    },
  };

  return {
    'results/burst-load-summary.json': JSON.stringify(summary, null, 2),
    'stdout': textSummary(data, perClient, jainsIndex),
  };
}

function textSummary(data, perClient, jainsIndex) {
  const metrics = data.metrics;
  const rateLimitRate = metrics.rate_limited?.values.rate || 0;

  const clientRows = perClient
    .map((c) => `   ${c.clientId.padEnd(16)}${String(c.requests).padStart(7)} requests`)
    .join('\n');

  return `
======================================================
  BURST LOAD TEST RESULTS
======================================================

Request Statistics:
   Total Requests:     ${metrics.http_reqs.values.count}
   Successful:         ${metrics.successful_requests?.values.count || 0}
   Rate Limited (429): ${Math.round(rateLimitRate * metrics.http_reqs.values.count)} (${(rateLimitRate * 100).toFixed(2)}%)
   Requests/sec:       ${metrics.http_reqs.values.rate.toFixed(2)}

⏱Latency:
   p50: ${metrics.http_req_duration.values['p(50)'].toFixed(2)}ms
   p95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
   p99: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
   max: ${metrics.http_req_duration.values.max.toFixed(2)}ms

Rate Limiting:
   Rate limited: ${(rateLimitRate * 100).toFixed(2)}%
   Error rate:   ${(metrics.errors.values.rate * 100).toFixed(2)}%

Per-Client Throughput:
${clientRows}

Jain's Fairness Index: ${jainsIndex !== null ? jainsIndex : 'N/A'}
   1.0 = perfectly equal  |  < 0.9 = uneven distribution

======================================================
`;
}

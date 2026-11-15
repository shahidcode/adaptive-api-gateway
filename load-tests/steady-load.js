// Steady Load Test

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Overall metrics
const errorRate   = new Rate('errors');
const latencyTrend = new Trend('latency');

// One counter per client — incremented inside default(), readable in handleSummary
const clientCounters = {
  'client-1': new Counter('reqs_client_1'),
  'client-2': new Counter('reqs_client_2'),
  'client-3': new Counter('reqs_client_3'),
  'client-4': new Counter('reqs_client_4'),
  'client-5': new Counter('reqs_client_5'),
};

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // ramp up
    { duration: '3m',  target: 20 },  // sustained
    { duration: '30s', target: 0  },  // ramp down
  ],
  thresholds: {
    // /api/orders routes to the slow service (500-2000ms) so overall p95 will be high.
    // Threshold is set to 2500ms to avoid a false failure — per-route latency is
    // analysed from the dashboard and gateway metrics, not from this aggregate number.
    'http_req_duration': ['p(95)<2500'],
    'errors':            ['rate<0.15'],
  },
};

const BASE_URL  = 'http://localhost:3000';
const CLIENT_IDS = ['client-1', 'client-2', 'client-3', 'client-4', 'client-5'];

export default function () {
  const clientId = CLIENT_IDS[Math.floor(Math.random() * CLIENT_IDS.length)];

  // Traffic distribution: 50% users, 30% orders, 20% products
  const rand = Math.random();
  let endpoint, routeName;

  if (rand < 0.5) {
    endpoint  = `${BASE_URL}/api/users`;
    routeName = 'users';
  } else if (rand < 0.8) {
    endpoint  = `${BASE_URL}/api/orders`;
    routeName = 'orders';
  } else {
    endpoint  = `${BASE_URL}/api/products`;
    routeName = 'products';
  }

  const params = {
    headers: {
      'X-Client-Id':    clientId,
      'Content-Type':   'application/json',
    },
    tags: {
      route:    routeName,
      clientId: clientId,
    },
  };

  const startTime = Date.now();
  const response  = http.get(endpoint, params);
  const latency   = Date.now() - startTime;

  latencyTrend.add(latency);

  // Increment this client's dedicated counter
  clientCounters[clientId].add(1);

  const success = check(response, {
    'status is 200':      (r) => r.status === 200,
    'status is not 429':  (r) => r.status !== 429,
    'has response body':  (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!success);

  if (response.status === 429) {
    console.log(`[${routeName}] Rate limited — Client: ${clientId}, Retry-After: ${response.headers['Retry-After']}`);
  }
  if (response.status >= 500) {
    console.log(`[${routeName}] Server error ${response.status} — Client: ${clientId}`);
  }

  sleep(0.5);
}

// Summary — runs once after all VUs finish
export function handleSummary(data) {
  const m = data.metrics;

  // Read per-client request counts from the dedicated Counter metrics
  const counterKeys = {
    'client-1': 'reqs_client_1',
    'client-2': 'reqs_client_2',
    'client-3': 'reqs_client_3',
    'client-4': 'reqs_client_4',
    'client-5': 'reqs_client_5',
  };

  const perClient = Object.entries(counterKeys).map(([id, key]) => {
    const count = m[key]?.values?.count ?? 0;
    return { clientId: id, requests: count };
  });

  // Jain's Fairness Index: (Σxi)² / (n × Σxi²)
  const counts    = perClient.map((c) => c.requests).filter((v) => v > 0);
  let jainsIndex  = null;
  if (counts.length > 1) {
    const sum   = counts.reduce((a, b) => a + b, 0);
    const sumSq = counts.reduce((a, b) => a + b * b, 0);
    jainsIndex  = parseFloat(((sum * sum) / (counts.length * sumSq)).toFixed(4));
  }

  const summary = {
    test:      'steady-load',
    timestamp: new Date().toISOString(),
    algorithm: 'adaptive',
    metrics: {
      totalRequests:  m.http_reqs.values.count,
      requestsPerSec: parseFloat(m.http_reqs.values.rate.toFixed(2)),
      errorRate:      parseFloat((m.errors.values.rate * 100).toFixed(2)),
      latency: {
        p50: parseFloat(m.http_req_duration.values['p(50)'].toFixed(2)),
        p95: parseFloat(m.http_req_duration.values['p(95)'].toFixed(2)),
        p99: parseFloat(m.http_req_duration.values['p(99)'].toFixed(2)),
        avg: parseFloat(m.http_req_duration.values.avg.toFixed(2)),
        max: parseFloat(m.http_req_duration.values.max.toFixed(2)),
      },
    },
    fairness: {
      perClientThroughput: perClient,
      jainsIndex:          jainsIndex,
      note: "Jain's Fairness Index — 1.0 = perfectly equal distribution across all clients",
    },
  };

  return {
    // Path is relative to the directory k6 is run from (load-tests/)
    'results/steady-load-summary.json': JSON.stringify(summary, null, 2),
    'stdout': buildTextSummary(m, perClient, jainsIndex),
  };
}

function buildTextSummary(m, perClient, jainsIndex) {
  const clientRows = perClient
    .map((c) => `   ${c.clientId.padEnd(14)}${String(c.requests).padStart(5)} requests`)
    .join('\n');

  return `
======================================================
  STEADY LOAD TEST RESULTS
======================================================

Request Statistics
   Total Requests : ${m.http_reqs.values.count}
   Requests/sec   : ${m.http_reqs.values.rate.toFixed(2)}
   Error rate     : ${(m.errors.values.rate * 100).toFixed(2)}%

⏱  Latency
   p50 : ${m.http_req_duration.values['p(50)'].toFixed(2)} ms
   p95 : ${m.http_req_duration.values['p(95)'].toFixed(2)} ms
   p99 : ${m.http_req_duration.values['p(99)'].toFixed(2)} ms
   avg : ${m.http_req_duration.values.avg.toFixed(2)} ms

Per-Client Throughput
${clientRows}

Jain's Fairness Index : ${jainsIndex !== null ? jainsIndex : 'N/A'}
   1.0 = perfectly equal  |  < 0.9 = uneven distribution

======================================================
`;
}

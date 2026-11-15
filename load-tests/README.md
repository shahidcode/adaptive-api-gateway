# Load Testing Scripts

k6 load testing scripts for evaluating the Adaptive API Gateway performance under different scenarios.

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Other platforms:** See [k6 installation guide](https://k6.io/docs/getting-started/installation/)

### Verify Installation
```bash
k6 version
```

## Test Scenarios

### 1. Steady Load Test (`steady-load.js`)

**Purpose:** Establish baseline performance under constant traffic.

**Pattern:**
- Ramp up to 20 virtual users
- Maintain 20 VUs for 3 minutes
- Ramp down to 0

**Traffic Distribution:**
- 50% → `/api/users` (steady service)
- 30% → `/api/orders` (slow service)
- 20% → `/api/products` (burst target)

**Expected Results:**
- Users endpoint: high throughput, low latency
- Orders endpoint: adaptive reduces rate limit due to high latency
- Products endpoint: stable performance

**Run:**
```bash
k6 run steady-load.js
```

**Use Case:** Baseline for comparing adaptive vs fixed rate limiting.

---

### 2. Burst Load Test (`burst-load.js`)

**Purpose:** Test adaptive response to sudden traffic spikes.

**Pattern:**
- Normal: 10 VUs for 1 minute
- Burst: Spike to 100 VUs for 2.5 minutes
- Recovery: Drop to 10 VUs for 2 minutes

**Traffic Target:** Focused on `/api/products` (burst-target service)

**Expected Results:**
- **During burst:**
  - Latency increases as service approaches capacity (50 concurrent)
  - Adaptive controller detects degradation, reduces rate limit
  - Some 429 responses expected (protection mechanism)
  
- **After burst:**
  - Latency returns to normal
  - Adaptive controller increases rate limit
  - Demonstrates recovery behavior

**Run:**
```bash
k6 run burst-load.js
```

**Key Metrics:**
- Rate limited percentage (should be 10-30% during burst)
- p95 latency (should stay below 1000ms)
- Error rate (should be low, < 5%)

**Use Case:** Validates burst tolerance and adaptive recovery.

---

### 3. Slow Backend Test (`slow-backend.js`)

**Purpose:** Verify adaptive controller protects degraded services.

**Pattern:**
- Ramp up to 15 VUs
- Sustained load for 4 minutes
- Ramp down to 0

**Traffic Target:** All traffic to `/api/orders` (slow service with 500-2000ms latency)

**Expected Results:**
- **Adaptive algorithm:**
  - Detects high p95 latency (> 300ms threshold)
  - Reduces rate limit to protect backend
  - Rate limiting active (10-20% of requests)
  - Backend errors controlled (< 15%)
  
- **Fixed algorithm (for comparison):**
  - Continues at fixed rate
  - Backend overwhelmed
  - Higher backend error rate (8-10%)

**Run:**
```bash
k6 run slow-backend.js
```

**Key Metrics:**
- Backend error rate (should be < 15%)
- Rate limited percentage (should be > 10%)
- p95 latency (will be high due to backend, but controlled)

**Use Case:** Demonstrates adaptive protection of degraded backends.

---

## Running Tests

### Single Test
```bash
cd load-tests
k6 run steady-load.js
```

### All Tests in Sequence
```bash
k6 run steady-load.js && \
k6 run burst-load.js && \
k6 run slow-backend.js
```

### Save Results to File
```bash
k6 run --out json=results/steady-load.json steady-load.js
```

### Run with Custom Duration
```bash
k6 run --duration 5m steady-load.js
```

### Run with More VUs
```bash
k6 run --vus 50 steady-load.js
```

## Interpreting Results

### Success Metrics

**Steady Load:**
- p95 latency < 500ms
- Error rate < 10%
- Throughput stable

**Burst Load:**
- Rate limiting active during burst
- p95 latency < 1000ms
- Quick recovery after burst

**Slow Backend:**
- Rate limiting active (> 10%)
- Backend errors controlled (< 15%)
- Adaptive adjusts rate limit downward

### Comparing Algorithms

To compare adaptive vs fixed rate limiting:

1. **Configure gateway** to use fixed-window:
   ```javascript
   // gateway/src/config/routes.js
   algorithm: 'fixed'
   ```

2. **Run all tests** and save results

3. **Switch to adaptive:**
   ```javascript
   algorithm: 'adaptive'
   ```

4. **Run tests again**

5. **Compare:**
   - Throughput (adaptive should be similar or higher)
   - Error rate (adaptive should be lower during degradation)
   - p95 latency (adaptive should be more stable)
   - Burst recovery (adaptive should be faster)

## Understanding Output

### Console Output

```
  status is 200
  status is not 429
    ↳  70% — 350 / 150

  http_req_duration..........: avg=234ms p(95)=456ms
  http_reqs..................: 500 25/s
  errors.....................: 5% 25 475
```

**Interpretation:**
- 70% of requests succeeded (not rate limited)
- Average latency: 234ms
- p95 latency: 456ms
- 25 requests per second
- 5% error rate

### JSON Output

Results saved to `results/*.json` include:
- Per-metric statistics
- Percentiles (p50, p95, p99)
- Request counts and rates
- Threshold pass/fail status

## Monitoring During Tests

### Watch Dashboard
Open dashboard while running tests:
```bash
# Terminal 1: Start services + gateway
cd gateway && npm start

# Terminal 2: Start dashboard
cd dashboard && npm run dev

# Terminal 3: Run load test
cd load-tests && k6 run steady-load.js
```

Dashboard URL: `http://localhost:5173`

### Watch Gateway Logs
```bash
cd gateway && npm start
```

Look for adaptive adjustment messages:
```
[Adaptive] /api/orders: 40 → 32 req/s (-20%) - high_latency (p95: 1200ms > 300ms)
[Adaptive] /api/users: 50 → 55 req/s (+10%) - healthy (p95: 78ms, errors: 0.5%)
```

### Monitor Backend Services

Check burst-target service stats:
```bash
curl http://localhost:3003/stats
```

Output shows:
- Current concurrent requests
- Total/rejected requests
- Utilization percentage

## Troubleshooting

### "Connection refused" errors

**Problem:** Gateway not running

**Solution:**
```bash
cd gateway
npm install
npm start
```

### High error rates in all tests

**Problem:** Backend services not running

**Solution:**
```bash
# Terminal 1
cd mock-services/steady && npm install && npm start

# Terminal 2
cd mock-services/slow && npm install && npm start

# Terminal 3
cd mock-services/burst-target && npm install && npm start
```

### No rate limiting visible

**Problem:** Load not high enough to trigger limits

**Solution:** Increase VUs or decrease rate limits in gateway config

### Tests timeout

**Problem:** Backend services too slow

**Solution:** Increase timeout in test scripts:
```javascript
timeout: '30s'
```

## Advanced Usage

### Custom Metrics

Add custom metrics to tests:
```javascript
import { Counter } from 'k6/metrics';
const myMetric = new Counter('my_metric');

// In test function
myMetric.add(1);
```

### Scenarios

Define complex load patterns:
```javascript
export const options = {
  scenarios: {
    ramping: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
      ],
    },
  },
};
```

### Checks and Thresholds

Custom validation:
```javascript
check(response, {
  'custom check': (r) => r.json('field') === 'value',
});

thresholds: {
  'custom_metric': ['value<100'],
}
```

## Results Directory

Test results saved to `results/`:
```
results/
├── steady-load-summary.json
├── burst-load-summary.json
└── slow-backend-summary.json
```

Use for:
- Dissertation analysis
- Graphing in external tools
- Statistical comparison

## Next Steps

1. Run baseline tests with current configuration
2. Adjust adaptive thresholds in `gateway/src/config/routes.js`
3. Re-run tests and compare results
4. Generate graphs for dissertation
5. Document findings in evaluation section

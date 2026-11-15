# Mock Backend Services

Three lightweight Express services simulating different backend behaviors for testing the adaptive API gateway.

## Services Overview

| Service | Port | Latency | Error Rate | Purpose |
|---------|------|---------|------------|---------|
| **Steady** | 3001 | 50-100ms | <1% | Baseline healthy service |
| **Slow** | 3002 | 500-2000ms | 8-10% | Degraded service (high latency) |
| **Burst Target** | 3003 | 50-500ms* | 3% + overload | Capacity-limited service |

*Latency increases with concurrent load

## Running Services

### Individual Services

```bash
# Steady service
cd mock-services/steady
npm install
npm start

# Slow service
cd mock-services/slow
npm install
npm start

# Burst target service
cd mock-services/burst-target
npm install
npm start
```

### All Services at Once

```bash
# From Project/ directory
cd mock-services/steady && npm install && npm start &
cd mock-services/slow && npm install && npm start &
cd mock-services/burst-target && npm install && npm start &
```

## Service Details

### 1. Steady Service (Port 3001)

**Characteristics:**
- Consistent low latency: 50-100ms
- Very low error rate: 0.5%
- Predictable behavior
- Simulates healthy microservice

**Endpoints:**
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `GET /health` - Health check

**Expected Gateway Behavior:**
- Adaptive controller should **increase** rate limit over time
- Should maintain high throughput
- Low error rates in metrics

**Test Commands:**
```bash
# Via gateway
curl http://localhost:3000/api/users

# Direct
curl http://localhost:3001/api/users
```

---

### 2. Slow Service (Port 3002)

**Characteristics:**
- High latency: 500-2000ms (simulates database slowness)
- Elevated error rate: 8-10%
- Returns 503 (Service Unavailable) and 500 (Internal Server Error)
- Simulates degraded backend

**Endpoints:**
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create order (even slower: 800-2500ms)
- `GET /health` - Health check (also slow!)

**Expected Gateway Behavior:**
- Adaptive controller should **decrease** rate limit
- p95 latency will exceed threshold (200ms)
- Error rate exceeds threshold (5%)
- Gateway protects service from overload

**Test Commands:**
```bash
# Via gateway
curl http://localhost:3000/api/orders

# Direct
curl http://localhost:3002/api/orders
```

**Key Behavior:**
This service deliberately triggers the adaptive controller's protection mechanism. You should see rate limit decreasing in gateway logs:

```
[Adaptive] /api/orders: 40 → 32 req/s (-20%) - high_latency (p95: 1200ms > 300ms)
```

---

### 3. Burst Target Service (Port 3003)

**Characteristics:**
- Load-dependent latency:
  - <50% load: 50-100ms
  - 50-80% load: 100-200ms
  - >80% load: 200-500ms
- Max concurrent requests: 50
- Returns 503 when capacity exceeded
- Error rate: 3% baseline + overload rejections

**Endpoints:**
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `GET /stats` - Service statistics (load, rejections)
- `GET /health` - Health check

**Special Features:**
- Tracks concurrent request count
- Rejects requests when at capacity
- Response includes load information:
  ```json
  {
    "serverLoad": {
      "current": 42,
      "max": 50,
      "utilizationPercent": 84
    }
  }
  ```

**Expected Gateway Behavior:**
- During burst: latency increases, adaptive controller reduces rate
- After burst: latency normalizes, adaptive controller increases rate
- Tests burst tolerance and recovery

**Test Commands:**
```bash
# Via gateway
curl http://localhost:3000/api/products

# Check service stats
curl http://localhost:3003/stats
```

**Burst Test:**
```bash
# Generate burst with k6 (from load-tests/)
k6 run burst-load.js
```

---

## Testing Scenarios

### Scenario 1: Steady State
1. Start all three services
2. Start gateway
3. Send steady traffic: 100 req/s distributed across routes
4. **Expected:** Steady service maintains high rate limit, others adjust down

### Scenario 2: Degradation Response
1. Start services + gateway
2. Send traffic only to `/api/orders` (slow service)
3. **Expected:** Rate limit decreases over time, error rate stays low at gateway level

### Scenario 3: Burst Handling
1. Start services + gateway
2. Send burst to `/api/products`: 1000 req/s for 30 seconds
3. **Expected:** Rate limit drops during burst, recovers after

### Scenario 4: Mixed Load
1. Start services + gateway
2. Send different rates to each route simultaneously
3. **Expected:** Each route has independent rate limit based on its backend health

---

## Monitoring Endpoints

### Service Health
```bash
curl http://localhost:3001/health  # Steady
curl http://localhost:3002/health  # Slow
curl http://localhost:3003/health  # Burst
```

### Service Stats (Burst Target only)
```bash
curl http://localhost:3003/stats
```

### Gateway Metrics
```bash
curl http://localhost:3000/metrics
```

---

## Configuration

### Adjusting Service Behavior

Edit the service files to tune characteristics:

**Steady Service (`steady/index.js`):**
```javascript
const latency = 50 + Math.random() * 50;  // Adjust range
if (Math.random() < 0.005) {  // Adjust error rate
```

**Slow Service (`slow/index.js`):**
```javascript
const latency = 500 + Math.random() * 1500;  // Adjust latency
if (Math.random() < 0.10) {  // Adjust error rate
```

**Burst Target (`burst-target/index.js`):**
```javascript
const MAX_CONCURRENT = 50;  // Adjust capacity
```

---

## Troubleshooting

**Services won't start:**
```bash
# Check if ports are in use
lsof -i :3001
lsof -i :3002
lsof -i :3003

# Kill processes if needed
kill -9 <PID>
```

**Gateway can't reach services:**
- Verify services are running: check terminal output
- Test directly: `curl http://localhost:3001/health`
- Check firewall settings

**No adaptive behavior visible:**
- Ensure services are actually being called through gateway (port 3000)
- Check gateway logs for adjustment messages
- Verify metrics are being collected: `curl http://localhost:3000/metrics`

---

## Development

### Adding New Endpoints

1. Add route to service (e.g., `steady/index.js`)
2. Update gateway config (`gateway/src/config/routes.js`)
3. Restart both service and gateway

### Simulating New Behaviors

Example: Add random slowdowns to Steady service:
```javascript
// In steady/index.js
const latency = Math.random() < 0.1 
  ? 500  // 10% of requests slow
  : 50 + Math.random() * 50;  // Normal
```

---

## Architecture

```
┌──────────────────┐
│   API Gateway    │  Port 3000
│   (Adaptive RL)  │
└────────┬─────────┘
         │
    ┌────┴─────┬─────────┬─────────┐
    │          │         │         │
┌───▼────┐ ┌──▼─────┐ ┌─▼────────┐
│ Steady │ │  Slow  │ │  Burst   │
│ :3001  │ │ :3002  │ │  :3003   │
└────────┘ └────────┘ └──────────┘
 Fast   Slow    Load-dep
```

## Next Steps

1. Start all services
2. Start gateway (`cd gateway && npm start`)
3. Run load tests (`cd load-tests && k6 run steady-load.js`)
4. Monitor dashboard (coming next!)

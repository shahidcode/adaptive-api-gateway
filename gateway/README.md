# Adaptive API Gateway

An intelligent API Gateway with dynamic rate limiting based on real-time backend health metrics.

## Features

- **Multiple Rate Limiting Algorithms**: Fixed Window, Token Bucket, and Adaptive
- **Real-time Metrics Collection**: Latency (p50/p95/p99), error rates, throughput
- **Backend Health Monitoring**: Automatically adjusts rate limits based on service health
- **Configurable Routes**: Easy route-to-service mapping
- **RESTful Metrics API**: Dashboard-ready JSON endpoints

## Quick Start

### Installation

```bash
cd gateway
npm install
```

### Running the Gateway

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The gateway will start on port 3000 by default.

### Endpoints

- **Health Check**: `GET http://localhost:3000/health`
- **Metrics**: `GET http://localhost:3000/metrics`
- **Proxied Routes**:
  - `http://localhost:3000/api/users` → Port 3001 (Steady service)
  - `http://localhost:3000/api/orders` → Port 3002 (Slow service)
  - `http://localhost:3000/api/products` → Port 3003 (Burst service)

## Configuration

Edit `src/config/routes.js` to configure routes and rate limiting:

```javascript
export const routeConfig = {
  '/api/users': {
    target: 'http://localhost:3001',
    rateLimit: {
      algorithm: 'adaptive', // 'fixed' | 'token' | 'adaptive'
      adaptive: {
        minRate: 10,
        maxRate: 1000,
        latencyThresholdHigh: 200,
        errorThreshold: 0.05
      }
    }
  }
};
```

## Rate Limiting Algorithms

### Fixed Window
- Allows fixed number of requests per time window
- Simple but has edge-case burst issues

### Token Bucket
- Smooths traffic with token refill mechanism
- Constant refill rate

### Adaptive (Research Contribution)
- Dynamically adjusts rate based on backend health
- Monitors p95 latency and error rate
- Increases limit when healthy, decreases when degraded

## Client Identification

Provide `X-Client-Id` header for per-client rate limiting:

```bash
curl -H "X-Client-Id: user123" http://localhost:3000/api/users
```

Falls back to IP address if header is missing.

## Response Headers

All responses include:

- `X-RateLimit-Limit`: Current rate limit
- `X-RateLimit-Algorithm`: Algorithm in use
- `X-Gateway-Latency`: Backend response time (ms)
- `X-Gateway-Route`: Matched route

Rate-limited responses (429) also include:
- `X-RateLimit-Remaining`: 0
- `Retry-After`: Seconds to wait

## Architecture

```
Client Request
    ↓
Rate Limiter Middleware
    ↓
Metrics Collection
    ↓
Proxy to Backend
    ↓
Metrics Recording
    ↓
Response
```

## Development

### Prerequisites

- Node.js 20.x or higher
- Backend services running on ports 3001, 3002, 3003

### Project Structure

```
gateway/
├── src/
│   ├── config/           # Route configuration
│   ├── middleware/       # Rate limiters
│   ├── metrics/          # Metrics collection
│   ├── proxy/            # Request proxying
│   ├── routes/           # API routes
│   └── index.js          # Main entry point
├── package.json
└── README.md
```

## Testing

Start the gateway and make requests:

```bash
# Check health
curl http://localhost:3000/health

# Get metrics
curl http://localhost:3000/metrics

# Make proxied request
curl -H "X-Client-Id: test-client" http://localhost:3000/api/users
```

## Environment Variables

- `PORT`: Gateway port (default: 3000)

## License

MIT

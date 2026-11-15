# Adaptive Gateway Dashboard

Real-time monitoring dashboard for the Adaptive API Gateway built with React and Recharts.

## Features

- **Real-time Metrics**: Updates every 2 seconds
- **Rate Limit Visualization**: Shows current limits and adaptive adjustments
- **Service Health Monitoring**: p50/p95/p99 latency, error rates, throughput
- **Historical Charts**: Throughput, latency, and error rate trends
- **Adaptive Controller Status**: Backend health and recent adjustments

## Quick Start

### Installation

```bash
cd dashboard
npm install
```

### Running

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

**Prerequisites:** The API gateway must be running on port 3000.

## Dashboard Sections

### 1. Header
- Connection status (green = connected, red = disconnected)
- Gateway uptime
- Last update timestamp

### 2. Gateway Statistics
- Total Requests
- Total Errors
- Overall Error Rate

### 3. Rate Limits by Route
Shows for each route:
- Current rate limit
- Algorithm type (fixed-window, token-bucket, adaptive)
- For adaptive:
  - Min/max range
  - Backend health (p95 latency, error rate, throughput)
  - Recent adjustments

### 4. Service Health Overview
Color-coded health status cards:
- Healthy: p95 < 100ms, errors < 1%
- Warning: p95 < 200ms, errors < 5%
- Degraded: p95 > 200ms OR errors > 5%
- Critical: p95 > 200ms AND errors > 5%

Shows:
- p50/p95/p99 latency
- Error rate
- Throughput
- Total requests

### 5. Latency Percentiles Chart
Bar chart comparing p50/p95/p99 latency across all routes.

### 6. Time-Series Charts
- **Throughput**: Requests per second over time
- **p95 Latency**: 95th percentile latency over time
- **Error Rate**: Percentage of errors over time

## Configuration

### Change Gateway URL

Create a `.env` file:

```bash
VITE_GATEWAY_URL=http://localhost:3000
```

### Adjust Refresh Rate

Edit `src/App.jsx`:

```javascript
const REFRESH_INTERVAL = 2000; // milliseconds
```

### Change History Window

Edit `src/App.jsx`:

```javascript
const MAX_HISTORY_POINTS = 60; // number of data points to keep
```

## Development

### Project Structure

```
dashboard/
├── src/
│   ├── components/
│   │   ├── MetricsChart.jsx           # Reusable line chart
│   │   ├── RateLimitPanel.jsx         # Rate limit status cards
│   │   ├── ServiceHealthGrid.jsx      # Service health cards
│   │   └── LatencyPercentiles.jsx     # Latency bar chart
│   ├── services/
│   │   └── api.js                     # API client for gateway
│   ├── App.jsx                        # Main application
│   ├── main.jsx                       # React entry point
│   └── index.css                      # Global styles
├── index.html
├── vite.config.js
└── package.json
```

### Adding New Components

1. Create component in `src/components/`
2. Import in `App.jsx`
3. Pass metrics data as props

Example:
```jsx
import MyComponent from './components/MyComponent';

// In App.jsx
<MyComponent data={metrics?.routes} />
```

### Styling

Components use inline styles for simplicity. To use CSS:

1. Create `.css` file in same directory as component
2. Import in component: `import './MyComponent.css'`

## Troubleshooting

### Dashboard shows "Disconnected"

**Problem:** Can't reach gateway on port 3000

**Solutions:**
1. Verify gateway is running: `curl http://localhost:3000/health`
2. Check CORS settings in gateway
3. Check browser console for errors

### Charts not updating

**Problem:** Data fetching but charts frozen

**Solutions:**
1. Check browser console for React errors
2. Verify metrics format matches expected structure
3. Clear browser cache and refresh

### "No data available" messages

**Problem:** Gateway not returning metrics

**Solutions:**
1. Check gateway `/metrics` endpoint: `curl http://localhost:3000/metrics`
2. Generate some traffic to gateway first
3. Verify route configuration

## API Endpoints Used

- `GET /metrics` - All gateway metrics (main data source)
- `GET /health` - Gateway health status
- `GET /metrics/:route` - Route-specific metrics (not currently used)

## Performance Notes

- Dashboard polls gateway every 2 seconds
- Keeps last 60 data points (2 minutes of history)
- Old data automatically pruned to prevent memory growth
- Charts use virtualization for smooth rendering

## Build for Production

```bash
npm run build
```

Output in `dist/` directory. Serve with any static file server:

```bash
npm run preview
```

Or use with nginx, Apache, etc.

## Environment Variables

- `VITE_GATEWAY_URL` - Gateway base URL (default: http://localhost:3000)

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## License

MIT

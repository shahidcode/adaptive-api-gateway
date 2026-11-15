// Main Dashboard Application

import React, { useState, useEffect, useRef } from 'react';
import { fetchMetrics, fetchHealth, fetchSystemMetrics, fetchLogs } from './services/api';
import MetricsChart from './components/MetricsChart';
import RateLimitPanel from './components/RateLimitPanel';
import ServiceHealthGrid from './components/ServiceHealthGrid';
import LatencyPercentiles from './components/LatencyPercentiles';
import SystemResources from './components/SystemResources';
import SystemLogs from './components/SystemLogs';

const METRICS_INTERVAL   = 2000;  // 2 s
const SYSTEM_INTERVAL    = 5000;  // 5 s
const LOGS_INTERVAL      = 3000;  // 3 s
const MAX_HISTORY_POINTS = 60;    // 2 minutes of history at 2 s
const MAX_LOG_ENTRIES    = 200;

export default function App() {
  const [metrics, setMetrics]           = useState(null);
  const [health, setHealth]             = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [logs, setLogs]                 = useState([]);
  const [history, setHistory]           = useState([]);
  const [isConnected, setIsConnected]   = useState(false);
  const [error, setError]               = useState(null);

  // polling

  useEffect(() => {
    fetchData();
    fetchSysData();
    fetchLogData();

    const t1 = setInterval(fetchData,    METRICS_INTERVAL);
    const t2 = setInterval(fetchSysData, SYSTEM_INTERVAL);
    const t3 = setInterval(fetchLogData, LOGS_INTERVAL);

    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, []);

  async function fetchData() {
    try {
      const [metricsData, healthData] = await Promise.all([fetchMetrics(), fetchHealth()]);
      setMetrics(metricsData);
      setHealth(healthData);
      setIsConnected(true);
      setError(null);
      addToHistory(metricsData);
    } catch (err) {
      setIsConnected(false);
      setError(err.message);
    }
  }

  async function fetchSysData() {
    try {
      const data = await fetchSystemMetrics();
      setSystemMetrics(data);
    } catch {
      // non-critical — silently ignore
    }
  }

  async function fetchLogData() {
    try {
      const entries = await fetchLogs(MAX_LOG_ENTRIES);
      setLogs(entries);
    } catch {
      // non-critical
    }
  }

  function addToHistory(metricsData) {
    setHistory((prev) => {
      const point = { timestamp: metricsData.timestamp, routes: metricsData.routes };
      const updated = [...prev, point];
      return updated.length > MAX_HISTORY_POINTS ? updated.slice(-MAX_HISTORY_POINTS) : updated;
    });
  }

  // chart data prep

  const routeKeys = metrics?.routes ? Object.keys(metrics.routes) : [];

  const throughputData = history.map((p) => {
    const d = { timestamp: p.timestamp };
    Object.entries(p.routes).forEach(([r, m]) => { d[r] = m?.throughput?.toFixed(2) || 0; });
    return d;
  });

  const latencyData = history.map((p) => {
    const d = { timestamp: p.timestamp };
    Object.entries(p.routes).forEach(([r, m]) => { d[`${r}_p95`] = m?.p95Latency?.toFixed(2) || 0; });
    return d;
  });

  const errorRateData = history.map((p) => {
    const d = { timestamp: p.timestamp };
    Object.entries(p.routes).forEach(([r, m]) => { d[r] = ((m?.errorRate || 0) * 100).toFixed(2); });
    return d;
  });

  // render

  return (
    <div style={styles.app}>

      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Adaptive API Gateway - Dashboard</h1>
        <div style={styles.headerRight}>
          <span style={connectionStyle(isConnected)}>
            {isConnected ? '● Connected' : '● Disconnected'}
          </span>
          {health && (
            <span style={styles.uptime}>Uptime: {health.uptimeFormatted || `${health.uptime}s`}</span>
          )}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          {error}.
        </div>
      )}

      <main style={styles.main}>

        {/* Gateway stats bar */}
        {metrics?.gateway && (
          <div style={styles.statsBar}>
            {[
              { label: 'Total Requests', value: metrics.gateway.totalRequests?.toLocaleString() },
              { label: 'Total Errors',   value: metrics.gateway.totalErrors?.toLocaleString() },
              {
                label: 'Error Rate',
                value: metrics.gateway.totalRequests > 0
                  ? `${((metrics.gateway.totalErrors / metrics.gateway.totalRequests) * 100).toFixed(2)}%`
                  : '0%'
              },
              { label: 'Active Routes', value: routeKeys.length }
            ].map(({ label, value }) => (
              <div key={label} style={styles.statCard}>
                <div style={styles.statLabel}>{label}</div>
                <div style={styles.statValue}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Rate Limits */}
        <RateLimitPanel rateLimits={metrics?.rateLimits} routes={metrics?.routes} />

        {/* Service Health */}
        <ServiceHealthGrid routes={metrics?.routes} />

        {/* Latency Percentiles bar chart */}
        <LatencyPercentiles routes={metrics?.routes} />

        {/* Time-series charts */}
        <div style={styles.chartsGrid}>
          <MetricsChart
            title="Throughput (req/s)"
            data={throughputData}
            unit="req/s"
            dataKeys={routeKeys.map((r, i) => ({ key: r, name: r, color: CHART_COLORS[i % CHART_COLORS.length] }))}
          />
          <MetricsChart
            title="p95 Latency (ms)"
            data={latencyData}
            unit="ms"
            dataKeys={routeKeys.map((r, i) => ({ key: `${r}_p95`, name: r, color: CHART_COLORS[i % CHART_COLORS.length] }))}
          />
          <MetricsChart
            title="Error Rate (%)"
            data={errorRateData}
            unit="%"
            dataKeys={routeKeys.map((r, i) => ({ key: r, name: r, color: CHART_COLORS[i % CHART_COLORS.length] }))}
          />
        </div>

        {/* System Resources (donut charts) — below error rate chart */}
        <SystemResources systemMetrics={systemMetrics} />

        {/* System Logs */}
        <SystemLogs logs={logs} />

      </main>
    </div>
  );
}

// constants & helpers

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b'];

function connectionStyle(connected) {
  return {
    fontSize: '14px',
    fontWeight: '600',
    color: connected ? '#10b981' : '#ef4444'
  };
}

// inline styles

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  header: {
    backgroundColor: 'white',
    padding: '18px 40px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '700',
    color: '#111'
  },
  headerRight: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  },
  uptime: {
    fontSize: '14px',
    color: '#6b7280'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px 40px',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: '14px'
  },
  main: {
    padding: '28px 40px',
    maxWidth: '1440px',
    margin: '0 auto'
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '18px 20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    textAlign: 'center'
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '6px',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
    gap: '20px'
  }
};

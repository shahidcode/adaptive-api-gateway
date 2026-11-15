// ServiceHealthGrid Component

import React from 'react';

export default function ServiceHealthGrid({ routes }) {
  if (!routes || Object.keys(routes).length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Service Health</h3>
        <p style={styles.empty}>No service health data available</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Service Health Overview</h3>
      <div style={styles.grid}>
        {Object.entries(routes).map(([route, metrics]) => {
          if (!metrics) return null;
          
          const healthStatus = getHealthStatus(metrics);
          
          return (
            <div key={route} style={getCardStyle(healthStatus)}>
              <div style={styles.cardHeader}>
                <h4 style={styles.routeName}>{route}</h4>
                <span style={getStatusBadgeStyle(healthStatus)}>
                  {healthStatus}
                </span>
              </div>
              
              <div style={styles.metricsGrid}>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>p50</div>
                  <div style={styles.metricValue}>{metrics.p50Latency.toFixed(2)}ms</div>
                </div>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>p95</div>
                  <div style={getLatencyValueStyle(metrics.p95Latency)}>
                    {metrics.p95Latency.toFixed(2)}ms
                  </div>
                </div>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>p99</div>
                  <div style={styles.metricValue}>{metrics.p99Latency.toFixed(2)}ms</div>
                </div>
              </div>
              
              <div style={styles.separator} />
              
              <div style={styles.statsRow}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Error Rate:</span>
                  <span style={getErrorRateValueStyle(metrics.errorRate)}>
                    {(metrics.errorRate * 100).toFixed(2)}%
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Throughput:</span>
                  <span style={styles.statValue}>{metrics.throughput.toFixed(1)} req/s</span>
                </div>
              </div>
              
              <div style={styles.statsRow}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Total Requests:</span>
                  <span style={styles.statValue}>{metrics.totalRequests}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getHealthStatus(metrics) {
  if (!metrics) return 'unknown';
  
  const highLatency = metrics.p95Latency > 200;
  const highErrors = metrics.errorRate > 0.05;
  
  if (highLatency && highErrors) return 'critical';
  if (highLatency || highErrors) return 'degraded';
  if (metrics.p95Latency > 100) return 'warning';
  return 'healthy';
}

function getCardStyle(status) {
  const baseStyle = {
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: 'white',
    transition: 'all 0.3s ease'
  };
  
  switch (status) {
    case 'healthy':
      return { ...baseStyle, border: '2px solid #10b981' };
    case 'warning':
      return { ...baseStyle, border: '2px solid #f59e0b' };
    case 'degraded':
      return { ...baseStyle, border: '2px solid #f97316' };
    case 'critical':
      return { ...baseStyle, border: '2px solid #ef4444' };
    default:
      return { ...baseStyle, border: '2px solid #d1d5db' };
  }
}

function getStatusBadgeStyle(status) {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase'
  };
  
  switch (status) {
    case 'healthy':
      return { ...baseStyle, backgroundColor: '#d1fae5', color: '#065f46' };
    case 'warning':
      return { ...baseStyle, backgroundColor: '#fef3c7', color: '#92400e' };
    case 'degraded':
      return { ...baseStyle, backgroundColor: '#fed7aa', color: '#9a3412' };
    case 'critical':
      return { ...baseStyle, backgroundColor: '#fee2e2', color: '#991b1b' };
    default:
      return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151' };
  }
}

function getLatencyValueStyle(latency) {
  const baseStyle = { ...styles.metricValue, fontWeight: '700' };
  if (latency < 100) return { ...baseStyle, color: '#10b981' };
  if (latency < 200) return { ...baseStyle, color: '#f59e0b' };
  return { ...baseStyle, color: '#ef4444' };
}

function getErrorRateValueStyle(errorRate) {
  const baseStyle = { fontWeight: '600' };
  if (errorRate < 0.01) return { ...baseStyle, color: '#10b981' };
  if (errorRate < 0.05) return { ...baseStyle, color: '#f59e0b' };
  return { ...baseStyle, color: '#ef4444' };
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '20px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  routeName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#111'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '15px'
  },
  metricBox: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px'
  },
  metricValue: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#111'
  },
  separator: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '15px 0'
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  stat: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px'
  },
  statLabel: {
    color: '#6b7280',
    fontWeight: '500'
  },
  statValue: {
    color: '#111',
    fontWeight: '600'
  }
};

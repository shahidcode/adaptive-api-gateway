// RateLimitPanel Component

import React from 'react';

export default function RateLimitPanel({ rateLimits, routes }) {
  if (!rateLimits || Object.keys(rateLimits).length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Rate Limits</h3>
        <p style={styles.empty}>No rate limit data available</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Rate Limits by Route</h3>
      <div style={styles.grid}>
        {Object.entries(rateLimits).map(([route, limiter]) => {
          const metrics = routes[route];
          const isAdaptive = limiter.algorithm === 'adaptive';
          
          return (
            <div key={route} style={styles.card}>
              <div style={styles.cardHeader}>
                <h4 style={styles.routeName}>{route}</h4>
                <span style={getAlgorithmBadgeStyle(limiter.algorithm)}>
                  {limiter.algorithm}
                </span>
              </div>
              
              <div style={styles.metric}>
                <span style={styles.label}>Current Limit:</span>
                <span style={styles.value}>
                  {isAdaptive 
                    ? `${limiter.adaptive?.currentRate || 0} req/s`
                    : limiter.algorithm === 'fixed-window'
                    ? `${limiter.maxRequests || 0} / ${(limiter.windowMs || 0) / 1000}s`
                    : `${limiter.tokensPerInterval || 0} / ${(limiter.interval || 0) / 1000}s`
                  }
                </span>
              </div>
              
              {isAdaptive && limiter.adaptive && (
                <>
                  <div style={styles.metric}>
                    <span style={styles.label}>Range:</span>
                    <span style={styles.value}>
                      {limiter.adaptive.minRate} - {limiter.adaptive.maxRate} req/s
                    </span>
                  </div>
                  
                  {limiter.backendHealth && (
                    <div style={styles.healthSection}>
                      <div style={styles.healthTitle}>Backend Health</div>
                      <div style={styles.healthMetrics}>
                        <div style={styles.healthMetric}>
                          <span style={styles.healthLabel}>p95 Latency:</span>
                          <span style={getLatencyStyle(limiter.backendHealth.p95Latency)}>
                            {limiter.backendHealth.p95Latency}ms
                          </span>
                        </div>
                        <div style={styles.healthMetric}>
                          <span style={styles.healthLabel}>Error Rate:</span>
                          <span style={getErrorRateStyle(limiter.backendHealth.errorRate)}>
                            {(limiter.backendHealth.errorRate * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div style={styles.healthMetric}>
                          <span style={styles.healthLabel}>Throughput:</span>
                          <span style={styles.healthValue}>
                            {limiter.backendHealth.throughput} req/s
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {limiter.recentAdjustments && limiter.recentAdjustments.length > 0 && (
                    <div style={styles.adjustmentsSection}>
                      <div style={styles.adjustmentTitle}>
                        Recent Adjustment: {limiter.recentAdjustments[limiter.recentAdjustments.length - 1].reason}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getAlgorithmBadgeStyle(algorithm) {
  const baseStyle = {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase'
  };
  
  switch (algorithm) {
    case 'adaptive':
      return { ...baseStyle, backgroundColor: '#dcfce7', color: '#166534' };
    case 'token-bucket':
      return { ...baseStyle, backgroundColor: '#dbeafe', color: '#1e40af' };
    case 'fixed-window':
      return { ...baseStyle, backgroundColor: '#fef3c7', color: '#92400e' };
    default:
      return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151' };
  }
}

function getLatencyStyle(latency) {
  const baseStyle = { fontWeight: '600' };
  if (latency < 100) return { ...baseStyle, color: '#16a34a' };
  if (latency < 200) return { ...baseStyle, color: '#ea580c' };
  return { ...baseStyle, color: '#dc2626' };
}

function getErrorRateStyle(errorRate) {
  const baseStyle = { fontWeight: '600' };
  if (errorRate < 0.01) return { ...baseStyle, color: '#16a34a' };
  if (errorRate < 0.05) return { ...baseStyle, color: '#ea580c' };
  return { ...baseStyle, color: '#dc2626' };
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#fafafa'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid #e5e7eb'
  },
  routeName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#111'
  },
  metric: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px'
  },
  label: {
    color: '#666',
    fontWeight: '500'
  },
  value: {
    color: '#111',
    fontWeight: '600'
  },
  healthSection: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #e5e7eb'
  },
  healthTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  healthMetrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  healthMetric: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px'
  },
  healthLabel: {
    color: '#666'
  },
  healthValue: {
    color: '#111',
    fontWeight: '600'
  },
  adjustmentsSection: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #e5e7eb'
  },
  adjustmentTitle: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic'
  }
};

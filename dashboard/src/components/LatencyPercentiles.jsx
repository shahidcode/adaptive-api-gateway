// LatencyPercentiles Component

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function LatencyPercentiles({ routes }) {
  if (!routes || Object.keys(routes).length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <p>No latency data available</p>
      </div>
    );
  }

  const data = Object.entries(routes).map(([route, metrics]) => ({
    route: route.replace('/api/', ''),
    p50: metrics?.p50Latency?.toFixed(2) || 0,
    p95: metrics?.p95Latency?.toFixed(2) || 0,
    p99: metrics?.p99Latency?.toFixed(2) || 0
  }));

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Latency Percentiles by Route</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="route" />
          <YAxis label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="p50" name="p50" fill="#10b981" />
          <Bar dataKey="p95" name="p95" fill="#f59e0b" />
          <Bar dataKey="p99" name="p99" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
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
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  emptyContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    color: '#999',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  }
};

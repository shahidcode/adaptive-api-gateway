// SystemResources Component

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// helpers

function getColor(value, threshold) {
  if (value >= threshold) return '#ef4444';       // red — critical
  if (value >= threshold * 0.85) return '#f59e0b'; // amber — warning
  return '#10b981';                                 // green — healthy
}

function DonutChart({ value = 0, threshold = 80, label, unit = '%' }) {
  const used = Math.min(value, 100);
  const free = 100 - used;
  const color = getColor(used, threshold);

  const data = [
    { name: 'Used', value: used },
    { name: 'Free', value: free }
  ];

  // Custom tooltip shows "CPU: 42.0%"
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={tooltipStyle}>
          {payload[0].name}: {payload[0].value.toFixed(1)}{unit}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={styles.donutWrapper}>
      <div style={styles.donutLabel}>{label}</div>
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={true}
            >
              <Cell fill={color} />
              <Cell fill="#e5e7eb" />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre text */}
        <div style={{ ...styles.centreText, color }}>
          <span style={styles.centreValue}>{used.toFixed(1)}</span>
          <span style={styles.centreUnit}>{unit}</span>
        </div>
      </div>
      <div style={{ ...styles.thresholdLabel, color: '#6b7280' }}>
        Threshold: {threshold}{unit}
      </div>
    </div>
  );
}

// main component

export default function SystemResources({ systemMetrics }) {
  if (!systemMetrics) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>System Resources</h3>
        <p style={styles.empty}>Waiting for system data…</p>
      </div>
    );
  }

  const { cpu = 0, memory = 0, disk = 0, thresholds = {} } = systemMetrics;
  const cpuThreshold = thresholds.cpu ?? 80;
  const memThreshold = thresholds.memory ?? 85;
  const diskThreshold = thresholds.disk ?? 90;

  // Build alert list
  const alerts = [];
  if (cpu > cpuThreshold)    alerts.push(`CPU at ${cpu.toFixed(1)}% — above ${cpuThreshold}% threshold`);
  if (memory > memThreshold) alerts.push(`Memory at ${memory.toFixed(1)}% — above ${memThreshold}% threshold`);
  if (disk > diskThreshold)  alerts.push(`Disk at ${disk.toFixed(1)}% — above ${diskThreshold}% threshold`);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>System Resources</h3>

      {alerts.length > 0 && (
        <div style={styles.alertBanner}>
          {alerts.map((a, i) => (
            <div key={i} style={styles.alertItem}>{a}</div>
          ))}
        </div>
      )}

      <div style={styles.donutRow}>
        <DonutChart value={cpu}    threshold={cpuThreshold}  label="CPU Usage"    />
        <DonutChart value={memory} threshold={memThreshold}  label="Memory / RAM" />
        <DonutChart value={disk}   threshold={diskThreshold} label="Disk Usage"   />
      </div>
    </div>
  );
}

// styles

const tooltipStyle = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '6px 12px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#111'
};

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '20px'
  },
  alertBanner: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '6px',
    padding: '10px 16px',
    marginBottom: '16px'
  },
  alertItem: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#92400e',
    lineHeight: '1.8'
  },
  donutRow: {
    display: 'flex',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: '20px'
  },
  donutWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  donutLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  centreText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
    pointerEvents: 'none'
  },
  centreValue: {
    fontSize: '22px',
    fontWeight: '700',
    lineHeight: 1
  },
  centreUnit: {
    fontSize: '12px',
    fontWeight: '600'
  },
  thresholdLabel: {
    fontSize: '12px'
  }
};

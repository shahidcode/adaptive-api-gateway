// MetricsChart Component

import React from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush
} from 'recharts';

// Custom Tooltip

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div style={tooltipStyles.box}>
      <p style={tooltipStyles.time}>{new Date(label).toLocaleTimeString()}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={tooltipStyles.row}>
          <span style={{ ...tooltipStyles.dot, backgroundColor: entry.color }} />
          <span style={tooltipStyles.name}>{entry.name}:</span>
          <span style={tooltipStyles.value}>
            {Number(entry.value).toFixed(2)}{unit ? ` ${unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// Main Component

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a78bfa'];

export default function MetricsChart({ data, title, dataKeys, unit }) {
  if (!data || data.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>{title}</h3>
        <div style={styles.empty}>No data yet - start sending traffic to the gateway.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            {dataKeys.map((dk, i) => {
              const color = dk.color || COLORS[i % COLORS.length];
              return (
                <linearGradient key={dk.key} id={`grad-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

          <XAxis
            dataKey="timestamp"
            tickFormatter={(v) => new Date(v).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
            fontSize={11}
            stroke="#9ca3af"
          />
          <YAxis fontSize={11} stroke="#9ca3af" width={45} />

          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Legend wrapperStyle={{ fontSize: '13px' }} />

          {dataKeys.map((dk, i) => {
            const color = dk.color || COLORS[i % COLORS.length];
            return (
              <React.Fragment key={dk.key}>
                {/* Filled area beneath the line */}
                <Area
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.name}
                  stroke="none"
                  fill={`url(#grad-${dk.key})`}
                  isAnimationActive={false}
                  legendType="none"
                />
                {/* The actual line on top */}
                <Line
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.name}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, fill: color, stroke: 'white' }}
                  isAnimationActive={false}
                />
              </React.Fragment>
            );
          })}

          {/* Brush for zoom / pan — only show when there are enough points */}
          {data.length > 20 && (
            <Brush
              dataKey="timestamp"
              height={22}
              stroke="#e5e7eb"
              travellerWidth={6}
              tickFormatter={(v) => new Date(v).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
              startIndex={Math.max(0, data.length - 30)}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Styles

const tooltipStyles = {
  box: {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    minWidth: '160px'
  },
  time: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '600',
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '6px'
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
    fontSize: '13px'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0
  },
  name: {
    color: '#6b7280',
    flex: 1
  },
  value: {
    fontWeight: '700',
    color: '#111'
  }
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
    height: '280px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '14px'
  }
};

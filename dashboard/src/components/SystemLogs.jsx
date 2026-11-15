// SystemLogs Component

import React, { useEffect, useRef } from 'react';

const LEVEL_STYLES = {
  INFO:  { badge: { backgroundColor: '#dbeafe', color: '#1e40af' }, row: {} },
  WARN:  { badge: { backgroundColor: '#fef3c7', color: '#92400e' }, row: { backgroundColor: '#fffbeb' } },
  ERROR: { badge: { backgroundColor: '#fee2e2', color: '#991b1b' }, row: { backgroundColor: '#fff1f2' } }
};

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function SystemLogs({ logs = [] }) {
  const logBoxRef = useRef(null);

  // Scroll only inside the log box — never the page
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>System Logs</h3>
        <span style={styles.count}>{logs.length} entries</span>
      </div>

      <div style={styles.logBox} ref={logBoxRef}>
        {logs.length === 0 ? (
          <div style={styles.empty}>No log entries yet - start sending traffic to the gateway.</div>
        ) : (
          logs.map((entry, i) => {
            const ls = LEVEL_STYLES[entry.level] || LEVEL_STYLES.INFO;
            return (
              <div key={i} style={{ ...styles.row, ...ls.row }}>
                <span style={styles.time}>{formatTime(entry.timestamp)}</span>
                <span style={{ ...styles.badge, ...ls.badge }}>{entry.level}</span>
                <span style={styles.component}>[{entry.component}]</span>
                <span style={styles.message}>{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  count: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500'
  },
  logBox: {
    height: '280px',
    overflowY: 'auto',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    padding: '8px 0',
    fontFamily: '"Fira Code", "Courier New", monospace',
    fontSize: '12px'
  },
  empty: {
    padding: '20px',
    textAlign: 'center',
    color: '#9ca3af',
    fontFamily: 'inherit'
  },
  row: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    padding: '3px 12px',
    borderBottom: '1px solid #f3f4f6'
  },
  time: {
    color: '#9ca3af',
    whiteSpace: 'nowrap',
    minWidth: '76px'
  },
  badge: {
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: '700',
    fontSize: '10px',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap'
  },
  component: {
    color: '#6366f1',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  message: {
    color: '#1f2937',
    flex: 1,
    wordBreak: 'break-word'
  }
};

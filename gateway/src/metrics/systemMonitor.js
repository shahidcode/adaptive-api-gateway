// SystemResourceMonitor

import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';

// Thresholds (%) — alerts appear in the dashboard when exceeded
const THRESHOLDS = {
  cpu: 80,
  memory: 85,
  disk: 90
};

export class SystemResourceMonitor {
  constructor(metricsCollector, intervalMs = 2000) {
    this.metricsCollector = metricsCollector;
    this.intervalMs = intervalMs;

    this._prevCpuTimes = this._readCpuTimes();
    this._cache = { cpu: 0, memory: 0, disk: 0, thresholds: THRESHOLDS };

    // Start polling immediately
    this._timer = setInterval(() => this._poll(), this.intervalMs);
    this._poll(); // first reading right away
  }

  // public API

  // Return the latest snapshot
  getSnapshot() {
    return { ...this._cache, timestamp: Date.now() };
  }

  destroy() {
    clearInterval(this._timer);
  }

  // private

  _poll() {
    const cpu = this._cpuPercent();
    const memory = this._memoryPercent();
    const disk = this._diskPercent();

    this._cache = { cpu, memory, disk, thresholds: THRESHOLDS };

    // Log threshold breaches to the structured log buffer
    if (cpu > THRESHOLDS.cpu) {
      this.metricsCollector.addLog('WARN', 'SystemMonitor', `CPU at ${cpu.toFixed(1)}% — above ${THRESHOLDS.cpu}% threshold`);
    }
    if (memory > THRESHOLDS.memory) {
      this.metricsCollector.addLog('WARN', 'SystemMonitor', `Memory at ${memory.toFixed(1)}% — above ${THRESHOLDS.memory}% threshold`);
    }
    if (disk > THRESHOLDS.disk) {
      this.metricsCollector.addLog('WARN', 'SystemMonitor', `Disk at ${disk.toFixed(1)}% — above ${THRESHOLDS.disk}% threshold`);
    }
  }

  // CPU % since last sample (averaged across all cores)
  _cpuPercent() {
    const current = this._readCpuTimes();
    const prev = this._prevCpuTimes;
    this._prevCpuTimes = current;

    let idleDelta = 0;
    let totalDelta = 0;

    for (let i = 0; i < current.length; i++) {
      idleDelta += current[i].idle - (prev[i]?.idle ?? 0);
      totalDelta += current[i].total - (prev[i]?.total ?? 0);
    }

    if (totalDelta === 0) return this._cache.cpu; // no change yet
    return parseFloat((100 - (100 * idleDelta) / totalDelta).toFixed(1));
  }

  _readCpuTimes() {
    return os.cpus().map((cpu) => {
      const t = cpu.times;
      return {
        idle: t.idle,
        total: t.user + t.nice + t.sys + t.idle + t.irq
      };
    });
  }

  // Memory usage %
  _memoryPercent() {
    const total = os.totalmem();

    if (process.platform === 'darwin') {
      try {
        const vmstat = execSync('vm_stat', { timeout: 1000 }).toString();
        const pageSize = parseInt(vmstat.match(/page size of (\d+)/)?.[1] ?? '16384');

        const get = (label) => {
          // vm_stat lines end with a period, e.g. "Pages free:  20655."
          // The \. is required — without it \d+ greedily matches digits
          // from unrelated lines and produces wrong values.
          const m = vmstat.match(new RegExp(`${label}:\\s+(\\d+)\\.`));
          return m ? parseInt(m[1]) * pageSize : 0;
        };

        const available =
          get('Pages free') +
          get('Pages inactive') +
          get('Pages speculative');

        const used = Math.max(0, total - available);
        return parseFloat(((used / total) * 100).toFixed(1));
      } catch {
        // vm_stat unavailable — fall through to standard calculation
      }
    }

    // Linux / fallback: os.freemem() is accurate
    const free = os.freemem();
    return parseFloat(((1 - free / total) * 100).toFixed(1));
  }

  // Disk usage % for the root filesystem
  _diskPercent() {
    // Primary: parse `df -k /` — accurate on both macOS and Linux
    try {
      const dfOut = execSync('df -k /', { timeout: 1000 }).toString();
      // df output (line 2): Filesystem  1K-blocks  Used  Available  Capacity ...
      // "Capacity" column is already a percentage string like "3%"
      const capacityMatch = dfOut.match(/(\d+)%/);
      if (capacityMatch) {
        return parseFloat(capacityMatch[1]);
      }
    } catch {
      // df unavailable — fall through
    }

    // Fallback: statfsSync (available since Node 21; may exist on Node 20)
    try {
      if (fs.statfsSync) {
        const stat = fs.statfsSync('/');
        const total = stat.blocks * stat.bsize;
        const free  = stat.bavail * stat.bsize; // bavail = available to non-root
        if (total > 0) return parseFloat(((1 - free / total) * 100).toFixed(1));
      }
    } catch {
      // not available on this Node version
    }

    return 0;
  }
}

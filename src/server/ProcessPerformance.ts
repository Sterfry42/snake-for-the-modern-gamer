import { monitorEventLoopDelay, performance } from 'node:perf_hooks';

/** One aggregate sample per reporting interval, never a per-frame probe. */
export class ProcessPerformance {
  private readonly delay = monitorEventLoopDelay({ resolution: 20 });
  private cpu = process.cpuUsage();
  private utilization = performance.eventLoopUtilization();
  private since = performance.now();

  constructor() {
    this.delay.enable();
  }

  read() {
    const now = performance.now();
    const elapsedMs = Math.max(1, now - this.since);
    const cpu = process.cpuUsage(this.cpu);
    this.cpu = process.cpuUsage();
    const utilization = performance.eventLoopUtilization(this.utilization);
    this.utilization = performance.eventLoopUtilization();
    const memory = process.memoryUsage();
    const report = {
      processUptimeSeconds: process.uptime(),
      sampleIntervalMs: elapsedMs,
      cpuPercent: ((cpu.user + cpu.system) / (elapsedMs * 1000)) * 100,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      externalBytes: memory.external,
      eventLoopUtilization: utilization.utilization,
      eventLoopMeanMs: Number.isFinite(this.delay.mean) ? this.delay.mean / 1e6 : 0,
      eventLoopP99Ms: this.delay.percentile(99) / 1e6,
      eventLoopMaxMs: this.delay.max / 1e6,
    };
    this.delay.reset();
    this.since = now;
    return report;
  }
  close(): void {
    this.delay.disable();
  }
}

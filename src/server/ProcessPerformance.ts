import { monitorEventLoopDelay, performance, PerformanceObserver } from 'node:perf_hooks';

const EVENT_LOOP_RESOLUTION_MS = 20;

/** One aggregate sample per reporting interval, never a per-frame probe. */
export class ProcessPerformance {
  private readonly delay = monitorEventLoopDelay({ resolution: EVENT_LOOP_RESOLUTION_MS });
  private cpu = process.cpuUsage();
  private threadCpu = process.threadCpuUsage?.();
  private utilization = performance.eventLoopUtilization();
  private since = performance.now();
  private gcCount = 0;
  private gcDurationMs = 0;
  private maximumGcPauseMs = 0;
  private readonly gcObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      this.gcCount++;
      this.gcDurationMs += entry.duration;
      this.maximumGcPauseMs = Math.max(this.maximumGcPauseMs, entry.duration);
    }
  });

  constructor() {
    this.delay.enable();
    this.gcObserver.observe({ entryTypes: ['gc'] });
  }

  read() {
    const now = performance.now();
    const elapsedMs = Math.max(1, now - this.since);
    const cpu = process.cpuUsage(this.cpu);
    this.cpu = process.cpuUsage();
    const threadCpu = this.threadCpu && process.threadCpuUsage?.(this.threadCpu);
    this.threadCpu = process.threadCpuUsage?.();
    const utilization = performance.eventLoopUtilization(this.utilization);
    this.utilization = performance.eventLoopUtilization();
    const memory = process.memoryUsage();
    const hasDelaySamples = this.delay.count > 0;
    const p10 = hasDelaySamples ? this.delay.percentile(10) / 1e6 : 0;
    const p99 = hasDelaySamples ? this.delay.percentile(99) / 1e6 : 0;
    const report = {
      processUptimeSeconds: process.uptime(),
      sampleIntervalMs: elapsedMs,
      cpuPercent: ((cpu.user + cpu.system) / (elapsedMs * 1000)) * 100,
      threadCpuPercent:
        threadCpu && ((threadCpu.user + threadCpu.system) / (elapsedMs * 1000)) * 100,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      externalBytes: memory.external,
      eventLoopUtilization: utilization.utilization,
      eventLoopMeanMs: Number.isFinite(this.delay.mean) ? this.delay.mean / 1e6 : 0,
      eventLoopProbeResolutionMs: EVENT_LOOP_RESOLUTION_MS,
      eventLoopSamples: this.delay.count,
      eventLoopP10Ms: p10,
      eventLoopP50Ms: hasDelaySamples ? this.delay.percentile(50) / 1e6 : 0,
      eventLoopP99Ms: p99,
      eventLoopP99AboveObservedFloorMs: Math.max(0, p99 - p10),
      eventLoopMaxMs: this.delay.max / 1e6,
      gcCount: this.gcCount,
      gcDurationMs: this.gcDurationMs,
      maximumGcPauseMs: this.maximumGcPauseMs,
    };
    this.delay.reset();
    this.gcCount = 0;
    this.gcDurationMs = 0;
    this.maximumGcPauseMs = 0;
    this.since = now;
    return report;
  }
  close(): void {
    this.delay.disable();
    this.gcObserver.disconnect();
  }
}

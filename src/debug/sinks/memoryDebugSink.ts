import type { DebugEvent } from '../debugEvents.js';

export class MemoryDebugSink {
  private events: DebugEvent[] = [];
  private droppedEventCount = 0;

  constructor(private readonly limit = 20_000) {}

  handle(event: DebugEvent): void {
    this.events.push(event);
    while (this.events.length > this.limit) {
      this.events.shift();
      this.droppedEventCount += 1;
    }
  }

  getEvents(): readonly DebugEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
    this.droppedEventCount = 0;
  }

  exportJson(): string {
    return JSON.stringify(this.events, null, 2);
  }

  download(sessionId: string): void {
    const blob = new Blob([this.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  getDroppedEventCount(): number {
    return this.droppedEventCount;
  }
}

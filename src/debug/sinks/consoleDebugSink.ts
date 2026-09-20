import type { DebugEvent } from '../debugEvents.js';

export class ConsoleDebugSink {
  handle(event: DebugEvent): void {
    const summary = formatDebugEventSummary(event);
    if (event.category === 'error') {
      console.error(summary, event.data);
      return;
    }
    if (event.type.endsWith('.failed') || event.type.endsWith('_rejected')) {
      console.warn(summary, event.data);
      return;
    }
    if (event.verbosity === 'trace') {
      console.debug(summary, event.data);
      return;
    }
    if (event.type === 'room.generated' && Array.isArray(event.data['tiles'])) {
      console.groupCollapsed(summary);
      console.log((event.data['tiles'] as string[]).join('\n'));
      console.log(event.data);
      console.groupEnd();
      return;
    }
    console.log(summary, event.data);
  }
}

function formatDebugEventSummary(event: DebugEvent): string {
  const key =
    typeof event.data['roomId'] === 'string'
      ? event.data['roomId']
      : typeof event.data['action'] === 'string'
        ? event.data['action']
        : typeof event.data['label'] === 'string'
          ? event.data['label']
          : '';
  return `[${event.sequence}] [${event.category}] ${event.type}${key ? ` ${key}` : ''}`;
}

import { describe, expect, it } from 'vitest';
import { normalizeArchipelagoServerUrl } from '../archipelagoClient.js';

function expectUrl(input: string, pageProtocol: 'http:' | 'https:', expected: string): void {
  const result = normalizeArchipelagoServerUrl(input, pageProtocol);
  expect('error' in result ? result.error : result.url).toBe(expected);
}

describe('normalizeArchipelagoServerUrl', () => {
  it('defaults bare hosts to ws on HTTP pages', () => {
    expectUrl('localhost:38281', 'http:', 'ws://localhost:38281/');
  });

  it('defaults bare hosts to wss on HTTPS pages', () => {
    expectUrl('71.227.228.114:38291', 'https:', 'wss://71.227.228.114:38291/');
  });

  it('preserves explicit websocket schemes', () => {
    expectUrl('wss://example.com/ap', 'https:', 'wss://example.com/ap');
    expectUrl('ws://localhost:38281', 'http:', 'ws://localhost:38281/');
  });

  it('converts HTTP schemes to websocket schemes and preserves path/query', () => {
    expectUrl('https://example.com/ap', 'https:', 'wss://example.com/ap');
    expectUrl('http://example.com/ap?room=1', 'http:', 'ws://example.com/ap?room=1');
  });

  it('blocks insecure websocket URLs on HTTPS pages before WebSocket construction', () => {
    const result = normalizeArchipelagoServerUrl('ws://71.227.228.114:38291', 'https:');
    expect('warning' in result ? result.warning : '').toBe(
      'This page is HTTPS. Use a wss:// Archipelago endpoint, or run the game locally.',
    );
  });

  it('rejects malformed scheme-like input', () => {
    const result = normalizeArchipelagoServerUrl('https//bad', 'https:');
    expect('error' in result ? result.error : '').toContain('Invalid Archipelago server URL');
  });

  it('uses a local default based on page protocol', () => {
    expectUrl('', 'http:', 'ws://localhost:38281/');
    expectUrl('   ', 'https:', 'wss://localhost:38281/');
  });
});

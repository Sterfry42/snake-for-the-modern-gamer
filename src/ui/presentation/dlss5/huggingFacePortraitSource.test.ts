import { describe, expect, it } from 'vitest';
import {
  DLSS5_PORTRAIT_CONFIG,
  DLSS5_PORTRAIT_DATASET,
  DLSS5_PORTRAIT_SPLIT,
  buildDlss5PortraitRowsUrl,
  fetchDlss5PortraitRow,
  parseDlss5PortraitRowsResponse,
  probeDlss5PortraitSource,
  type RowsFetch,
} from './huggingFacePortraitSource.js';

describe('DLSS 5 Hugging Face portrait source', () => {
  it('builds a Hugging Face rows API URL for the canonical dataset', () => {
    const url = new URL(buildDlss5PortraitRowsUrl(42));

    expect(url.origin).toBe('https://datasets-server.huggingface.co');
    expect(url.pathname).toBe('/rows');
    expect(url.searchParams.get('dataset')).toBe(DLSS5_PORTRAIT_DATASET);
    expect(url.searchParams.get('config')).toBe(DLSS5_PORTRAIT_CONFIG);
    expect(url.searchParams.get('split')).toBe(DLSS5_PORTRAIT_SPLIT);
    expect(url.searchParams.get('offset')).toBe('42');
    expect(url.searchParams.get('length')).toBe('1');
  });

  it('parses the temporary image URL without treating it as durable identity', () => {
    const row = parseDlss5PortraitRowsResponse(
      {
        rows: [
          {
            row_idx: 42,
            row: {
              image: { src: 'https://signed.example/image.jpg', width: 512, height: 512 },
              file_id: 'photo_00042',
            },
          },
        ],
      },
      42,
    );

    expect(row).toEqual({
      rowIndex: 42,
      imageUrl: 'https://signed.example/image.jpg',
      width: 512,
      height: 512,
      fileId: 'photo_00042',
    });
  });

  it('normalizes actor-derived indexes before fetching rows', async () => {
    let requestedUrl = '';
    const fetchImpl: RowsFetch = async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          rows: [{ row_idx: 9999, row: { image: { src: 'https://signed.example/9999.jpg' } } }],
        }),
      };
    };

    const row = await fetchDlss5PortraitRow(-1, fetchImpl);

    expect(new URL(requestedUrl).searchParams.get('offset')).toBe('9999');
    expect(row.rowIndex).toBe(9999);
  });

  it('probes the row image URL without persisting it as identity', async () => {
    const fetchImpl: RowsFetch = async (url) => {
      if (url.includes('/rows?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            rows: [{ row_idx: 7, row: { image: { src: 'https://signed.example/7.png' } } }],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: (name) => (name.toLowerCase() === 'content-type' ? 'image/png' : null) },
        arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
        json: async () => ({}),
      };
    };

    await expect(probeDlss5PortraitSource(7, fetchImpl)).resolves.toMatchObject({
      row: { rowIndex: 7 },
      imageBytes: 4,
      contentType: 'image/png',
    });
  });

  it.runIf(process.env.DLSS5_LIVE_TEST === '1')(
    'can fetch a live canonical Hugging Face portrait row and signed image',
    async () => {
      const probe = await probeDlss5PortraitSource(0);

      expect(probe.row.rowIndex).toBe(0);
      expect(probe.row.width).toBe(512);
      expect(probe.row.height).toBe(512);
      expect(probe.imageBytes).toBeGreaterThan(1024);
    },
  );
});

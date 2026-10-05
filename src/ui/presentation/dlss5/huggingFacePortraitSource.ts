export const DLSS5_PORTRAIT_DATASET = 'lambdaWalker/ds.photo_id';
export const DLSS5_PORTRAIT_CONFIG = 'default';
export const DLSS5_PORTRAIT_SPLIT = 'body';
export const DLSS5_SYNTHETIC_PORTRAIT_COUNT = 10_000;
export const DLSS5_PORTRAIT_LICENSE = 'CC BY 4.0';
export const DLSS5_PORTRAIT_ATTRIBUTION =
  'lambdaWalker/ds.photo_id on Hugging Face, licensed CC BY 4.0';

export interface Dlss5PortraitRowImage {
  src: string;
  width?: number;
  height?: number;
}

export interface Dlss5PortraitRow {
  rowIndex: number;
  imageUrl: string;
  width: number;
  height: number;
  fileId?: string;
}

export interface Dlss5PortraitSourceProbe {
  row: Dlss5PortraitRow;
  imageBytes: number;
  contentType: string;
}

interface RowsResponse {
  rows?: Array<{
    row_idx?: number;
    row?: {
      image?: Partial<Dlss5PortraitRowImage>;
      file_id?: unknown;
    };
  }>;
}

interface RowsFetchResponse {
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null };
  json(): Promise<unknown>;
  arrayBuffer?(): Promise<ArrayBuffer>;
}

export type RowsFetch = (url: string) => Promise<RowsFetchResponse>;

export async function fetchDlss5PortraitRow(
  index: number,
  fetchImpl: RowsFetch = fetch,
): Promise<Dlss5PortraitRow> {
  const rowIndex = normalizeDlss5PortraitRowIndex(index);
  const response = await fetchImpl(buildDlss5PortraitRowsUrl(rowIndex));
  if (!response.ok) {
    throw new Error(`DLSS 5 portrait source returned HTTP ${response.status}`);
  }

  return parseDlss5PortraitRowsResponse(await response.json(), rowIndex);
}

export async function probeDlss5PortraitSource(
  index: number,
  fetchImpl: RowsFetch = fetch,
): Promise<Dlss5PortraitSourceProbe> {
  const row = await fetchDlss5PortraitRow(index, fetchImpl);
  const imageResponse = await fetchImpl(row.imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`DLSS 5 portrait image returned HTTP ${imageResponse.status}`);
  }

  return {
    row,
    imageBytes: (await imageResponse.arrayBuffer?.())?.byteLength ?? 0,
    contentType: imageResponse.headers?.get('content-type') ?? '',
  };
}

export function buildDlss5PortraitRowsUrl(index: number): string {
  const url = new URL('https://datasets-server.huggingface.co/rows');
  url.searchParams.set('dataset', DLSS5_PORTRAIT_DATASET);
  url.searchParams.set('config', DLSS5_PORTRAIT_CONFIG);
  url.searchParams.set('split', DLSS5_PORTRAIT_SPLIT);
  url.searchParams.set('offset', String(normalizeDlss5PortraitRowIndex(index)));
  url.searchParams.set('length', '1');
  return url.toString();
}

export function parseDlss5PortraitRowsResponse(
  payload: unknown,
  requestedIndex: number,
): Dlss5PortraitRow {
  const response = payload as RowsResponse;
  const row = response.rows?.[0];
  const image = row?.row?.image;
  if (!image || typeof image.src !== 'string' || image.src.length === 0) {
    throw new Error('DLSS 5 portrait source response did not include an image URL');
  }

  return {
    rowIndex: typeof row.row_idx === 'number' ? row.row_idx : requestedIndex,
    imageUrl: image.src,
    width: typeof image.width === 'number' ? image.width : 512,
    height: typeof image.height === 'number' ? image.height : 512,
    fileId: typeof row.row?.file_id === 'string' ? row.row.file_id : undefined,
  };
}

function normalizeDlss5PortraitRowIndex(index: number): number {
  const integer = Math.trunc(index);
  return (
    ((integer % DLSS5_SYNTHETIC_PORTRAIT_COUNT) + DLSS5_SYNTHETIC_PORTRAIT_COUNT) %
    DLSS5_SYNTHETIC_PORTRAIT_COUNT
  );
}

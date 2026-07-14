import { afterEach, describe, expect, it, vi } from 'vitest';

import { inspectNotebookImage, validateNotebookImage } from './image';

function png(width = 2, height = 3, animated = false) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const chunk = (type: string, data: number[]) => {
    const length = data.length;
    return [
      (length >>> 24) & 255, (length >>> 16) & 255, (length >>> 8) & 255, length & 255,
      ...[...type].map((character) => character.charCodeAt(0)),
      ...data,
      0, 0, 0, 0,
    ];
  };
  const ihdr = [
    (width >>> 24) & 255, (width >>> 16) & 255, (width >>> 8) & 255, width & 255,
    (height >>> 24) & 255, (height >>> 16) & 255, (height >>> 8) & 255, height & 255,
    8, 6, 0, 0, 0,
  ];
  return new Uint8Array([
    ...signature,
    ...chunk('IHDR', ihdr),
    ...(animated ? chunk('acTL', [0, 0, 0, 1, 0, 0, 0, 0]) : []),
    ...chunk('IEND', []),
  ]);
}

function jpeg() {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x03, 0x00, 0x02, 0x01, 0x01,
    0xff, 0xd9,
  ]);
}

function webp({ animated = false } = {}) {
  const payload = animated
    ? [0x02, 0, 0, 0, 1, 0, 0, 2, 0, 0]
    : [0, 0, 0, 0, 1, 0, 0, 2, 0, 0];
  const size = 4 + 8 + payload.length;
  return new Uint8Array([
    82, 73, 70, 70,
    size & 255, (size >>> 8) & 255, (size >>> 16) & 255, (size >>> 24) & 255,
    87, 69, 66, 80,
    86, 80, 56, 88,
    payload.length, 0, 0, 0,
    ...payload,
  ]);
}

const svg = (source: string) => new TextEncoder().encode(source);

describe('Notebook image safety validation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sniffs supported static raster formats and dimensions', () => {
    expect(inspectNotebookImage(png())).toMatchObject({
      mimeType: 'image/png', width: 2, height: 3,
    });
    expect(inspectNotebookImage(jpeg())).toMatchObject({
      mimeType: 'image/jpeg', width: 2, height: 3,
    });
    expect(inspectNotebookImage(webp())).toMatchObject({
      mimeType: 'image/webp', width: 2, height: 3,
    });
  });

  it('rejects animated PNG and WebP content', () => {
    expect(() => inspectNotebookImage(png(2, 3, true))).toThrow('Animated PNG');
    expect(() => inspectNotebookImage(webp({ animated: true }))).toThrow('Animated WebP');
  });

  it('accepts static SVG with internal paint references', () => {
    const inspection = inspectNotebookImage(svg(
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/></svg>',
    ));
    expect(inspection).toMatchObject({ mimeType: 'image/svg+xml', width: null, height: null });
  });

  it('decodes SVG through an image element when createImageBitmap is present', async () => {
    const createImageBitmap = vi.fn();
    const decode = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('createImageBitmap', createImageBitmap);
    vi.stubGlobal('Image', class {
      src = '';
      decode = decode;
    });
    await validateNotebookImage(svg(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
    ), 'image/svg+xml');
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(decode).toHaveBeenCalledOnce();
  });

  it.each([
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="x"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.com/x.svg#id"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://example.com/x.css)</style></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="run()"/></svg>',
  ])('rejects scriptable, animated, or externally linked SVG', (source) => {
    expect(() => inspectNotebookImage(svg(source))).toThrow();
  });

  it('rejects GIF, AVIF, MIME confusion, and unsafe raster dimensions', () => {
    expect(() => inspectNotebookImage(svg('GIF89a'))).toThrow('GIF');
    expect(() => inspectNotebookImage(new Uint8Array([
      0, 0, 0, 20, 102, 116, 121, 112, 97, 118, 105, 102,
    ]))).toThrow('AVIF');
    expect(() => inspectNotebookImage(png(), 'image/jpeg')).toThrow('does not match');
    expect(() => inspectNotebookImage(png(10_001, 10_000))).toThrow('100 megapixel');
  });
});

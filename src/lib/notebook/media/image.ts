import type { NotebookSupportedAssetMimeType } from '../persistence/contracts';

export const NOTEBOOK_IMAGE_RASTER_WARNING_BYTES = 25 * 1024 * 1024;
export const NOTEBOOK_IMAGE_RASTER_WARNING_PIXELS = 50_000_000;
export const NOTEBOOK_IMAGE_RASTER_MAX_PIXELS = 100_000_000;
export const NOTEBOOK_IMAGE_SVG_WARNING_BYTES = 5 * 1024 * 1024;
export const NOTEBOOK_IMAGE_SVG_MAX_BYTES = 10 * 1024 * 1024;
export const NOTEBOOK_IMAGE_SVG_MAX_ELEMENTS = 100_000;
export const NOTEBOOK_IMAGE_SVG_MAX_ATTRIBUTES = 500_000;
export const NOTEBOOK_IMAGE_SVG_MAX_DEPTH = 256;

export type NotebookImageMimeType = Extract<
  NotebookSupportedAssetMimeType,
  `image/${string}`
>;

export type NotebookImageWarning =
  | 'large-raster-file'
  | 'high-raster-resolution'
  | 'large-svg-file';

export type NotebookImageInspection = {
  mimeType: NotebookImageMimeType;
  byteLength: number;
  width: number | null;
  height: number | null;
  warnings: NotebookImageWarning[];
};

function bytesEqual(bytes: Uint8Array, offset: number, expected: readonly number[]) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function uint32BigEndian(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function uint32LittleEndian(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function inspectPng(bytes: Uint8Array) {
  if (bytes.byteLength < 33 || !bytesEqual(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10])) {
    throw new Error('Notebook PNG signature is invalid.');
  }
  let offset = 8;
  let width: number | null = null;
  let height: number | null = null;
  let sawEnd = false;
  while (offset + 12 <= bytes.byteLength) {
    const length = uint32BigEndian(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    const end = offset + 12 + length;
    if (end > bytes.byteLength) {
      throw new Error('Notebook PNG contains a truncated chunk.');
    }
    if (type === 'IHDR') {
      if (offset !== 8 || length !== 13) {
        throw new Error('Notebook PNG header is invalid.');
      }
      width = uint32BigEndian(bytes, offset + 8);
      height = uint32BigEndian(bytes, offset + 12);
    }
    if (type === 'acTL') {
      throw new Error('Animated PNG is not supported.');
    }
    if (type === 'IEND') {
      sawEnd = true;
      break;
    }
    offset = end;
  }
  if (!width || !height || !sawEnd) {
    throw new Error('Notebook PNG structure is incomplete.');
  }
  return { width, height };
}

const JPEG_START_OF_FRAME = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function inspectJpeg(bytes: Uint8Array) {
  if (bytes.byteLength < 4 || !bytesEqual(bytes, 0, [0xff, 0xd8])) {
    throw new Error('Notebook JPEG signature is invalid.');
  }
  let offset = 2;
  while (offset + 1 < bytes.byteLength) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9) break;
    if (marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.byteLength) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.byteLength) {
      throw new Error('Notebook JPEG contains a truncated segment.');
    }
    if (JPEG_START_OF_FRAME.has(marker)) {
      if (length < 7) throw new Error('Notebook JPEG frame is invalid.');
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      if (!width || !height) throw new Error('Notebook JPEG dimensions are invalid.');
      return { width, height };
    }
    offset += length;
  }
  throw new Error('Notebook JPEG has no supported image frame.');
}

function inspectWebp(bytes: Uint8Array) {
  if (
    bytes.byteLength < 20
    || ascii(bytes, 0, 4) !== 'RIFF'
    || ascii(bytes, 8, 4) !== 'WEBP'
    || uint32LittleEndian(bytes, 4) + 8 > bytes.byteLength
  ) {
    throw new Error('Notebook WebP container is invalid.');
  }
  let offset = 12;
  let dimensions: { width: number; height: number } | null = null;
  while (offset + 8 <= bytes.byteLength) {
    const type = ascii(bytes, offset, 4);
    const length = uint32LittleEndian(bytes, offset + 4);
    const data = offset + 8;
    const end = data + length;
    if (end > bytes.byteLength) {
      throw new Error('Notebook WebP contains a truncated chunk.');
    }
    if (type === 'ANIM' || type === 'ANMF') {
      throw new Error('Animated WebP is not supported.');
    }
    if (type === 'VP8X') {
      if (length < 10) throw new Error('Notebook WebP extended header is invalid.');
      if ((bytes[data] & 0x02) !== 0) throw new Error('Animated WebP is not supported.');
      dimensions = {
        width: 1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16),
        height: 1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16),
      };
    } else if (type === 'VP8 ' && length >= 10) {
      if (!bytesEqual(bytes, data + 3, [0x9d, 0x01, 0x2a])) {
        throw new Error('Notebook WebP frame header is invalid.');
      }
      dimensions = {
        width: (bytes[data + 6] | (bytes[data + 7] << 8)) & 0x3fff,
        height: (bytes[data + 8] | (bytes[data + 9] << 8)) & 0x3fff,
      };
    } else if (type === 'VP8L' && length >= 5) {
      if (bytes[data] !== 0x2f) throw new Error('Notebook lossless WebP header is invalid.');
      dimensions = {
        width: 1 + bytes[data + 1] + ((bytes[data + 2] & 0x3f) << 8),
        height: 1 + (bytes[data + 2] >> 6) + (bytes[data + 3] << 2)
          + ((bytes[data + 4] & 0x0f) << 10),
      };
    }
    offset = end + (length % 2);
  }
  if (!dimensions?.width || !dimensions.height) {
    throw new Error('Notebook WebP has no supported image frame.');
  }
  return dimensions;
}

const FORBIDDEN_SVG_ELEMENTS = new Set([
  'script', 'foreignobject', 'animate', 'animatemotion', 'animatetransform', 'set',
  'iframe', 'object', 'embed', 'audio', 'video', 'image',
]);

function containsUnsafeCssUrl(text: string) {
  for (const match of text.matchAll(/url\s*\(\s*([^)]+?)\s*\)/gi)) {
    const target = match[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
    if (!/^#[A-Za-z_][\w:.-]*$/.test(target)) return true;
  }
  return false;
}

function inspectSvg(bytes: Uint8Array) {
  if (bytes.byteLength > NOTEBOOK_IMAGE_SVG_MAX_BYTES) {
    throw new Error('Notebook SVG exceeds the 10 MiB safety limit.');
  }
  let source: string;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Notebook SVG must be valid UTF-8.');
  }
  const lower = source.toLowerCase();
  if (
    /<!doctype|<!entity|<\?/.test(lower)
    || /javascript\s*:|data\s*:\s*text\/html|@import|expression\s*\(|behavior\s*:|-moz-binding/.test(lower)
    || containsUnsafeCssUrl(source)
  ) {
    throw new Error('Notebook SVG contains executable or external content.');
  }
  const tagPattern = /<\s*(\/?)\s*([A-Za-z_][\w:.-]*)([^<>]*?)\s*(\/?)>/g;
  let firstElement: string | null = null;
  let elementCount = 0;
  let attributeCount = 0;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(source)) !== null) {
    const closing = Boolean(match[1]);
    const name = (match[2] ?? '').split(':').at(-1)!.toLowerCase();
    if (closing) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    firstElement ??= name;
    elementCount += 1;
    if (elementCount > NOTEBOOK_IMAGE_SVG_MAX_ELEMENTS) {
      throw new Error('Notebook SVG exceeds the element complexity budget.');
    }
    if (FORBIDDEN_SVG_ELEMENTS.has(name)) {
      throw new Error(`Notebook SVG contains forbidden element ${name}.`);
    }
    const attributes = match[3] ?? '';
    const attributePattern = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
    let attribute: RegExpExecArray | null;
    while ((attribute = attributePattern.exec(attributes)) !== null) {
      attributeCount += 1;
      if (attributeCount > NOTEBOOK_IMAGE_SVG_MAX_ATTRIBUTES) {
        throw new Error('Notebook SVG exceeds the attribute complexity budget.');
      }
      const key = (attribute[1] ?? '').toLowerCase();
      const value = (attribute[2] ?? attribute[3] ?? attribute[4] ?? '').trim();
      if (
        key.startsWith('on')
        || key === 'src'
        || ((key === 'href' || key.endsWith(':href')) && !/^#[A-Za-z_][\w:.-]*$/.test(value))
        || containsUnsafeCssUrl(value)
      ) {
        throw new Error(`Notebook SVG contains unsafe attribute ${key}.`);
      }
    }
    if (!match[4]) {
      depth += 1;
      if (depth > NOTEBOOK_IMAGE_SVG_MAX_DEPTH) {
        throw new Error('Notebook SVG exceeds the nesting safety limit.');
      }
    }
  }
  if (firstElement !== 'svg' || elementCount === 0 || depth !== 0) {
    throw new Error('Notebook SVG root or nesting is invalid.');
  }
  return { width: null, height: null };
}

function sniffImageMimeType(bytes: Uint8Array): NotebookImageMimeType {
  if (bytesEqual(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png';
  if (bytesEqual(bytes, 0, [0xff, 0xd8])) return 'image/jpeg';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
  const prefix = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.byteLength, 512)))
    .replace(/^\uFEFF/, '')
    .trimStart();
  if (/^(?:<!--[^]*?-->\s*)?<svg(?:\s|>)/i.test(prefix)) return 'image/svg+xml';
  if (/^GIF8[79]a/.test(prefix)) throw new Error('GIF images are not supported.');
  if (bytes.byteLength >= 12 && ascii(bytes, 4, 4) === 'ftyp'
    && /^(avif|avis)$/.test(ascii(bytes, 8, 4))) {
    throw new Error('AVIF images are not supported.');
  }
  throw new Error('The selected file is not a supported PNG, JPEG, WebP, or SVG image.');
}

export function inspectNotebookImage(
  bytes: Uint8Array,
  declaredMimeType?: string,
): NotebookImageInspection {
  const mimeType = sniffImageMimeType(bytes);
  if (declaredMimeType && declaredMimeType !== mimeType
    && !(declaredMimeType === 'image/jpg' && mimeType === 'image/jpeg')) {
    throw new Error('The image content does not match its declared media type.');
  }
  const dimensions = mimeType === 'image/png'
    ? inspectPng(bytes)
    : mimeType === 'image/jpeg'
      ? inspectJpeg(bytes)
      : mimeType === 'image/webp'
        ? inspectWebp(bytes)
        : inspectSvg(bytes);
  const pixels = dimensions.width !== null && dimensions.height !== null
    ? dimensions.width * dimensions.height
    : 0;
  if (pixels > NOTEBOOK_IMAGE_RASTER_MAX_PIXELS) {
    throw new Error('Notebook raster image exceeds the 100 megapixel safety limit.');
  }
  const warnings: NotebookImageWarning[] = [];
  if (mimeType === 'image/svg+xml') {
    if (bytes.byteLength > NOTEBOOK_IMAGE_SVG_WARNING_BYTES) warnings.push('large-svg-file');
  } else {
    if (bytes.byteLength > NOTEBOOK_IMAGE_RASTER_WARNING_BYTES) warnings.push('large-raster-file');
    if (pixels > NOTEBOOK_IMAGE_RASTER_WARNING_PIXELS) warnings.push('high-raster-resolution');
  }
  return {
    mimeType,
    byteLength: bytes.byteLength,
    width: dimensions.width,
    height: dimensions.height,
    warnings,
  };
}

async function decodeWithImageElement(bytes: Uint8Array, mimeType: NotebookImageMimeType) {
  if (typeof Image === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeType }));
  try {
    const image = new Image();
    image.src = url;
    if (typeof image.decode === 'function') await image.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function validateNotebookImage(
  bytes: Uint8Array,
  declaredMimeType?: string,
): Promise<NotebookImageInspection> {
  const inspection = inspectNotebookImage(bytes, declaredMimeType);
  try {
    if (inspection.mimeType !== 'image/svg+xml'
      && typeof globalThis.createImageBitmap === 'function') {
      const bitmap = await globalThis.createImageBitmap(
        new Blob([bytes as BlobPart], { type: inspection.mimeType }),
      );
      bitmap.close();
    } else {
      await decodeWithImageElement(bytes, inspection.mimeType);
    }
  } catch {
    throw new Error('This image could not be decoded by the current runtime.');
  }
  return inspection;
}

export function notebookImageWarningMessage(warning: NotebookImageWarning) {
  if (warning === 'large-raster-file') return 'This raster image is larger than 25 MiB.';
  if (warning === 'high-raster-resolution') return 'This raster image is larger than 50 megapixels.';
  return 'This SVG is larger than 5 MiB.';
}

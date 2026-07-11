import { validateSerializableMathJson } from '../display/printer/math-json';
import {
  MATH_CLIPBOARD_HTML_ATTRIBUTE,
  MATH_CLIPBOARD_MAX_CANONICAL_BYTES,
  MATH_CLIPBOARD_MAX_ENVELOPE_BYTES,
  MATH_CLIPBOARD_SCHEMA,
  MATH_CLIPBOARD_VERSION,
  type MathClipboardEnvelopeV1,
  type MathClipboardMetadata,
  type MathClipboardSurface,
  type MathClipboardWriteRequest,
} from './contracts';

const MODE_IDS = new Set([
  'calculate',
  'equation',
  'matrix',
  'vector',
  'table',
  'guide',
  'calculus',
  'trigonometry',
  'statistics',
  'geometry',
  'labs',
]);

const SURFACES = new Set<MathClipboardSurface>([
  'display',
  'formula-viewer',
  'history',
  'workspace-expression',
  'guide',
]);

const TOP_LEVEL_KEYS = new Set(['schema', 'version', 'canonicalLatex', 'mathJson', 'metadata']);
const METADATA_KEYS = new Set(['surface', 'mode']);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

export type MathClipboardEnvelopeFailure =
  | 'invalid-envelope'
  | 'invalid-canonical-latex'
  | 'invalid-math-json'
  | 'invalid-metadata'
  | 'byte-limit';

export type MathClipboardEnvelopeResult =
  | { ok: true; envelope: MathClipboardEnvelopeV1; serialized: string }
  | { ok: false; reason: MathClipboardEnvelopeFailure };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(record).every((key) => allowed.has(key));
}

function validMetadata(value: unknown): value is MathClipboardMetadata {
  if (!isPlainObject(value) || !hasOnlyKeys(value, METADATA_KEYS)) return false;
  if (typeof value.surface !== 'string' || !SURFACES.has(value.surface as MathClipboardSurface)) {
    return false;
  }
  return value.mode === undefined || (typeof value.mode === 'string' && MODE_IDS.has(value.mode));
}

function validCanonicalLatex(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && textEncoder.encode(value).byteLength <= MATH_CLIPBOARD_MAX_CANONICAL_BYTES;
}

function serializeEnvelope(envelope: MathClipboardEnvelopeV1): MathClipboardEnvelopeResult {
  const serialized = JSON.stringify(envelope);
  if (textEncoder.encode(serialized).byteLength > MATH_CLIPBOARD_MAX_ENVELOPE_BYTES) {
    return { ok: false, reason: 'byte-limit' };
  }
  return { ok: true, envelope, serialized };
}

export function createMathClipboardEnvelope(
  request: MathClipboardWriteRequest,
): MathClipboardEnvelopeResult {
  if (!validCanonicalLatex(request.canonicalLatex)) {
    return { ok: false, reason: 'invalid-canonical-latex' };
  }
  if (!validMetadata(request.metadata)) {
    return { ok: false, reason: 'invalid-metadata' };
  }

  const mathJson = request.mathJson === undefined
    ? undefined
    : validateSerializableMathJson(request.mathJson);
  const envelope: MathClipboardEnvelopeV1 = {
    schema: MATH_CLIPBOARD_SCHEMA,
    version: MATH_CLIPBOARD_VERSION,
    canonicalLatex: request.canonicalLatex,
    ...(mathJson?.ok ? { mathJson: mathJson.validated.value } : {}),
    metadata: { ...request.metadata },
  };
  return serializeEnvelope(envelope);
}

export function parseMathClipboardEnvelope(serialized: string): MathClipboardEnvelopeResult {
  if (textEncoder.encode(serialized).byteLength > MATH_CLIPBOARD_MAX_ENVELOPE_BYTES) {
    return { ok: false, reason: 'byte-limit' };
  }

  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { ok: false, reason: 'invalid-envelope' };
  }
  if (!isPlainObject(value) || !hasOnlyKeys(value, TOP_LEVEL_KEYS)) {
    return { ok: false, reason: 'invalid-envelope' };
  }
  if (value.schema !== MATH_CLIPBOARD_SCHEMA || value.version !== MATH_CLIPBOARD_VERSION) {
    return { ok: false, reason: 'invalid-envelope' };
  }
  if (!validCanonicalLatex(value.canonicalLatex)) {
    return { ok: false, reason: 'invalid-canonical-latex' };
  }
  if (!validMetadata(value.metadata)) {
    return { ok: false, reason: 'invalid-metadata' };
  }

  const mathJson = value.mathJson === undefined
    ? undefined
    : validateSerializableMathJson(value.mathJson);
  if (mathJson && !mathJson.ok) {
    return { ok: false, reason: 'invalid-math-json' };
  }

  return serializeEnvelope({
    schema: MATH_CLIPBOARD_SCHEMA,
    version: MATH_CLIPBOARD_VERSION,
    canonicalLatex: value.canonicalLatex,
    ...(mathJson?.ok ? { mathJson: mathJson.validated.value } : {}),
    metadata: { ...value.metadata },
  });
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 16_384;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function encodeMathClipboardEnvelopeAttribute(serialized: string) {
  return bytesToBase64(textEncoder.encode(serialized))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

export function decodeMathClipboardEnvelopeAttribute(encoded: string): MathClipboardEnvelopeResult {
  const maxEncodedLength = Math.ceil(MATH_CLIPBOARD_MAX_ENVELOPE_BYTES * 4 / 3) + 4;
  if (!/^[A-Za-z0-9_-]+$/u.test(encoded) || encoded.length > maxEncodedLength) {
    return { ok: false, reason: 'invalid-envelope' };
  }
  const padded = encoded.replaceAll('-', '+').replaceAll('_', '/')
    .padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  try {
    return parseMathClipboardEnvelope(textDecoder.decode(base64ToBytes(padded)));
  } catch {
    return { ok: false, reason: 'invalid-envelope' };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildMathClipboardHtml(serialized: string, visibleText: string) {
  const encoded = encodeMathClipboardEnvelopeAttribute(serialized);
  return `<span ${MATH_CLIPBOARD_HTML_ATTRIBUTE}="${encoded}">${escapeHtml(visibleText)}</span>`;
}

export function boundedMathClipboardVisibleText(visibleText: string | undefined, canonicalLatex: string) {
  const candidate = visibleText?.trim() || canonicalLatex;
  return textEncoder.encode(candidate).byteLength <= MATH_CLIPBOARD_MAX_CANONICAL_BYTES
    ? candidate
    : canonicalLatex;
}

export function parseMathClipboardHtml(html: string): MathClipboardEnvelopeResult {
  if (textEncoder.encode(html).byteLength > MATH_CLIPBOARD_MAX_ENVELOPE_BYTES * 2) {
    return { ok: false, reason: 'byte-limit' };
  }
  if (typeof DOMParser === 'undefined') {
    return { ok: false, reason: 'invalid-envelope' };
  }
  const document = new DOMParser().parseFromString(html, 'text/html');
  const element = document.querySelector(`[${MATH_CLIPBOARD_HTML_ATTRIBUTE}]`);
  const encoded = element?.getAttribute(MATH_CLIPBOARD_HTML_ATTRIBUTE);
  return encoded
    ? decodeMathClipboardEnvelopeAttribute(encoded)
    : { ok: false, reason: 'invalid-envelope' };
}

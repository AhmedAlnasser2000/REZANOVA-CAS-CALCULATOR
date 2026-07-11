import type { ModeId, SerializableMathJson } from '../../types/calculator';

export const MATH_CLIPBOARD_SCHEMA = 'calcwiz.math-clipboard';
export const MATH_CLIPBOARD_VERSION = 1;
export const MATH_CLIPBOARD_CONTENT_TYPE = 'application/x-calcwiz-math+json';
export const MATH_CLIPBOARD_MIME = 'web application/x-calcwiz-math+json';
export const MATH_CLIPBOARD_HTML_ATTRIBUTE = 'data-calcwiz-math-envelope';
export const MATH_CLIPBOARD_MAX_CANONICAL_BYTES = 320_000;
export const MATH_CLIPBOARD_MAX_ENVELOPE_BYTES = 640_000;

export type MathClipboardSurface =
  | 'display'
  | 'formula-viewer'
  | 'history'
  | 'workspace-expression'
  | 'guide';

export type MathClipboardMetadata = {
  surface: MathClipboardSurface;
  mode?: ModeId;
};

export type MathClipboardEnvelopeV1 = {
  schema: typeof MATH_CLIPBOARD_SCHEMA;
  version: typeof MATH_CLIPBOARD_VERSION;
  canonicalLatex: string;
  mathJson?: SerializableMathJson;
  metadata: MathClipboardMetadata;
};

export type MathClipboardWriteRequest = {
  canonicalLatex: string;
  visibleText?: string;
  mathJson?: unknown;
  metadata: MathClipboardMetadata;
};

export type MathClipboardReadResult =
  | {
      ok: true;
      canonicalLatex: string;
      mathJson?: SerializableMathJson;
      metadata?: MathClipboardMetadata;
      source: 'custom-mime' | 'html-envelope' | 'text';
    }
  | {
      ok: false;
      reason: 'empty' | 'blocked' | 'malformed' | 'mismatched';
      textFallback?: string;
    };

export type MathClipboardWriteResult =
  | {
      ok: true;
      host: 'browser' | 'tauri';
      fidelity: 'custom-mime' | 'html-envelope' | 'canonical-text';
    }
  | {
      ok: false;
      host: 'browser' | 'tauri';
      reason: 'empty' | 'blocked' | 'invalid';
    };

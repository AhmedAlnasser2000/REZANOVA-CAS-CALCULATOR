import { describe, expect, it } from 'vitest';
import {
  MATH_CLIPBOARD_MAX_CANONICAL_BYTES,
  boundedMathClipboardVisibleText,
  buildMathClipboardHtml,
  createMathClipboardEnvelope,
  decodeMathClipboardEnvelopeAttribute,
  encodeMathClipboardEnvelopeAttribute,
  parseMathClipboardEnvelope,
} from './index';

const request = {
  canonicalLatex: String.raw`x=\frac{\pi}{2}`,
  mathJson: ['Equal', 'x', ['Divide', 'Pi', 2]],
  metadata: { surface: 'display' as const, mode: 'equation' as const },
};

describe('MathClipboardEnvelopeV1', () => {
  it('round-trips exact canonical LaTeX and bounded MathJSON', () => {
    const created = createMathClipboardEnvelope(request);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const parsed = parseMathClipboardEnvelope(created.serialized);
    expect(parsed).toEqual(created);
    expect(parsed.ok && parsed.envelope).toEqual({
      schema: 'calcwiz.math-clipboard',
      version: 1,
      canonicalLatex: request.canonicalLatex,
      mathJson: request.mathJson,
      metadata: request.metadata,
    });
  });

  it('base64url-encodes Unicode without exposing JSON in the HTML attribute', () => {
    const created = createMathClipboardEnvelope({
      ...request,
      canonicalLatex: String.raw`\operatorname{Re}(z)=\alpha`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const encoded = encodeMathClipboardEnvelopeAttribute(created.serialized);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(decodeMathClipboardEnvelopeAttribute(encoded)).toEqual(created);
    const html = buildMathClipboardHtml(created.serialized, '<visible & exact>');
    expect(html).toContain('&lt;visible &amp; exact&gt;');
    expect(html).not.toContain(created.serialized);
  });

  it('rejects malformed, oversized, and privacy-expanding envelopes', () => {
    expect(parseMathClipboardEnvelope('{')).toMatchObject({ ok: false });
    expect(parseMathClipboardEnvelope(JSON.stringify({
      schema: 'calcwiz.math-clipboard',
      version: 1,
      canonicalLatex: 'x',
      metadata: { surface: 'display' },
      recordId: 'private-history-id',
    }))).toEqual({ ok: false, reason: 'invalid-envelope' });
    expect(createMathClipboardEnvelope({
      canonicalLatex: 'x'.repeat(MATH_CLIPBOARD_MAX_CANONICAL_BYTES + 1),
      metadata: { surface: 'display' },
    })).toEqual({ ok: false, reason: 'invalid-canonical-latex' });
    expect(boundedMathClipboardVisibleText(
      'v'.repeat(MATH_CLIPBOARD_MAX_CANONICAL_BYTES + 1),
      'x',
    )).toBe('x');
  });

  it('omits invalid optional MathJSON from trusted writes and rejects it on reads', () => {
    const created = createMathClipboardEnvelope({
      ...request,
      mathJson: ['Add', Number.NaN, 1],
    });
    expect(created.ok && created.envelope.mathJson).toBeUndefined();

    expect(parseMathClipboardEnvelope(JSON.stringify({
      schema: 'calcwiz.math-clipboard',
      version: 1,
      canonicalLatex: 'x',
      mathJson: ['Add', null, 1],
      metadata: { surface: 'display' },
    }))).toEqual({ ok: false, reason: 'invalid-math-json' });
  });
});

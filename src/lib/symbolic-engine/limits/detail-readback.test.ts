import { describe, expect, it } from 'vitest';
import { limitDetailSectionFromLines } from './detail-readback';

describe('limit detail readback', () => {
  it('keeps prose rewrite evidence as text instead of math', () => {
    const section = limitDetailSectionFromLines('Limit Method', [
      'Rewrite: rationalized the radical difference with its conjugate before comparing infinity scales.',
    ]);

    expect(section.lineParts?.[0]).toEqual([
      { kind: 'text', text: 'Rewrite: ' },
      {
        kind: 'text',
        text: 'rationalized the radical difference with its conjugate before comparing infinity scales.',
      },
    ]);
  });

  it('still renders mathematical rewrite values as math', () => {
    const section = limitDetailSectionFromLines('Limit Method', [
      'Rewrite: x/(sin(x)).',
    ]);

    expect(section.lineParts?.[0]).toEqual([
      { kind: 'text', text: 'Rewrite: ' },
      { kind: 'math', latex: 'x/(sin(x))' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('keeps dominant-scale rewrite prose readable while rendering the coefficient', () => {
    const section = limitDetailSectionFromLines('Limit Method', [
      'Rewrite/equivalent: dominant scale with coefficient \\frac{1}{2}.',
    ]);

    expect(section.lineParts?.[0]).toEqual([
      { kind: 'text', text: 'Rewrite/equivalent: dominant scale with coefficient ' },
      { kind: 'math', latex: '\\frac{1}{2}' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('splits dominant-scale rewrite scale and coefficient into readable parts', () => {
    const section = limitDetailSectionFromLines('Limit Method', [
      'Rewrite/equivalent: dominant scale 1 with coefficient \\frac{1}{2}.',
    ]);

    expect(section.lineParts?.[0]).toEqual([
      { kind: 'text', text: 'Rewrite/equivalent: dominant scale ' },
      { kind: 'math', latex: '1' },
      { kind: 'text', text: ' with coefficient ' },
      { kind: 'math', latex: '\\frac{1}{2}' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('does not treat prose slashes as math', () => {
    const section = limitDetailSectionFromLines('Limit Method', [
      'Rewrite: selected a safe log/power transform before retrying the sub-limit.',
    ]);

    expect(section.lineParts?.[0]).toEqual([
      { kind: 'text', text: 'Rewrite: ' },
      {
        kind: 'text',
        text: 'selected a safe log/power transform before retrying the sub-limit.',
      },
    ]);
  });
});

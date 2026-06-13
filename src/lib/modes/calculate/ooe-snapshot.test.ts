import { describe, expect, it } from 'vitest';
import {
  buildStandardCalculateOoeInputRevisionId,
  buildStandardCalculateOoeSnapshot,
} from '../calculate';

describe('standard Calculate OOE snapshot helpers', () => {
  it('builds stable revisions for equivalent requests and changes on meaningful input', () => {
    const first = {
      action: 'evaluate' as const,
      latex: '2+2',
      angleUnit: 'deg' as const,
      outputStyle: 'both' as const,
      ansLatex: '0',
      calculateScreen: 'standard' as const,
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
      ],
    };
    const second = {
      storedVariables: [
        { numericValue: 4, valueLatex: '4', name: 'a' },
      ],
      calculateScreen: 'standard' as const,
      ansLatex: '0',
      outputStyle: 'both' as const,
      angleUnit: 'deg' as const,
      latex: '2+2',
      action: 'evaluate' as const,
    };
    const changed = { ...first, latex: '2+3' };

    expect(buildStandardCalculateOoeSnapshot(first)).toEqual({ action: 'evaluate', request: first });
    expect(buildStandardCalculateOoeInputRevisionId(first))
      .toBe(buildStandardCalculateOoeInputRevisionId(second));
    expect(buildStandardCalculateOoeInputRevisionId(first))
      .not.toBe(buildStandardCalculateOoeInputRevisionId(changed));
    expect(buildStandardCalculateOoeInputRevisionId(first))
      .toMatch(/^input\.expression\.evaluate\.[a-z0-9]+$/u);
  });
});

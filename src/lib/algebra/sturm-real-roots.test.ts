import { describe, expect, it } from 'vitest';
import { certifyRealPolynomialRootsSturm, rootInSturmIntervals } from './sturm-real-roots';

describe('Sturm real-root certification', () => {
  it('certifies one distinct real root for a high-degree polynomial', () => {
    const certification = certifyRealPolynomialRootsSturm([1, 0, 0, 0, 0, 0, -1, -5]);

    expect(certification.kind).toBe('certified');
    expect(certification.distinctRealRootCount).toBe(1);
    expect(certification.intervals).toHaveLength(1);
    expect(rootInSturmIntervals(1.3007656097, certification.intervals)).toBe(true);
  });

  it('counts repeated roots as distinct real root locations', () => {
    const certification = certifyRealPolynomialRootsSturm([1, 1, -5, -1, 8, -4]);

    expect(certification.kind).toBe('certified');
    expect(certification.distinctRealRootCount).toBe(2);
    expect(rootInSturmIntervals(-2, certification.intervals)).toBe(true);
    expect(rootInSturmIntervals(1, certification.intervals)).toBe(true);
  });
});

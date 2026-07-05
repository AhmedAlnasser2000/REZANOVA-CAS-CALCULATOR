import { describe, expect, it } from 'vitest';
import { complex } from '../../numeric/complex';
import { createComplexNumericEvaluator } from './numeric-evaluator';
import { validateComplexRootBox } from './local-box-validation';

describe('Complex local box validation', () => {
  it('validates a simple root when the Krawczyk contraction fits inside the box', () => {
    const evaluator = createComplexNumericEvaluator({ expressionLatex: 'z^2+1=0', target: 'z' });

    const result = validateComplexRootBox({
      evaluator,
      root: complex(0, 1),
      region: { reMin: -2, reMax: 2, imMin: -2, imMax: 2 },
    });

    expect(result.status).toBe('validated');
    if (result.status !== 'validated') {
      throw new Error('Expected local box validation to accept a simple root');
    }
    expect(result.derivativeMagnitude).toBeGreaterThan(1);
    expect(result.contractionRadius).toBeLessThan(result.boxRadius);
    expect(result.sampleCount).toBe(8);
  });

  it('leaves multiple or clustered roots inconclusive instead of forcing a unique-root claim', () => {
    const evaluator = createComplexNumericEvaluator({ expressionLatex: 'z^2=0', target: 'z' });

    const result = validateComplexRootBox({
      evaluator,
      root: complex(0, 0),
      region: { reMin: -1, reMax: 1, imMin: -1, imMax: 1 },
    });

    expect(result.status).toBe('inconclusive');
    if (result.status === 'validated') {
      throw new Error('Expected multiple-root local box validation to stay inconclusive');
    }
    expect(result.reason).toContain('derivative is too small');
  });
});

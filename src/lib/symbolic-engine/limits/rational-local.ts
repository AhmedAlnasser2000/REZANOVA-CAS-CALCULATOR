import type { LimitDirection } from '../../../types/calculator';
import { normalizeExactRationalNode } from '../rational';
import { limitTextRow } from './detail-readback';
import { evaluateNodeAt, success } from './evaluation';
import { resolveLocalEquivalentLimit } from './local-equivalents';
import { isNodeArray } from '../patterns';

export function resolveRationalLocalLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const simplified = normalizeExactRationalNode(node, 'simplify');
  if (simplified?.changed) {
    const value = evaluateNodeAt(simplified.normalizedNode, target, variable);
    if (value !== undefined) {
      return success(value, 'rule-based-symbolic', [
        limitTextRow('Used the existing exact rational normalizer to cancel common factors before evaluating the local form.'),
        limitTextRow('The simplified local form is finite at the target.'),
      ]);
    }

    const simplifiedLimit = resolveLocalEquivalentLimit(
      simplified.normalizedNode,
      target,
      variable,
      direction,
      'Used the existing exact rational normalizer before analyzing the remaining local behavior.',
    );
    if (simplifiedLimit) {
      return simplifiedLimit;
    }
  }

  return resolveLocalEquivalentLimit(
    node,
    target,
    variable,
    direction,
    'Compared numerator and denominator local orders at the finite target.',
  );
}

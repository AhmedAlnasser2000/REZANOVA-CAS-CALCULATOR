import { CANONICAL_SPECIAL_FUNCTION_ARITIES } from '../../../types/calculator/canonical-result-special';
import { checkMath, InvalidResult, keys, record } from './math';

/** Traversal is bounded by the complete document inspection before entry. */
export function checkSpecialExpression(value: unknown, path: string): void {
  const bad = (): never => { throw new InvalidResult('Invalid special-function expression.', path); };
  if (!record(value)) return bad();
  const nested = (v: unknown, key: string) => checkSpecialExpression(v, `${path}.${key}`);
  switch (value.kind) {
    case 'standard-math':
      if (!keys(value, ['kind', 'value'])) return bad();
      return checkMath(value.value, `${path}.value`);
    case 'named-function': {
      if (!keys(value, ['kind', 'name', 'arguments']) || typeof value.name !== 'string'
        || !Object.hasOwn(CANONICAL_SPECIAL_FUNCTION_ARITIES, value.name)) return bad();
      const arity = CANONICAL_SPECIAL_FUNCTION_ARITIES[value.name as keyof typeof CANONICAL_SPECIAL_FUNCTION_ARITIES];
      if (!Array.isArray(value.arguments) || value.arguments.length !== arity) return bad();
      return value.arguments.forEach((v, i) => nested(v, `arguments[${i}]`));
    }
    case 'sum': case 'product': {
      const key = value.kind === 'sum' ? 'terms' : 'factors', items = value[key];
      if (!keys(value, ['kind', key]) || !Array.isArray(items) || !items.length) return bad();
      return items.forEach((v, i) => nested(v, `${key}[${i}]`));
    }
    case 'quotient': case 'power': {
      const [left, right] = value.kind === 'quotient' ? ['numerator', 'denominator'] : ['base', 'exponent'];
      if (!keys(value, ['kind', left, right])) return bad();
      nested(value[left], left); return nested(value[right], right);
    }
    case 'negation':
      if (!keys(value, ['kind', 'operand'])) return bad();
      return nested(value.operand, 'operand');
    case 'piecewise':
      if (!keys(value, ['kind', 'branches'], ['otherwise']) || !Array.isArray(value.branches) || !value.branches.length) return bad();
      value.branches.forEach((branch, i) => {
        if (!record(branch) || !keys(branch, ['value', 'condition'])) return bad();
        checkMath(branch.condition, `${path}.branches[${i}].condition`);
        nested(branch.value, `branches[${i}].value`);
      });
      if (value.otherwise !== undefined) nested(value.otherwise, 'otherwise');
      return;
    default: return bad();
  }
}

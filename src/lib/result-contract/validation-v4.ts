import type {
  CanonicalMathValueV2,
  CanonicalResultDocumentV4,
  CanonicalSpecialFunctionNameV4,
} from '../../types/calculator';
import { CANONICAL_SPECIAL_FUNCTION_ARITIES_V4 } from '../../types/calculator';
import { inspectJsonCompatibleStructuredValue } from './structured-value';
import {
  CANONICAL_RESULT_MAX_BYTES,
  CANONICAL_RESULT_MAX_DEPTH,
  CANONICAL_RESULT_MAX_NODES,
  type CanonicalResultValidationFailure,
  type CanonicalResultValidationLimits,
} from './validation';
import { validateCanonicalResultDocumentV2 } from './validation-v2';

const MAX_VARIADIC_ITEMS = 64;
const MAX_PIECEWISE_BRANCHES = 32;

export type CanonicalResultMathReferenceV4 = {
  path: string;
  value: CanonicalMathValueV2;
};

export type ValidatedCanonicalResultDocumentV4 = {
  value: CanonicalResultDocumentV4;
  nodeCount: number;
  depth: number;
  byteLength: number;
  mathValueCount: number;
};

export type CanonicalResultValidationResultV4 =
  | { ok: true; validated: ValidatedCanonicalResultDocumentV4 }
  | { ok: false; failure: CanonicalResultValidationFailure };

type ExpressionInspection = {
  mathValues: CanonicalResultMathReferenceV4[];
  namedFunctionCount: number;
};

function failure(
  message: string,
  path: string,
  reason: CanonicalResultValidationFailure['reason'] = 'invalid-shape',
): CanonicalResultValidationResultV4 {
  return { ok: false, failure: { reason, message, path } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function validateStandardMath(value: unknown, path: string) {
  const result = validateCanonicalResultDocumentV2({
    version: 2,
    outcomeKind: 'success',
    title: 'V4 standard leaf',
    primary: { kind: 'math', value },
    warnings: [],
  });
  if (result.ok) {
    const primary = result.validated.value.primary;
    return primary?.kind === 'math'
      ? { ok: true as const, value: primary.value }
      : { ok: false as const, failure: failure('V4 standard leaf is missing.', path) };
  }
  return {
    ok: false as const,
    failure: failure(
      result.failure.message,
      result.failure.path
        ? path + result.failure.path.replace('$.primary.value', '')
        : path,
      result.failure.reason,
    ),
  };
}

function inspectExpression(
  value: unknown,
  path: string,
  target: ExpressionInspection,
): CanonicalResultValidationResultV4 | undefined {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return failure('V4 special expressions must be typed plain objects.', path);
  }

  if (value.kind === 'standard-math') {
    if (!hasOnlyKeys(value, ['kind', 'value'])) {
      return failure('V4 standard-math expression shape is invalid.', path);
    }
    const math = validateStandardMath(value.value, path + '.value');
    if (!math.ok) return math.failure;
    target.mathValues.push({ path: path + '.value', value: math.value });
    return undefined;
  }

  if (value.kind === 'named-function') {
    if (!hasOnlyKeys(value, ['kind', 'name', 'arguments'])) {
      return failure('V4 named-function expression shape is invalid.', path);
    }
    if (
      typeof value.name !== 'string'
      || !(value.name in CANONICAL_SPECIAL_FUNCTION_ARITIES_V4)
    ) {
      return failure('V4 named-function uses an unsupported function.', path + '.name');
    }
    const name = value.name as CanonicalSpecialFunctionNameV4;
    if (
      !Array.isArray(value.arguments)
      || value.arguments.length !== CANONICAL_SPECIAL_FUNCTION_ARITIES_V4[name]
    ) {
      return failure(
        `${name} requires exactly ${CANONICAL_SPECIAL_FUNCTION_ARITIES_V4[name]} arguments.`,
        path + '.arguments',
      );
    }
    target.namedFunctionCount += 1;
    for (const [index, argument] of value.arguments.entries()) {
      const nested = inspectExpression(argument, `${path}.arguments[${index}]`, target);
      if (nested) return nested;
    }
    return undefined;
  }

  if (value.kind === 'sum' || value.kind === 'product') {
    const key = value.kind === 'sum' ? 'terms' : 'factors';
    if (!hasOnlyKeys(value, ['kind', key])) {
      return failure(`V4 ${value.kind} expression shape is invalid.`, path);
    }
    const entries = value[key];
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_VARIADIC_ITEMS) {
      return failure(
        `V4 ${value.kind} expressions require 1-${MAX_VARIADIC_ITEMS} entries.`,
        path + '.' + key,
      );
    }
    for (const [index, entry] of entries.entries()) {
      const nested = inspectExpression(entry, `${path}.${key}[${index}]`, target);
      if (nested) return nested;
    }
    return undefined;
  }

  if (value.kind === 'quotient' || value.kind === 'power') {
    const firstKey = value.kind === 'quotient' ? 'numerator' : 'base';
    const secondKey = value.kind === 'quotient' ? 'denominator' : 'exponent';
    if (!hasOnlyKeys(value, ['kind', firstKey, secondKey])) {
      return failure(`V4 ${value.kind} expression shape is invalid.`, path);
    }
    const first = inspectExpression(value[firstKey], path + '.' + firstKey, target);
    if (first) return first;
    return inspectExpression(value[secondKey], path + '.' + secondKey, target);
  }

  if (value.kind === 'negation') {
    if (!hasOnlyKeys(value, ['kind', 'operand'])) {
      return failure('V4 negation expression shape is invalid.', path);
    }
    return inspectExpression(value.operand, path + '.operand', target);
  }

  if (value.kind === 'piecewise') {
    if (!hasOnlyKeys(value, ['kind', 'branches', 'otherwise'])) {
      return failure('V4 piecewise expression shape is invalid.', path);
    }
    if (
      !Array.isArray(value.branches)
      || value.branches.length === 0
      || value.branches.length > MAX_PIECEWISE_BRANCHES
    ) {
      return failure(
        `V4 piecewise expressions require 1-${MAX_PIECEWISE_BRANCHES} branches.`,
        path + '.branches',
      );
    }
    for (const [index, branch] of value.branches.entries()) {
      const branchPath = `${path}.branches[${index}]`;
      if (!isRecord(branch) || !hasOnlyKeys(branch, ['value', 'condition'])) {
        return failure('V4 piecewise branches require value and condition.', branchPath);
      }
      const condition = validateStandardMath(branch.condition, branchPath + '.condition');
      if (!condition.ok) return condition.failure;
      target.mathValues.push({ path: branchPath + '.condition', value: condition.value });
      const nested = inspectExpression(branch.value, branchPath + '.value', target);
      if (nested) return nested;
    }
    return value.otherwise === undefined
      ? undefined
      : inspectExpression(value.otherwise, path + '.otherwise', target);
  }

  return failure('Unsupported V4 special-expression node: ' + value.kind + '.', path + '.kind');
}

export function collectCanonicalResultMathValuesV4(
  document: CanonicalResultDocumentV4,
): CanonicalResultMathReferenceV4[] {
  if (document.primary?.kind !== 'special-function-expression') return [];
  const target: ExpressionInspection = { mathValues: [], namedFunctionCount: 0 };
  inspectExpression(document.primary.expression, '$.primary.expression', target);
  return target.mathValues;
}

export function validateCanonicalResultDocumentV4(
  input: unknown,
  limits: CanonicalResultValidationLimits = {},
): CanonicalResultValidationResultV4 {
  const inspection = inspectJsonCompatibleStructuredValue(input, {
    label: 'Canonical result V4',
    maxNodes: limits.maxNodes ?? CANONICAL_RESULT_MAX_NODES,
    maxDepth: limits.maxDepth ?? CANONICAL_RESULT_MAX_DEPTH,
    maxBytes: limits.maxBytes ?? CANONICAL_RESULT_MAX_BYTES,
  });
  if (!inspection.ok) return { ok: false, failure: inspection.failure };

  const cloned = JSON.parse(inspection.serialized) as unknown;
  if (!isRecord(cloned) || cloned.version !== 4) {
    return failure('Canonical result V4 requires version 4.', '$.version');
  }
  const primary = cloned.primary;
  if (
    !isRecord(primary)
    || primary.kind !== 'special-function-expression'
    || !hasOnlyKeys(primary, ['kind', 'expression'])
  ) {
    return failure(
      'Canonical result V4 requires a typed special-function expression primary.',
      '$.primary',
    );
  }

  const commonCandidate = { ...cloned, version: 2 };
  Reflect.deleteProperty(commonCandidate, 'primary');
  const commonValidation = validateCanonicalResultDocumentV2(commonCandidate, limits);
  if (!commonValidation.ok) return { ok: false, failure: commonValidation.failure };

  const target: ExpressionInspection = { mathValues: [], namedFunctionCount: 0 };
  const expressionFailure = inspectExpression(
    primary.expression,
    '$.primary.expression',
    target,
  );
  if (expressionFailure) return expressionFailure;
  if (target.namedFunctionCount === 0) {
    return failure(
      'Canonical result V4 is reserved for expressions containing an approved special function.',
      '$.primary.expression',
    );
  }

  return {
    ok: true,
    validated: {
      value: cloned as CanonicalResultDocumentV4,
      nodeCount: inspection.nodeCount,
      depth: inspection.depth,
      byteLength: inspection.byteLength,
      mathValueCount: commonValidation.validated.mathValueCount + target.mathValues.length,
    },
  };
}

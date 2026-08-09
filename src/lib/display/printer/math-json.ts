import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';

export type { SerializableMathJson } from '../../../types/calculator/math-payload-types';

export const MATH_JSON_MAX_NODES = 2_000;
export const MATH_JSON_MAX_DEPTH = 64;
export const MATH_JSON_MAX_BYTES = 320_000;

export type MathJsonValidationLimits = {
  maxNodes?: number;
  maxDepth?: number;
  maxBytes?: number;
};

export type ValidatedMathJson = {
  value: SerializableMathJson;
  nodeCount: number;
  depth: number;
  byteLength: number;
};

export type MathJsonValidationFailure = {
  reason:
    | 'invalid-root'
    | 'invalid-value'
    | 'non-finite-number'
    | 'non-plain-object'
    | 'cyclic-value'
    | 'node-limit'
    | 'depth-limit'
    | 'byte-limit';
  message: string;
};

export type MathJsonValidationResult =
  | { ok: true; validated: ValidatedMathJson }
  | { ok: false; failure: MathJsonValidationFailure };

const EXPRESSION_OBJECT_KEYS = new Set(['num', 'sym', 'str', 'fn', 'dict']);
const ATTRIBUTE_KEYS = new Set([
  'comment',
  'documentation',
  'latex',
  'wikidata',
  'wikibase',
  'openmathSymbol',
  'openmathCd',
  'sourceUrl',
  'sourceContent',
  'sourceOffsets',
]);

function isPlainObject(value: object) {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isExpressionArray(value: readonly unknown[]) {
  return value.length > 0 && typeof value[0] === 'string' && value[0].length > 0;
}

function expressionObjectKey(value: Record<string, unknown>) {
  const keys = Object.keys(value).filter((key) => EXPRESSION_OBJECT_KEYS.has(key));
  return keys.length === 1 ? keys[0] : null;
}

function isExpressionRoot(value: unknown): value is SerializableMathJson {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string') {
    return value.length > 0;
  }
  if (Array.isArray(value)) {
    return isExpressionArray(value);
  }
  return value !== null
    && typeof value === 'object'
    && isPlainObject(value)
    && expressionObjectKey(value as Record<string, unknown>) !== null;
}

function failure(
  reason: MathJsonValidationFailure['reason'],
  message: string,
): MathJsonValidationResult {
  return { ok: false, failure: { reason, message } };
}

type PendingValue = {
  value: unknown;
  depth: number;
  role: 'expression' | 'dictionary-value';
  exit?: boolean;
};

export function validateSerializableMathJson(
  input: unknown,
  limits: MathJsonValidationLimits = {},
): MathJsonValidationResult {
  const maxNodes = limits.maxNodes ?? MATH_JSON_MAX_NODES;
  const maxDepth = limits.maxDepth ?? MATH_JSON_MAX_DEPTH;
  const maxBytes = limits.maxBytes ?? MATH_JSON_MAX_BYTES;

  if (!isExpressionRoot(input)) {
    return failure('invalid-root', 'MathJSON must begin with an expression node.');
  }

  const pending: PendingValue[] = [{ value: input, depth: 1, role: 'expression' }];
  const ancestors = new WeakSet<object>();
  let nodeCount = 0;
  let deepest = 0;

  while (pending.length > 0) {
    const current = pending.pop() as PendingValue;
    if (current.exit) {
      if (current.value !== null && typeof current.value === 'object') {
        ancestors.delete(current.value);
      }
      continue;
    }
    nodeCount += 1;
    deepest = Math.max(deepest, current.depth);

    if (nodeCount > maxNodes) {
      return failure('node-limit', `MathJSON exceeds the ${maxNodes} node limit.`);
    }
    if (current.depth > maxDepth) {
      return failure('depth-limit', `MathJSON exceeds the ${maxDepth} level depth limit.`);
    }

    const value = current.value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return failure('non-finite-number', 'MathJSON numeric literals must be finite.');
      }
      continue;
    }
    if (typeof value === 'string') {
      if (current.role === 'expression' && value.length === 0) {
        return failure('invalid-value', 'MathJSON symbols must not be empty.');
      }
      continue;
    }
    if (typeof value === 'boolean') {
      if (current.role !== 'dictionary-value') {
        return failure('invalid-value', 'Boolean values are valid only inside MathJSON dictionaries.');
      }
      continue;
    }
    if (value === null || typeof value !== 'object') {
      return failure('invalid-value', 'MathJSON contains a non-JSON or unsupported value.');
    }
    if (!isPlainObject(value) && !Array.isArray(value)) {
      return failure('non-plain-object', 'MathJSON must contain only arrays and plain objects.');
    }
    if (ancestors.has(value)) {
      return failure('cyclic-value', 'MathJSON must not contain cyclic references.');
    }
    ancestors.add(value);
    pending.push({ ...current, exit: true });

    if (Array.isArray(value)) {
      if (current.role === 'expression' && !isExpressionArray(value)) {
        return failure('invalid-value', 'MathJSON expression arrays require a non-empty operator.');
      }
      const start = current.role === 'expression' ? 1 : 0;
      for (let index = value.length - 1; index >= start; index -= 1) {
        pending.push({
          value: value[index],
          depth: current.depth + 1,
          role: current.role,
        });
      }
      continue;
    }

    const record = value as Record<string, unknown>;
    const primaryKey = expressionObjectKey(record);
    if (!primaryKey) {
      return failure('invalid-value', 'MathJSON objects require exactly one expression payload key.');
    }
    if (Object.keys(record).some((key) => !EXPRESSION_OBJECT_KEYS.has(key) && !ATTRIBUTE_KEYS.has(key))) {
      return failure('invalid-value', 'MathJSON contains an unsupported object property.');
    }

    if (primaryKey === 'num' || primaryKey === 'sym' || primaryKey === 'str') {
      if (typeof record[primaryKey] !== 'string') {
        return failure('invalid-value', `MathJSON ${primaryKey} payloads must be strings.`);
      }
    } else if (primaryKey === 'fn') {
      if (!Array.isArray(record.fn) || !isExpressionArray(record.fn)) {
        return failure('invalid-value', 'MathJSON fn payloads require an operator and operands.');
      }
      for (let index = record.fn.length - 1; index >= 1; index -= 1) {
        pending.push({ value: record.fn[index], depth: current.depth + 1, role: 'expression' });
      }
    } else {
      if (record.dict === null || typeof record.dict !== 'object' || !isPlainObject(record.dict)) {
        return failure('invalid-value', 'MathJSON dict payloads must be plain objects.');
      }
      for (const entry of Object.values(record.dict)) {
        pending.push({ value: entry, depth: current.depth + 1, role: 'dictionary-value' });
      }
    }

    for (const key of ATTRIBUTE_KEYS) {
      if (!(key in record)) {
        continue;
      }
      const attribute = record[key];
      if (key === 'sourceOffsets') {
        if (!Array.isArray(attribute)
          || attribute.length !== 2
          || attribute.some((offset) => !Number.isInteger(offset))) {
          return failure('invalid-value', 'MathJSON sourceOffsets must contain two integers.');
        }
      } else if (typeof attribute !== 'string') {
        return failure('invalid-value', `MathJSON ${key} metadata must be a string.`);
      }
    }
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(input);
  } catch {
    return failure('invalid-value', 'MathJSON could not be serialized.');
  }
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  if (byteLength > maxBytes) {
    return failure('byte-limit', `MathJSON exceeds the ${maxBytes} byte limit.`);
  }

  return {
    ok: true,
    validated: {
      value: JSON.parse(serialized) as SerializableMathJson,
      nodeCount,
      depth: deepest,
      byteLength,
    },
  };
}

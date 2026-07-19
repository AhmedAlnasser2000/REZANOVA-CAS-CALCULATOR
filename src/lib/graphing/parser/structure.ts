import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';

type MathJsonRecord = Record<string, unknown>;

function asRecord(value: unknown): MathJsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as MathJsonRecord
    : null;
}

export function graphNodeOperator(value: unknown): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null;
  }
  const record = asRecord(value);
  if (!record || !Array.isArray(record.fn)) return null;
  return typeof record.fn[0] === 'string' ? record.fn[0] : null;
}

export function graphNodeOperands(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.slice(1);
  const record = asRecord(value);
  return record && Array.isArray(record.fn) ? record.fn.slice(1) : [];
}

export function graphSymbolName(value: unknown): string | null {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  return record && typeof record.sym === 'string' ? record.sym : null;
}

export function graphTupleOperands(value: unknown): unknown[] | null {
  const operator = graphNodeOperator(value);
  if (operator === 'Tuple' || operator === 'Sequence') {
    return graphNodeOperands(value);
  }
  if (operator !== 'Delimiter') return null;
  const [body, delimiter] = graphNodeOperands(value);
  if (typeof delimiter === 'string' && !delimiter.includes(',')) return null;
  if (graphNodeOperator(body) === 'Sequence') return graphNodeOperands(body);
  return null;
}

export function graphSetOperands(value: unknown): unknown[] | null {
  return graphNodeOperator(value) === 'Set' ? graphNodeOperands(value) : null;
}

export function graphFunctionCall(
  value: unknown,
): { name: string; arguments: unknown[] } | null {
  const operator = graphNodeOperator(value);
  const operands = graphNodeOperands(value);
  if (operator === 'InvisibleOperator' && operands.length === 2) {
    const name = graphSymbolName(operands[0]);
    const tuple = graphTupleOperands(operands[1]);
    if (name && tuple) return { name, arguments: tuple };
    if (name && graphNodeOperator(operands[1]) === 'Delimiter') {
      const [argument] = graphNodeOperands(operands[1]);
      return { name, arguments: [argument] };
    }
  }
  if (operator && !operator.startsWith("'")) {
    return { name: operator, arguments: operands };
  }
  return null;
}

export function cloneGraphMathJson(value: unknown): SerializableMathJson {
  return JSON.parse(JSON.stringify(value)) as SerializableMathJson;
}

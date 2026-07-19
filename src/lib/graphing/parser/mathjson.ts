import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  validateSerializableMathJson,
} from '../../display/printer/math-json';
import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';
import type { GraphExpressionIR } from '../contracts';
import { graphNodeOperands, graphNodeOperator, graphSymbolName } from './structure';
import { graphParserFailure, type GraphParserFailure } from './types';

export const GRAPH_PARSER_MAX_SOURCE_LENGTH = 8_192;
export const GRAPH_PARSER_MAX_MATHJSON_NODES = 512;
export const GRAPH_PARSER_MAX_MATHJSON_DEPTH = 32;
export const GRAPH_PARSER_MAX_MATHJSON_BYTES = 64_000;

const graphParserEngine = new ComputeEngine();

const UNSAFE_OPERATORS = new Set([
  'Assign',
  'Declare',
  'Evaluate',
  'Function',
  'Integrate',
  'Lambda',
  'Limit',
  'Product',
  'Random',
  'SetDelayed',
  'Sum',
]);

export const GRAPH_EXPRESSION_OPERATOR_ARITY: ReadonlyMap<
  string,
  { minimum: number; maximum: number }
> = new Map([
  ['Abs', { minimum: 1, maximum: 1 }],
  ['Add', { minimum: 1, maximum: 64 }],
  ['Arccos', { minimum: 1, maximum: 1 }],
  ['Arcosh', { minimum: 1, maximum: 1 }],
  ['Arcsin', { minimum: 1, maximum: 1 }],
  ['Arctan', { minimum: 1, maximum: 1 }],
  ['Arsinh', { minimum: 1, maximum: 1 }],
  ['Artanh', { minimum: 1, maximum: 1 }],
  ['Ceil', { minimum: 1, maximum: 1 }],
  ['Cos', { minimum: 1, maximum: 1 }],
  ['Cosh', { minimum: 1, maximum: 1 }],
  ['Cot', { minimum: 1, maximum: 1 }],
  ['Csc', { minimum: 1, maximum: 1 }],
  ['Divide', { minimum: 2, maximum: 2 }],
  ['Exp', { minimum: 1, maximum: 1 }],
  ['Floor', { minimum: 1, maximum: 1 }],
  ['Ln', { minimum: 1, maximum: 1 }],
  ['Log', { minimum: 1, maximum: 2 }],
  ['Max', { minimum: 1, maximum: 64 }],
  ['Min', { minimum: 1, maximum: 64 }],
  ['Mod', { minimum: 2, maximum: 2 }],
  ['Multiply', { minimum: 1, maximum: 64 }],
  ['Negate', { minimum: 1, maximum: 1 }],
  ['Power', { minimum: 2, maximum: 2 }],
  ['Rational', { minimum: 2, maximum: 2 }],
  ['Root', { minimum: 2, maximum: 2 }],
  ['Round', { minimum: 1, maximum: 1 }],
  ['Sec', { minimum: 1, maximum: 1 }],
  ['Sign', { minimum: 1, maximum: 1 }],
  ['Sin', { minimum: 1, maximum: 1 }],
  ['Sinh', { minimum: 1, maximum: 1 }],
  ['Sqrt', { minimum: 1, maximum: 1 }],
  ['Tan', { minimum: 1, maximum: 1 }],
  ['Tanh', { minimum: 1, maximum: 1 }],
]);

const RESERVED_CONSTANTS = new Set(['ExponentialE', 'GoldenRatio', 'Pi']);
const FORBIDDEN_CONSTANTS = new Set([
  'ComplexInfinity',
  'False',
  'ImaginaryUnit',
  'NaN',
  'NegativeInfinity',
  'PositiveInfinity',
  'True',
  'Undefined',
]);
const SYMBOL_PATTERN = /^\p{L}[\p{L}\p{N}_]*$/u;

function boundedMathJson(input: unknown) {
  return validateSerializableMathJson(input, {
    maxNodes: GRAPH_PARSER_MAX_MATHJSON_NODES,
    maxDepth: GRAPH_PARSER_MAX_MATHJSON_DEPTH,
    maxBytes: GRAPH_PARSER_MAX_MATHJSON_BYTES,
  });
}

function scanUnsafeOperators(input: unknown): { operator: string; path: string } | null {
  const pending = [{ value: input, path: '$' }];
  while (pending.length > 0) {
    const current = pending.pop() as { value: unknown; path: string };
    const operator = graphNodeOperator(current.value);
    if (operator && UNSAFE_OPERATORS.has(operator)) {
      return { operator, path: current.path };
    }
    graphNodeOperands(current.value).forEach((child, index) => {
      pending.push({ value: child, path: `${current.path}[${index + 1}]` });
    });
  }
  return null;
}

function inspectCanonicalExpression(
  input: SerializableMathJson,
): { ok: true; freeSymbols: string[] } | GraphParserFailure {
  const freeSymbols = new Set<string>();
  const pending = [{ value: input as unknown, path: '$' }];

  while (pending.length > 0) {
    const current = pending.pop() as { value: unknown; path: string };
    const operator = graphNodeOperator(current.value);
    if (operator) {
      if (operator === 'Error' || operator === 'LatexString' || operator === 'ErrorCode') {
        return graphParserFailure('unsupported-relation', 'incomplete-or-invalid-source', current.path);
      }
      const arity = GRAPH_EXPRESSION_OPERATOR_ARITY.get(operator);
      if (!arity) {
        return graphParserFailure('unsupported-operator', operator, current.path);
      }
      const operands = graphNodeOperands(current.value);
      if (operands.length < arity.minimum || operands.length > arity.maximum) {
        return graphParserFailure('unsupported-operator', `${operator}-arity`, current.path);
      }
      operands.forEach((child, index) => {
        pending.push({ value: child, path: `${current.path}[${index + 1}]` });
      });
      continue;
    }

    if (typeof current.value === 'number') continue;
    if (current.value && typeof current.value === 'object' && 'num' in current.value) continue;
    const symbol = graphSymbolName(current.value);
    if (!symbol || symbol.startsWith("'") || !SYMBOL_PATTERN.test(symbol)) {
      return graphParserFailure('unsafe-expression', 'invalid-symbol', current.path);
    }
    if (FORBIDDEN_CONSTANTS.has(symbol)) {
      return graphParserFailure('unsafe-expression', `forbidden-constant-${symbol}`, current.path);
    }
    if (!RESERVED_CONSTANTS.has(symbol)) freeSymbols.add(symbol);
  }

  return { ok: true, freeSymbols: [...freeSymbols].sort() };
}

export type GraphExpressionAdapterResult =
  | { ok: true; expression: GraphExpressionIR }
  | GraphParserFailure;

export function adaptGraphExpressionMathJson(
  input: unknown,
  path = '$',
): GraphExpressionAdapterResult {
  const boundedInput = boundedMathJson(input);
  if (!boundedInput.ok) {
    const budgetFailure = ['node-limit', 'depth-limit', 'byte-limit'].includes(boundedInput.failure.reason);
    return graphParserFailure(
      budgetFailure ? 'expression-budget-exceeded' : 'unsafe-expression',
      boundedInput.failure.reason,
      path,
    );
  }
  const unsafe = scanUnsafeOperators(boundedInput.validated.value);
  if (unsafe) {
    return graphParserFailure('unsafe-expression', unsafe.operator, `${path}${unsafe.path.slice(1)}`);
  }

  let canonical: SerializableMathJson;
  try {
    const boxed = graphParserEngine.box(boundedInput.validated.value);
    if (!boxed.isValid) {
      return graphParserFailure('unsupported-relation', 'incomplete-or-invalid-source', path);
    }
    canonical = boxed.json as SerializableMathJson;
  } catch {
    return graphParserFailure('unsafe-expression', 'compute-engine-box-failed', path);
  }

  const boundedCanonical = boundedMathJson(canonical);
  if (!boundedCanonical.ok) {
    return graphParserFailure(
      'expression-budget-exceeded',
      `canonical-${boundedCanonical.failure.reason}`,
      path,
    );
  }
  const inspection = inspectCanonicalExpression(boundedCanonical.validated.value);
  if (!inspection.ok) return inspection;
  return {
    ok: true,
    expression: {
      mathJson: boundedCanonical.validated.value,
      freeSymbols: inspection.freeSymbols,
    },
  };
}

export function parseGraphLatexToStructuralMathJson(sourceLatex: string) {
  try {
    return {
      ok: true as const,
      mathJson: graphParserEngine.parse(sourceLatex, { form: 'structural' }).json,
    };
  } catch {
    return graphParserFailure('unsupported-relation', 'latex-parse-failed');
  }
}

export function serializeGraphMathJsonToLatex(mathJson: SerializableMathJson) {
  try {
    return graphParserEngine.box(mathJson, { form: 'structural' }).toLatex();
  } catch {
    return '';
  }
}

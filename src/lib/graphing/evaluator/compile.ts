import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';
import { validateGraphExpression } from '../contracts';
import { GRAPH_EXPRESSION_OPERATOR_ARITY } from '../parser/mathjson';
import { graphNodeOperands, graphNodeOperator, graphSymbolName } from '../parser/structure';
import type {
  CompiledGraphExpressionPlan,
  GraphEvaluationInstruction,
  GraphExpressionCompileInput,
  GraphExpressionCompileResult,
  GraphPeriodicSamplingHintV1,
} from './types';

const GRAPH_EVALUATOR_MAX_INSTRUCTIONS = 512;
const GRAPH_EVALUATOR_MAX_COMPILE_DEPTH = 32;

const CONSTANT_VALUES = new Map<string, number>([
  ['ExponentialE', Math.E],
  ['GoldenRatio', (1 + Math.sqrt(5)) / 2],
  ['Pi', Math.PI],
]);

function compileFailure(
  code: 'expression-budget-exceeded' | 'unsafe-expression' | 'unsupported-operator',
  detailCode: string,
  path?: string,
): GraphExpressionCompileResult {
  return { ok: false, stopReason: { code, detailCode, ...(path ? { path } : {}) } };
}

function numericObjectValue(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('num' in value)) {
    return null;
  }
  if (typeof value.num !== 'string') return null;
  const numeric = Number(value.num);
  return Number.isFinite(numeric) ? numeric : null;
}

function numericValue(value: SerializableMathJson): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return numericObjectValue(value);
}

type AffineHint = GraphPeriodicSamplingHintV1['coefficient'] & { independentSymbol: string };

function affineHints(node: SerializableMathJson): AffineHint[] {
  const symbol = graphSymbolName(node);
  if (symbol) return [{ kind: 'constant', value: 1, independentSymbol: symbol }];
  const operator = graphNodeOperator(node);
  const operands = graphNodeOperands(node) as SerializableMathJson[];
  if (operator === 'Negate' && operands.length === 1) {
    return affineHints(operands[0]!).map((hint) => hint.kind === 'constant'
      ? { ...hint, value: -hint.value }
      : hint);
  }
  if (operator === 'Add') {
    const nonConstants = operands.filter((operand) => numericValue(operand) === null);
    return nonConstants.length === 1 ? affineHints(nonConstants[0]!) : [];
  }
  if (operator !== 'Multiply' || operands.length !== 2) return [];
  const leftNumber = numericValue(operands[0]!);
  const rightNumber = numericValue(operands[1]!);
  const leftSymbol = graphSymbolName(operands[0]!);
  const rightSymbol = graphSymbolName(operands[1]!);
  if (leftNumber !== null && rightSymbol) {
    return [{ kind: 'constant', value: leftNumber, independentSymbol: rightSymbol }];
  }
  if (rightNumber !== null && leftSymbol) {
    return [{ kind: 'constant', value: rightNumber, independentSymbol: leftSymbol }];
  }
  if (leftSymbol && rightSymbol) {
    return [
      { kind: 'symbol', symbol: leftSymbol, independentSymbol: rightSymbol },
      { kind: 'symbol', symbol: rightSymbol, independentSymbol: leftSymbol },
    ];
  }
  return [];
}

function periodicSamplingHints(node: SerializableMathJson) {
  const hints: GraphPeriodicSamplingHintV1[] = [];
  const visit = (value: SerializableMathJson) => {
    const operator = graphNodeOperator(value);
    const operands = graphNodeOperands(value) as SerializableMathJson[];
    if ((operator === 'Sin' || operator === 'Cos' || operator === 'Tan') && operands[0]) {
      for (const hint of affineHints(operands[0])) {
        if (!hint.independentSymbol) continue;
        const { independentSymbol, ...coefficient } = hint;
        hints.push({ operator, independentSymbol, coefficient });
      }
    }
    operands.forEach(visit);
  };
  visit(node);
  return hints;
}

function appendExpressionInstructions(
  node: SerializableMathJson,
  path: string,
  depth: number,
  instructions: GraphEvaluationInstruction[],
  requiredSymbols: Set<string>,
): GraphExpressionCompileResult | null {
  if (depth > GRAPH_EVALUATOR_MAX_COMPILE_DEPTH) {
    return compileFailure('expression-budget-exceeded', 'compile-depth', path);
  }
  if (instructions.length >= GRAPH_EVALUATOR_MAX_INSTRUCTIONS) {
    return compileFailure('expression-budget-exceeded', 'instruction-count', path);
  }
  if (typeof node === 'number') {
    if (!Number.isFinite(node)) return compileFailure('unsafe-expression', 'non-finite-number', path);
    instructions.push({ kind: 'literal', value: node });
    return null;
  }
  const numericObject = numericObjectValue(node);
  if (numericObject !== null) {
    instructions.push({ kind: 'literal', value: numericObject });
    return null;
  }
  const operator = graphNodeOperator(node);
  if (operator) {
    const policy = GRAPH_EXPRESSION_OPERATOR_ARITY.get(operator);
    if (!policy) return compileFailure('unsupported-operator', operator, path);
    const operands = graphNodeOperands(node) as SerializableMathJson[];
    if (operands.length < policy.minimum || operands.length > policy.maximum) {
      return compileFailure('unsupported-operator', `${operator}-arity`, path);
    }
    for (let index = 0; index < operands.length; index += 1) {
      const failure = appendExpressionInstructions(
        operands[index],
        `${path}[${index + 1}]`,
        depth + 1,
        instructions,
        requiredSymbols,
      );
      if (failure) return failure;
    }
    instructions.push({ kind: 'operator', operator, arity: operands.length });
    return null;
  }
  const symbol = graphSymbolName(node);
  if (!symbol) return compileFailure('unsafe-expression', 'invalid-leaf', path);
  const constant = CONSTANT_VALUES.get(symbol);
  if (constant !== undefined) {
    instructions.push({ kind: 'literal', value: constant });
  } else {
    requiredSymbols.add(symbol);
    instructions.push({ kind: 'symbol', symbol });
  }
  return null;
}

export function compileGraphExpression(
  input: GraphExpressionCompileInput,
): GraphExpressionCompileResult {
  const validation = validateGraphExpression(input.expression);
  if (!validation.ok) {
    return compileFailure('unsafe-expression', validation.failure.reason, validation.failure.path);
  }
  const instructions: GraphEvaluationInstruction[] = [];
  const requiredSymbols = new Set<string>();
  const failure = appendExpressionInstructions(
    validation.validated.value.mathJson,
    '$',
    1,
    instructions,
    requiredSymbols,
  );
  if (failure) return failure;
  const actualSymbols = [...requiredSymbols].sort();
  const declaredSymbols = [...validation.validated.value.freeSymbols].sort();
  if (actualSymbols.length !== declaredSymbols.length
    || actualSymbols.some((symbol, index) => symbol !== declaredSymbols[index])) {
    return compileFailure('unsafe-expression', 'free-symbol-mismatch');
  }
  const plan: CompiledGraphExpressionPlan = Object.freeze({
    planId: input.planId,
    sourceRevision: input.sourceRevision,
    instructions: Object.freeze(instructions.map((instruction) => Object.freeze(instruction))),
    requiredSymbols: Object.freeze(actualSymbols),
    samplingHints: Object.freeze({
      periodic: Object.freeze(periodicSamplingHints(validation.validated.value.mathJson)),
    }),
  });
  return { ok: true, plan };
}

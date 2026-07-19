import type {
  GraphComparator,
  GraphConditionIR,
  GraphExpressionIR,
  GraphInequalityComparator,
} from '../contracts';
import { validateGraphCondition } from '../contracts';
import { adaptGraphExpressionMathJson } from './mathjson';
import { graphNodeOperands, graphNodeOperator, graphSymbolName } from './structure';
import { graphParserFailure, type GraphParserFailure } from './types';

const COMPARATOR_BY_OPERATOR = new Map<string, GraphComparator>([
  ['Equal', '='],
  ['Greater', '>'],
  ['GreaterEqual', '>='],
  ['Less', '<'],
  ['LessEqual', '<='],
]);

type RawComparatorChain = {
  operands: unknown[];
  operators: GraphComparator[];
};

function rawComparatorChain(
  input: unknown,
  path: string,
): { ok: true; chain: RawComparatorChain } | GraphParserFailure {
  const operatorName = graphNodeOperator(input);
  const comparator = operatorName ? COMPARATOR_BY_OPERATOR.get(operatorName) : undefined;
  if (!comparator) {
    return graphParserFailure('unsupported-relation', 'not-a-supported-comparison', path);
  }
  const operands = graphNodeOperands(input);
  if (operands.length < 2) {
    return graphParserFailure('unsupported-relation', 'comparison-arity', path);
  }
  if (operands.length > 2) {
    return {
      ok: true,
      chain: {
        operands,
        operators: Array.from({ length: operands.length - 1 }, () => comparator),
      },
    };
  }

  const [left, right] = operands;
  const leftComparator = graphNodeOperator(left);
  const rightComparator = graphNodeOperator(right);
  const leftIsChain = leftComparator ? COMPARATOR_BY_OPERATOR.has(leftComparator) : false;
  const rightIsChain = rightComparator ? COMPARATOR_BY_OPERATOR.has(rightComparator) : false;
  if (leftIsChain && rightIsChain) {
    return graphParserFailure('unsupported-relation', 'branched-comparison-chain', path);
  }
  if (leftIsChain) {
    const inner = rawComparatorChain(left, `${path}[1]`);
    if (!inner.ok) return inner;
    return {
      ok: true,
      chain: {
        operands: [...inner.chain.operands, right],
        operators: [...inner.chain.operators, comparator],
      },
    };
  }
  if (rightIsChain) {
    const inner = rawComparatorChain(right, `${path}[2]`);
    if (!inner.ok) return inner;
    return {
      ok: true,
      chain: {
        operands: [left, ...inner.chain.operands],
        operators: [comparator, ...inner.chain.operators],
      },
    };
  }
  return { ok: true, chain: { operands: [left, right], operators: [comparator] } };
}

function isMonotoneInequalityChain(operators: readonly GraphComparator[]) {
  const directions = new Set(operators.map((operator) => operator.startsWith('<') ? '<' : '>'));
  return directions.size === 1 && !operators.includes('=');
}

export type ParsedGraphComparatorChain = {
  operands: GraphExpressionIR[];
  operators: GraphComparator[];
};

export function parseGraphComparatorChain(
  input: unknown,
  path = '$',
): { ok: true; chain: ParsedGraphComparatorChain } | GraphParserFailure {
  const raw = rawComparatorChain(input, path);
  if (!raw.ok) return raw;
  if (raw.chain.operators.length > 1) {
    if (!isMonotoneInequalityChain(raw.chain.operators)) {
      return graphParserFailure('unsupported-relation', 'non-monotone-comparison-chain', path);
    }
  }
  const expressions: GraphExpressionIR[] = [];
  for (let index = 0; index < raw.chain.operands.length; index += 1) {
    const expression = adaptGraphExpressionMathJson(
      raw.chain.operands[index],
      `${path}.operands[${index}]`,
    );
    if (!expression.ok) return expression;
    expressions.push(expression.expression);
  }
  return {
    ok: true,
    chain: { operands: expressions, operators: raw.chain.operators },
  };
}

function parseIntervalMembership(
  input: unknown,
  path: string,
): { ok: true; condition: GraphConditionIR } | GraphParserFailure {
  const [valueNode, intervalNode] = graphNodeOperands(input);
  const intervalOperator = graphNodeOperator(intervalNode);
  const intervalOperands = graphNodeOperands(intervalNode);
  if (intervalOperator !== 'Interval' || intervalOperands.length !== 2) {
    return graphParserFailure('invalid-condition', 'unsupported-membership-set', path);
  }
  const value = adaptGraphExpressionMathJson(valueNode, `${path}.value`);
  if (!value.ok) return value;
  const minimum = adaptGraphExpressionMathJson(intervalOperands[0], `${path}.minimum`);
  if (!minimum.ok) return minimum;
  const maximum = adaptGraphExpressionMathJson(intervalOperands[1], `${path}.maximum`);
  if (!maximum.ok) return maximum;
  return {
    ok: true,
    condition: {
      kind: 'interval-membership',
      value: value.expression,
      minimum: minimum.expression,
      maximum: maximum.expression,
      minimumInclusive: true,
      maximumInclusive: true,
    },
  };
}

function parseConditionInternal(
  input: unknown,
  path: string,
  depth: number,
): { ok: true; condition: GraphConditionIR } | GraphParserFailure {
  if (depth > 16) {
    return graphParserFailure('condition-budget-exceeded', 'condition-depth', path);
  }
  const symbol = graphSymbolName(input);
  if (symbol === 'True' || symbol === 'False') {
    return { ok: true, condition: { kind: 'constant', value: symbol === 'True' } };
  }
  const operator = graphNodeOperator(input);
  if (operator === 'And') {
    const operands = graphNodeOperands(input);
    if (operands.length === 0 || operands.length > 64) {
      return graphParserFailure('condition-budget-exceeded', 'condition-clause-count', path);
    }
    const clauses: GraphConditionIR[] = [];
    for (let index = 0; index < operands.length; index += 1) {
      const clause = parseConditionInternal(operands[index], `${path}.clauses[${index}]`, depth + 1);
      if (!clause.ok) return clause;
      if (clause.condition.kind === 'and') clauses.push(...clause.condition.clauses);
      else clauses.push(clause.condition);
    }
    if (clauses.length > 64) {
      return graphParserFailure('condition-budget-exceeded', 'condition-clause-count', path);
    }
    return { ok: true, condition: { kind: 'and', clauses } };
  }
  if (operator === 'Element') return parseIntervalMembership(input, path);
  if (operator && COMPARATOR_BY_OPERATOR.has(operator)) {
    const parsed = parseGraphComparatorChain(input, path);
    if (!parsed.ok) {
      return graphParserFailure(
        parsed.stopReason.code === 'expression-budget-exceeded'
          ? 'condition-budget-exceeded'
          : 'invalid-condition',
        parsed.stopReason.detailCode ?? 'invalid-comparison',
        parsed.stopReason.path ?? path,
      );
    }
    if (parsed.chain.operators.length === 1) {
      return {
        ok: true,
        condition: {
          kind: 'comparison',
          left: parsed.chain.operands[0],
          operator: parsed.chain.operators[0],
          right: parsed.chain.operands[1],
        },
      };
    }
    return {
      ok: true,
      condition: {
        kind: 'chain',
        operands: parsed.chain.operands,
        operators: parsed.chain.operators as GraphInequalityComparator[],
      },
    };
  }
  return graphParserFailure('invalid-condition', 'unsupported-condition-operator', path);
}

export function parseGraphConditionMathJson(
  input: unknown,
  path = '$',
): { ok: true; condition: GraphConditionIR } | GraphParserFailure {
  const parsed = parseConditionInternal(input, path, 1);
  if (!parsed.ok) return parsed;
  const validation = validateGraphCondition(parsed.condition);
  if (!validation.ok) {
    const budgetFailure = validation.failure.reason === 'condition-depth'
      || validation.failure.reason === 'condition-clause-limit';
    return graphParserFailure(
      budgetFailure ? 'condition-budget-exceeded' : 'invalid-condition',
      validation.failure.reason,
      validation.failure.path ?? path,
    );
  }
  return { ok: true, condition: validation.validated.value };
}

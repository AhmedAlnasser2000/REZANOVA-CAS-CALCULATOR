import { validateSerializableMathJson } from '../../display/printer/math-json';
import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';
import type {
  GraphConditionIR,
  GraphExpressionIR,
  GraphInequalityComparator,
  GraphPiecewiseSpecV1,
  GraphRelationIR,
} from '../contracts';
import {
  validateGraphPiecewise,
  validateGraphRelation,
} from '../contracts';
import { parseGraphComparatorChain, parseGraphConditionMathJson } from './conditions';
import {
  adaptGraphExpressionMathJson,
  GRAPH_PARSER_MAX_MATHJSON_BYTES,
  GRAPH_PARSER_MAX_MATHJSON_DEPTH,
  GRAPH_PARSER_MAX_MATHJSON_NODES,
} from './mathjson';
import {
  graphFunctionCall,
  graphNodeOperands,
  graphNodeOperator,
  graphSetOperands,
  graphSymbolName,
  graphTupleOperands,
} from './structure';
import {
  graphParserFailure,
  type GraphParserFailure,
  type GraphSourceClassificationV1,
} from './types';

const CARTESIAN_COORDINATES = new Set(['x', 'y']);
const POLAR_COORDINATES = new Set(['r', 'theta']);
const ALL_COORDINATES = new Set([...CARTESIAN_COORDINATES, ...POLAR_COORDINATES]);
const PARAMETRIC_SHORTHAND_SYMBOLS = ['t', 'u', 's'] as const;
const COMPARISON_OPERATORS = new Set(['Equal', 'Greater', 'GreaterEqual', 'Less', 'LessEqual']);
const UNSAFE_TOP_LEVEL_OPERATORS = new Set([
  'Assign', 'Declare', 'Evaluate', 'Function', 'Integrate', 'Lambda', 'Limit',
  'Product', 'Random', 'SetDelayed', 'Sum',
]);

function expressionUsesAny(expression: GraphExpressionIR, symbols: ReadonlySet<string>) {
  return expression.freeSymbols.some((symbol) => symbols.has(symbol));
}

function expressionsUseAny(
  expressions: readonly GraphExpressionIR[],
  symbols: ReadonlySet<string>,
) {
  return expressions.some((expression) => expressionUsesAny(expression, symbols));
}

function conditionExpressions(condition: GraphConditionIR): GraphExpressionIR[] {
  if (condition.kind === 'constant') return [];
  if (condition.kind === 'comparison') return [condition.left, condition.right];
  if (condition.kind === 'chain') return condition.operands;
  if (condition.kind === 'interval-membership') {
    return [
      condition.value,
      ...(condition.minimum ? [condition.minimum] : []),
      ...(condition.maximum ? [condition.maximum] : []),
    ];
  }
  return condition.clauses.flatMap(conditionExpressions);
}

function validatedRelation(
  relation: GraphRelationIR,
): { ok: true; relation: GraphRelationIR } | GraphParserFailure {
  const validation = validateGraphRelation(relation);
  if (!validation.ok) {
    return graphParserFailure(
      'unsupported-relation',
      validation.failure.reason,
      validation.failure.path,
    );
  }
  return { ok: true, relation: validation.validated.value };
}

function relationForTarget(
  target: 'x' | 'y' | 'r',
  rhs: GraphExpressionIR,
  origin: 'authored-relation' | 'bare-expression',
  path: string,
): { ok: true; relation: GraphRelationIR } | GraphParserFailure {
  if (target === 'y') {
    if (expressionUsesAny(rhs, new Set(['y', 'r', 'theta']))) {
      return graphParserFailure('coordinate-parameter-conflict', 'explicit-y-coordinate-conflict', path);
    }
    return validatedRelation({ kind: 'explicit-y', rhs, origin });
  }
  if (target === 'x') {
    if (expressionUsesAny(rhs, new Set(['x', 'r', 'theta']))) {
      return graphParserFailure('coordinate-parameter-conflict', 'explicit-x-coordinate-conflict', path);
    }
    return validatedRelation({ kind: 'explicit-x', rhs });
  }
  if (expressionUsesAny(rhs, new Set(['x', 'y', 'r']))) {
    return graphParserFailure('coordinate-parameter-conflict', 'polar-coordinate-conflict', path);
  }
  return validatedRelation({ kind: 'polar-radius', radius: rhs, angleSymbol: 'theta' });
}

function conditionAllowedForTarget(
  target: 'x' | 'y' | 'r',
  condition: GraphConditionIR,
) {
  const expressions = conditionExpressions(condition);
  if (target === 'y') return !expressionsUseAny(expressions, new Set(['y', 'r', 'theta']));
  if (target === 'x') return !expressionsUseAny(expressions, new Set(['x', 'r', 'theta']));
  return !expressionsUseAny(expressions, new Set(['x', 'y', 'r']));
}

function classifyPiecewise(
  node: unknown,
  target: 'x' | 'y' | 'r',
  origin: 'authored-relation' | 'bare-expression',
  path: string,
): GraphSourceClassificationV1 {
  const operands = graphNodeOperands(node);
  if (operands.length < 2 || operands.length % 2 !== 0 || operands.length > 64) {
    return graphParserFailure('unsupported-relation', 'piecewise-shape', path);
  }
  const branches: GraphPiecewiseSpecV1['branches'] = [];
  let otherwise: GraphRelationIR | undefined;

  for (let index = 0; index < operands.length; index += 2) {
    const conditionNode = operands[index];
    const valueNode = operands[index + 1];
    const branchNumber = index / 2 + 1;
    const expression = adaptGraphExpressionMathJson(valueNode, `${path}.values[${branchNumber - 1}]`);
    if (!expression.ok) return expression;
    const relation = relationForTarget(
      target,
      expression.expression,
      origin,
      `${path}.values[${branchNumber - 1}]`,
    );
    if (!relation.ok) return relation;
    const condition = parseGraphConditionMathJson(
      conditionNode,
      `${path}.conditions[${branchNumber - 1}]`,
    );
    if (!condition.ok) return condition;

    if (condition.condition.kind === 'constant' && condition.condition.value) {
      if (index !== operands.length - 2) {
        return graphParserFailure('invalid-condition', 'piecewise-otherwise-must-be-last', path);
      }
      otherwise = relation.relation;
      continue;
    }
    if (!conditionAllowedForTarget(target, condition.condition)) {
      return graphParserFailure(
        'coordinate-parameter-conflict',
        'piecewise-condition-coordinate-conflict',
        `${path}.conditions[${branchNumber - 1}]`,
      );
    }
    branches.push({
      branchId: `branch.${branchNumber}`,
      relation: relation.relation,
      condition: condition.condition,
    });
  }

  const piecewise: GraphPiecewiseSpecV1 = {
    version: 1,
    branches,
    ...(otherwise ? { otherwise } : {}),
  };
  const validation = validateGraphPiecewise(piecewise);
  if (!validation.ok) {
    return graphParserFailure(
      validation.failure.reason.startsWith('condition-')
        ? 'condition-budget-exceeded'
        : 'unsupported-relation',
      validation.failure.reason,
      validation.failure.path ?? path,
    );
  }
  return { ok: true, itemKind: 'piecewise', piecewise: validation.validated.value };
}

function explicitParametricSignature(
  input: unknown,
): { parameterSymbol: string } | null {
  const tuple = graphTupleOperands(input);
  if (!tuple || tuple.length !== 2) return null;
  const xCall = graphFunctionCall(tuple[0]);
  const yCall = graphFunctionCall(tuple[1]);
  if (!xCall || !yCall || xCall.name !== 'x' || yCall.name !== 'y') return null;
  if (xCall.arguments.length !== 1 || yCall.arguments.length !== 1) return null;
  const xParameter = graphSymbolName(xCall.arguments[0]);
  const yParameter = graphSymbolName(yCall.arguments[0]);
  if (!xParameter || xParameter !== yParameter || ALL_COORDINATES.has(xParameter)) return null;
  return { parameterSymbol: xParameter };
}

function buildParametricRelation(
  parameterSymbol: string,
  coordinateNodes: readonly unknown[],
  path: string,
): GraphSourceClassificationV1 {
  if (coordinateNodes.length !== 2 || ALL_COORDINATES.has(parameterSymbol)) {
    return graphParserFailure('unsupported-relation', 'parametric-shape', path);
  }
  const x = adaptGraphExpressionMathJson(coordinateNodes[0], `${path}.x`);
  if (!x.ok) return x;
  const y = adaptGraphExpressionMathJson(coordinateNodes[1], `${path}.y`);
  if (!y.ok) return y;
  if (expressionsUseAny([x.expression, y.expression], ALL_COORDINATES)) {
    return graphParserFailure('coordinate-parameter-conflict', 'parametric-coordinate-conflict', path);
  }
  const relation = validatedRelation({
    kind: 'parametric-curve',
    parameterSymbol,
    x: x.expression,
    y: y.expression,
  });
  return relation.ok
    ? { ok: true, itemKind: 'relation', relation: relation.relation }
    : relation;
}

function classifyPointCoordinates(
  tuples: readonly unknown[][],
  path: string,
): GraphSourceClassificationV1 {
  if (tuples.length > 512) {
    return graphParserFailure('expression-budget-exceeded', 'point-count', path);
  }
  const points: Array<{ x: SerializableMathJson; y: SerializableMathJson }> = [];
  for (let index = 0; index < tuples.length; index += 1) {
    const tuple = tuples[index];
    if (tuple.length !== 2) {
      return graphParserFailure('unsupported-relation', 'point-arity', `${path}[${index}]`);
    }
    const x = adaptGraphExpressionMathJson(tuple[0], `${path}[${index}].x`);
    if (!x.ok) return x;
    const y = adaptGraphExpressionMathJson(tuple[1], `${path}[${index}].y`);
    if (!y.ok) return y;
    if (expressionsUseAny([x.expression, y.expression], ALL_COORDINATES)) {
      return graphParserFailure('coordinate-parameter-conflict', 'point-coordinate-conflict', `${path}[${index}]`);
    }
    points.push({ x: x.expression.mathJson, y: y.expression.mathJson });
  }
  return { ok: true, itemKind: 'point-set', points };
}

function classifyTuple(input: unknown, path: string): GraphSourceClassificationV1 {
  const tuple = graphTupleOperands(input);
  if (!tuple || tuple.length !== 2) {
    return graphParserFailure('unsupported-relation', 'tuple-arity', path);
  }
  const adapted = tuple.map((node, index) =>
    adaptGraphExpressionMathJson(node, `${path}[${index}]`));
  const failure = adapted.find((entry) => !entry.ok);
  if (failure && !failure.ok) return failure;
  const expressions = adapted.map((entry) => {
    if (!entry.ok) throw new Error('Unreachable failed Graph tuple expression.');
    return entry.expression;
  });
  const shorthandParameters = PARAMETRIC_SHORTHAND_SYMBOLS.filter((symbol) =>
    expressions.some((expression) => expression.freeSymbols.includes(symbol)));
  if (shorthandParameters.length > 1) {
    return graphParserFailure('invalid-parameter', 'ambiguous-parametric-symbol', path);
  }
  if (shorthandParameters.length === 1) {
    return buildParametricRelation(shorthandParameters[0], tuple, path);
  }
  return classifyPointCoordinates([tuple], path);
}

function classifySet(input: unknown, path: string): GraphSourceClassificationV1 {
  const set = graphSetOperands(input);
  if (!set || set.length === 0) {
    return graphParserFailure('unsupported-relation', 'empty-point-set', path);
  }
  const tuples: unknown[][] = [];
  for (let index = 0; index < set.length; index += 1) {
    const tuple = graphTupleOperands(set[index]);
    if (!tuple) {
      return graphParserFailure('unsupported-relation', 'point-set-member-not-point', `${path}[${index}]`);
    }
    tuples.push(tuple);
  }
  return classifyPointCoordinates(tuples, path);
}

function classifyImplicitEquality(
  left: GraphExpressionIR,
  right: GraphExpressionIR,
  path: string,
): GraphSourceClassificationV1 {
  const expressions = [left, right];
  if (expressionsUseAny(expressions, POLAR_COORDINATES)) {
    return graphParserFailure('coordinate-parameter-conflict', 'implicit-polar-mix', path);
  }
  if (!expressionsUseAny(expressions, CARTESIAN_COORDINATES)) {
    return graphParserFailure('unsupported-relation', 'scalar-equality', path);
  }
  const relation = validatedRelation({ kind: 'implicit-equality', left, right });
  return relation.ok
    ? { ok: true, itemKind: 'relation', relation: relation.relation }
    : relation;
}

function classifyEquality(input: unknown, path: string): GraphSourceClassificationV1 {
  const operands = graphNodeOperands(input);
  if (operands.length !== 2) {
    return graphParserFailure('unsupported-relation', 'equality-chain', path);
  }
  const [leftNode, rightNode] = operands;
  if (COMPARISON_OPERATORS.has(graphNodeOperator(leftNode) ?? '')
    || COMPARISON_OPERATORS.has(graphNodeOperator(rightNode) ?? '')) {
    return graphParserFailure('unsupported-relation', 'equality-chain', path);
  }
  const parametric = explicitParametricSignature(leftNode);
  const rightTuple = graphTupleOperands(rightNode);
  if (parametric && rightTuple) {
    return buildParametricRelation(parametric.parameterSymbol, rightTuple, path);
  }

  const target = graphSymbolName(leftNode);
  if ((target === 'x' || target === 'y' || target === 'r')
    && graphNodeOperator(rightNode) === 'Which') {
    return classifyPiecewise(rightNode, target, 'authored-relation', `${path}.piecewise`);
  }
  const left = adaptGraphExpressionMathJson(leftNode, `${path}.left`);
  if (!left.ok) return left;
  const right = adaptGraphExpressionMathJson(rightNode, `${path}.right`);
  if (!right.ok) return right;

  if (target
    && !ALL_COORDINATES.has(target)
    && left.expression.freeSymbols.length === 1
    && left.expression.freeSymbols[0] === target) {
    if (right.expression.freeSymbols.length > 0) {
      return graphParserFailure('unsupported-relation', 'dependent-parameter-definition', path);
    }
    return {
      ok: true,
      itemKind: 'parameter-definition',
      symbol: target,
      value: right.expression,
    };
  }

  if (target === 'y' && !right.expression.freeSymbols.includes('y')) {
    if (expressionUsesAny(right.expression, POLAR_COORDINATES)) {
      return graphParserFailure('coordinate-parameter-conflict', 'explicit-y-coordinate-conflict', path);
    }
    const relation = validatedRelation({
      kind: 'explicit-y', rhs: right.expression, origin: 'authored-relation',
    });
    return relation.ok ? { ok: true, itemKind: 'relation', relation: relation.relation } : relation;
  }
  if (target === 'x' && !right.expression.freeSymbols.includes('x')) {
    if (expressionUsesAny(right.expression, POLAR_COORDINATES)) {
      return graphParserFailure('coordinate-parameter-conflict', 'explicit-x-coordinate-conflict', path);
    }
    const relation = validatedRelation({ kind: 'explicit-x', rhs: right.expression });
    return relation.ok ? { ok: true, itemKind: 'relation', relation: relation.relation } : relation;
  }
  if (target === 'r') {
    const relation = relationForTarget('r', right.expression, 'authored-relation', path);
    return relation.ok ? { ok: true, itemKind: 'relation', relation: relation.relation } : relation;
  }
  return classifyImplicitEquality(left.expression, right.expression, path);
}

function classifyComparison(input: unknown, path: string): GraphSourceClassificationV1 {
  if (graphNodeOperator(input) === 'Equal') return classifyEquality(input, path);
  const parsed = parseGraphComparatorChain(input, path);
  if (!parsed.ok) return parsed;
  if (expressionsUseAny(parsed.chain.operands, POLAR_COORDINATES)) {
    return graphParserFailure('coordinate-parameter-conflict', 'inequality-polar-mix', path);
  }
  if (!expressionsUseAny(parsed.chain.operands, CARTESIAN_COORDINATES)) {
    return graphParserFailure('unsupported-relation', 'scalar-inequality', path);
  }
  if (parsed.chain.operators.length === 1) {
    const relation = validatedRelation({
      kind: 'inequality',
      left: parsed.chain.operands[0],
      operator: parsed.chain.operators[0] as GraphInequalityComparator,
      right: parsed.chain.operands[1],
    });
    return relation.ok ? { ok: true, itemKind: 'relation', relation: relation.relation } : relation;
  }
  const relation = validatedRelation({
    kind: 'chained-inequality',
    operands: parsed.chain.operands,
    operators: parsed.chain.operators as GraphInequalityComparator[],
  });
  return relation.ok ? { ok: true, itemKind: 'relation', relation: relation.relation } : relation;
}

function classifyBareExpression(input: unknown, path: string): GraphSourceClassificationV1 {
  const expression = adaptGraphExpressionMathJson(input, path);
  if (!expression.ok) return expression;
  const symbols = new Set(expression.expression.freeSymbols);
  if (symbols.has('y') || symbols.has('r') || symbols.has('theta')) {
    return graphParserFailure(
      'ambiguous-bare-expression',
      symbols.has('y') ? 'bare-y-or-mixed-cartesian' : 'bare-polar-coordinate',
      path,
    );
  }
  const relation = validatedRelation({
    kind: 'explicit-y',
    rhs: expression.expression,
    origin: 'bare-expression',
  });
  return relation.ok ? { ok: true, itemKind: 'relation', relation: relation.relation } : relation;
}

export function classifyGraphMathJson(input: unknown): GraphSourceClassificationV1 {
  const bounded = validateSerializableMathJson(input, {
    maxNodes: GRAPH_PARSER_MAX_MATHJSON_NODES,
    maxDepth: GRAPH_PARSER_MAX_MATHJSON_DEPTH,
    maxBytes: GRAPH_PARSER_MAX_MATHJSON_BYTES,
  });
  if (!bounded.ok) {
    const budgetFailure = ['node-limit', 'depth-limit', 'byte-limit'].includes(bounded.failure.reason);
    return graphParserFailure(
      budgetFailure ? 'expression-budget-exceeded' : 'unsafe-expression',
      bounded.failure.reason,
    );
  }
  const node = bounded.validated.value;
  const operator = graphNodeOperator(node);
  if (operator && UNSAFE_TOP_LEVEL_OPERATORS.has(operator)) {
    return graphParserFailure('unsafe-expression', operator);
  }
  if (operator === 'Error') {
    return graphParserFailure('unsupported-relation', 'incomplete-or-invalid-source');
  }
  if (operator === 'Which') return classifyPiecewise(node, 'y', 'bare-expression', '$.piecewise');
  if (graphTupleOperands(node)) return classifyTuple(node, '$.tuple');
  if (graphSetOperands(node)) return classifySet(node, '$.points');
  if (operator && COMPARISON_OPERATORS.has(operator)) return classifyComparison(node, '$');
  if (operator === 'And' || operator === 'Or' || operator === 'NotEqual' || operator === 'Approx') {
    return graphParserFailure('unsupported-relation', `unsupported-top-level-${operator}`);
  }
  return classifyBareExpression(node, '$');
}

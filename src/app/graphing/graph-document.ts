import {
  classifyGraphSource,
  adaptGraphExpressionMathJson,
  parseGraphConditionMathJson,
  parseGraphLatexToStructuralMathJson,
  serializeGraphMathJsonToLatex,
  type GraphConditionIR,
  type GraphDocumentV1,
  type GraphItemPresentationV1,
  type GraphItemSpecV1,
  type GraphSourceV1,
  type GraphStopReason,
} from '../../lib/graphing';

const GRAPH_COLOR_TOKENS = [
  'graph-blue',
  'graph-green',
  'graph-violet',
  'graph-orange',
  'graph-cyan',
] as const;

function presentation(index: number): GraphItemPresentationV1 {
  return {
    version: 1,
    colorToken: GRAPH_COLOR_TOKENS[index % GRAPH_COLOR_TOKENS.length],
    stroke: 'solid',
    strokeWidth: 'normal',
    fillOpacity: 0.18,
    label: 'auto',
  };
}

export function graphItemSource(item: GraphItemSpecV1) {
  return 'source' in item ? item.source : null;
}

export function graphItemSourceLatex(item: GraphItemSpecV1) {
  return graphItemSource(item)?.sourceLatex ?? '';
}

function expressionLatex(expression: { mathJson: Parameters<typeof serializeGraphMathJsonToLatex>[0] }) {
  return serializeGraphMathJsonToLatex(expression.mathJson);
}

export function graphConditionLatex(condition: GraphConditionIR): string {
  if (condition.kind === 'constant') return condition.value ? '\\mathrm{true}' : '\\mathrm{false}';
  if (condition.kind === 'comparison') {
    return `${expressionLatex(condition.left)}${condition.operator}${expressionLatex(condition.right)}`;
  }
  if (condition.kind === 'chain') {
    return condition.operands.map((operand, index) => (
      `${index ? condition.operators[index - 1] : ''}${expressionLatex(operand)}`
    )).join('');
  }
  if (condition.kind === 'and') return condition.clauses.map(graphConditionLatex).join('\\land ');
  const minimum = condition.minimum ? expressionLatex(condition.minimum) : '-\\infty';
  const maximum = condition.maximum ? expressionLatex(condition.maximum) : '\\infty';
  return `${expressionLatex(condition.value)}\\in${condition.minimumInclusive ? '[' : '('}${minimum},${maximum}${condition.maximumInclusive ? ']' : ')'}`;
}

export function graphPiecewiseBranchValueLatex(
  branch: Extract<GraphItemSpecV1, { kind: 'piecewise' }>['piecewise']['branches'][number],
) {
  return branch.relation.kind === 'explicit-y' || branch.relation.kind === 'explicit-x'
    ? expressionLatex(branch.relation.rhs)
    : '';
}

function presentationPiecewiseLatex(item: Extract<GraphItemSpecV1, { kind: 'piecewise' }>) {
  const target = item.piecewise.branches[0]?.relation.kind === 'explicit-x' ? 'x' : 'y';
  const rows = item.piecewise.branches.map((branch) => (
    `${graphPiecewiseBranchValueLatex(branch)}&${graphConditionLatex(branch.condition)}`
  ));
  return `${target}=\\begin{cases}${rows.join('\\\\')}\\end{cases}`;
}

export function updateGraphPiecewiseBranch(input: {
  document: GraphDocumentV1;
  itemId: string;
  branchId: string;
  valueLatex: string;
  conditionLatex: string;
}): GraphDocumentV1 | null {
  const item = input.document.items.find((candidate): candidate is Extract<GraphItemSpecV1, { kind: 'piecewise' }> => (
    candidate.itemId === input.itemId && candidate.kind === 'piecewise'
  ));
  const branch = item?.piecewise.branches.find((candidate) => candidate.branchId === input.branchId);
  if (!item || !branch) return null;
  const parsedValue = parseGraphLatexToStructuralMathJson(input.valueLatex);
  if (!parsedValue.ok) return null;
  const value = adaptGraphExpressionMathJson(parsedValue.mathJson, '$.guided.value');
  const parsedCondition = parseGraphLatexToStructuralMathJson(input.conditionLatex);
  if (!value.ok || !parsedCondition.ok) return null;
  const condition = parseGraphConditionMathJson(parsedCondition.mathJson, '$.guided.condition');
  if (!condition.ok) return null;
  const relation = branch.relation.kind === 'explicit-x'
    ? { kind: 'explicit-x' as const, rhs: value.expression }
    : { kind: 'explicit-y' as const, rhs: value.expression, origin: 'authored-relation' as const };
  const nextItem = {
    ...item,
    source: { ...item.source, sourceRevision: item.source.sourceRevision + 1 },
    piecewise: {
      ...item.piecewise,
      branches: item.piecewise.branches.map((candidate) => candidate.branchId === input.branchId
        ? { ...candidate, relation, condition: condition.condition }
        : candidate),
    },
  };
  nextItem.source.sourceLatex = presentationPiecewiseLatex(nextItem);
  return replaceGraphDocumentItem(input.document, nextItem);
}

export function mutateGraphPiecewiseBranches(input: {
  document: GraphDocumentV1;
  itemId: string;
  action: 'add' | 'remove' | 'up' | 'down';
  branchId?: string;
}): GraphDocumentV1 | null {
  const item = input.document.items.find((candidate): candidate is Extract<GraphItemSpecV1, { kind: 'piecewise' }> => (
    candidate.itemId === input.itemId && candidate.kind === 'piecewise'
  ));
  if (!item) return null;
  const branches = [...item.piecewise.branches];
  const index = input.branchId
    ? branches.findIndex((branch) => branch.branchId === input.branchId)
    : -1;
  if (input.action === 'add') {
    branches.push({
      branchId: `${item.itemId}.branch.${item.source.sourceRevision + 1}`,
      relation: { kind: 'explicit-y', origin: 'authored-relation', rhs: { mathJson: 0, freeSymbols: [] } },
      condition: { kind: 'constant', value: false },
    });
  } else if (input.action === 'remove' && index >= 0 && branches.length > 1) {
    branches.splice(index, 1);
  } else if (input.action === 'up' && index > 0) {
    [branches[index - 1], branches[index]] = [branches[index], branches[index - 1]];
  } else if (input.action === 'down' && index >= 0 && index < branches.length - 1) {
    [branches[index], branches[index + 1]] = [branches[index + 1], branches[index]];
  } else {
    return null;
  }
  const nextItem = {
    ...item,
    source: { ...item.source, sourceRevision: item.source.sourceRevision + 1 },
    piecewise: { ...item.piecewise, branches },
  };
  nextItem.source.sourceLatex = presentationPiecewiseLatex(nextItem);
  return replaceGraphDocumentItem(input.document, nextItem);
}

function unsupportedVisibleRouteStop(detailCode: string): GraphStopReason {
  return {
    code: 'unsupported-relation',
    detailCode,
    path: '$',
  };
}

export function buildVisibleGraphItem(input: {
  itemId: string;
  sourceLatex: string;
  sourceRevision: number;
  index: number;
  previous?: GraphItemSpecV1;
}): GraphItemSpecV1 {
  const source: GraphSourceV1 = {
    sourceKind: 'mathlive-latex',
    sourceLatex: input.sourceLatex,
    sourceRevision: input.sourceRevision,
  };
  const previousPresentation = input.previous && 'presentation' in input.previous
    ? input.previous.presentation
    : presentation(input.index);
  const visible = input.previous?.visible ?? true;
  const classified = classifyGraphSource(source);
  if (classified.ok
    && classified.itemKind === 'relation'
    && (classified.relation.kind === 'explicit-y'
      || classified.relation.kind === 'explicit-x'
      || classified.relation.kind === 'implicit-equality'
      || classified.relation.kind === 'inequality'
      || classified.relation.kind === 'chained-inequality')) {
    return {
      version: 1,
      kind: 'relation',
      itemId: input.itemId,
      source,
      relation: classified.relation,
      visible,
      presentation: previousPresentation,
    };
  }

  if (classified.ok && classified.itemKind === 'point-set') {
    return {
      version: 1,
      kind: 'point-set',
      itemId: input.itemId,
      source,
      points: classified.points,
      visible,
      presentation: previousPresentation,
    };
  }

  if (classified.ok && classified.itemKind === 'piecewise') {
    return {
      version: 1,
      kind: 'piecewise',
      itemId: input.itemId,
      source,
      piecewise: classified.piecewise,
      visible,
      presentation: previousPresentation,
    };
  }

  const parseStop = classified.ok
    ? unsupportedVisibleRouteStop(`future-${classified.itemKind}`)
    : classified.stopReason;
  return {
    version: 1,
    kind: 'invalid-relation-draft',
    itemId: input.itemId,
    source,
    parseStop: classified.ok && classified.itemKind === 'relation'
      ? unsupportedVisibleRouteStop(`future-${classified.relation.kind}`)
      : parseStop,
    visible,
    presentation: previousPresentation,
  };
}

export function replaceGraphDocumentItem(
  document: GraphDocumentV1,
  item: GraphItemSpecV1,
) {
  const existingIndex = document.items.findIndex((candidate) => candidate.itemId === item.itemId);
  const items = existingIndex < 0
    ? [...document.items, item]
    : document.items.map((candidate, index) => index === existingIndex ? item : candidate);
  return {
    ...document,
    documentRevision: document.documentRevision + 1,
    items,
  } satisfies GraphDocumentV1;
}

export function removeGraphDocumentItem(
  document: GraphDocumentV1,
  itemId: string,
) {
  return {
    ...document,
    documentRevision: document.documentRevision + 1,
    items: document.items.filter((item) => item.itemId !== itemId),
  } satisfies GraphDocumentV1;
}

export function toggleGraphDocumentItem(
  document: GraphDocumentV1,
  itemId: string,
) {
  return {
    ...document,
    documentRevision: document.documentRevision + 1,
    items: document.items.map((item) => item.itemId === itemId
      ? { ...item, visible: !item.visible }
      : item),
  } satisfies GraphDocumentV1;
}

export function graphDraftMessage(stop: GraphStopReason) {
  if (stop.detailCode === 'empty-source') return '';
  if (stop.detailCode === 'incomplete-or-invalid-source') return 'Keep typing to finish the expression.';
  if (stop.code === 'ambiguous-bare-expression') {
    return 'Use an x-based expression, or write an explicit relation such as y = …';
  }
  if (stop.detailCode?.startsWith('future-')) {
    return 'This relation is recognized, but its plotting route arrives in the next Graphing moves.';
  }
  if (stop.code === 'expression-budget-exceeded') return 'This expression is over the safe Graphing budget.';
  if (stop.code === 'unsafe-expression') return 'This expression is not safe to evaluate in Graphing.';
  return 'This expression is not supported by the current real-function plotter.';
}

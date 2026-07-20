import {
  classifyGraphSource,
  compileGraphExpression,
  createGraphExpressionEvaluator,
  defaultGraphItemPresentation,
  adaptGraphExpressionMathJson,
  parseGraphConditionMathJson,
  parseGraphLatexToStructuralMathJson,
  serializeGraphMathJsonToLatex,
  type GraphConditionIR,
  type GraphDocumentV3,
  type GraphItemPresentationV2,
  type GraphItemSpecV1,
  type GraphItemSpecV2,
  type GraphNoteItemV1,
  type GraphSourceV1,
  type GraphStopReason,
} from '../../lib/graphing';

export function graphItemSource(item: GraphItemSpecV2) {
  return 'source' in item
    ? item.source
    : item.kind === 'parameter'
      ? item.parameter.source ?? null
      : null;
}

export function graphItemSourceLatex(item: GraphItemSpecV2) {
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

export type GraphPiecewiseDraftBranchFeedback = {
  value?: string;
  condition?: string;
};

function graphConditionFreeSymbols(condition: GraphConditionIR) {
  const symbols = new Set<string>();
  const expression = (value: { freeSymbols: string[] } | undefined) => {
    value?.freeSymbols.forEach((symbol) => symbols.add(symbol));
  };
  const visit = (value: GraphConditionIR) => {
    if (value.kind === 'comparison') { expression(value.left); expression(value.right); }
    else if (value.kind === 'chain') value.operands.forEach(expression);
    else if (value.kind === 'and') value.clauses.forEach(visit);
    else if (value.kind === 'interval-membership') {
      expression(value.value); expression(value.minimum); expression(value.maximum);
    }
  };
  visit(condition);
  return symbols;
}

export function graphPiecewiseDraftBranchFeedback(input: {
  target: 'x' | 'y';
  valueLatex: string;
  conditionLatex: string;
}): GraphPiecewiseDraftBranchFeedback {
  const feedback: GraphPiecewiseDraftBranchFeedback = {};
  const independent = input.target === 'y' ? 'x' : 'y';
  if (input.valueLatex.trim()) {
    const parsed = parseGraphLatexToStructuralMathJson(input.valueLatex);
    if (!parsed.ok) feedback.value = 'This branch value is incomplete or not recognized.';
    else {
      const value = adaptGraphExpressionMathJson(parsed.mathJson, '$.guided.value');
      if (!value.ok) feedback.value = 'This branch value is not a supported real expression.';
      else if (value.expression.freeSymbols.includes(input.target)) {
        feedback.value = `A branch defining ${input.target} cannot use ${input.target} in its value.`;
      }
    }
  }
  if (input.conditionLatex.trim()) {
    const parsed = parseGraphLatexToStructuralMathJson(input.conditionLatex);
    if (!parsed.ok) {
      feedback.condition = `Condition not recognized. Try a comparison such as ${independent} < 2.`;
    } else {
      const condition = parseGraphConditionMathJson(parsed.mathJson, '$.guided.condition');
      if (!condition.ok) {
        feedback.condition = condition.stopReason.detailCode === 'unsupported-condition-operator'
          ? `A condition needs a comparison such as ${independent} < 2.`
          : condition.stopReason.code === 'condition-budget-exceeded'
            ? 'This condition is too complex for a piecewise branch.'
            : `Condition not recognized. Try a comparison such as ${independent} < 2.`;
      } else if (graphConditionFreeSymbols(condition.condition).has(input.target)) {
        feedback.condition = `Use ${independent} for this branch condition; ${input.target} is being defined.`;
      }
    }
  }
  return feedback;
}

export function buildGraphPiecewiseItemFromAuthoringDraft(input: {
  itemId: string;
  sourceRevision: number;
  index: number;
  target: 'y' | 'x';
  branches: Array<{ branchId: string; valueLatex: string; conditionLatex: string }>;
  previous?: Extract<GraphItemSpecV1, { kind: 'piecewise' }>;
}): Extract<GraphItemSpecV1, { kind: 'piecewise' }> | null {
  const branches: Extract<GraphItemSpecV1, { kind: 'piecewise' }>['piecewise']['branches'] = [];
  for (const branch of input.branches) {
    if (!branch.valueLatex.trim() || !branch.conditionLatex.trim()) return null;
    const parsedValue = parseGraphLatexToStructuralMathJson(branch.valueLatex);
    const parsedCondition = parseGraphLatexToStructuralMathJson(branch.conditionLatex);
    if (!parsedValue.ok || !parsedCondition.ok) return null;
    const value = adaptGraphExpressionMathJson(parsedValue.mathJson, '$.guided.value');
    const condition = parseGraphConditionMathJson(parsedCondition.mathJson, '$.guided.condition');
    if (!value.ok || !condition.ok) return null;
    branches.push({
      branchId: branch.branchId,
      relation: input.target === 'x'
        ? { kind: 'explicit-x', rhs: value.expression }
        : { kind: 'explicit-y', origin: 'authored-relation', rhs: value.expression },
      condition: condition.condition,
    });
  }
  if (branches.length < 2) return null;
  const item: Extract<GraphItemSpecV1, { kind: 'piecewise' }> = {
    version: 1,
    kind: 'piecewise',
    itemId: input.itemId,
    source: { sourceKind: 'mathlive-latex', sourceLatex: '', sourceRevision: input.sourceRevision },
    piecewise: { version: 1, branches },
    visible: input.previous?.visible ?? true,
    presentation: input.previous?.presentation ?? defaultGraphItemPresentation(input.index),
  };
  item.source.sourceLatex = presentationPiecewiseLatex(item);
  return item;
}

function presentationPiecewiseLatex(item: Extract<GraphItemSpecV1, { kind: 'piecewise' }>) {
  const target = item.piecewise.branches[0]?.relation.kind === 'explicit-x' ? 'x' : 'y';
  const rows = item.piecewise.branches.map((branch) => (
    `${graphPiecewiseBranchValueLatex(branch)}&${graphConditionLatex(branch.condition)}`
  ));
  return `${target}=\\begin{cases}${rows.join('\\\\')}\\end{cases}`;
}

export function updateGraphPiecewiseBranch(input: {
  document: GraphDocumentV3;
  itemId: string;
  branchId: string;
  valueLatex: string;
  conditionLatex: string;
}): GraphDocumentV3 | null {
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
  document: GraphDocumentV3;
  itemId: string;
  action: 'add' | 'remove' | 'up' | 'down';
  branchId?: string;
}): GraphDocumentV3 | null {
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
    : defaultGraphItemPresentation(input.index);
  const visible = input.previous?.visible ?? true;
  const classified = classifyGraphSource(source);
  if (classified.ok
    && classified.itemKind === 'relation'
    && (classified.relation.kind === 'explicit-y'
      || classified.relation.kind === 'explicit-x'
      || classified.relation.kind === 'implicit-equality'
      || classified.relation.kind === 'inequality'
      || classified.relation.kind === 'chained-inequality'
      || classified.relation.kind === 'polar-radius'
      || classified.relation.kind === 'parametric-curve'
      || classified.relation.kind === 'real-surface')) {
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

  if (classified.ok && classified.itemKind === 'parameter-definition') {
    const compiled = compileGraphExpression({
      planId: `${input.itemId}:parameter`,
      sourceRevision: input.sourceRevision,
      expression: classified.value,
    });
    const evaluated = compiled.ok
      ? createGraphExpressionEvaluator(compiled.plan).evaluate({})
      : null;
    if (evaluated?.status === 'finite') {
      return {
        version: 1,
        kind: 'parameter',
        itemId: input.itemId,
        parameter: {
          version: 1,
          parameterId: `${input.itemId}:parameter`,
          symbol: classified.symbol,
          origin: 'authored-definition',
          source,
          value: evaluated.value,
          minimum: Math.min(-3, evaluated.value),
          maximum: Math.max(3, evaluated.value),
          step: 0.1,
        },
        visible,
      };
    }
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

export function createGraphParameterItem(input: {
  itemId: string;
  symbol: string;
}): Extract<GraphItemSpecV1, { kind: 'parameter' }> {
  return {
    version: 1,
    kind: 'parameter',
    itemId: input.itemId,
    parameter: {
      version: 1,
      parameterId: `${input.itemId}:parameter`,
      symbol: input.symbol,
      origin: 'slider-created',
      value: 1,
      minimum: -3,
      maximum: 3,
      step: 0.1,
    },
    visible: true,
  };
}

export function updateGraphParameterItem(input: {
  document: GraphDocumentV3;
  itemId: string;
  values: Partial<Pick<Extract<GraphItemSpecV1, { kind: 'parameter' }>['parameter'],
    'value' | 'minimum' | 'maximum' | 'step' | 'animation'>>;
}) {
  const item = input.document.items.find((candidate): candidate is Extract<GraphItemSpecV1, { kind: 'parameter' }> => (
    candidate.itemId === input.itemId && candidate.kind === 'parameter'
  ));
  if (!item) return null;
  const parameter = { ...item.parameter, ...input.values };
  if (!Number.isFinite(parameter.value)
    || !Number.isFinite(parameter.minimum)
    || !Number.isFinite(parameter.maximum)
    || !Number.isFinite(parameter.step)
    || parameter.minimum > parameter.maximum
    || parameter.step <= 0) return null;
  parameter.value = Math.min(parameter.maximum, Math.max(parameter.minimum, parameter.value));
  return replaceGraphDocumentItem(input.document, { ...item, parameter });
}

export function updateGraphRealSurfaceBounds(input: {
  document: GraphDocumentV3;
  itemId: string;
  bounds?: { xMin: number; xMax: number; yMin: number; yMax: number };
}) {
  const item = input.document.items.find((candidate): candidate is Extract<GraphItemSpecV1, { kind: 'relation' }> => (
    candidate.itemId === input.itemId && candidate.kind === 'relation'
  ));
  if (!item || item.relation.kind !== 'real-surface') return null;
  if (input.bounds && (!Object.values(input.bounds).every(Number.isFinite)
    || input.bounds.xMin >= input.bounds.xMax || input.bounds.yMin >= input.bounds.yMax)) return null;
  const relation = input.bounds
    ? { ...item.relation, bounds: input.bounds }
    : { kind: 'real-surface' as const, z: item.relation.z };
  return replaceGraphDocumentItem(input.document, {
    ...item,
    relation,
  });
}

export function replaceGraphDocumentItem(
  document: GraphDocumentV3,
  item: GraphItemSpecV1,
) {
  const existingIndex = document.items.findIndex((candidate) => candidate.itemId === item.itemId);
  const items = existingIndex < 0
    ? [...document.items, item]
    : document.items.map((candidate, index) => index === existingIndex ? item : candidate);
  return {
    ...document,
    contentRevision: document.contentRevision + 1,
    mathematicsRevision: document.mathematicsRevision + 1,
    items,
  } satisfies GraphDocumentV3;
}

export function removeGraphDocumentItem(
  document: GraphDocumentV3,
  itemId: string,
) {
  const removed = document.items.find((item) => item.itemId === itemId);
  return {
    ...document,
    contentRevision: document.contentRevision + 1,
    mathematicsRevision: document.mathematicsRevision + (removed?.kind === 'note' ? 0 : 1),
    items: document.items.filter((item) => item.itemId !== itemId),
  } satisfies GraphDocumentV3;
}

export function toggleGraphDocumentItem(
  document: GraphDocumentV3,
  itemId: string,
) {
  return {
    ...document,
    contentRevision: document.contentRevision + 1,
    mathematicsRevision: document.mathematicsRevision + 1,
    items: document.items.map((item) => item.itemId === itemId
      ? item.kind === 'note' ? item : { ...item, visible: !item.visible }
      : item),
  } satisfies GraphDocumentV3;
}

export function replaceGraphDocumentPresentation(input: {
  document: GraphDocumentV3;
  itemId: string;
  presentation: GraphItemPresentationV2;
}) {
  const item = input.document.items.find((candidate) => candidate.itemId === input.itemId);
  if (!item || !('presentation' in item)) return null;
  return {
    ...input.document,
    contentRevision: input.document.contentRevision + 1,
    items: input.document.items.map((candidate) => candidate.itemId === input.itemId
      ? { ...candidate, presentation: input.presentation }
      : candidate),
  } satisfies GraphDocumentV3;
}

export function createGraphNoteItem(itemId: string): GraphNoteItemV1 {
  return { version: 1, kind: 'note', itemId, text: '' };
}

export function replaceGraphDocumentNote(
  document: GraphDocumentV3,
  note: GraphNoteItemV1,
) {
  const existingIndex = document.items.findIndex((candidate) => candidate.itemId === note.itemId);
  const items = existingIndex < 0
    ? [...document.items, note]
    : document.items.map((candidate, index) => index === existingIndex ? note : candidate);
  return {
    ...document,
    contentRevision: document.contentRevision + 1,
    items,
  } satisfies GraphDocumentV3;
}

export function reorderGraphDocumentItem(
  document: GraphDocumentV3,
  itemId: string,
  destinationIndex: number,
) {
  const sourceIndex = document.items.findIndex((item) => item.itemId === itemId);
  if (sourceIndex < 0) return document;
  const boundedIndex = Math.max(0, Math.min(document.items.length - 1, destinationIndex));
  if (boundedIndex === sourceIndex) return document;
  const items = [...document.items];
  const [item] = items.splice(sourceIndex, 1);
  items.splice(boundedIndex, 0, item);
  return {
    ...document,
    contentRevision: document.contentRevision + 1,
    items,
  } satisfies GraphDocumentV3;
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
  if (stop.detailCode === 'dependent-parameter-definition') {
    return 'Dependent parameter definitions are not supported yet. Use a finite numeric value.';
  }
  if (stop.code === 'expression-budget-exceeded') return 'This expression is over the safe Graphing budget.';
  if (stop.code === 'unsafe-expression') return 'This expression is not safe to evaluate in Graphing.';
  return 'This expression is not supported by the current real-function plotter.';
}

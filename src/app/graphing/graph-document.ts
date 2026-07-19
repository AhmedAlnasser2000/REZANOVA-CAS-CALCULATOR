import {
  classifyGraphSource,
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

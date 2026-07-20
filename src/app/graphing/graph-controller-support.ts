import type {
  GraphClassifiedItemSnapshotV2,
  GraphDocumentV4,
  GraphItemSpecV1,
  GraphViewportV1,
} from '../../lib/graphing';

export function classifiedGraphItems(document: GraphDocumentV4): GraphClassifiedItemSnapshotV2[] {
  const items: GraphClassifiedItemSnapshotV2[] = [];
  document.items.forEach((item) => {
    if (item.kind !== 'relation' && item.kind !== 'piecewise' && item.kind !== 'point-set') return;
    const { presentation: _presentation, ...mathematics } = item;
    void _presentation;
    items.push(mathematics);
  });
  return items;
}

export function graphParameterEnvironment(document: GraphDocumentV4) {
  return Object.fromEntries(document.items
    .filter((item): item is Extract<GraphItemSpecV1, { kind: 'parameter' }> => item.kind === 'parameter')
    .map((item) => [item.parameter.symbol, item.parameter.value]));
}

export function graphItemFreeSymbols(item: GraphItemSpecV1 | GraphClassifiedItemSnapshotV2) {
  const symbols = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if ('freeSymbols' in value && Array.isArray(value.freeSymbols)) {
      value.freeSymbols.forEach((symbol) => {
        if (typeof symbol === 'string') symbols.add(symbol);
      });
    }
    Object.values(value).forEach((child) => Array.isArray(child) ? child.forEach(visit) : visit(child));
  };
  visit(item);
  return symbols;
}

export function graphParameterEnvironmentChanged(left: GraphDocumentV4, right: GraphDocumentV4) {
  const leftParameters = graphParameterEnvironment(left);
  const rightParameters = graphParameterEnvironment(right);
  const symbols = new Set([...Object.keys(leftParameters), ...Object.keys(rightParameters)]);
  return [...symbols].some((symbol) => leftParameters[symbol] !== rightParameters[symbol]);
}

export function unresolvedGraphSymbols(document: GraphDocumentV4) {
  const declared = new Set(document.items
    .filter((item): item is Extract<GraphItemSpecV1, { kind: 'parameter' }> => item.kind === 'parameter')
    .map((item) => item.parameter.symbol));
  const reserved = new Set(['x', 'y', 'z', 'r', 'theta']);
  for (const item of document.items) {
    if (item.kind === 'relation' && item.relation.kind === 'parametric-curve') {
      reserved.add(item.relation.parameterSymbol);
    }
  }
  const symbols = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if ('freeSymbols' in value && Array.isArray(value.freeSymbols)) {
      value.freeSymbols.forEach((symbol) => {
        if (typeof symbol === 'string' && !reserved.has(symbol) && !declared.has(symbol)) {
          symbols.add(symbol);
        }
      });
    }
    Object.values(value).forEach(visit);
  };
  document.items.forEach((item) => {
    if (item.kind === 'relation' || item.kind === 'piecewise') visit(item);
  });
  return [...symbols].sort();
}

function graphMathematicsProjection(document: GraphDocumentV4) {
  return document.items.flatMap((item): unknown[] => {
    if (item.kind === 'note') return [];
    if ('presentation' in item) {
      const { presentation: _presentation, ...mathematics } = item;
      void _presentation;
      return [mathematics];
    }
    return [item];
  });
}

export function restoredGraphDocument(current: GraphDocumentV4, snapshot: GraphDocumentV4) {
  const mathematicsChanged = JSON.stringify(graphMathematicsProjection(current))
    !== JSON.stringify(graphMathematicsProjection(snapshot));
  return {
    ...snapshot,
    contentRevision: current.contentRevision + 1,
    mathematicsRevision: current.mathematicsRevision + (mathematicsChanged ? 1 : 0),
  } satisfies GraphDocumentV4;
}

export function isFiniteGraphViewport(viewport: GraphViewportV1) {
  return Number.isFinite(viewport.xMin)
    && Number.isFinite(viewport.xMax)
    && Number.isFinite(viewport.yMin)
    && Number.isFinite(viewport.yMax)
    && viewport.xMax > viewport.xMin
    && viewport.yMax > viewport.yMin;
}

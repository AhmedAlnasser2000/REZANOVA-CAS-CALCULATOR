import type { GraphDocumentV4 } from '../../lib/graphing';
import type { GraphTraceRouteKind } from './GraphSvgViewport';

/**
 * How each item is traced: y = f(x) and x = f(y) curves sweep by their input,
 * polar and parametric curves by their parameter, points and surfaces by
 * position. A piecewise item traces like its branches (it sweeps across them).
 */
export function graphItemTraceRoutes(items: GraphDocumentV4['items']) {
  const routes: Record<string, GraphTraceRouteKind> = {};
  for (const item of items) {
    if (item.kind === 'point-set') { routes[item.itemId] = 'point-set'; continue; }
    const relation = item.kind === 'relation' ? item.relation
      : item.kind === 'piecewise' ? item.piecewise.branches[0]?.relation ?? item.piecewise.otherwise : undefined;
    if (!relation) continue;
    if (relation.kind === 'explicit-y' || relation.kind === 'explicit-x') routes[item.itemId] = relation.kind;
    else if (relation.kind === 'polar-radius') routes[item.itemId] = { kind: 'polar-radius', parameterSymbol: 'theta' };
    else if (relation.kind === 'parametric-curve') routes[item.itemId] = { kind: 'parametric-curve', parameterSymbol: relation.parameterSymbol };
    else if (relation.kind === 'real-surface') routes[item.itemId] = 'real-surface';
  }
  return routes;
}

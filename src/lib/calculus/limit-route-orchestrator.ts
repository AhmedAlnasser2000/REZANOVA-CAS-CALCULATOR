import type { DisplayDetailSection } from '../../types/calculator';
import type { LimitRouteClassification, LimitRouteKind } from './limit-route-classifier';

export type LimitRoutePlan =
  | {
      kind: 'ready';
      routeKind: Exclude<LimitRouteKind, 'malformed' | 'too-complex' | 'unsupported'>;
      allowNumericFallback: boolean;
      classification: LimitRouteClassification;
    }
  | {
      kind: 'blocked';
      routeKind: Extract<LimitRouteKind, 'malformed' | 'too-complex' | 'unsupported'>;
      error: string;
      detailSections: DisplayDetailSection[];
      classification: LimitRouteClassification;
    };

function routeDiagnostic(classification: LimitRouteClassification): DisplayDetailSection[] {
  const lines = [
    `Route classification: ${classification.kind}.`,
    `Reason: ${classification.reason}.`,
  ];

  if (classification.nodeCount !== undefined && classification.maxDepth !== undefined) {
    lines.push(`Route profile: ${classification.nodeCount} nodes, depth ${classification.maxDepth}.`);
  }

  return [{
    title: 'Limit Diagnostic',
    lines,
  }];
}

function blockedRoute(
  classification: LimitRouteClassification,
  error: string,
): LimitRoutePlan {
  return {
    kind: 'blocked',
    routeKind: classification.kind as Extract<LimitRouteKind, 'malformed' | 'too-complex' | 'unsupported'>,
    error,
    detailSections: routeDiagnostic(classification),
    classification,
  };
}

export function planNaturalLimitRoute(classification: LimitRouteClassification): LimitRoutePlan {
  if (classification.kind === 'malformed') {
    return blockedRoute(classification, classification.reason);
  }

  if (classification.kind === 'too-complex') {
    return blockedRoute(classification, 'This limit expression exceeds the current Calculus route budget.');
  }

  if (classification.kind === 'unsupported') {
    return blockedRoute(classification, 'This limit is outside the supported Calculus limit routes.');
  }

  return {
    kind: 'ready',
    routeKind: classification.kind,
    allowNumericFallback: classification.kind === 'direct-substitution' || classification.kind === 'finite-pole',
    classification,
  };
}

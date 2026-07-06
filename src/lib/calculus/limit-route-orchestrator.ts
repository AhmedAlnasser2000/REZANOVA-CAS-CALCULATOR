import type { DisplayDetailSection } from '../../types/calculator';
import { limitDetailSectionFromLines } from '../symbolic-engine/limits/detail-readback';
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

type RouteExplanationOutcome =
  | 'blocked'
  | 'controlled-stop'
  | 'numeric-fallback-used'
  | 'resolved';

const routeLabels: Record<LimitRouteKind, string> = {
  'direct-substitution': 'direct substitution',
  'removable-rational': 'removable rational expression',
  'local-equivalent': 'local equivalent',
  'finite-pole': 'finite pole',
  'exact-local-algebra': 'exact local algebra',
  'indeterminate-transform': 'indeterminate transform',
  'infinity-asymptotic': 'infinity asymptotic comparison',
  'lhospital-candidate': "L'Hospital candidate",
  'taylor-series-candidate': 'Taylor leading terms',
  'squeeze-oscillation': 'squeeze or oscillation',
  piecewise: 'piecewise branch analysis',
  'abs-side-behavior': 'absolute-value side behavior',
  'mrv-lite': 'MRV-lite asymptotic comparison',
  gruntz: 'Gruntz asymptotic route',
  unsupported: 'unsupported route',
  malformed: 'malformed expression',
  'too-complex': 'over-budget expression',
};

const numericFallbackLimitRoutes = new Set<LimitRouteKind>([
  'direct-substitution',
  'finite-pole',
]);

export function isLimitRouteNumericFallbackAllowed(routeKind: LimitRouteKind): boolean {
  return numericFallbackLimitRoutes.has(routeKind);
}

function fallbackPolicyLine(input: {
  classification: LimitRouteClassification;
  allowNumericFallback: boolean;
  outcome?: RouteExplanationOutcome;
}) {
  if (input.outcome === 'blocked') {
    return 'Fallback policy: no numeric fallback was attempted because the expression stopped before a supported route was available.';
  }

  if (input.allowNumericFallback) {
    return input.outcome === 'numeric-fallback-used'
      ? 'Fallback policy: numeric fallback was allowed for this route and produced the displayed result.'
      : 'Fallback policy: numeric fallback is allowed for this route only if the exact route cannot decide cleanly.';
  }

  if (input.outcome === 'controlled-stop') {
    return 'Fallback policy: numeric fallback was skipped because this route needs an exact symbolic decision.';
  }

  return 'Fallback policy: numeric fallback was skipped because the route resolved symbolically.';
}

function outcomeLine(outcome?: RouteExplanationOutcome) {
  if (outcome === 'blocked') {
    return 'Outcome: stopped with a controlled explanation instead of guessing.';
  }
  if (outcome === 'controlled-stop') {
    return 'Outcome: the selected route did not resolve the expression within the current exact rules.';
  }
  if (outcome === 'numeric-fallback-used') {
    return 'Outcome: controlled numeric sampling was used after the route allowed fallback.';
  }
  if (outcome === 'resolved') {
    return 'Outcome: the selected route resolved the limit.';
  }
  return undefined;
}

export function limitRouteExplanationSection(input: {
  classification: LimitRouteClassification;
  allowNumericFallback: boolean;
  outcome?: RouteExplanationOutcome;
}): DisplayDetailSection {
  const lines = [
    `Route chosen: ${routeLabels[input.classification.kind]}.`,
    `Why this route: ${input.classification.reason}.`,
    fallbackPolicyLine(input),
  ];

  const outcome = outcomeLine(input.outcome);
  if (outcome) {
    lines.push(outcome);
  }

  if (input.classification.nodeCount !== undefined && input.classification.maxDepth !== undefined) {
    lines.push(`Route profile: ${input.classification.nodeCount} nodes, depth ${input.classification.maxDepth}.`);
  }

  return limitDetailSectionFromLines('Limit Route', lines);
}

function routeDiagnostic(classification: LimitRouteClassification): DisplayDetailSection[] {
  const lines = [
    `Route classification: ${classification.kind}.`,
    `Reason: ${classification.reason}.`,
  ];

  if (classification.nodeCount !== undefined && classification.maxDepth !== undefined) {
    lines.push(`Route profile: ${classification.nodeCount} nodes, depth ${classification.maxDepth}.`);
  }

  return [limitDetailSectionFromLines('Limit Diagnostic', lines)];
}

function blockedRoute(
  classification: LimitRouteClassification,
  error: string,
): LimitRoutePlan {
  return {
    kind: 'blocked',
    routeKind: classification.kind as Extract<LimitRouteKind, 'malformed' | 'too-complex' | 'unsupported'>,
    error,
    detailSections: [
      limitRouteExplanationSection({
        classification,
        allowNumericFallback: false,
        outcome: 'blocked',
      }),
      ...routeDiagnostic(classification),
    ],
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
    allowNumericFallback: isLimitRouteNumericFallbackAllowed(classification.kind),
    classification,
  };
}

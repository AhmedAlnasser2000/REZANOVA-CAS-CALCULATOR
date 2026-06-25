import type {
  EquationTargetShapeOkProfile,
  EquationTargetShapeProfile,
} from './profile';

export type EquationSelectedTargetRouteFamily =
  | 'linear'
  | 'polynomial'
  | 'rational'
  | 'factorable-polynomial'
  | 'special-form-roots'
  | 'carrier-elimination'
  | 'algebraic-isolation'
  | 'carrier'
  | 'cubic-cardano'
  | 'quartic-ferrari'
  | 'exp-log'
  | 'trig'
  | 'composition'
  | 'mixed-algebraic'
  | 'selected-target-isolation';

export type EquationSelectedTargetRoutePhase =
  | 'top-level'
  | 'generated-handoff';

export type EquationSelectedTargetRoutePlan = {
  profile: EquationTargetShapeProfile;
  phase: EquationSelectedTargetRoutePhase;
  families: EquationSelectedTargetRouteFamily[];
  skippedFamilies: EquationSelectedTargetRouteFamily[];
};

export type EquationSelectedTargetRoutePlanOptions = {
  phase?: EquationSelectedTargetRoutePhase;
};

const TOP_LEVEL_ROUTE_ORDER: EquationSelectedTargetRouteFamily[] = [
  'linear',
  'polynomial',
  'rational',
  'factorable-polynomial',
  'special-form-roots',
  'carrier-elimination',
  'carrier',
  'algebraic-isolation',
  'cubic-cardano',
  'quartic-ferrari',
  'exp-log',
  'trig',
  'composition',
  'mixed-algebraic',
  'selected-target-isolation',
];

const GENERATED_HANDOFF_ROUTE_ORDER: EquationSelectedTargetRouteFamily[] = [
  'linear',
  'polynomial',
  'rational',
  'factorable-polynomial',
  'algebraic-isolation',
  'carrier-elimination',
  'carrier',
  'exp-log',
  'trig',
  'composition',
  'mixed-algebraic',
];

const POLYNOMIAL_ROUTE_FAMILIES = new Set<EquationSelectedTargetRouteFamily>([
  'linear',
  'polynomial',
  'factorable-polynomial',
  'special-form-roots',
  'carrier-elimination',
  'carrier',
  'cubic-cardano',
  'quartic-ferrari',
  'algebraic-isolation',
]);

const RATIONAL_ROUTE_FAMILIES = new Set<EquationSelectedTargetRouteFamily>([
  'rational',
  'cubic-cardano',
  'quartic-ferrari',
]);

const EXP_LOG_ROUTE_FAMILIES = new Set<EquationSelectedTargetRouteFamily>([
  'exp-log',
  'composition',
  'selected-target-isolation',
]);

const TRIG_ROUTE_FAMILIES = new Set<EquationSelectedTargetRouteFamily>([
  'trig',
  'composition',
  'selected-target-isolation',
]);

const ALGEBRAIC_ROUTE_FAMILIES = new Set<EquationSelectedTargetRouteFamily>([
  'polynomial',
  'factorable-polynomial',
  'special-form-roots',
  'carrier-elimination',
  'algebraic-isolation',
  'carrier',
  'composition',
  'mixed-algebraic',
  'selected-target-isolation',
]);

function defaultOrder(phase: EquationSelectedTargetRoutePhase) {
  return phase === 'generated-handoff'
    ? GENERATED_HANDOFF_ROUTE_ORDER
    : TOP_LEVEL_ROUTE_ORDER;
}

function orderedFamilies(
  allowed: Set<EquationSelectedTargetRouteFamily>,
  phase: EquationSelectedTargetRoutePhase,
) {
  return defaultOrder(phase).filter((family) => allowed.has(family));
}

function fallbackPlan(
  profile: EquationTargetShapeProfile,
  phase: EquationSelectedTargetRoutePhase,
): EquationSelectedTargetRoutePlan {
  return {
    profile,
    phase,
    families: [...defaultOrder(phase)],
    skippedFamilies: [],
  };
}

function isMixedOrUnknown(profile: EquationTargetShapeOkProfile) {
  return profile.targetSide === 'both'
    || profile.topLevelTargetIslandCount > 1
    || profile.routeHints.includes('mixed-or-unknown');
}

function planAllowedFamilies(profile: EquationTargetShapeOkProfile) {
  if (isMixedOrUnknown(profile)) {
    return null;
  }

  const { flags } = profile;
  if (flags.linearLike || flags.polynomialLike) {
    const allowed = new Set(POLYNOMIAL_ROUTE_FAMILIES);
    if (flags.targetInDenominator) {
      allowed.add('rational');
    }
    return allowed;
  }

  if (flags.targetInDenominator) {
    const allowed = new Set(RATIONAL_ROUTE_FAMILIES);
    if (flags.targetUnderRadical || flags.targetUnderAbs) {
      allowed.add('composition');
    }
    return allowed;
  }

  if (flags.targetInTrigArgument) {
    return new Set(TRIG_ROUTE_FAMILIES);
  }

  if (flags.targetInExponent || flags.targetInLogArgument || flags.targetInExpArgument) {
    return new Set(EXP_LOG_ROUTE_FAMILIES);
  }

  if (flags.targetUnderRadical || flags.targetAsPowerBase) {
    return new Set(ALGEBRAIC_ROUTE_FAMILIES);
  }

  return null;
}

export function planSelectedTargetRouteFamilies(
  profile: EquationTargetShapeProfile,
  options: EquationSelectedTargetRoutePlanOptions = {},
): EquationSelectedTargetRoutePlan {
  const phase = options.phase ?? 'top-level';
  if (profile.status !== 'ok') {
    return fallbackPlan(profile, phase);
  }

  const allowed = planAllowedFamilies(profile);
  if (!allowed) {
    return fallbackPlan(profile, phase);
  }

  const families = orderedFamilies(allowed, phase);
  const skippedFamilies = defaultOrder(phase).filter((family) => !allowed.has(family));
  return {
    profile,
    phase,
    families,
    skippedFamilies,
  };
}

export function shouldAttemptSelectedTargetRoute(
  plan: EquationSelectedTargetRoutePlan,
  family: EquationSelectedTargetRouteFamily,
) {
  return plan.families.includes(family);
}

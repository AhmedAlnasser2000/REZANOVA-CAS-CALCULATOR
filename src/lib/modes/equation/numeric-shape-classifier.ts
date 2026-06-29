import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import {
  equationToZeroFormLatex,
} from '../../equation/domain-guards';
import {
  addSampledDiscontinuityFact,
  collectEquationNumericDomainFacts,
  probeEquationZeroForm,
  type EquationNumericDomainFact,
  type EquationNumericDomainFactKind,
  type EquationNumericSampleProbe,
} from '../../equation/numeric-domain-segmentation';
import {
  profileEquationTargetShape,
  type EquationTargetShapeProfile,
} from '../../equation/target-shape/profile';
import type {
  AngleUnit,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';
import {
  prepareEquationStoredValueSubstitution,
  remainingApproximateModeParameters,
} from './stored-values';

export type EquationNumericShapeRoute =
  | 'deterministic-algebraic'
  | 'rational-algebraic'
  | 'nonlinear-search'
  | 'periodic-interval'
  | 'discontinuity-heavy'
  | 'unsupported-non-evaluable';

export type EquationNumericIntervalNeed = 'none' | 'recommended' | 'required';

export type {
  EquationNumericDomainFact,
  EquationNumericDomainFactKind,
};

export type EquationNumericShapeClassification = {
  equationLatex: string;
  effectiveLatex: string;
  zeroFormLatex?: string;
  selectedTarget?: string;
  numericReady: boolean;
  unresolvedNonTargetSymbols: string[];
  targetShapeProfile: EquationTargetShapeProfile | null;
  route: EquationNumericShapeRoute;
  intervalNeed: EquationNumericIntervalNeed;
  routeEvidence: string[];
  domainFacts: EquationNumericDomainFact[];
  substitution: {
    usedStoredValues: VariableSubstitutionSnapshot[];
    protectedStoredValues: VariableSubstitutionSnapshot[];
  };
  sampleProbe?: {
    samplePoints: number[];
    finiteSampleCount: number;
    undefinedSampleCount: number;
  };
};

type RouteDecision = {
  route: EquationNumericShapeRoute;
  intervalNeed: EquationNumericIntervalNeed;
  evidence: string[];
};

function uniqueSortedNames(names: readonly string[]) {
  return [...new Set(names)].sort((left, right) => left.localeCompare(right));
}

function routeFromProfile(input: {
  numericReady: boolean;
  profile: EquationTargetShapeProfile | null;
  facts: readonly EquationNumericDomainFact[];
  sampleProbe?: EquationNumericSampleProbe;
}): RouteDecision {
  const evidence: string[] = [];
  const { numericReady, profile, facts, sampleProbe } = input;
  if (!numericReady) {
    evidence.push('Input is not numeric-ready because unresolved non-target symbols remain or no target was selected.');
    return { route: 'unsupported-non-evaluable', intervalNeed: 'none', evidence };
  }
  if (!profile || profile.status !== 'ok') {
    evidence.push(profile?.status ?? 'target-shape-profile-unavailable');
    return { route: 'unsupported-non-evaluable', intervalNeed: 'none', evidence };
  }

  const hasDenominator = facts.some((fact) => fact.kind === 'denominator-exclusion');
  const hasLog = facts.some((fact) => fact.kind === 'log-domain');
  const hasRoot = facts.some((fact) => fact.kind === 'root-domain');
  const hasPeriodic = facts.some((fact) => fact.kind === 'periodic-carrier');
  const hasSampledDiscontinuity = facts.some((fact) => fact.kind === 'sampled-discontinuity')
    || Boolean(sampleProbe && sampleProbe.undefinedSampleCount > 0 && sampleProbe.finiteSampleCount > 0);

  if (hasPeriodic && profile.targetOccurrenceCount === 1 && profile.topLevelTargetIslandCount === 1 && !hasDenominator && !hasLog && !hasRoot) {
    evidence.push('Single selected-target periodic carrier requires interval-bounded branch search.');
    return { route: 'periodic-interval', intervalNeed: 'required', evidence };
  }

  if (hasPeriodic) {
    evidence.push('Mixed periodic/non-periodic target occurrence needs nonlinear numeric search.');
    return { route: 'nonlinear-search', intervalNeed: 'recommended', evidence };
  }

  if (hasDenominator && (hasLog || hasRoot || hasSampledDiscontinuity)) {
    evidence.push('Domain restrictions and discontinuity hazards require discontinuity-aware search.');
    return { route: 'discontinuity-heavy', intervalNeed: 'recommended', evidence };
  }

  if (hasDenominator || profile.flags.targetInDenominator) {
    evidence.push('Target appears in a rational algebraic shape.');
    return { route: 'rational-algebraic', intervalNeed: 'none', evidence };
  }

  if (profile.flags.polynomialLike && !hasRoot && !hasLog) {
    evidence.push(`Polynomial-like target shape${profile.polynomialDegree !== null ? ` of degree ${profile.polynomialDegree}` : ''}.`);
    return { route: 'deterministic-algebraic', intervalNeed: 'none', evidence };
  }

  if (hasLog || hasRoot || profile.flags.targetInExponent || profile.flags.targetInLogArgument || profile.flags.targetInExpArgument) {
    evidence.push('Transcendental or radical target shape needs numeric search unless a later deterministic route claims it.');
    return { route: 'nonlinear-search', intervalNeed: 'recommended', evidence };
  }

  evidence.push('No supported numeric-evaluation shape was recognized.');
  return { route: 'unsupported-non-evaluable', intervalNeed: 'none', evidence };
}

export function classifyEquationNumericShape(input: {
  equationLatex: string;
  equationSolveTarget?: string | null;
  angleUnit?: AngleUnit;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
}): EquationNumericShapeClassification {
  const angleUnit = input.angleUnit ?? 'rad';
  const prepared = prepareEquationStoredValueSubstitution({
    equationLatex: input.equationLatex,
    equationSolveTarget: input.equationSolveTarget,
    forceNumericPolicy: true,
    storedVariables: input.storedVariables,
    variableSubstitutionSnapshot: input.variableSubstitutionSnapshot,
  });
  const effectiveLatex = normalizeExplicitNamedVariablesInLatex(prepared.substitution.latex).latex;
  const selectedTarget = prepared.protectedTarget;
  const unresolvedNonTargetSymbols = uniqueSortedNames(
    remainingApproximateModeParameters(effectiveLatex, selectedTarget),
  );
  const numericReady = Boolean(selectedTarget) && unresolvedNonTargetSymbols.length === 0;
  const targetShapeProfile = selectedTarget
    ? profileEquationTargetShape(effectiveLatex, selectedTarget, { allowGeneratedImplicitProducts: true })
    : null;
  const zeroFormLatex = numericReady ? equationToZeroFormLatex(effectiveLatex) : undefined;
  const domainFacts = selectedTarget ? collectEquationNumericDomainFacts(effectiveLatex, selectedTarget) : [];
  const sampleProbe = numericReady && zeroFormLatex && selectedTarget
    ? probeEquationZeroForm(zeroFormLatex, selectedTarget, angleUnit)
    : undefined;
  addSampledDiscontinuityFact(domainFacts, sampleProbe);
  const route = routeFromProfile({
    numericReady,
    profile: targetShapeProfile,
    facts: domainFacts,
    sampleProbe,
  });

  return {
    equationLatex: input.equationLatex,
    effectiveLatex,
    zeroFormLatex,
    selectedTarget,
    numericReady,
    unresolvedNonTargetSymbols,
    targetShapeProfile,
    route: route.route,
    intervalNeed: route.intervalNeed,
    routeEvidence: route.evidence,
    domainFacts,
    substitution: {
      usedStoredValues: [...prepared.substitution.substitutions],
      protectedStoredValues: [...prepared.substitution.protectedSubstitutions],
    },
    sampleProbe,
  };
}

import { ComputeEngine } from '@cortex-js/compute-engine';

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

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

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
    finitePoints: number[];
    undefinedPoints: number[];
    finiteSampleCount: number;
    undefinedSampleCount: number;
  };
};

type RouteDecision = {
  route: EquationNumericShapeRoute;
  intervalNeed: EquationNumericIntervalNeed;
  evidence: string[];
};

const ce = new ComputeEngine();
const PERIODIC_OPERATOR_NAMES = new Set(['Sin', 'Cos', 'Tan', 'Cot', 'Sec', 'Csc']);

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function uniqueSortedNames(names: readonly string[]) {
  return [...new Set(names)].sort((left, right) => left.localeCompare(right));
}

function containsTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }
  if (!node || typeof node !== 'object') {
    return false;
  }
  const entries = isArrayNode(node) ? node : Object.values(node);
  return entries.some((entry) => containsTarget(entry, target));
}

function flattenAdditiveTerms(node: MathJson): MathJson[] {
  return isArrayNode(node) && node[0] === 'Add'
    ? node.slice(1) as MathJson[]
    : [node];
}

function targetOnlyInsidePeriodicCarriers(
  node: unknown,
  target: string,
  insidePeriodicCarrier = false,
): boolean {
  if (typeof node === 'string') {
    return node !== target || insidePeriodicCarrier;
  }
  if (!node || typeof node !== 'object') {
    return true;
  }

  if (isArrayNode(node)) {
    const [operator, ...operands] = node;
    const nextInsidePeriodicCarrier = insidePeriodicCarrier
      || (typeof operator === 'string' && PERIODIC_OPERATOR_NAMES.has(operator));
    return operands.every((operand) =>
      targetOnlyInsidePeriodicCarriers(operand, target, nextInsidePeriodicCarrier));
  }

  return Object.values(node).every((entry) =>
    targetOnlyInsidePeriodicCarriers(entry, target, insidePeriodicCarrier));
}

function hasNonPeriodicTopLevelTargetTerm(equationLatex: string, target: string): boolean {
  try {
    const json = ce.parse(equationLatex).json as MathJson;
    if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
      return false;
    }
    const left = json[1] as MathJson;
    const right = json[2] as MathJson;
    return [...flattenAdditiveTerms(left), ...flattenAdditiveTerms(right)].some((term) =>
      containsTarget(term, target) && !targetOnlyInsidePeriodicCarriers(term, target));
  } catch {
    return false;
  }
}

function routeFromProfile(input: {
  numericReady: boolean;
  profile: EquationTargetShapeProfile | null;
  facts: readonly EquationNumericDomainFact[];
  sampleProbe?: EquationNumericSampleProbe;
  hasNonPeriodicTopLevelTargetTerm: boolean;
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

  if (hasPeriodic && (profile.topLevelTargetIslandCount === 1 || hasDenominator || !input.hasNonPeriodicTopLevelTargetTerm)) {
    evidence.push('Selected-target periodic carrier requires interval-bounded branch search.');
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
  const hasPeriodicFact = domainFacts.some((fact) => fact.kind === 'periodic-carrier');
  const hasNonPeriodicTargetTerm = selectedTarget && hasPeriodicFact
    ? hasNonPeriodicTopLevelTargetTerm(effectiveLatex, selectedTarget)
    : true;
  const route = routeFromProfile({
    numericReady,
    profile: targetShapeProfile,
    facts: domainFacts,
    sampleProbe,
    hasNonPeriodicTopLevelTargetTerm: hasNonPeriodicTargetTerm,
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

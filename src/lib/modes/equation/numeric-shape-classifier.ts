import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import {
  equationToZeroFormLatex,
  evaluateLatexAtTarget,
} from '../../equation/domain-guards';
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

export type EquationNumericDomainFactKind =
  | 'denominator-exclusion'
  | 'log-domain'
  | 'root-domain'
  | 'periodic-carrier'
  | 'sampled-discontinuity';

export type EquationNumericDomainFact = {
  kind: EquationNumericDomainFactKind;
  expressionLatex?: string;
  relationLatex?: string;
  message: string;
  source: 'symbolic-scan' | 'sample-probe';
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

const ce = new ComputeEngine();
const PERIODIC_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Cot', 'Sec', 'Csc']);
const SAMPLE_POINTS = [-10, -2, -1, 0, 1, 2, 3, 10];

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function uniqueSortedNames(names: readonly string[]) {
  return [...new Set(names)].sort((left, right) => left.localeCompare(right));
}

function nodeLatex(node: unknown) {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).latex;
  } catch {
    return undefined;
  }
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

function addFact(
  facts: EquationNumericDomainFact[],
  fact: EquationNumericDomainFact,
) {
  const key = `${fact.kind}|${fact.expressionLatex ?? ''}|${fact.relationLatex ?? ''}|${fact.message}`;
  const exists = facts.some((entry) =>
    `${entry.kind}|${entry.expressionLatex ?? ''}|${entry.relationLatex ?? ''}|${entry.message}` === key);
  if (!exists) {
    facts.push(fact);
  }
}

function factMessage(expressionLatex: string | undefined, relationLatex: string, fallback: string) {
  return expressionLatex ? `${expressionLatex} ${relationLatex}` : fallback;
}

function collectSymbolicFacts(node: unknown, facts: EquationNumericDomainFact[], target: string) {
  if (!isArrayNode(node) || node.length === 0) {
    return;
  }

  const [operator, ...operands] = node;
  if (operator === 'Divide' && operands.length >= 2) {
    const denominatorLatex = nodeLatex(operands[1]);
    addFact(facts, {
      kind: 'denominator-exclusion',
      expressionLatex: denominatorLatex,
      relationLatex: '\\ne0',
      message: factMessage(denominatorLatex, '\\ne0', 'Denominator must be nonzero.'),
      source: 'symbolic-scan',
    });
  }

  if ((operator === 'Ln' || operator === 'Log') && operands.length >= 1) {
    const argumentLatex = nodeLatex(operands[0]);
    addFact(facts, {
      kind: 'log-domain',
      expressionLatex: argumentLatex,
      relationLatex: '>0',
      message: factMessage(argumentLatex, '>0', 'Log argument must be positive.'),
      source: 'symbolic-scan',
    });

    if (operator === 'Log' && operands.length >= 2) {
      const baseLatex = nodeLatex(operands[1]);
      addFact(facts, {
        kind: 'log-domain',
        expressionLatex: baseLatex,
        relationLatex: '>0',
        message: factMessage(baseLatex, '>0', 'Log base must be positive.'),
        source: 'symbolic-scan',
      });
      addFact(facts, {
        kind: 'log-domain',
        expressionLatex: baseLatex,
        relationLatex: '\\ne1',
        message: factMessage(baseLatex, '\\ne1', 'Log base must not equal 1.'),
        source: 'symbolic-scan',
      });
    }
  }

  if (operator === 'Sqrt' && operands.length >= 1) {
    const radicandLatex = nodeLatex(operands[0]);
    addFact(facts, {
      kind: 'root-domain',
      expressionLatex: radicandLatex,
      relationLatex: '\\ge0',
      message: factMessage(radicandLatex, '\\ge0', 'Even root radicand must be nonnegative.'),
      source: 'symbolic-scan',
    });
  }

  if (operator === 'Root' && operands.length >= 2) {
    const index = typeof operands[1] === 'number' ? operands[1] : null;
    if (index !== null && Number.isInteger(index) && index % 2 === 0) {
      const radicandLatex = nodeLatex(operands[0]);
      addFact(facts, {
        kind: 'root-domain',
        expressionLatex: radicandLatex,
        relationLatex: '\\ge0',
        message: factMessage(radicandLatex, '\\ge0', 'Even root radicand must be nonnegative.'),
        source: 'symbolic-scan',
      });
    }
  }

  if (typeof operator === 'string' && PERIODIC_OPERATORS.has(operator) && operands.some((operand) => containsTarget(operand, target))) {
    const carrierLatex = operands[0] ? nodeLatex(operands[0]) : undefined;
    addFact(facts, {
      kind: 'periodic-carrier',
      expressionLatex: carrierLatex,
      message: carrierLatex
        ? `Periodic carrier detected: ${operator}(${carrierLatex}).`
        : `Periodic ${operator} carrier detected.`,
      source: 'symbolic-scan',
    });
  }

  for (const operand of operands) {
    collectSymbolicFacts(operand, facts, target);
  }
}

function collectDomainFacts(equationLatex: string, target: string) {
  const facts: EquationNumericDomainFact[] = [];
  try {
    const parsed = ce.parse(equationLatex);
    collectSymbolicFacts(parsed.json as MathJson, facts, target);
  } catch {
    return facts;
  }
  return facts;
}

function probeZeroForm(zeroFormLatex: string, target: string, angleUnit: AngleUnit) {
  let finiteSampleCount = 0;
  let undefinedSampleCount = 0;
  for (const samplePoint of SAMPLE_POINTS) {
    const evaluated = evaluateLatexAtTarget(zeroFormLatex, target, samplePoint, angleUnit);
    if (evaluated.value === null || !Number.isFinite(evaluated.value)) {
      undefinedSampleCount += 1;
    } else {
      finiteSampleCount += 1;
    }
  }

  return {
    samplePoints: [...SAMPLE_POINTS],
    finiteSampleCount,
    undefinedSampleCount,
  };
}

function routeFromProfile(input: {
  numericReady: boolean;
  profile: EquationTargetShapeProfile | null;
  facts: readonly EquationNumericDomainFact[];
  sampleProbe?: EquationNumericShapeClassification['sampleProbe'];
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

function addSampleFact(
  facts: EquationNumericDomainFact[],
  sampleProbe: EquationNumericShapeClassification['sampleProbe'],
) {
  if (!sampleProbe || sampleProbe.undefinedSampleCount === 0) {
    return;
  }
  addFact(facts, {
    kind: 'sampled-discontinuity',
    message: `Sample probe found ${sampleProbe.undefinedSampleCount} undefined point(s) across ${sampleProbe.samplePoints.length} numeric target samples.`,
    source: 'sample-probe',
  });
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
  const domainFacts = selectedTarget ? collectDomainFacts(effectiveLatex, selectedTarget) : [];
  const sampleProbe = numericReady && zeroFormLatex && selectedTarget
    ? probeZeroForm(zeroFormLatex, selectedTarget, angleUnit)
    : undefined;
  addSampleFact(domainFacts, sampleProbe);
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

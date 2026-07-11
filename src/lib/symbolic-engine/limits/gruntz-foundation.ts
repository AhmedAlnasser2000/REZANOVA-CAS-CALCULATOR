import type { DisplayDetailLinePart, LimitTargetKind } from '../../../types/calculator';
import { readExactScalarNode } from '../../algebra/polynomial-core';
import {
  dependsOnVariable,
  isNodeArray,
} from '../patterns';
import {
  isSymbolicCoefficientOne,
  parseSymbolicCoefficient,
  type SymbolicCoefficient,
  type SymbolicCoefficientFact,
} from '../primitives/coefficient-domain';
import { limitMathPart, limitTextPart } from './detail-readback';
import {
  compareInfinityScale,
  infinityScaleLabel,
  leadingInfinityScaleTerm,
  zeroInfinityScale,
  type InfinityScaleTerm,
} from './infinity-scale-terms';
import { buildGruntzRewriteEvidenceRows } from './gruntz-rewrite-evidence';
import { profileSymbolicLimitsResult } from '../../display/printer';

const EPSILON = 1e-10;

export type GruntzMrvAtomKind =
  | 'exponential'
  | 'power'
  | 'root'
  | 'log'
  | 'iterated-log'
  | 'constant-scale';

export type GruntzScaleSignature = {
  exponential?: InfinityScaleTerm;
  residual: InfinityScaleTerm;
};

export type GruntzDomainIntent = 'real' | 'complex-principal';

export type GruntzBranchAssumption = {
  latex: string;
  reason: string;
  source: 'coefficient-driver' | 'principal-branch' | 'real-domain';
};

export type GruntzAtomCoefficient = {
  coefficient: SymbolicCoefficient;
  latex: string;
  facts: SymbolicCoefficientFact[];
};

export type GruntzMrvAtom = {
  id: string;
  kind: GruntzMrvAtomKind;
  latex: string;
  sourceLatex: string;
  variable: string;
  signature: GruntzScaleSignature;
  coefficient?: GruntzAtomCoefficient;
  branchAssumptions: GruntzBranchAssumption[];
  evidenceRows: DisplayDetailLinePart[][];
};

type GruntzMrvAtomDraft = Omit<GruntzMrvAtom, 'id' | 'evidenceRows'>;

export type GruntzCoefficientDriver = {
  latex: string;
  facts: SymbolicCoefficientFact[];
  atomIds: string[];
  branchConditions: string[];
};

export type GruntzComparability =
  | 'dominates'
  | 'dominated-by'
  | 'same-class'
  | 'unsupported';

export type GruntzComparabilityClass = {
  rank: number;
  representativeLatex: string;
  atomIds: string[];
  scaleLatex: string;
};

export type GruntzMrvSet = {
  variable: string;
  targetKind: Exclude<LimitTargetKind, 'finite'>;
  domain: GruntzDomainIntent;
  atoms: GruntzMrvAtom[];
  dominantAtomId?: string;
  comparabilityClasses: GruntzComparabilityClass[];
  coefficientDrivers: GruntzCoefficientDriver[];
  branchAssumptions: GruntzBranchAssumption[];
  evidenceRows: DisplayDetailLinePart[][];
  unsupportedReason?: string;
};

export type GruntzScaleComparison = {
  comparability: GruntzComparability;
  left?: GruntzMrvAtom;
  right?: GruntzMrvAtom;
  evidence: string[];
};

export type GruntzWSubstitution = {
  fromLatex: string;
  toLatex: string;
  reason: string;
  role: 'dominant-atom' | 'residual-variable';
};

export type GruntzRewriteToWContract = {
  supported: boolean;
  variable: string;
  wLatex?: string;
  wLimitLatex?: string;
  dominantAtom?: GruntzMrvAtom;
  originalLatex?: string;
  rewrittenLatex?: string;
  substitutions: GruntzWSubstitution[];
  assumptions: string[];
  branchAssumptions?: GruntzBranchAssumption[];
  coefficientDrivers?: GruntzCoefficientDriver[];
  parameterConditions?: string[];
  evidenceRows?: DisplayDetailLinePart[][];
  stopReason?: string;
};

export type GruntzLimitExtractionContract = {
  supported: boolean;
  resultKind?: 'zero' | 'infinity' | 'finite-residual' | 'needs-rewrite';
  exactLatex?: string;
  signKnowledge?: 'positive' | 'negative' | 'unknown';
  numerator?: GruntzMrvAtom;
  denominator?: GruntzMrvAtom;
  evidence: string[];
  stopReason?: string;
};

export type GruntzMrvSetOptions = {
  domain?: GruntzDomainIntent;
};

function constantScaleTerm(coefficient = 1): InfinityScaleTerm {
  return {
    coefficient,
    scale: zeroInfinityScale(),
    reason: 'constant Gruntz comparison scale',
  };
}

function isCloseToZero(value: number) {
  return Math.abs(value) < EPSILON;
}

function numericConstant(node: unknown): number | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }
  if (!isNodeArray(node)) {
    return undefined;
  }
  if (node[0] === 'Rational' && typeof node[1] === 'number' && typeof node[2] === 'number' && node[2] !== 0) {
    return node[1] / node[2];
  }
  if (node[0] === 'Negate' && node.length === 2) {
    const value = numericConstant(node[1]);
    return value === undefined ? undefined : -value;
  }
  return undefined;
}

function productNode(factors: unknown[]) {
  if (factors.length === 0) {
    return 1;
  }
  return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
}

function quotientNode(numerators: unknown[], denominators: unknown[]) {
  const numerator = productNode(numerators);
  return denominators.length === 0 ? numerator : ['Divide', numerator, productNode(denominators)];
}

function rationalLatex(numerator: number, denominator: number) {
  return `\\frac{${numerator}}{${denominator}}`;
}

export function gruntzNodeToLatex(node: unknown): string {
  if (typeof node === 'number') {
    return Number.isInteger(node) ? `${node}` : `${node}`;
  }
  if (typeof node === 'string') {
    return node === 'ExponentialE' ? 'e' : node;
  }
  if (!isNodeArray(node) || node.length === 0) {
    return '?';
  }

  if (node[0] === 'Rational' && typeof node[1] === 'number' && typeof node[2] === 'number') {
    return rationalLatex(node[1], node[2]);
  }
  if (node[0] === 'Negate' && node.length === 2) {
    return `-${gruntzNodeToLatex(node[1])}`;
  }
  if (node[0] === 'Sqrt' && node.length === 2) {
    return `\\sqrt{${gruntzNodeToLatex(node[1])}}`;
  }
  if (node[0] === 'Log' && node.length === 2) {
    return `\\log(${gruntzNodeToLatex(node[1])})`;
  }
  if (node[0] === 'Power' && node.length === 3) {
    const base = node[1] === 'ExponentialE' ? 'e' : gruntzNodeToLatex(node[1]);
    return `${base}^{${gruntzNodeToLatex(node[2])}}`;
  }
  if (node[0] === 'Multiply') {
    return node.slice(1).map(gruntzNodeToLatex).join('\\,');
  }
  if (node[0] === 'Divide' && node.length === 3) {
    return `\\frac{${gruntzNodeToLatex(node[1])}}{${gruntzNodeToLatex(node[2])}}`;
  }
  if (node[0] === 'Add') {
    return node.slice(1).map(gruntzNodeToLatex).join(' + ');
  }

  return String(node[0]);
}

function compareNumbers(left: number, right: number) {
  const delta = left - right;
  if (Math.abs(delta) < EPSILON) {
    return 0;
  }
  return delta > 0 ? 1 : -1;
}

function compareExponents(left: InfinityScaleTerm, right: InfinityScaleTerm) {
  const scaleComparison = compareInfinityScale(left.scale, right.scale);
  if (scaleComparison !== 0) {
    return scaleComparison;
  }
  return compareNumbers(left.coefficient, right.coefficient);
}

function positiveUnboundedExponent(term: InfinityScaleTerm | undefined) {
  return Boolean(
    term
    && term.coefficient > 0
    && compareInfinityScale(term.scale, zeroInfinityScale()) > 0,
  );
}

export function compareGruntzScaleSignatures(left: GruntzScaleSignature, right: GruntzScaleSignature) {
  const leftExponential = positiveUnboundedExponent(left.exponential);
  const rightExponential = positiveUnboundedExponent(right.exponential);

  if (leftExponential && rightExponential && left.exponential && right.exponential) {
    const exponentComparison = compareExponents(left.exponential, right.exponential);
    if (exponentComparison !== 0) {
      return exponentComparison;
    }
    return compareInfinityScale(left.residual.scale, right.residual.scale);
  }

  if (leftExponential !== rightExponential) {
    return leftExponential ? 1 : -1;
  }

  return compareInfinityScale(left.residual.scale, right.residual.scale);
}

function atomKindFromNode(node: unknown, term: InfinityScaleTerm): GruntzMrvAtomKind {
  if (isNodeArray(node) && node[0] === 'Sqrt') {
    return 'root';
  }
  if (isNodeArray(node) && node[0] === 'Log') {
    return term.scale.logs.findIndex((power) => !isCloseToZero(power)) > 0 ? 'iterated-log' : 'log';
  }
  if (isNodeArray(node) && node[0] === 'Power' && node[1] === 'ExponentialE') {
    return 'exponential';
  }
  if (compareInfinityScale(term.scale, zeroInfinityScale()) === 0) {
    return 'constant-scale';
  }
  return 'power';
}

function principalBranchAssumptions(input: {
  kind: GruntzMrvAtomKind;
  sourceLatex: string;
  domain: GruntzDomainIntent;
}): GruntzBranchAssumption[] {
  if (input.domain === 'complex-principal') {
    if (input.kind === 'root') {
      return [{
        latex: input.sourceLatex,
        reason: 'principal square-root branch',
        source: 'principal-branch',
      }];
    }
    if (input.kind === 'log' || input.kind === 'iterated-log') {
      return [{
        latex: input.sourceLatex,
        reason: 'principal logarithm branch',
        source: 'principal-branch',
      }];
    }
  }

  if (input.domain === 'real' && input.kind === 'root') {
    return [{
      latex: input.sourceLatex,
      reason: 'eventual real square-root domain',
      source: 'real-domain',
    }];
  }

  return [];
}

type FactorSplit = {
  coefficientNumerators: unknown[];
  coefficientDenominators: unknown[];
  scaleNumerators: unknown[];
  scaleDenominators: unknown[];
};

function splitCoefficientAndScaleFactors(
  node: unknown,
  variable: string,
  split: FactorSplit,
  denominator = false,
) {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    split.coefficientNumerators.push(-1);
    splitCoefficientAndScaleFactors(node[1], variable, split, denominator);
    return;
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    node.slice(1).forEach((factor) =>
      splitCoefficientAndScaleFactors(factor, variable, split, denominator));
    return;
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    splitCoefficientAndScaleFactors(node[1], variable, split, denominator);
    splitCoefficientAndScaleFactors(node[2], variable, split, !denominator);
    return;
  }

  const bucket = dependsOnVariable(node, variable)
    ? denominator ? split.scaleDenominators : split.scaleNumerators
    : denominator ? split.coefficientDenominators : split.coefficientNumerators;
  bucket.push(node);
}

function coefficientAndScaleDraft(
  node: unknown,
  variable: string,
): { coefficientNode: unknown; scaleNode: unknown } | undefined {
  const split: FactorSplit = {
    coefficientNumerators: [],
    coefficientDenominators: [],
    scaleNumerators: [],
    scaleDenominators: [],
  };
  splitCoefficientAndScaleFactors(node, variable, split);
  if (split.scaleNumerators.length === 0 && split.scaleDenominators.length === 0) {
    return undefined;
  }
  return {
    coefficientNode: quotientNode(split.coefficientNumerators, split.coefficientDenominators),
    scaleNode: quotientNode(split.scaleNumerators, split.scaleDenominators),
  };
}

function coefficientMetadata(
  node: unknown,
  variable: string,
): GruntzAtomCoefficient | undefined {
  const parsed = parseSymbolicCoefficient(node, variable);
  if (parsed.kind !== 'success' || isSymbolicCoefficientOne(parsed.coefficient)) {
    return undefined;
  }
  return {
    coefficient: parsed.coefficient,
    latex: parsed.coefficient.latex,
    facts: parsed.coefficient.facts,
  };
}

function atomEvidenceRows(atom: GruntzMrvAtom): DisplayDetailLinePart[][] {
  const rows: DisplayDetailLinePart[][] = [[
    limitTextPart('MRV atom: '),
    limitMathPart(atom.latex),
    limitTextPart(' with scale '),
    limitMathPart(atomScaleLatex(atom)),
    limitTextPart('.'),
  ]];
  if (atom.coefficient) {
    rows.push([
      limitTextPart('Target-free coefficient driver: '),
      limitMathPart(atom.coefficient.latex),
      limitTextPart('.'),
    ]);
  }
  atom.branchAssumptions.forEach((assumption) => rows.push([
    limitTextPart('Branch assumption: '),
    limitMathPart(assumption.latex),
    limitTextPart(` uses ${assumption.reason}.`),
  ]));
  return rows;
}

function atomFromNode(
  node: unknown,
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  options: Required<GruntzMrvSetOptions>,
): GruntzMrvAtomDraft | undefined {
  if (!dependsOnVariable(node, variable)) {
    const constant = numericConstant(node);
    if (constant === undefined) {
      return undefined;
    }
    return {
      kind: 'constant-scale',
      latex: gruntzNodeToLatex(node),
      sourceLatex: gruntzNodeToLatex(node),
      variable,
      signature: { residual: constantScaleTerm(constant) },
      branchAssumptions: [],
    };
  }

  const split = coefficientAndScaleDraft(node, variable);
  if (split) {
    const coefficient = coefficientMetadata(split.coefficientNode, variable);
    if (coefficient) {
      const scaleTerm = atomFromNode(split.scaleNode, variable, targetKind, options);
      if (!scaleTerm) {
        return undefined;
      }
      return {
        ...scaleTerm,
        sourceLatex: gruntzNodeToLatex(node),
        coefficient,
        branchAssumptions: [
          ...scaleTerm.branchAssumptions,
          ...coefficient.facts.map((fact) => ({
            latex: `${fact.expressionLatex}${fact.relation}`,
            reason: 'nonzero coefficient denominator',
            source: 'coefficient-driver' as const,
          })),
        ],
      };
    }
  }

  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3 && node[1] === 'ExponentialE') {
    const exponent = leadingInfinityScaleTerm(node[2], variable, targetKind);
    if (!positiveUnboundedExponent(exponent)) {
      return undefined;
    }
    const latex = gruntzNodeToLatex(node);
    return {
      kind: 'exponential',
      latex,
      sourceLatex: latex,
      variable,
      signature: {
        exponential: exponent,
        residual: constantScaleTerm(1),
      },
      branchAssumptions: principalBranchAssumptions({
        kind: 'exponential',
        sourceLatex: latex,
        domain: options.domain,
      }),
    };
  }

  const residual = leadingInfinityScaleTerm(node, variable, targetKind);
  if (!residual) {
    return undefined;
  }
  const latex = gruntzNodeToLatex(node);
  const kind = atomKindFromNode(node, residual);
  return {
    kind,
    latex,
    sourceLatex: latex,
    variable,
    signature: { residual },
    branchAssumptions: principalBranchAssumptions({
      kind,
      sourceLatex: latex,
      domain: options.domain,
    }),
  };
}

function collectCandidateNodes(node: unknown, nodes: unknown[] = []) {
  nodes.push(node);
  if (!isNodeArray(node)) {
    return nodes;
  }
  node.slice(1).forEach((child) => collectCandidateNodes(child, nodes));
  return nodes;
}

function atomScaleLatex(atom: GruntzMrvAtom) {
  if (atom.signature.exponential && positiveUnboundedExponent(atom.signature.exponential)) {
    return `e^{${infinityScaleLabel(atom.signature.exponential.scale)}}`;
  }
  return infinityScaleLabel(atom.signature.residual.scale);
}

function withIds(atoms: GruntzMrvAtomDraft[]): GruntzMrvAtom[] {
  return atoms.map((atom, index) => ({
    ...atom,
    id: `mrv_${index + 1}`,
    evidenceRows: [],
  })).map((atom) => ({
    ...atom,
    evidenceRows: atomEvidenceRows(atom),
  }));
}

function uniqueAtoms(atoms: GruntzMrvAtomDraft[]) {
  const seen = new Set<string>();
  return atoms.filter((atom) => {
    const key = `${atom.kind}:${atom.latex}:${atomScaleLatex({ ...atom, id: 'tmp', evidenceRows: [] })}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function comparabilityClasses(atoms: GruntzMrvAtom[]): GruntzComparabilityClass[] {
  const ordered = [...atoms].sort((left, right) => -compareGruntzScaleSignatures(left.signature, right.signature));
  const classes: GruntzComparabilityClass[] = [];
  let remaining = ordered;
  while (remaining.length > 0) {
    const representative = remaining[0];
    const same = remaining.filter((atom) => compareGruntzScaleSignatures(atom.signature, representative.signature) === 0);
    classes.push({
      rank: classes.length + 1,
      representativeLatex: representative.latex,
      atomIds: same.map((atom) => atom.id),
      scaleLatex: atomScaleLatex(representative),
    });
    remaining = remaining.filter((atom) => !same.includes(atom));
  }
  return classes;
}

function coefficientDrivers(atoms: GruntzMrvAtom[]): GruntzCoefficientDriver[] {
  const drivers = new Map<string, GruntzCoefficientDriver>();
  atoms.forEach((atom) => {
    if (!atom.coefficient) {
      return;
    }
    if (readExactScalarNode(atom.coefficient.coefficient.node)) {
      return;
    }
    const existing = drivers.get(atom.coefficient.latex) ?? {
      latex: atom.coefficient.latex,
      facts: atom.coefficient.facts,
      atomIds: [],
      branchConditions: [
        `${atom.coefficient.latex}>0`,
        `${atom.coefficient.latex}=0`,
        `${atom.coefficient.latex}<0`,
      ],
    };
    existing.atomIds.push(atom.id);
    drivers.set(atom.coefficient.latex, existing);
  });
  return [...drivers.values()];
}

function uniqueBranchAssumptions(atoms: GruntzMrvAtom[]): GruntzBranchAssumption[] {
  const seen = new Set<string>();
  return atoms.flatMap((atom) => atom.branchAssumptions).filter((assumption) => {
    const key = `${assumption.source}:${assumption.latex}:${assumption.reason}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function buildGruntzMrvSet(
  node: unknown,
  variable = 'x',
  targetKind: Exclude<LimitTargetKind, 'finite'> = 'posInfinity',
  options: GruntzMrvSetOptions = {},
): GruntzMrvSet {
  const resolvedOptions: Required<GruntzMrvSetOptions> = {
    domain: options.domain ?? 'real',
  };
  const candidates = collectCandidateNodes(node)
    .map((candidate) => atomFromNode(candidate, variable, targetKind, resolvedOptions))
    .filter(Boolean) as GruntzMrvAtomDraft[];
  const atoms = withIds(uniqueAtoms(candidates))
    .sort((left, right) => -compareGruntzScaleSignatures(left.signature, right.signature));
  const classes = comparabilityClasses(atoms);
  const branchAssumptions = uniqueBranchAssumptions(atoms);
  return {
    variable,
    targetKind,
    domain: resolvedOptions.domain,
    atoms,
    dominantAtomId: atoms[0]?.id,
    comparabilityClasses: classes,
    coefficientDrivers: coefficientDrivers(atoms),
    branchAssumptions,
    evidenceRows: atoms.flatMap((atom) => atom.evidenceRows),
    unsupportedReason: atoms.length === 0 && dependsOnVariable(node, variable)
      ? 'No supported MRV atom could be extracted for the current Gruntz foundation contract.'
      : undefined,
  };
}

export function compareGruntzScales(
  leftNode: unknown,
  rightNode: unknown,
  variable = 'x',
  targetKind: Exclude<LimitTargetKind, 'finite'> = 'posInfinity',
): GruntzScaleComparison {
  const options: Required<GruntzMrvSetOptions> = { domain: 'real' };
  const left = atomFromNode(leftNode, variable, targetKind, options);
  const right = atomFromNode(rightNode, variable, targetKind, options);
  if (!left || !right) {
    return {
      comparability: 'unsupported',
      evidence: ['At least one side is outside the supported Gruntz foundation scale contract.'],
    };
  }

  const [leftAtom, rightAtom] = withIds([left, right]);
  const comparison = compareGruntzScaleSignatures(leftAtom.signature, rightAtom.signature);
  const comparability: GruntzComparability =
    comparison > 0 ? 'dominates' : comparison < 0 ? 'dominated-by' : 'same-class';
  return {
    comparability,
    left: leftAtom,
    right: rightAtom,
    evidence: [
      `left scale ${atomScaleLatex(leftAtom)}`,
      `right scale ${atomScaleLatex(rightAtom)}`,
    ],
  };
}

function dominantAtom(set: GruntzMrvSet) {
  return set.atoms.find((atom) => atom.id === set.dominantAtomId);
}

function negatedLatex(latex: string) {
  return latex.startsWith('-') ? latex.slice(1) : `-${latex}`;
}

function wSubstitutionForAtom(atom: GruntzMrvAtom, variable: string) {
  if (atom.kind === 'exponential' && atom.signature.exponential) {
    const exponentFromLatex = atom.latex.match(/^e\^\{(.+)\}$/u)?.[1];
    const exponent = exponentFromLatex ?? infinityScaleLabel(atom.signature.exponential.scale);
    return {
      wLatex: `e^{${negatedLatex(exponent)}}`,
      fromLatex: atom.latex,
      toLatex: '\\frac{1}{w}',
      reason: 'dominant exponential MRV atom is rewritten as 1/w',
      role: 'dominant-atom' as const,
    };
  }

  if (atom.latex === variable || atom.kind === 'power' || atom.kind === 'root' || atom.kind === 'log' || atom.kind === 'iterated-log') {
    return {
      wLatex: `\\frac{1}{${atom.latex}}`,
      fromLatex: atom.latex,
      toLatex: '\\frac{1}{w}',
      reason: 'dominant unbounded scale is rewritten as 1/w',
      role: 'dominant-atom' as const,
    };
  }

  return undefined;
}

function residualVariableSubstitution(
  atom: GruntzMrvAtom,
  variable: string,
): GruntzWSubstitution | undefined {
  if (atom.latex === String.raw`e^{${variable}}`) {
    return {
      fromLatex: variable,
      toLatex: String.raw`\left(-\log(w)\right)`,
      reason: 'residual variable is rewritten from w=e^{-x}',
      role: 'residual-variable',
    };
  }
  if (atom.latex === variable) {
    return {
      fromLatex: variable,
      toLatex: String.raw`\frac{1}{w}`,
      reason: 'residual variable is rewritten from w=1/x',
      role: 'residual-variable',
    };
  }
  return undefined;
}

function replaceAllLiteral(source: string, fromLatex: string, toLatex: string) {
  return fromLatex.length === 0 ? source : source.split(fromLatex).join(toLatex);
}

function applyWSubstitutions(sourceLatex: string, substitutions: GruntzWSubstitution[]) {
  return substitutions.reduce(
    (current, substitution) => replaceAllLiteral(current, substitution.fromLatex, substitution.toLatex),
    sourceLatex,
  );
}

function targetApproachLatex(targetKind: Exclude<LimitTargetKind, 'finite'>) {
  return targetKind === 'negInfinity' ? '-\\infty' : '\\infty';
}

export function buildGruntzRewriteToWContract(
  node: unknown,
  variable = 'x',
  targetKind: Exclude<LimitTargetKind, 'finite'> = 'posInfinity',
  options: GruntzMrvSetOptions = {},
): GruntzRewriteToWContract {
  const set = buildGruntzMrvSet(node, variable, targetKind, options);
  const atom = dominantAtom(set);
  if (!atom) {
    return {
      supported: false,
      variable,
      substitutions: [],
      assumptions: [],
      stopReason: set.unsupportedReason ?? 'No dominant Gruntz MRV atom was found.',
    };
  }

  const substitution = wSubstitutionForAtom(atom, variable);
  if (!substitution) {
    return {
      supported: false,
      variable,
      dominantAtom: atom,
      substitutions: [],
      assumptions: [],
      stopReason: 'The dominant atom has no supported rewrite-to-w contract yet.',
    };
  }
  const substitutions = [
    substitution,
    residualVariableSubstitution(atom, variable),
  ].filter(Boolean) as GruntzWSubstitution[];
  const originalLatex = gruntzNodeToLatex(node);
  const rewrittenLatex = applyWSubstitutions(originalLatex, substitutions);
  const parameterConditions = set.coefficientDrivers.flatMap((driver) => driver.branchConditions);

  return {
    supported: true,
    variable,
    wLatex: substitution.wLatex,
    wLimitLatex: '0^+',
    dominantAtom: atom,
    originalLatex,
    rewrittenLatex,
    substitutions,
    assumptions: ['w > 0', `${variable}\\to${targetApproachLatex(targetKind)}`],
    branchAssumptions: set.branchAssumptions,
    coefficientDrivers: set.coefficientDrivers,
    parameterConditions,
    evidenceRows: [
      ...set.evidenceRows,
      ...buildGruntzRewriteEvidenceRows({ atom, originalLatex, rewrittenLatex, substitutions, set }),
    ],
  };
}

function signKnowledge(atom: GruntzMrvAtom): 'positive' | 'negative' | 'unknown' {
  if (atom.kind === 'exponential' || atom.kind === 'root' || atom.kind === 'log' || atom.kind === 'iterated-log') {
    return 'positive';
  }
  if (atom.signature.residual.coefficient > EPSILON) {
    return 'positive';
  }
  if (atom.signature.residual.coefficient < -EPSILON) {
    return 'negative';
  }
  return 'unknown';
}

function quotientSign(left: GruntzMrvAtom, right: GruntzMrvAtom): 'positive' | 'negative' | 'unknown' {
  const leftSign = signKnowledge(left);
  const rightSign = signKnowledge(right);
  if (leftSign === 'unknown' || rightSign === 'unknown') {
    return 'unknown';
  }
  return leftSign === rightSign ? 'positive' : 'negative';
}

export function buildGruntzLimitExtractionContract(
  node: unknown,
  variable = 'x',
  targetKind: Exclude<LimitTargetKind, 'finite'> = 'posInfinity',
): GruntzLimitExtractionContract {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return {
      supported: false,
      evidence: [],
      stopReason: 'The first Gruntz limit extraction contract supports quotients only.',
    };
  }

  const options: Required<GruntzMrvSetOptions> = { domain: 'real' };
  const quotientAtoms = [
    atomFromNode(node[1], variable, targetKind, options),
    atomFromNode(node[2], variable, targetKind, options),
  ];
  const [numerator, denominator] = quotientAtoms.every(Boolean)
    ? withIds(quotientAtoms as Omit<GruntzMrvAtom, 'id'>[])
    : [];
  if (!numerator || !denominator) {
    return {
      supported: false,
      evidence: [],
      stopReason: 'The quotient has no supported dominant MRV atom on at least one side.',
    };
  }

  const comparison = compareGruntzScaleSignatures(numerator.signature, denominator.signature);
  const evidence = [
    `numerator scale ${atomScaleLatex(numerator)}`,
    `denominator scale ${atomScaleLatex(denominator)}`,
  ];

  if (comparison < 0) {
    return profileSymbolicLimitsResult({
      supported: true,
      resultKind: 'zero',
      exactLatex: '0',
      signKnowledge: quotientSign(numerator, denominator),
      numerator,
      denominator,
      evidence: [...evidence, 'denominator scale dominates'],
    });
  }

  if (comparison > 0) {
    const sign = quotientSign(numerator, denominator);
    return profileSymbolicLimitsResult({
      supported: true,
      resultKind: 'infinity',
      exactLatex: sign === 'negative' ? '-\\infty' : sign === 'positive' ? '\\infty' : undefined,
      signKnowledge: sign,
      numerator,
      denominator,
      evidence: [...evidence, 'numerator scale dominates'],
    });
  }

  return {
    supported: true,
    resultKind: 'finite-residual',
    signKnowledge: quotientSign(numerator, denominator),
    numerator,
    denominator,
    evidence: [...evidence, 'matching comparability class leaves a residual quotient'],
  };
}

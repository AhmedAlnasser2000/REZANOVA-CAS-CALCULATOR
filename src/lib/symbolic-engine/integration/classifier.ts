import {
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
  parseAffine,
  toPolynomialTerms,
} from '../patterns';
import { containsRationalOperator } from './metadata';
import { numericNodeValue, sameNode } from './node-helpers';
import type { IntegralStrategy } from './types';

export type IntegrationRouteFamily = Exclude<IntegralStrategy, 'compute-engine'>;

export type IntegrandForm =
  | 'constant'
  | 'polynomial'
  | 'rational'
  | 'inverse-trig-candidate'
  | 'composition'
  | 'product'
  | 'algebraic-radical'
  | 'branch-sensitive'
  | 'transcendental'
  | 'unknown';

export type IntegrandFeature =
  | IntegrandForm
  | 'affine'
  | 'divide'
  | 'negative-integer-power'
  | 'trig'
  | 'log'
  | 'exponential'
  | 'root'
  | 'absolute-value';

export type IntegrandFormClassification = {
  primaryForm: IntegrandForm;
  forms: IntegrandForm[];
  features: IntegrandFeature[];
  routes: IntegrationRouteFamily[];
  allowCompatibilityFallback: boolean;
};

export const INTEGRATION_ROUTE_PRECEDENCE: IntegrationRouteFamily[] = [
  'inverse-trig',
  'derivative-ratio',
  'partial-fractions',
  'u-substitution',
  'direct-rule',
  'integration-by-parts',
  'affine-linear',
];

type IntegrandProfile = {
  dependsOnTarget: boolean;
  rootHead?: string;
  rootIsProduct: boolean;
  rootIsPolynomial: boolean;
  rootIsAffine: boolean;
  hasRationalOperator: boolean;
  hasNegativeIntegerPower: boolean;
  hasComposition: boolean;
  hasBranchSensitiveCarrier: boolean;
  hasRadical: boolean;
  hasTranscendental: boolean;
  hasTrig: boolean;
  hasLog: boolean;
  hasExponential: boolean;
  inverseTrigCandidate: boolean;
};

function orderedRoutes(routes: IntegrationRouteFamily[]) {
  const requested = new Set(routes);
  return INTEGRATION_ROUTE_PRECEDENCE.filter((route) => requested.has(route));
}

function dedupe<T>(items: T[]) {
  return [...new Set(items)];
}

function positiveNumeric(node: unknown) {
  const value = numericNodeValue(node);
  return value !== undefined && value > 0;
}

function squaredAffineTerm(node: unknown, variable: string) {
  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && numericNodeValue(node[2]) === 2
  ) {
    return parseAffine(node[1], variable);
  }

  return undefined;
}

function reciprocalSqrtBody(node: unknown) {
  if (
    isNodeArray(node)
    && node[0] === 'Sqrt'
    && node.length === 2
    && isNodeArray(node[1])
    && node[1][0] === 'Divide'
    && node[1].length === 3
    && node[1][1] === 1
  ) {
    return node[1][2];
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3 && node[1] === 1) {
    const denominator = node[2];
    if (isNodeArray(denominator) && denominator[0] === 'Sqrt' && denominator.length === 2) {
      return denominator[1];
    }
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && numericNodeValue(node[2]) === -0.5
  ) {
    return node[1];
  }

  return undefined;
}

function isInverseTrigCandidate(node: unknown, variable: string) {
  if (
    isNodeArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && node[1] === 1
    && isNodeArray(node[2])
    && node[2][0] === 'Add'
    && node[2].length === 3
  ) {
    const left = node[2][1];
    const right = node[2][2];
    const hasAtanShape =
      (positiveNumeric(left) && squaredAffineTerm(right, variable))
      || (positiveNumeric(right) && squaredAffineTerm(left, variable));
    if (hasAtanShape) {
      return true;
    }
  }

  const sqrtBody = reciprocalSqrtBody(node);
  if (
    isNodeArray(sqrtBody)
    && sqrtBody[0] === 'Add'
    && sqrtBody.length === 3
  ) {
    const left = sqrtBody[1];
    const right = sqrtBody[2];
    const negatedLeft = isNodeArray(left) && left[0] === 'Negate' ? left[1] : undefined;
    const negatedRight = isNodeArray(right) && right[0] === 'Negate' ? right[1] : undefined;
    return Boolean(
      (positiveNumeric(left) && squaredAffineTerm(negatedRight, variable))
      || (positiveNumeric(right) && squaredAffineTerm(negatedLeft, variable)),
    );
  }

  return false;
}

function scan(node: unknown, variable: string, profile: IntegrandProfile) {
  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return;
  }

  const [head, ...children] = node;
  if (head === 'Abs' || head === 'AbsoluteValue') {
    profile.hasBranchSensitiveCarrier = true;
  }

  if (head === 'Sqrt') {
    profile.hasRadical = true;
    profile.hasComposition ||= children.some((child) =>
      dependsOnVariable(child, variable) && !sameNode(child, variable));
  }

  if (head === 'Divide') {
    profile.hasRationalOperator = true;
  }

  if (head === 'Power' && node.length === 3) {
    const exponent = numericNodeValue(node[2]);
    if (exponent !== undefined && exponent < 0 && Number.isInteger(exponent)) {
      profile.hasNegativeIntegerPower = true;
      profile.hasRationalOperator = true;
    }
    if (exponent !== undefined && !Number.isInteger(exponent)) {
      profile.hasRadical = true;
    }
    if (node[1] === 'ExponentialE') {
      profile.hasExponential = true;
      profile.hasTranscendental = true;
    }
    if (dependsOnVariable(node[1], variable) && !sameNode(node[1], variable)) {
      profile.hasComposition = true;
    }
    if (dependsOnVariable(node[2], variable) && !sameNode(node[2], variable)) {
      profile.hasComposition = true;
    }
  }

  if (head === 'Sin' || head === 'Cos' || head === 'Tan' || head === 'Cot' || head === 'Sec' || head === 'Csc') {
    profile.hasTrig = true;
    profile.hasTranscendental = true;
  }

  if (head === 'Ln' || head === 'Log') {
    profile.hasLog = true;
    profile.hasTranscendental = true;
  }

  if (
    (head === 'Sin' || head === 'Cos' || head === 'Tan' || head === 'Cot' || head === 'Sec' || head === 'Csc' || head === 'Ln' || head === 'Log')
    && node.length === 2
    && dependsOnVariable(node[1], variable)
    && !sameNode(node[1], variable)
  ) {
    profile.hasComposition = true;
  }

  for (const child of children) {
    scan(child, variable, profile);
  }
}

function buildProfile(node: unknown, variable: string): IntegrandProfile {
  const rootHead = isNodeArray(node) && typeof node[0] === 'string' ? node[0] : undefined;
  const profile: IntegrandProfile = {
    dependsOnTarget: dependsOnVariable(node, variable),
    rootHead,
    rootIsProduct: isNodeArray(node) && node[0] === 'Multiply' && flattenMultiply(node).length > 1,
    rootIsPolynomial: Boolean(toPolynomialTerms(node, variable)),
    rootIsAffine: Boolean(parseAffine(node, variable)),
    hasRationalOperator: containsRationalOperator(node),
    hasNegativeIntegerPower: false,
    hasComposition: false,
    hasBranchSensitiveCarrier: false,
    hasRadical: false,
    hasTranscendental: false,
    hasTrig: false,
    hasLog: false,
    hasExponential: false,
    inverseTrigCandidate: isInverseTrigCandidate(node, variable),
  };

  scan(node, variable, profile);
  return profile;
}

function profileForms(profile: IntegrandProfile): IntegrandForm[] {
  const forms: IntegrandForm[] = [];
  if (!profile.dependsOnTarget) {
    forms.push('constant');
  }
  if (profile.rootIsPolynomial) {
    forms.push('polynomial');
  }
  if (profile.inverseTrigCandidate) {
    forms.push('inverse-trig-candidate');
  }
  if (profile.hasRationalOperator) {
    forms.push('rational');
  }
  if (profile.rootIsProduct) {
    forms.push('product');
  }
  if (profile.hasComposition) {
    forms.push('composition');
  }
  if (profile.hasRadical) {
    forms.push('algebraic-radical');
  }
  if (profile.hasBranchSensitiveCarrier) {
    forms.push('branch-sensitive');
  }
  if (profile.hasTranscendental) {
    forms.push('transcendental');
  }
  return forms.length > 0 ? dedupe(forms) : ['unknown'];
}

function profileFeatures(profile: IntegrandProfile, forms: IntegrandForm[]): IntegrandFeature[] {
  const features: IntegrandFeature[] = [...forms];
  if (profile.rootIsAffine) {
    features.push('affine');
  }
  if (profile.rootHead === 'Divide') {
    features.push('divide');
  }
  if (profile.hasNegativeIntegerPower) {
    features.push('negative-integer-power');
  }
  if (profile.hasTrig) {
    features.push('trig');
  }
  if (profile.hasLog) {
    features.push('log');
  }
  if (profile.hasExponential) {
    features.push('exponential');
  }
  if (profile.hasRadical) {
    features.push('root');
  }
  if (profile.hasBranchSensitiveCarrier) {
    features.push('absolute-value');
  }
  return dedupe(features);
}

function primaryFormFor(forms: IntegrandForm[]) {
  const priority: IntegrandForm[] = [
    'branch-sensitive',
    'inverse-trig-candidate',
    'rational',
    'product',
    'algebraic-radical',
    'transcendental',
    'composition',
    'polynomial',
    'constant',
    'unknown',
  ];
  return priority.find((form) => forms.includes(form)) ?? 'unknown';
}

function routePlanFor(primaryForm: IntegrandForm, forms: IntegrandForm[]) {
  if (primaryForm === 'branch-sensitive') {
    return [];
  }

  if (forms.includes('inverse-trig-candidate')) {
    return orderedRoutes([
      'inverse-trig',
      'derivative-ratio',
      'partial-fractions',
      'u-substitution',
      'direct-rule',
      'integration-by-parts',
      'affine-linear',
    ]);
  }

  if (forms.includes('rational')) {
    return orderedRoutes([
      'derivative-ratio',
      'partial-fractions',
      'u-substitution',
      'direct-rule',
      'integration-by-parts',
      'affine-linear',
    ]);
  }

  if (
    forms.includes('product')
    || forms.includes('composition')
    || forms.includes('algebraic-radical')
    || forms.includes('transcendental')
  ) {
    return orderedRoutes([
      'u-substitution',
      'direct-rule',
      'integration-by-parts',
      'affine-linear',
    ]);
  }

  if (forms.includes('polynomial') || forms.includes('constant')) {
    return orderedRoutes(['direct-rule', 'affine-linear']);
  }

  return [];
}

export function classifyIntegrandForm(
  node: unknown,
  variable = 'x',
): IntegrandFormClassification {
  const profile = buildProfile(node, variable);
  const forms = profileForms(profile);
  const primaryForm = primaryFormFor(forms);
  const features = profileFeatures(profile, forms);

  return {
    primaryForm,
    forms,
    features,
    routes: routePlanFor(primaryForm, forms),
    allowCompatibilityFallback:
      primaryForm === 'unknown' && !profile.hasBranchSensitiveCarrier,
  };
}

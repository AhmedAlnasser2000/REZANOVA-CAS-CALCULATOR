import {
  buildExactScalarNode,
  divideExactScalars,
  exactScalarEquals,
  exactScalarIsZero,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  readExactScalarNode,
  subtractExactScalars,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import { isSymbolicCoefficientZero } from '../../primitives/coefficient-domain';
import {
  getSymbolicPolynomialCoefficient,
  parseSymbolicPolynomial,
} from '../../primitives/symbolic-polynomial';
import { normalizeGeneratedIntegrationLatex } from '../readback-hygiene';
import { boxLatex, wrapGroupedLatex } from '../../patterns';
import {
  profileDepth2TranscendentalTower,
  type Depth2TowerFact,
  type Depth2TowerProfileReady,
} from './depth2-profile';
import type { ExpQuadraticCertificateProof } from './proof';
import {
  buildTranscendentalNonElementaryCertificateFromProof,
  type TranscendentalNonElementaryCertificate,
} from './result-shape';
import { certificateUxDetailSections } from './certificate-ux';

const ONE: ExactScalar = { numerator: 1, denominator: 1 };
const TWO: ExactScalar = { numerator: 2, denominator: 1 };
const FOUR: ExactScalar = { numerator: 4, denominator: 1 };

function scalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(normalizeExactScalar(value)));
}

function integerSquareRoot(value: number) {
  if (value < 0) {
    return null;
  }
  const root = Math.trunc(Math.sqrt(value));
  return root * root === value ? root : null;
}

function exactSquareRoot(value: ExactScalar): ExactScalar | null {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator < 0 || normalized.denominator <= 0) {
    return null;
  }

  const numeratorRoot = integerSquareRoot(normalized.numerator);
  const denominatorRoot = integerSquareRoot(normalized.denominator);
  if (numeratorRoot === null || denominatorRoot === null || denominatorRoot === 0) {
    return null;
  }

  return normalizeExactScalar({
    numerator: numeratorRoot,
    denominator: denominatorRoot,
  });
}

function coefficientVariableNode(coefficient: ExactScalar, variable: string) {
  const normalized = normalizeExactScalar(coefficient);
  if (exactScalarEquals(normalized, ONE)) {
    return variable;
  }
  return ['Multiply', buildExactScalarNode(normalized), variable];
}

function affineNode(coefficient: ExactScalar, constant: ExactScalar, variable: string) {
  const terms: unknown[] = [coefficientVariableNode(coefficient, variable)];
  if (!exactScalarIsZero(constant)) {
    terms.push(buildExactScalarNode(constant));
  }
  return terms.length === 1 ? terms[0] : ['Add', ...terms];
}

function argumentLatex(absA: ExactScalar, shift: ExactScalar, variable: string) {
  const squareRoot = exactSquareRoot(absA);
  if (squareRoot) {
    const constant = multiplyExactScalars(squareRoot, shift);
    return boxLatex(affineNode(squareRoot, constant, variable));
  }

  const sqrtLatex = String.raw`\sqrt{${scalarLatex(absA)}}`;
  if (exactScalarIsZero(shift)) {
    return `${sqrtLatex}${variable}`;
  }

  return `${sqrtLatex}\\left(${variable}+${scalarLatex(shift)}\\right)`;
}

function prefactorLatex(absA: ExactScalar, completedSquareConstant: ExactScalar) {
  const squareRoot = exactSquareRoot(absA);
  const denominatorScalar = squareRoot ? multiplyExactScalars(TWO, squareRoot) : null;
  const denominator = denominatorScalar
    ? scalarLatex(denominatorScalar)
    : String.raw`2\sqrt{${scalarLatex(absA)}}`;
  const base = String.raw`\frac{\sqrt{\pi}}{${denominator}}`;
  if (exactScalarIsZero(completedSquareConstant)) {
    return base;
  }

  return String.raw`${base}\cdot e^{${scalarLatex(completedSquareConstant)}}`;
}

function exactQuadraticCoefficients(proof: ExpQuadraticCertificateProof) {
  const parsed = parseSymbolicPolynomial(proof.exponentNode, proof.variable, 2);
  if (parsed.kind !== 'success' || parsed.polynomial.degree !== 2) {
    return undefined;
  }

  const a = readExactScalarNode(parsed.polynomial.coefficients[2]?.node);
  const b = readExactScalarNode(parsed.polynomial.coefficients[1]?.node);
  const c = readExactScalarNode(parsed.polynomial.coefficients[0]?.node);
  if (!a || !b || !c || a.numerator === 0) {
    return undefined;
  }

  return {
    a: normalizeExactScalar(a),
    b: normalizeExactScalar(b),
    c: normalizeExactScalar(c),
  };
}

function exactQuadraticSpecialFunctionLatex(proof: ExpQuadraticCertificateProof) {
  const coefficients = exactQuadraticCoefficients(proof);
  if (!coefficients) {
    return undefined;
  }

  const { a, b, c } = coefficients;
  const twoA = multiplyExactScalars(TWO, a);
  const fourA = multiplyExactScalars(FOUR, a);
  const bSquared = multiplyExactScalars(b, b);
  const squareCorrection = divideExactScalars(bSquared, fourA);
  const shift = divideExactScalars(b, twoA);
  if (!squareCorrection || !shift) {
    return undefined;
  }

  const completedSquareConstant = subtractExactScalars(c, squareCorrection);
  const positiveBranch = a.numerator > 0;
  const absA = positiveBranch ? a : negateExactScalar(a);
  const fn = positiveBranch ? 'erfi' : 'erf';
  const argument = argumentLatex(absA, shift, proof.variable);

  return String.raw`${prefactorLatex(absA, completedSquareConstant)}\cdot \operatorname{${fn}}\left(${argument}\right)`;
}

function casewiseLatex(rows: Array<{ valueLatex: string; conditionLatex: string }>) {
  return `\\begin{cases}${rows
    .map((row) => `${row.valueLatex},&${row.conditionLatex}`)
    .join('\\\\')}\\end{cases}`;
}

function symbolicCompletedSquareConstantLatex(input: {
  aLatex: string;
  bLatex: string;
  cLatex: string;
  bIsZero: boolean;
  cIsZero: boolean;
}) {
  if (input.bIsZero) {
    return input.cLatex;
  }

  const correction = String.raw`\frac{${wrapGroupedLatex(input.bLatex)}^{2}}{4${wrapGroupedLatex(input.aLatex)}}`;
  return input.cIsZero
    ? `-${correction}`
    : `${input.cLatex}-${correction}`;
}

function symbolicQuadraticArgumentLatex(input: {
  sqrtRadicandLatex: string;
  aLatex: string;
  bLatex: string;
  bIsZero: boolean;
  variable: string;
}) {
  const sqrtFactor = String.raw`\sqrt{${input.sqrtRadicandLatex}}`;
  if (input.bIsZero) {
    return `${sqrtFactor}${input.variable}`;
  }

  return String.raw`${sqrtFactor}\left(${input.variable}+\frac{${input.bLatex}}{2${wrapGroupedLatex(input.aLatex)}}\right)`;
}

function symbolicSpecialFunctionBranchLatex(input: {
  fn: 'erf' | 'erfi';
  sqrtRadicandLatex: string;
  aLatex: string;
  bLatex: string;
  cLatex: string;
  bIsZero: boolean;
  cIsZero: boolean;
  variable: string;
}) {
  const completedSquareConstant = symbolicCompletedSquareConstantLatex(input);
  const exponentialFactor = completedSquareConstant === '0'
    ? ''
    : String.raw`\cdot e^{${completedSquareConstant}}`;
  const argument = symbolicQuadraticArgumentLatex(input);

  return String.raw`\frac{\sqrt{\pi}}{2\sqrt{${input.sqrtRadicandLatex}}}${exponentialFactor}\cdot \operatorname{${input.fn}}\left(${argument}\right)`;
}

function symbolicQuadraticSpecialFunctionLatex(proof: ExpQuadraticCertificateProof) {
  const parsed = parseSymbolicPolynomial(proof.exponentNode, proof.variable, 2);
  if (parsed.kind !== 'success' || parsed.polynomial.degree !== 2) {
    return undefined;
  }

  const a = getSymbolicPolynomialCoefficient(parsed.polynomial, 2);
  const b = getSymbolicPolynomialCoefficient(parsed.polynomial, 1);
  const c = getSymbolicPolynomialCoefficient(parsed.polynomial, 0);
  const exactA = readExactScalarNode(a.node);
  if (exactA) {
    return undefined;
  }

  const aLatex = a.latex;
  const bLatex = b.latex;
  const cLatex = c.latex;
  const bIsZero = isSymbolicCoefficientZero(b);
  const cIsZero = isSymbolicCoefficientZero(c);
  const positiveBranch = symbolicSpecialFunctionBranchLatex({
    fn: 'erfi',
    sqrtRadicandLatex: aLatex,
    aLatex,
    bLatex,
    cLatex,
    bIsZero,
    cIsZero,
    variable: proof.variable,
  });
  const negativeBranch = symbolicSpecialFunctionBranchLatex({
    fn: 'erf',
    sqrtRadicandLatex: `-${wrapGroupedLatex(aLatex)}`,
    aLatex,
    bLatex,
    cLatex,
    bIsZero,
    cIsZero,
    variable: proof.variable,
  });

  return normalizeGeneratedIntegrationLatex(
    casewiseLatex([
      {
        valueLatex: negativeBranch,
        conditionLatex: `${wrapGroupedLatex(aLatex)}<0`,
      },
      {
        valueLatex: positiveBranch,
        conditionLatex: `${wrapGroupedLatex(aLatex)}>0`,
      },
    ]),
    proof.variable,
  );
}

function specialFunctionDetail(functionLatex: string): TranscendentalNonElementaryCertificate['detailSections'][number] {
  return {
    title: 'Special-Function Readback',
    lines: [
      functionLatex,
      'The named special-function formula differentiates back to the integrand using the exact erf/erfi derivative rules.',
      'The certificate details below explain why no elementary antiderivative exists in the stated field.',
    ],
    lineKinds: ['math', 'text', 'text'],
  };
}

function updateProofScopeForSpecialFunction(
  sections: TranscendentalNonElementaryCertificate['detailSections'],
) {
  return sections.map((section) => {
    if (section.title !== 'Proof Scope') {
      return section;
    }

    return {
      ...section,
      lines: section.lines.map((line) =>
        line.includes('Special-function readback')
          ? 'Named special-function readback is shown in the main answer; the certificate remains the elementary non-existence proof.'
          : line),
    };
  });
}

function depth2FactEntry(fact: Depth2TowerFact): ExactSupplementEntry {
  return {
    kind: fact.relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex: fact.expressionLatex,
    relation: fact.relation === '0<expr<1' || fact.relation === '>1'
      ? '>0'
      : fact.relation,
    source: 'candidate-validation',
  };
}

function depth2SupplementLatex(profile: Depth2TowerProfileReady) {
  const entries = [
    ...profile.requiredFacts,
    ...profile.branchFacts,
  ].map(depth2FactEntry);
  const lines = mergeExactSupplementLatex({
    entries,
    source: 'candidate-validation',
  });
  return lines.length > 0 ? lines : undefined;
}

function coefficientNodeOrOne(profile: Depth2TowerProfileReady) {
  return profile.coefficientNode ?? 1;
}

function ratioPrefactorLatex(profile: Depth2TowerProfileReady) {
  if (profile.derivativeCarrier.kind !== 'affine-slope') {
    return undefined;
  }

  const coefficientNode = coefficientNodeOrOne(profile);
  const coefficientScalar = readExactScalarNode(coefficientNode);
  const slopeScalar = readExactScalarNode(profile.derivativeCarrier.slopeNode);
  if (coefficientScalar && slopeScalar) {
    const ratio = divideExactScalars(coefficientScalar, slopeScalar);
    if (!ratio) {
      return undefined;
    }
    const normalized = normalizeExactScalar(ratio);
    return exactScalarEquals(normalized, ONE) ? undefined : scalarLatex(normalized);
  }

  const coefficientLatex = profile.coefficientNode === undefined
    ? '1'
    : boxLatex(profile.coefficientNode);
  const slopeLatex = profile.derivativeCarrier.slopeLatex;
  if (coefficientLatex === slopeLatex) {
    return undefined;
  }
  if (slopeLatex === '1') {
    return coefficientLatex === '1' ? undefined : coefficientLatex;
  }

  return String.raw`\frac{${coefficientLatex}}{${slopeLatex}}`;
}

function multiplyPrefactorByFunction(prefactorLatex: string | undefined, functionLatex: string) {
  if (!prefactorLatex || prefactorLatex === '1') {
    return functionLatex;
  }
  if (prefactorLatex === '-1') {
    return `-${functionLatex}`;
  }

  return String.raw`${prefactorLatex}\cdot ${functionLatex}`;
}

function operatorFunctionLatex(name: 'Si' | 'Ci', argumentLatex: string) {
  return String.raw`\operatorname{${name}}\left(${argumentLatex}\right)`;
}

function namedSpecialFunctionLatex(
  name: 'Si' | 'Ci' | 'Ei' | 'li',
  argumentLatex: string,
) {
  return String.raw`\operatorname{${name}}\left(${argumentLatex}\right)`;
}

function negatedArgumentLatex(profile: Depth2TowerProfileReady) {
  return boxLatex(['Negate', profile.coreArgumentNode]);
}

function depth2CasewiseLatex(
  rows: Array<{ valueLatex: string; conditionLatex: string }>,
  variable: string,
) {
  return normalizeGeneratedIntegrationLatex(casewiseLatex(rows), variable);
}

function depth2FieldLatex(profile: Depth2TowerProfileReady) {
  return String.raw`K\left(${profile.variable}, \sin\left(${profile.coreArgumentLatex}\right), \cos\left(${profile.coreArgumentLatex}\right)\right)`;
}

function depth2SpecialFunctionDetail(input: {
  functionLatex: string;
  profile: Depth2TowerProfileReady;
  functionName: 'Si' | 'Ci';
}): TranscendentalNonElementaryCertificate['detailSections'] {
  const familyLine = input.functionName === 'Si'
    ? 'Family: affine sine quotient, reduced to the sine integral special function.'
    : 'Family: affine cosine quotient, reduced to the cosine integral special function on real-domain branches.';
  const derivativeLine = input.functionName === 'Si'
    ? String.raw`\frac{d}{dx}\operatorname{Si}\left(u\right)=\frac{\sin(u)u'}{u}`
    : String.raw`\frac{d}{dx}\operatorname{Ci}\left(u\right)=\frac{\cos(u)u'}{u}`;

  return [
    {
      title: 'Non-Elementary Certificate',
      lines: [
        'No elementary antiderivative exists for this affine quotient in the stated elementary differential field.',
        'The main answer uses a named special function rather than reporting a heuristic failure.',
      ],
    },
    {
      title: 'Proof Scope',
      lineKinds: ['math', 'text', 'text'],
      lines: [
        depth2FieldLatex(input.profile),
        familyLine,
        'The quotient argument is affine in the selected variable and the denominator branch excludes zero.',
      ],
    },
    ...certificateUxDetailSections({
      inputFacts: input.profile.requiredFacts,
      branchFacts: input.profile.branchFacts,
      proofObligations: [{
        summary: 'The named special-function derivative rule is the proof obligation used for readback verification.',
        latex: derivativeLine,
      }],
    }),
    {
      title: 'Special-Function Readback',
      lineKinds: ['math', 'math', 'text'],
      lines: [
        input.functionLatex,
        derivativeLine,
        'The named special-function formula differentiates back to the integrand; the certificate records that no elementary formula exists in the stated field.',
      ],
    },
  ];
}

export function buildSiCiAffineQuotientSpecialFunctionCertificate(
  node: unknown,
  variable = 'x',
): TranscendentalNonElementaryCertificate | undefined {
  const profile = profileDepth2TranscendentalTower(node, variable);
  if (
    profile.kind !== 'ready'
    || profile.consumer !== 'certificate-special-function'
    || (
      profile.family !== 'sine-integral-affine-quotient'
      && profile.family !== 'cosine-integral-affine-quotient'
    )
    || profile.derivativeCarrier.kind !== 'affine-slope'
  ) {
    return undefined;
  }

  const prefactor = ratioPrefactorLatex(profile);
  const exactLatex = profile.family === 'sine-integral-affine-quotient'
    ? multiplyPrefactorByFunction(prefactor, operatorFunctionLatex('Si', profile.coreArgumentLatex))
    : depth2CasewiseLatex([
      {
        valueLatex: multiplyPrefactorByFunction(prefactor, operatorFunctionLatex('Ci', profile.coreArgumentLatex)),
        conditionLatex: `${profile.coreArgumentLatex}>0`,
      },
      {
        valueLatex: multiplyPrefactorByFunction(prefactor, operatorFunctionLatex('Ci', negatedArgumentLatex(profile))),
        conditionLatex: `${profile.coreArgumentLatex}<0`,
      },
    ], profile.variable);
  const functionName = profile.family === 'sine-integral-affine-quotient'
    ? 'Si'
    : 'Ci';

  return {
    kind: 'non-elementary-certificate',
    family: 'depth2-affine-quotient',
    variable: profile.variable,
    exactLatex,
    antiderivativeKind: 'special-function',
    fieldLatex: depth2FieldLatex(profile),
    theorem: 'depth2-affine-quotient-transcendental-risch',
    proofSummary: `${functionName} affine quotient non-elementarity certificate with named special-function readback.`,
    exactSupplementLatex: depth2SupplementLatex(profile),
    detailSections: depth2SpecialFunctionDetail({
      functionLatex: exactLatex,
      profile,
      functionName,
    }),
  };
}

function depth2EiLiFieldLatex(profile: Depth2TowerProfileReady) {
  return profile.family === 'logarithmic-integral-affine-reciprocal'
    ? String.raw`K\left(${profile.variable}, \ln\left(${profile.coreArgumentLatex}\right)\right)`
    : String.raw`K\left(${profile.variable}, e^{${profile.coreArgumentLatex}}\right)`;
}

function depth2EiLiSpecialFunctionDetail(input: {
  functionLatex: string;
  profile: Depth2TowerProfileReady;
  functionName: 'Ei' | 'li';
}): TranscendentalNonElementaryCertificate['detailSections'] {
  const familyLine = input.functionName === 'Ei'
    ? 'Family: affine exponential quotient, reduced to the exponential integral special function.'
    : 'Family: affine logarithmic reciprocal, reduced to the logarithmic integral special function.';
  const derivativeLine = input.functionName === 'Ei'
    ? String.raw`\frac{d}{dx}\operatorname{Ei}\left(u\right)=\frac{e^{u}u'}{u}`
    : String.raw`\frac{d}{dx}\operatorname{li}\left(u\right)=\frac{u'}{\ln(u)}`;

  return [
    {
      title: 'Non-Elementary Certificate',
      lines: [
        'No elementary antiderivative exists for this affine quotient in the stated elementary differential field.',
        'The main answer uses a named special function rather than reporting a heuristic failure.',
      ],
    },
    {
      title: 'Proof Scope',
      lineKinds: ['math', 'text', 'text'],
      lines: [
        depth2EiLiFieldLatex(input.profile),
        familyLine,
        'The real-domain branch rows intentionally avoid adding complex branch constants to the main answer.',
      ],
    },
    ...certificateUxDetailSections({
      inputFacts: input.profile.requiredFacts,
      branchFacts: input.profile.branchFacts,
      proofObligations: [{
        summary: 'The named special-function derivative rule is the proof obligation used for readback verification.',
        latex: derivativeLine,
      }],
    }),
    {
      title: 'Special-Function Readback',
      lineKinds: ['math', 'math', 'text'],
      lines: [
        input.functionLatex,
        derivativeLine,
        'The named special-function formula differentiates back to the integrand; the certificate records that no elementary formula exists in the stated field.',
      ],
    },
  ];
}

export function buildEiLiAffineSpecialFunctionCertificate(
  node: unknown,
  variable = 'x',
): TranscendentalNonElementaryCertificate | undefined {
  const profile = profileDepth2TranscendentalTower(node, variable);
  if (
    profile.kind !== 'ready'
    || profile.consumer !== 'certificate-special-function'
    || (
      profile.family !== 'exponential-integral-affine-quotient'
      && profile.family !== 'logarithmic-integral-affine-reciprocal'
    )
    || profile.derivativeCarrier.kind !== 'affine-slope'
  ) {
    return undefined;
  }

  const prefactor = ratioPrefactorLatex(profile);
  const functionName = profile.family === 'exponential-integral-affine-quotient'
    ? 'Ei'
    : 'li';
  const functionLatex = multiplyPrefactorByFunction(
    prefactor,
    namedSpecialFunctionLatex(functionName, profile.coreArgumentLatex),
  );
  const exactLatex = profile.family === 'exponential-integral-affine-quotient'
    ? depth2CasewiseLatex([
      {
        valueLatex: functionLatex,
        conditionLatex: `${profile.coreArgumentLatex}>0`,
      },
      {
        valueLatex: functionLatex,
        conditionLatex: `${profile.coreArgumentLatex}<0`,
      },
    ], profile.variable)
    : depth2CasewiseLatex([
      {
        valueLatex: functionLatex,
        conditionLatex: `${profile.coreArgumentLatex}>1`,
      },
      {
        valueLatex: functionLatex,
        conditionLatex: `0<${profile.coreArgumentLatex}<1`,
      },
    ], profile.variable);

  return {
    kind: 'non-elementary-certificate',
    family: 'depth2-affine-quotient',
    variable: profile.variable,
    exactLatex,
    antiderivativeKind: 'special-function',
    fieldLatex: depth2EiLiFieldLatex(profile),
    theorem: 'depth2-affine-quotient-transcendental-risch',
    proofSummary: `${functionName} affine quotient non-elementarity certificate with named special-function readback.`,
    exactSupplementLatex: depth2SupplementLatex(profile),
    detailSections: depth2EiLiSpecialFunctionDetail({
      functionLatex: exactLatex,
      profile,
      functionName,
    }),
  };
}

export function buildExpQuadraticSpecialFunctionCertificateFromProof(
  proof: ExpQuadraticCertificateProof,
): TranscendentalNonElementaryCertificate | undefined {
  const functionLatex =
    exactQuadraticSpecialFunctionLatex(proof)
    ?? symbolicQuadraticSpecialFunctionLatex(proof);
  if (!functionLatex) {
    return undefined;
  }

  const certificate = buildTranscendentalNonElementaryCertificateFromProof(proof);
  if (!certificate) {
    return undefined;
  }

  return {
    ...certificate,
    exactLatex: functionLatex,
    antiderivativeKind: 'special-function',
    detailSections: [
      ...updateProofScopeForSpecialFunction(certificate.detailSections),
      specialFunctionDetail(functionLatex),
    ],
  };
}

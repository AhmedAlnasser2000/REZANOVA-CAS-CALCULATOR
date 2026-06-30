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
import { isSymbolicCoefficientZero } from '../../primitives/coefficient-domain';
import {
  getSymbolicPolynomialCoefficient,
  parseSymbolicPolynomial,
} from '../../primitives/symbolic-polynomial';
import { normalizeGeneratedIntegrationLatex } from '../readback-hygiene';
import { boxLatex, wrapGroupedLatex } from '../../patterns';
import type { ExpQuadraticCertificateProof } from './proof';
import {
  buildTranscendentalNonElementaryCertificateFromProof,
  type TranscendentalNonElementaryCertificate,
} from './result-shape';

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

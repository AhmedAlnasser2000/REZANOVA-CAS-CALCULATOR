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
import { parseSymbolicPolynomial } from '../../primitives/symbolic-polynomial';
import { boxLatex, wrapGroupedLatex } from '../../patterns';
import { normalizeGeneratedIntegrationLatex } from '../readback-hygiene';
import { certificateUxDetailSections } from './certificate-ux';
import type { TranscendentalNonElementaryCertificate } from './result-shape';

const ONE: ExactScalar = { numerator: 1, denominator: 1 };
const TWO: ExactScalar = { numerator: 2, denominator: 1 };
const FOUR: ExactScalar = { numerator: 4, denominator: 1 };

type FresnelTrigHead = 'Sin' | 'Cos';

type FresnelIntegrand = {
  head: FresnelTrigHead;
  argument: unknown;
  coefficient: ExactScalar;
};

type FresnelQuadratic = {
  leading: ExactScalar;
  linear: ExactScalar;
  constant: ExactScalar;
};

function scalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(normalizeExactScalar(value)));
}

function extractFresnelIntegrand(node: unknown): FresnelIntegrand | undefined {
  if (Array.isArray(node) && (node[0] === 'Sin' || node[0] === 'Cos') && node.length === 2) {
    return {
      head: node[0],
      argument: node[1],
      coefficient: ONE,
    };
  }

  if (Array.isArray(node) && node[0] === 'Negate' && node.length === 2) {
    const inner = extractFresnelIntegrand(node[1]);
    return inner
      ? {
        ...inner,
        coefficient: negateExactScalar(inner.coefficient),
      }
      : undefined;
  }

  if (!Array.isArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  let coefficient = ONE;
  let trig: FresnelIntegrand | undefined;
  for (const factor of node.slice(1)) {
    const scalar = readExactScalarNode(factor);
    if (scalar) {
      coefficient = multiplyExactScalars(coefficient, scalar);
      continue;
    }

    const factorTrig = extractFresnelIntegrand(factor);
    if (!factorTrig || trig) {
      return undefined;
    }
    trig = factorTrig;
  }

  return trig
    ? {
      head: trig.head,
      argument: trig.argument,
      coefficient: multiplyExactScalars(coefficient, trig.coefficient),
    }
    : undefined;
}

function exactRationalQuadratic(node: unknown, variable: string): FresnelQuadratic | undefined {
  const parsed = parseSymbolicPolynomial(node, variable, 2);
  if (parsed.kind !== 'success' || parsed.polynomial.degree !== 2) {
    return undefined;
  }

  const leading = readExactScalarNode(parsed.polynomial.coefficients[2]?.node);
  const linear = readExactScalarNode(parsed.polynomial.coefficients[1]?.node);
  const constant = readExactScalarNode(parsed.polynomial.coefficients[0]?.node);
  if (!leading || !linear || !constant || exactScalarIsZero(leading)) {
    return undefined;
  }

  return {
    leading: normalizeExactScalar(leading),
    linear: normalizeExactScalar(linear),
    constant: normalizeExactScalar(constant),
  };
}

function signedScalarLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  const absolute = normalized.numerator < 0
    ? negateExactScalar(normalized)
    : normalized;
  return {
    sign: normalized.numerator < 0 ? '-' : '+',
    latex: scalarLatex(absolute),
  };
}

function shiftedVariableLatex(variable: string, shift: ExactScalar) {
  const normalized = normalizeExactScalar(shift);
  if (exactScalarIsZero(normalized)) {
    return variable;
  }

  const signed = signedScalarLatex(normalized);
  return `${variable}${signed.sign}${signed.latex}`;
}

function piDenominatorLatex(denominator: number) {
  return denominator === 1 ? String.raw`\pi` : `${denominator}\\pi`;
}

function fresnelArgumentScaleLatex(absA: ExactScalar) {
  const normalized = normalizeExactScalar(absA);
  const numerator = normalized.numerator * 2;
  const denominator = normalized.denominator;
  return String.raw`\sqrt{\frac{${numerator}}{${piDenominatorLatex(denominator)}}}`;
}

function fresnelPrefactorBaseLatex(absA: ExactScalar) {
  const normalized = normalizeExactScalar(absA);
  const numerator = normalized.denominator;
  const denominator = normalized.numerator * 2;
  const numeratorLatex = numerator === 1 ? String.raw`\pi` : `${numerator}\\pi`;
  return String.raw`\sqrt{\frac{${numeratorLatex}}{${denominator}}}`;
}

function multiplyScalarAndLatex(coefficient: ExactScalar, latex: string) {
  const normalized = normalizeExactScalar(coefficient);
  if (exactScalarEquals(normalized, ONE)) {
    return latex;
  }
  if (exactScalarEquals(normalized, negateExactScalar(ONE))) {
    return `-${wrapGroupedLatex(latex)}`;
  }
  return `${scalarLatex(normalized)}\\cdot ${latex}`;
}

function namedSpecialFunctionLatex(name: 'FresnelS' | 'FresnelC', argumentLatex: string) {
  return String.raw`\operatorname{${name}}\left(${argumentLatex}\right)`;
}

function fresnelArgumentLatex(absA: ExactScalar, shift: ExactScalar, variable: string) {
  const shifted = shiftedVariableLatex(variable, shift);
  const scale = fresnelArgumentScaleLatex(absA);
  return shifted === variable
    ? `${scale}${variable}`
    : String.raw`${scale}\left(${shifted}\right)`;
}

function trigConstantFactor(head: 'sin' | 'cos', value: ExactScalar): { sign: 1 | -1; latex: string } {
  const normalized = normalizeExactScalar(value);
  const negative = normalized.numerator < 0;
  const absolute = negative ? negateExactScalar(normalized) : normalized;
  const argumentLatex = scalarLatex(absolute);
  const groupedArgument = argumentLatex.startsWith(String.raw`\frac`)
    ? `{${argumentLatex}}`
    : argumentLatex;
  return {
    sign: negative && head === 'sin' ? -1 : 1,
    latex: `\\${head}\\left(${groupedArgument}\\right)`,
  };
}

function termProductLatex(factors: string[]) {
  const usable = factors.filter((factor) => factor !== '1');
  return usable.length === 0 ? '1' : usable.join(String.raw`\cdot `);
}

function signedTermSumLatex(terms: Array<{ sign: 1 | -1; latex: string }>) {
  const usable = terms.filter((term) => term.latex !== '0');
  if (usable.length === 0) {
    return '0';
  }

  return usable.map((term, index) => {
    if (index === 0) {
      return term.sign === -1 ? `-${wrapGroupedLatex(term.latex)}` : term.latex;
    }
    return term.sign === -1 ? `-${term.latex}` : `+${term.latex}`;
  }).join('');
}

function fresnelInnerLatex(input: {
  head: FresnelTrigHead;
  positiveLeading: boolean;
  completedSquareConstant: ExactScalar;
  argumentLatex: string;
}) {
  const s = namedSpecialFunctionLatex('FresnelS', input.argumentLatex);
  const c = namedSpecialFunctionLatex('FresnelC', input.argumentLatex);
  if (exactScalarIsZero(input.completedSquareConstant)) {
    if (input.head === 'Cos') {
      return c;
    }
    return input.positiveLeading ? s : `-${s}`;
  }

  const sinK = trigConstantFactor('sin', input.completedSquareConstant);
  const cosK = trigConstantFactor('cos', input.completedSquareConstant);
  if (input.positiveLeading && input.head === 'Sin') {
    return signedTermSumLatex([
      { sign: cosK.sign, latex: termProductLatex([cosK.latex, s]) },
      { sign: sinK.sign, latex: termProductLatex([sinK.latex, c]) },
    ]);
  }
  if (input.positiveLeading && input.head === 'Cos') {
    return signedTermSumLatex([
      { sign: cosK.sign, latex: termProductLatex([cosK.latex, c]) },
      { sign: sinK.sign === 1 ? -1 : 1, latex: termProductLatex([sinK.latex, s]) },
    ]);
  }
  if (!input.positiveLeading && input.head === 'Sin') {
    return signedTermSumLatex([
      { sign: sinK.sign, latex: termProductLatex([sinK.latex, c]) },
      { sign: cosK.sign === 1 ? -1 : 1, latex: termProductLatex([cosK.latex, s]) },
    ]);
  }
  return signedTermSumLatex([
    { sign: cosK.sign, latex: termProductLatex([cosK.latex, c]) },
    { sign: sinK.sign, latex: termProductLatex([sinK.latex, s]) },
  ]);
}

function fresnelQuadraticLatex(input: {
  integrand: FresnelIntegrand;
  quadratic: FresnelQuadratic;
  variable: string;
}) {
  const { leading, linear, constant } = input.quadratic;
  const twoA = multiplyExactScalars(TWO, leading);
  const fourA = multiplyExactScalars(FOUR, leading);
  const bSquared = multiplyExactScalars(linear, linear);
  const squareCorrection = divideExactScalars(bSquared, fourA);
  const shift = divideExactScalars(linear, twoA);
  if (!squareCorrection || !shift) {
    return undefined;
  }

  const completedSquareConstant = subtractExactScalars(constant, squareCorrection);
  const positiveLeading = leading.numerator > 0;
  const absA = positiveLeading ? leading : negateExactScalar(leading);
  const argument = fresnelArgumentLatex(absA, shift, input.variable);
  const inner = fresnelInnerLatex({
    head: input.integrand.head,
    positiveLeading,
    completedSquareConstant,
    argumentLatex: argument,
  });
  const prefactor = fresnelPrefactorBaseLatex(absA);
  const scalarPrefactor = multiplyScalarAndLatex(input.integrand.coefficient, prefactor);
  const exactLatex = !exactScalarIsZero(completedSquareConstant) || inner.startsWith('-')
    ? `${scalarPrefactor}\\cdot \\left(${inner}\\right)`
    : `${scalarPrefactor}\\cdot ${inner}`;

  return normalizeGeneratedIntegrationLatex(exactLatex, input.variable);
}

function fresnelQuadraticFieldLatex(input: {
  integrand: FresnelIntegrand;
  quadraticLatex: string;
  variable: string;
}) {
  const trig = input.integrand.head === 'Sin'
    ? String.raw`\sin\left(${input.quadraticLatex}\right)`
    : String.raw`\cos\left(${input.quadraticLatex}\right)`;
  return String.raw`K\left(${input.variable}, ${trig}\right)`;
}

function fresnelQuadraticDetail(input: {
  functionLatex: string;
  integrand: FresnelIntegrand;
  quadraticLatex: string;
  variable: string;
}): TranscendentalNonElementaryCertificate['detailSections'] {
  const derivativeLineS = String.raw`\frac{d}{dx}\operatorname{FresnelS}\left(u\right)=\sin\left(\frac{\pi u^2}{2}\right)u'`;
  const derivativeLineC = String.raw`\frac{d}{dx}\operatorname{FresnelC}\left(u\right)=\cos\left(\frac{\pi u^2}{2}\right)u'`;
  const familyLine = input.integrand.head === 'Sin'
    ? 'Family: sine of an exact-rational quadratic, reduced by completing the square to FresnelS/FresnelC.'
    : 'Family: cosine of an exact-rational quadratic, reduced by completing the square to FresnelS/FresnelC.';

  return [
    {
      title: 'Non-Elementary Certificate',
      lineKind: 'text',
      lines: [
        'No elementary antiderivative exists for this quadratic trigonometric integrand in the stated elementary differential field.',
        'The main answer uses named Fresnel special functions rather than reporting a heuristic failure.',
      ],
    },
    {
      title: 'Proof Scope',
      lineKinds: ['math', 'text', 'text'],
      lines: [
        fresnelQuadraticFieldLatex(input),
        familyLine,
        'The quadratic has exact-rational coefficients and a nonzero leading term.',
      ],
    },
    ...certificateUxDetailSections({
      inputFacts: [],
      branchFacts: [],
      proofObligations: [
        {
          summary: 'Complete the square, then scale the argument to the standard Fresnel convention.',
          latex: String.raw`${input.quadraticLatex}=A\left(${input.variable}+h\right)^2+k`,
        },
        {
          summary: 'The named special-function derivative rules are the readback proof obligations.',
          latex: `${derivativeLineS},\\quad ${derivativeLineC}`,
        },
      ],
    }),
    {
      title: 'Special-Function Readback',
      lineKinds: ['math', 'math', 'math', 'text'],
      lines: [
        input.functionLatex,
        derivativeLineS,
        derivativeLineC,
        'The named special-function formula differentiates back to the integrand after the completed-square substitution.',
      ],
    },
  ];
}

export function buildFresnelQuadraticSpecialFunctionCertificate(
  node: unknown,
  variable = 'x',
): TranscendentalNonElementaryCertificate | undefined {
  const integrand = extractFresnelIntegrand(node);
  if (!integrand || exactScalarIsZero(integrand.coefficient)) {
    return undefined;
  }

  const quadratic = exactRationalQuadratic(integrand.argument, variable);
  if (!quadratic) {
    return undefined;
  }

  const exactLatex = fresnelQuadraticLatex({
    integrand,
    quadratic,
    variable,
  });
  if (!exactLatex) {
    return undefined;
  }

  const quadraticLatex = boxLatex(integrand.argument);
  return {
    kind: 'non-elementary-certificate',
    family: 'fresnel-quadratic',
    variable,
    exactLatex,
    antiderivativeKind: 'special-function',
    fieldLatex: fresnelQuadraticFieldLatex({
      integrand,
      quadraticLatex,
      variable,
    }),
    theorem: 'fresnel-quadratic-transcendental-risch',
    proofSummary: 'Fresnel quadratic-trig non-elementarity certificate with named special-function readback.',
    detailSections: fresnelQuadraticDetail({
      functionLatex: exactLatex,
      integrand,
      quadraticLatex,
      variable,
    }),
  };
}

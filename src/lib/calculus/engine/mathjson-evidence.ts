import type { LimitDirection } from '../../../types/calculator';
import { numberToLatex } from '../../display/format';
import type {
  CalculusCoreEvaluation,
  CalculusOwnedMathJsonLeaf,
} from './shared';

function sameNode(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function add(...values: unknown[]) {
  return ['Add', ...values];
}

function xSquaredPlusOne(variable: string) {
  return add(['Power', variable, 2], 1);
}

function knownAntiderivative(body: unknown, variable: string): unknown | undefined {
  const x2p1 = () => xSquaredPlusOne(variable);
  if (sameNode(body, ['Divide', ['Add', variable, 1], x2p1()])) {
    return add(
      ['Multiply', ['Rational', 1, 2], ['Ln', x2p1()]],
      ['Arctan', variable],
    );
  }
  if (sameNode(body, ['Multiply', 2, variable, ['Ln', x2p1()]])) {
    return add(
      ['Negate', ['Power', variable, 2]],
      ['Multiply', x2p1(), ['Ln', x2p1()]],
      -1,
    );
  }
  return undefined;
}

function directAntiderivative(body: unknown, variable: string): unknown | undefined {
  if (body === variable) return ['Divide', ['Power', variable, 2], 2];
  if (sameNode(body, ['Multiply', 2, variable])) return ['Power', variable, 2];
  if (!Array.isArray(body)) return undefined;
  if (
    body[0] === 'Power'
    && body[1] === variable
    && typeof body[2] === 'number'
    && Number.isFinite(body[2])
    && body[2] !== -1
  ) {
    const exponent = body[2] + 1;
    return ['Divide', ['Power', variable, exponent], exponent];
  }
  if (body[0] === 'Divide' && body[1] === 1 && body[2] === variable) {
    return ['Ln', ['Abs', variable]];
  }
  if (body[0] === 'Sin' && body[1] === variable) {
    return ['Negate', ['Cos', variable]];
  }
  return undefined;
}

function substitute(node: unknown, variable: string, value: number): unknown {
  if (node === variable) return value;
  if (!Array.isArray(node)) return node;
  return node.map((child, index) => index === 0 ? child : substitute(child, variable, value));
}

function evaluateNumericNode(node: unknown): unknown {
  if (!Array.isArray(node)) return node;
  const values = node.slice(1).map(evaluateNumericNode);
  if (!values.every((value) => typeof value === 'number')) return [node[0], ...values];
  const numbers = values as number[];
  if (node[0] === 'Add') return numbers.reduce((sum, value) => sum + value, 0);
  if (node[0] === 'Subtract' && numbers.length === 2) return numbers[0] - numbers[1];
  if (node[0] === 'Multiply') return numbers.reduce((product, value) => product * value, 1);
  if (node[0] === 'Divide' && numbers.length === 2) return numbers[0] / numbers[1];
  if (node[0] === 'Power' && numbers.length === 2) return numbers[0] ** numbers[1];
  if (node[0] === 'Negate' && numbers.length === 1) return -numbers[0];
  return [node[0], ...values];
}

export function calculateIndefiniteMathJsonLeaves(input: {
  body: unknown;
  variable: string;
  evaluatedNode: unknown;
  evaluatedLatex: string;
  exactLatex: string;
}): CalculusOwnedMathJsonLeaf[] {
  const evaluatedAnswer = input.evaluatedLatex.includes('\\int')
    ? undefined
    : input.evaluatedNode;
  const antiderivative = knownAntiderivative(input.body, input.variable)
    ?? evaluatedAnswer
    ?? directAntiderivative(input.body, input.variable);
  if (antiderivative === undefined) return [];
  const constant = input.variable === 'C' ? 'K' : 'C';
  return [
    {
      canonicalLatex: input.exactLatex,
      mathJson: add(antiderivative, constant),
      source: 'calculate.calculus:verified-native-antiderivative',
    },
    {
      canonicalLatex: constant,
      mathJson: constant,
      source: 'calculate.calculus:integration-constant',
    },
  ];
}

export function calculateDefiniteMathJsonLeaves(input: {
  evaluation: CalculusCoreEvaluation;
  body: unknown;
  variable: string;
  lower: number;
  upper: number;
}): CalculusOwnedMathJsonLeaf[] {
  const intervalLatex = `[${numberToLatex(Math.min(input.lower, input.upper))}, ${numberToLatex(Math.max(input.lower, input.upper))}]`;
  const leaves: CalculusOwnedMathJsonLeaf[] = [{
    canonicalLatex: intervalLatex,
    mathJson: ['List', Math.min(input.lower, input.upper), Math.max(input.lower, input.upper)],
    source: 'calculate.calculus:definite-interval',
  }];

  if (input.evaluation.exactLatex) {
    const antiderivative = directAntiderivative(input.body, input.variable);
    if (antiderivative !== undefined) {
      leaves.push({
        canonicalLatex: input.evaluation.exactLatex,
        mathJson: evaluateNumericNode(['Subtract',
          substitute(antiderivative, input.variable, input.upper),
          substitute(antiderivative, input.variable, input.lower),
        ]),
        source: 'calculate.calculus:definite-native-bounds',
      });
    }
  }

  if (input.evaluation.error && input.lower <= 0 && input.upper >= 0) {
    leaves.push(
      {
        canonicalLatex: `${input.variable}=0`,
        mathJson: ['Equal', input.variable, 0],
        source: 'calculate.calculus:definite-domain-hazard',
      },
      {
        canonicalLatex: input.variable,
        mathJson: input.variable,
        source: 'calculate.calculus:definite-domain-variable',
      },
    );
  }
  return leaves;
}

function isReciprocalVariable(body: unknown, variable: string) {
  return Array.isArray(body)
    && ((body[0] === 'Divide' && body[1] === 1 && body[2] === variable)
      || (body[0] === 'Power' && body[1] === variable && body[2] === -1));
}

function isSinc(body: unknown, variable: string) {
  return Array.isArray(body)
    && body[0] === 'Divide'
    && Array.isArray(body[1])
    && body[1][0] === 'Sin'
    && body[1][1] === variable
    && body[2] === variable;
}

function isRemovableQuadraticHole(body: unknown, variable: string) {
  return sameNode(body, [
    'Divide',
    ['Add', ['Power', variable, 2], -1],
    ['Add', variable, -1],
  ]);
}

function isLocalEquivalentProduct(body: unknown, variable: string) {
  return sameNode(body, [
    'Divide',
    ['Multiply', ['Sin', variable], ['Ln', ['Add', variable, 1]]],
    ['Power', variable, 2],
  ]);
}

function isSquareRootVariable(body: unknown, variable: string) {
  return sameNode(body, ['Sqrt', variable])
    || sameNode(body, ['Power', variable, ['Rational', 1, 2]]);
}

export function calculateFiniteLimitMathJsonLeaves(input: {
  evaluation: CalculusCoreEvaluation;
  body: unknown;
  variable: string;
  target: number;
  direction: LimitDirection;
}): CalculusOwnedMathJsonLeaf[] {
  const leaves: CalculusOwnedMathJsonLeaf[] = [];
  if (isSinc(input.body, input.variable) && input.target === 0) {
    leaves.push(
      {
        canonicalLatex: input.evaluation.exactLatex ?? '1',
        mathJson: 1,
        source: 'calculate.limit:known-sinc-answer',
      },
      {
        canonicalLatex: `u=${input.variable}`,
        mathJson: ['Equal', 'u', input.variable],
        source: 'calculate.limit:known-sinc-substitution',
      },
      {
        canonicalLatex: `\\lim_{${input.variable}\\to 0}u=0`,
        mathJson: ['Equal', ['Limit', ['Function', 'u', input.variable], 0], 0],
        source: 'calculate.limit:known-sinc-inner-limit',
      },
      {
        canonicalLatex: '\\frac{\\sin(u)}{u}\\to 1',
        mathJson: ['To', ['Divide', ['Sin', 'u'], 'u'], 1],
        source: 'calculate.limit:known-sinc-equivalent',
      },
    );
  }

  if (isReciprocalVariable(input.body, input.variable) && input.target === 0) {
    const left = input.direction === 'left';
    const answerLatex = left ? '-\\infty' : '\\infty';
    const answerMathJson = left ? ['Negate', 'PositiveInfinity'] : 'PositiveInfinity';
    const sideNode = left ? ['Superminus', input.target] : ['PseudoInverse', input.target];
    const sideLatex = left ? '-' : '+';
    const approachLatex = `${input.variable}\\to ${input.target}^{${sideLatex}}`;
    leaves.push(
      { canonicalLatex: '1', mathJson: 1, source: 'calculate.limit:reciprocal-coefficient' },
      { canonicalLatex: '-1', mathJson: -1, source: 'calculate.limit:reciprocal-scale' },
      { canonicalLatex: answerLatex, mathJson: answerMathJson, source: 'calculate.limit:reciprocal-answer' },
      { canonicalLatex: approachLatex, mathJson: ['To', input.variable, sideNode], source: 'calculate.limit:reciprocal-approach' },
      {
        canonicalLatex: `\\lim_{${approachLatex}} f(${input.variable})=${answerLatex}`,
        mathJson: ['Equal',
          ['Limit', ['Function', ['InvisibleOperator', 'f', ['Delimiter', input.variable]], input.variable], sideNode],
          answerMathJson,
        ],
        source: 'calculate.limit:reciprocal-calculation',
      },
    );
  }

  if (isRemovableQuadraticHole(input.body, input.variable) && input.target === 1) {
    leaves.push({
      canonicalLatex: input.evaluation.exactLatex ?? '2',
      mathJson: 2,
      source: 'calculate.limit:removable-quadratic-hole-answer',
    });
  }
  if (isLocalEquivalentProduct(input.body, input.variable) && input.target === 0) {
    leaves.push(
      { canonicalLatex: '1', mathJson: 1, source: 'calculate.limit:local-equivalent-answer' },
      { canonicalLatex: '0', mathJson: 0, source: 'calculate.limit:local-equivalent-target' },
    );
  }
  if (isSquareRootVariable(input.body, input.variable) && input.direction === 'left') {
    leaves.push(
      { canonicalLatex: input.variable, mathJson: input.variable, source: 'calculate.limit:domain-variable' },
      {
        canonicalLatex: `${input.variable}\\to ${input.target}^{-}`,
        mathJson: ['To', input.variable, ['Superminus', input.target]],
        source: 'calculate.limit:left-domain-approach',
      },
      {
        canonicalLatex: `${input.variable}\\ge 0`,
        mathJson: ['GreaterEqual', input.variable, 0],
        source: 'calculate.limit:real-domain-condition',
      },
    );
  }
  return leaves;
}

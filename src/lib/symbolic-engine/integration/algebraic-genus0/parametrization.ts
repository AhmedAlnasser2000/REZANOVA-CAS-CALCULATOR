import {
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  subtractExactScalars,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  simplifyMathJsonNodeOrOriginal,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import {
  getSymbolicPolynomialCoefficient,
  parseSymbolicPolynomial,
} from '../../primitives/symbolic-polynomial';
import { boxLatex } from '../../patterns';
import {
  algebraicGenus0FactsToExactSupplementLatex,
  algebraicGenus0SubstitutionDenominatorFact,
  buildAlgebraicGenus0RadicandFacts,
  type AlgebraicGenus0Fact,
} from './facts';

export type AlgebraicGenus0ParametrizationFamily =
  | 'affine-radical'
  | 'quadratic-plus'
  | 'quadratic-minus'
  | 'quadratic-outside';

export type AlgebraicGenus0ParametrizationStopReason =
  | 'constant-radicand'
  | 'exact-quadratic-required'
  | 'requires-algebraic-constant'
  | 'unsupported-quadratic-sign'
  | 'unsupported-radicand-degree'
  | 'unsupported-radicand-facts'
  | 'zero-leading-coefficient';

export type AlgebraicGenus0ParametrizationReady = {
  kind: 'success';
  family: AlgebraicGenus0ParametrizationFamily;
  variable: string;
  parameter: string;
  radicandLatex: string;
  variableParamNode: unknown;
  radicalParamNode: unknown;
  derivativeParamNode: unknown;
  variableParamLatex: string;
  radicalParamLatex: string;
  derivativeParamLatex: string;
  facts: AlgebraicGenus0Fact[];
  exactSupplementLatex: string[];
};

export type AlgebraicGenus0ParametrizationStop = {
  kind: 'stop';
  variable: string;
  parameter: string;
  reason: AlgebraicGenus0ParametrizationStopReason;
  detail: string;
};

export type AlgebraicGenus0Parametrization =
  | AlgebraicGenus0ParametrizationReady
  | AlgebraicGenus0ParametrizationStop;

const TWO: ExactScalar = { numerator: 2, denominator: 1 };

type ExactQuadraticParametrizationParts = {
  kind: 'parts';
  family: Exclude<AlgebraicGenus0ParametrizationFamily, 'affine-radical'>;
  variableParamNode: unknown;
  radicalParamNode: unknown;
  derivativeParamNode: unknown;
  denominatorNode: unknown;
};

function stop(
  variable: string,
  parameter: string,
  reason: AlgebraicGenus0ParametrizationStopReason,
  detail: string,
): AlgebraicGenus0ParametrizationStop {
  return { kind: 'stop', variable, parameter, reason, detail };
}

function chooseParameter(variable: string, requested?: string) {
  if (requested && requested !== variable) {
    return requested;
  }
  return variable === 't' ? 's' : 't';
}

function latex(node: unknown) {
  return boxLatex(simplifyMathJsonNodeOrOriginal(node));
}

function exactNode(value: ExactScalar) {
  return buildExactScalarNode(normalizeExactScalar(value));
}

function scalarSquareRoot(value: ExactScalar): ExactScalar | undefined {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator < 0 || normalized.denominator <= 0) {
    return undefined;
  }
  const numeratorRoot = Math.sqrt(normalized.numerator);
  const denominatorRoot = Math.sqrt(normalized.denominator);
  return Number.isInteger(numeratorRoot) && Number.isInteger(denominatorRoot)
    ? normalizeExactScalar({ numerator: numeratorRoot, denominator: denominatorRoot })
    : undefined;
}

function square(node: unknown) {
  return multiplyMathJsonNodes(node, node);
}

function power2(symbol: string) {
  return ['Power', symbol, 2];
}

function denominatorFact(node: unknown) {
  return algebraicGenus0SubstitutionDenominatorFact(latex(node));
}

function result(input: {
  family: AlgebraicGenus0ParametrizationFamily;
  variable: string;
  parameter: string;
  radicandLatex: string;
  variableParamNode: unknown;
  radicalParamNode: unknown;
  derivativeParamNode: unknown;
  facts: AlgebraicGenus0Fact[];
}): AlgebraicGenus0ParametrizationReady {
  return {
    kind: 'success',
    family: input.family,
    variable: input.variable,
    parameter: input.parameter,
    radicandLatex: input.radicandLatex,
    variableParamNode: simplifyMathJsonNodeOrOriginal(input.variableParamNode),
    radicalParamNode: simplifyMathJsonNodeOrOriginal(input.radicalParamNode),
    derivativeParamNode: simplifyMathJsonNodeOrOriginal(input.derivativeParamNode),
    variableParamLatex: latex(input.variableParamNode),
    radicalParamLatex: latex(input.radicalParamNode),
    derivativeParamLatex: latex(input.derivativeParamNode),
    facts: input.facts,
    exactSupplementLatex: algebraicGenus0FactsToExactSupplementLatex(input.facts),
  };
}

function affineParametrization(
  radicand: unknown,
  variable: string,
  parameter: string,
): AlgebraicGenus0Parametrization | undefined {
  const parsed = parseSymbolicPolynomial(radicand, variable, 1);
  if (parsed.kind !== 'success' || parsed.polynomial.degree !== 1) {
    return undefined;
  }

  const facts = buildAlgebraicGenus0RadicandFacts(radicand, variable);
  if (facts.kind !== 'success') {
    return stop(variable, parameter, 'unsupported-radicand-facts', 'The affine radicand facts could not be represented.');
  }

  const slope = getSymbolicPolynomialCoefficient(parsed.polynomial, 1);
  const offset = getSymbolicPolynomialCoefficient(parsed.polynomial, 0);
  const parameterSquared = power2(parameter);
  const variableParamNode = divideMathJsonNodes(
    subtractMathJsonNodes(parameterSquared, offset.node),
    slope.node,
  );
  const radicalParamNode = parameter;
  const derivativeParamNode = divideMathJsonNodes(
    multiplyMathJsonNodes(2, parameter),
    slope.node,
  );

  return result({
    family: 'affine-radical',
    variable,
    parameter,
    radicandLatex: facts.radicandLatex,
    variableParamNode,
    radicalParamNode,
    derivativeParamNode,
    facts: facts.globalFacts,
  });
}

function exactCompletedSquare(input: {
  radicand: unknown;
  variable: string;
  parameter: string;
}): ExactQuadraticParametrizationParts | AlgebraicGenus0ParametrizationStop | undefined {
  const polynomial = parseExactPolynomial(input.radicand, input.variable, 2);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 2) {
    return undefined;
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  if (a.numerator === 0) {
    return stop(input.variable, input.parameter, 'zero-leading-coefficient', 'The quadratic leading coefficient is zero.');
  }
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const c = getExactPolynomialCoefficient(polynomial, 0);
  const twoA = multiplyExactScalars(TWO, a);
  const shift = divideExactScalars(b, twoA);
  const normalizedConstant = divideExactScalars(c, a);
  if (!shift || !normalizedConstant) {
    return stop(input.variable, input.parameter, 'unsupported-quadratic-sign', 'The completed-square shift could not be represented.');
  }

  const completedConstant = subtractExactScalars(
    normalizedConstant,
    multiplyExactScalars(shift, shift),
  );
  const absA = a.numerator < 0 ? negateExactScalar(a) : a;
  const rootA = scalarSquareRoot(absA);
  if (!rootA) {
    return stop(
      input.variable,
      input.parameter,
      'requires-algebraic-constant',
      'The completed-square scale needs an algebraic constant outside this parametrization slice.',
    );
  }

  const rootANode = exactNode(rootA);
  const shiftNode = exactNode(shift);
  const t = input.parameter;
  const tSquared = power2(t);
  const signedRadius = multiplyExactScalars(a, completedConstant);
  const radius = signedRadius.numerator < 0
    ? negateExactScalar(signedRadius)
    : signedRadius;
  const rNode = exactNode(radius);
  const positiveR = exactScalarToNumber(radius);

  if (positiveR <= 0) {
    return stop(
      input.variable,
      input.parameter,
      'unsupported-quadratic-sign',
      'The completed-square radicand is outside the standard real genus-0 quadratic families.',
    );
  }

  if (a.numerator > 0 && exactScalarToNumber(completedConstant) > 0) {
    const uNode = divideMathJsonNodes(
      subtractMathJsonNodes(tSquared, rNode),
      multiplyMathJsonNodes(2, t),
    );
    const variableParamNode = subtractMathJsonNodes(
      divideMathJsonNodes(uNode, rootANode),
      shiftNode,
    );
    const radicalParamNode = divideMathJsonNodes(
      addMathJsonNodes(tSquared, rNode),
      multiplyMathJsonNodes(2, t),
    );
    const derivativeParamNode = divideMathJsonNodes(
      addMathJsonNodes(tSquared, rNode),
      multiplyMathJsonNodes(2, rootANode, square(t)),
    );
    return { kind: 'parts', family: 'quadratic-plus' as const, variableParamNode, radicalParamNode, derivativeParamNode, denominatorNode: t };
  }

  if (a.numerator > 0 && exactScalarToNumber(completedConstant) < 0) {
    const uNode = divideMathJsonNodes(
      addMathJsonNodes(tSquared, rNode),
      multiplyMathJsonNodes(2, t),
    );
    const variableParamNode = subtractMathJsonNodes(
      divideMathJsonNodes(uNode, rootANode),
      shiftNode,
    );
    const radicalParamNode = divideMathJsonNodes(
      subtractMathJsonNodes(tSquared, rNode),
      multiplyMathJsonNodes(2, t),
    );
    const derivativeParamNode = divideMathJsonNodes(
      subtractMathJsonNodes(tSquared, rNode),
      multiplyMathJsonNodes(2, rootANode, square(t)),
    );
    return { kind: 'parts', family: 'quadratic-outside' as const, variableParamNode, radicalParamNode, derivativeParamNode, denominatorNode: t };
  }

  if (a.numerator < 0 && exactScalarToNumber(completedConstant) < 0) {
    const rootR = scalarSquareRoot(rNodeToScalar(rNode));
    if (!rootR) {
      return stop(
        input.variable,
        input.parameter,
        'requires-algebraic-constant',
        'The circle-type quadratic parametrization needs a square root of the completed-square radius.',
      );
    }
    const rootRNode = exactNode(rootR);
    const denominator = addMathJsonNodes(1, tSquared);
    const uNode = divideMathJsonNodes(
      multiplyMathJsonNodes(2, rootRNode, t),
      denominator,
    );
    const variableParamNode = subtractMathJsonNodes(
      divideMathJsonNodes(uNode, rootANode),
      shiftNode,
    );
    const radicalParamNode = divideMathJsonNodes(
      multiplyMathJsonNodes(rootRNode, subtractMathJsonNodes(1, tSquared)),
      denominator,
    );
    const derivativeParamNode = divideMathJsonNodes(
      multiplyMathJsonNodes(2, rootRNode, subtractMathJsonNodes(1, tSquared)),
      multiplyMathJsonNodes(rootANode, square(denominator)),
    );
    return { kind: 'parts', family: 'quadratic-minus' as const, variableParamNode, radicalParamNode, derivativeParamNode, denominatorNode: denominator };
  }

  return stop(
    input.variable,
    input.parameter,
    'unsupported-quadratic-sign',
    'The completed-square signs are outside the standard real genus-0 quadratic parametrizations.',
  );
}

function rNodeToScalar(node: unknown): ExactScalar {
  const scalar = readExactScalarNode(node);
  if (!scalar) {
    throw new Error('expected exact scalar node');
  }
  return scalar;
}

function quadraticParametrization(
  radicand: unknown,
  variable: string,
  parameter: string,
): AlgebraicGenus0Parametrization | undefined {
  const facts = buildAlgebraicGenus0RadicandFacts(radicand, variable);
  if (facts.kind === 'success' && facts.degree !== 2) {
    return undefined;
  }
  if (facts.kind !== 'success') {
    return stop(variable, parameter, 'unsupported-radicand-facts', 'The quadratic radicand facts could not be represented.');
  }

  const parametrized = exactCompletedSquare({ radicand, variable, parameter });
  if (!parametrized) {
    return undefined;
  }
  if (parametrized.kind === 'stop') {
    return parametrized;
  }

  return result({
    family: parametrized.family,
    variable,
    parameter,
    radicandLatex: facts.radicandLatex,
    variableParamNode: parametrized.variableParamNode,
    radicalParamNode: parametrized.radicalParamNode,
    derivativeParamNode: parametrized.derivativeParamNode,
    facts: [
      ...facts.globalFacts,
      denominatorFact(parametrized.denominatorNode),
    ],
  });
}

export function parametrizeAlgebraicGenus0Radicand(
  radicand: unknown,
  variable = 'x',
  requestedParameter?: string,
): AlgebraicGenus0Parametrization {
  const parameter = chooseParameter(variable, requestedParameter);
  const facts = buildAlgebraicGenus0RadicandFacts(radicand, variable);
  if (facts.kind !== 'success') {
    return stop(variable, parameter, 'unsupported-radicand-facts', `The radicand facts stopped with ${facts.reason}.`);
  }

  if (facts.degree === 1) {
    return affineParametrization(radicand, variable, parameter)
      ?? stop(variable, parameter, 'unsupported-radicand-degree', 'The affine radicand could not be parametrized.');
  }

  return quadraticParametrization(radicand, variable, parameter)
    ?? stop(variable, parameter, 'exact-quadratic-required', 'This parametrization slice requires an exact-rational completed-square quadratic.');
}

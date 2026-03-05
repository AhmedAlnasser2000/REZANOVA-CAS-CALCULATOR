import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  flattenAdd,
  flattenMultiply,
  isNodeArray,
} from '../symbolic-engine/patterns';
import { normalizeAst } from '../symbolic-engine/normalize';
import {
  exactRatioLatex,
  parseSupportedRatio,
} from './angles';
import {
  matchAffineVariableArgument,
  matchTrigCall,
  sameTrigArgument,
  type TrigFunctionKind,
} from './normalize';
import { formatNumber } from '../format';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

export type BoundedTrigEquationMatch = {
  kind: TrigFunctionKind;
  argument: {
    coefficient: number;
    offsetLatex: string;
    argumentLatex: string;
  };
  scale: number;
  shift: number;
  rhsLatex: string;
  rhsValue: number;
};

export type BoundedMixedLinearTrigEquationMatch = {
  argument: {
    coefficient: number;
    offsetLatex: string;
    argumentLatex: string;
  };
  sinCoefficient: number;
  cosCoefficient: number;
  rhsLatex: string;
  rhsValue: number;
};

type TrigCall = NonNullable<ReturnType<typeof matchTrigCall>>;
type ScaledTrigTermMatch = {
  trig: TrigCall;
  scale: number;
};

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function numericFromNode(node: unknown): number | null {
  const parsedRatio = parseSupportedRatio(boxLatex(node));
  if (parsedRatio !== null) {
    return parsedRatio;
  }

  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }

  try {
    const numeric = ce.box(node as Parameters<typeof ce.box>[0]).N?.();
    const json = numeric?.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (json && typeof json === 'object' && 'num' in json) {
      const value = Number((json as { num: string }).num);
      return Number.isFinite(value) ? value : null;
    }
  } catch {
    return null;
  }

  return null;
}

function approximateFraction(value: number, maxDenominator = 360) {
  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < EPSILON) {
      return { numerator, denominator };
    }
  }

  return undefined;
}

function formatExactValueLatex(value: number) {
  const exact = exactRatioLatex(value);
  if (exact) {
    return exact;
  }

  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < EPSILON) {
    return `${rounded}`;
  }

  const ratio = approximateFraction(value);
  if (ratio) {
    const sign = ratio.numerator < 0 ? '-' : '';
    const numerator = Math.abs(ratio.numerator);
    const denominator = Math.abs(ratio.denominator);
    if (denominator === 1) {
      return `${ratio.numerator}`;
    }
    return `${sign}\\frac{${numerator}}{${denominator}}`;
  }

  return formatNumber(value);
}

function parseScaledTrigTerm(node: unknown): ScaledTrigTermMatch | null {
  const normalized = normalizeAst(node);
  const trig = matchTrigCall(normalized);
  if (trig) {
    return { trig, scale: 1 };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const inner: ScaledTrigTermMatch | null = parseScaledTrigTerm(normalized[1]);
    return inner ? { ...inner, scale: -inner.scale } : null;
  }

  if (!isNodeArray(normalized) || normalized[0] !== 'Multiply') {
    return null;
  }

  const factors = flattenMultiply(normalized);
  let trigFactor: ReturnType<typeof matchTrigCall> = null;
  let scale = 1;

  for (const factor of factors) {
    const numeric = numericFromNode(factor);
    if (numeric !== null) {
      scale *= numeric;
      continue;
    }

    const trig = matchTrigCall(factor);
    if (!trig || trigFactor) {
      return null;
    }
    trigFactor = trig;
  }

  if (!trigFactor || Math.abs(scale) < EPSILON) {
    return null;
  }

  return {
    trig: trigFactor,
    scale,
  };
}

function parseLinearTrigSide(node: unknown) {
  const normalized = normalizeAst(node);
  const direct = parseScaledTrigTerm(normalized);
  if (direct) {
    return { ...direct, shift: 0 };
  }

  const terms = flattenAdd(normalized);
  if (terms.length !== 2) {
    return null;
  }

  const first = parseScaledTrigTerm(terms[0]);
  const second = parseScaledTrigTerm(terms[1]);
  const firstNumeric = numericFromNode(terms[0]);
  const secondNumeric = numericFromNode(terms[1]);

  if (first && secondNumeric !== null) {
    return { ...first, shift: secondNumeric };
  }

  if (second && firstNumeric !== null) {
    return { ...second, shift: firstNumeric };
  }

  return null;
}

function buildBoundedSingleCallMatch(
  matchedSide: ReturnType<typeof parseLinearTrigSide>,
  constantSide: number,
): BoundedTrigEquationMatch | null {
  if (!matchedSide) {
    return null;
  }

  if (Math.abs(matchedSide.scale) < EPSILON) {
    return null;
  }

  const argument = matchAffineVariableArgument(matchedSide.trig.argument, { maxCoefficient: 6 });
  if (!argument) {
    return null;
  }

  const rhsValue = (constantSide - matchedSide.shift) / matchedSide.scale;
  if (!Number.isFinite(rhsValue)) {
    return null;
  }

  return {
    kind: matchedSide.trig.kind,
    argument: {
      coefficient: argument.coefficient,
      offsetLatex: argument.offsetLatex,
      argumentLatex: argument.argumentLatex,
    },
    scale: matchedSide.scale,
    shift: matchedSide.shift,
    rhsLatex: formatExactValueLatex(rhsValue),
    rhsValue,
  };
}

function parseMixedLinearTrigSide(node: unknown) {
  const terms = flattenAdd(normalizeAst(node));
  if (terms.length !== 2 && terms.length !== 3) {
    return null;
  }

  let sinTerm: ReturnType<typeof parseScaledTrigTerm> | null = null;
  let cosTerm: ReturnType<typeof parseScaledTrigTerm> | null = null;
  let constant = 0;

  for (const term of terms) {
    const numeric = numericFromNode(term);
    if (numeric !== null) {
      constant += numeric;
      continue;
    }

    const parsed = parseScaledTrigTerm(term);
    if (!parsed) {
      return null;
    }

    if (parsed.trig.kind === 'sin') {
      if (sinTerm) {
        return null;
      }
      sinTerm = parsed;
      continue;
    }

    if (parsed.trig.kind === 'cos') {
      if (cosTerm) {
        return null;
      }
      cosTerm = parsed;
      continue;
    }

    return null;
  }

  if (!sinTerm || !cosTerm || !sameTrigArgument(sinTerm.trig, cosTerm.trig)) {
    return null;
  }

  const argument = matchAffineVariableArgument(sinTerm.trig.argument, { maxCoefficient: 6 });
  if (!argument) {
    return null;
  }

  return {
    argument: {
      coefficient: argument.coefficient,
      offsetLatex: argument.offsetLatex,
      argumentLatex: argument.argumentLatex,
    },
    sinCoefficient: sinTerm.scale,
    cosCoefficient: cosTerm.scale,
    constant,
  };
}

function buildBoundedMixedLinearMatch(
  matchedSide: ReturnType<typeof parseMixedLinearTrigSide>,
  constantSide: number,
): BoundedMixedLinearTrigEquationMatch | null {
  if (!matchedSide) {
    return null;
  }

  if (
    Math.abs(matchedSide.sinCoefficient) < EPSILON
    || Math.abs(matchedSide.cosCoefficient) < EPSILON
  ) {
    return null;
  }

  const rhsValue = constantSide - matchedSide.constant;
  return {
    argument: matchedSide.argument,
    sinCoefficient: matchedSide.sinCoefficient,
    cosCoefficient: matchedSide.cosCoefficient,
    rhsValue,
    rhsLatex: formatExactValueLatex(rhsValue),
  };
}

export function matchBoundedTrigEquation(equationLatex: string): BoundedTrigEquationMatch | null {
  const parsed = normalizeAst(ce.parse(equationLatex).json);
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const [, left, right] = parsed;
  const leftLinear = parseLinearTrigSide(left);
  const rightConstant = numericFromNode(right);
  if (leftLinear && rightConstant !== null) {
    const matched = buildBoundedSingleCallMatch(leftLinear, rightConstant);
    if (matched) {
      return matched;
    }
  }

  const rightLinear = parseLinearTrigSide(right);
  const leftConstant = numericFromNode(left);
  if (rightLinear && leftConstant !== null) {
    const matched = buildBoundedSingleCallMatch(rightLinear, leftConstant);
    if (matched) {
      return matched;
    }
  }

  return null;
}

export function matchBoundedMixedLinearTrigEquation(
  equationLatex: string,
): BoundedMixedLinearTrigEquationMatch | null {
  const parsed = normalizeAst(ce.parse(equationLatex).json);
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const [, left, right] = parsed;
  const leftMixed = parseMixedLinearTrigSide(left);
  const rightConstant = numericFromNode(right);
  if (leftMixed && rightConstant !== null) {
    return buildBoundedMixedLinearMatch(leftMixed, rightConstant);
  }

  const rightMixed = parseMixedLinearTrigSide(right);
  const leftConstant = numericFromNode(left);
  if (rightMixed && leftConstant !== null) {
    return buildBoundedMixedLinearMatch(rightMixed, leftConstant);
  }

  return null;
}

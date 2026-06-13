import { normalizeRelationOperatorLatex } from '../input/input-canonicalization';
import type {
  AngleUnit,
  DisplayOutcome,
  EquationAnswerMode,
  EquationDomainIntent,
  OutputStyle,
} from '../../types/calculator';
import {
  DEFAULT_MAX_REDUCTION_DEPTH,
  type FiniteInequalityResult,
  type InequalityRelation,
  type InternalInequalityResult,
  type PeriodicInequalityResult,
} from './inequality/types';
import {
  isTopLevelInequalityLatex,
  resolveTarget,
  reverseRelation,
  topLevelInequality,
} from './inequality/relation';
import {
  polynomialAgainstNumericBound,
  polynomialInequality,
  rationalAgainstNumericBound,
  rationalInequality,
  solveAffineAgainstNumericBound,
} from './inequality/finite';
import { peelNumericShellComparison } from './inequality/shells';
import { absoluteInequality, logExpInequality, radicalInequality } from './inequality/wrappers';
import { trigInequality } from './inequality/periodic-trig';
import {
  buildSuccessOutcome,
  inequalityAnswerModeGuidanceOutcome,
  unsupportedInequalityOutcome,
} from './inequality/outcome';

function solveFiniteNode(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
}): FiniteInequalityResult | null {
  const peeledShell = peelNumericShellComparison(input);
  if (peeledShell) {
    const reduced = solveFiniteNode({
      left: peeledShell.left,
      right: peeledShell.right,
      relation: peeledShell.relation,
      target: input.target,
      depth: input.depth,
    });
    if (reduced) {
      return {
        ...reduced,
        lines: [
          peeledShell.line,
          ...reduced.lines,
        ],
      };
    }
  }

  const affineLeft = solveAffineAgainstNumericBound(input);
  if (affineLeft) {
    return affineLeft;
  }
  const affineRight = solveAffineAgainstNumericBound({
    left: input.right,
    right: input.left,
    relation: reverseRelation(input.relation),
    target: input.target,
  });
  if (affineRight) {
    return affineRight;
  }

  const polynomialNumeric = polynomialAgainstNumericBound(
    input.left,
    input.right,
    input.relation,
    input.target,
  );
  if (polynomialNumeric) {
    return polynomialNumeric;
  }
  const reversedPolynomialNumeric = polynomialAgainstNumericBound(
    input.right,
    input.left,
    reverseRelation(input.relation),
    input.target,
  );
  if (reversedPolynomialNumeric) {
    return reversedPolynomialNumeric;
  }

  const polynomial = polynomialInequality(input.left, input.right, input.relation, input.target);
  if (polynomial) {
    return polynomial;
  }
  const rational = rationalInequality(input.left, input.right, input.relation, input.target);
  if (rational) {
    return rational;
  }
  const rationalNumeric = rationalAgainstNumericBound(
    input.left,
    input.right,
    input.relation,
    input.target,
  );
  if (rationalNumeric) {
    return rationalNumeric;
  }
  const reversedRationalNumeric = rationalAgainstNumericBound(
    input.right,
    input.left,
    reverseRelation(input.relation),
    input.target,
  );
  if (reversedRationalNumeric) {
    return reversedRationalNumeric;
  }
  if (input.depth <= 0) {
    return null;
  }

  const recursiveInput = { ...input, solveFiniteNode };
  return absoluteInequality(recursiveInput)
    ?? radicalInequality(recursiveInput)
    ?? logExpInequality(recursiveInput);
}

function solveComparison(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}): FiniteInequalityResult | PeriodicInequalityResult | null {
  const peeledShell = peelNumericShellComparison(input);
  if (peeledShell) {
    const reduced = solveComparison({
      left: peeledShell.left,
      right: peeledShell.right,
      relation: peeledShell.relation,
      target: input.target,
      depth: input.depth,
      angleUnit: input.angleUnit,
      outputStyle: input.outputStyle,
    });
    if (reduced) {
      return {
        ...reduced,
        lines: [
          peeledShell.line,
          ...reduced.lines,
        ],
      };
    }
  }

  const finite = solveFiniteNode(input);
  if (finite) {
    return finite;
  }

  return trigInequality({
    left: input.left,
    right: input.right,
    relation: input.relation,
    target: input.target,
    angleUnit: input.angleUnit,
    outputStyle: input.outputStyle,
  });
}

function solveInternal(input: {
  equationLatex: string;
  target?: string | null;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}): InternalInequalityResult {
  const equationLatex = normalizeRelationOperatorLatex(input.equationLatex);
  const top = topLevelInequality(equationLatex);
  if (!top) {
    return { kind: 'stop', reason: 'The inequality could not be parsed as a supported top-level relation.' };
  }
  const target = resolveTarget(input.target, top.left, top.right);
  if (!target) {
    return { kind: 'stop', reason: 'The guarded inequality route requires exactly one solve target and no symbolic parameters.' };
  }

  const solved = solveComparison({
    left: top.left,
    right: top.right,
    relation: top.relation,
    target,
    depth: DEFAULT_MAX_REDUCTION_DEPTH,
    angleUnit: input.angleUnit,
    outputStyle: input.outputStyle,
  });
  if (solved) {
    return solved;
  }

  return {
    kind: 'stop',
    reason: 'This inequality is outside the guarded real inequality engine: unsupported rational/radical/log/exp/trig shape, symbolic parameter, chained relation, or composition depth.',
  };
}

export { isTopLevelInequalityLatex, inequalityAnswerModeGuidanceOutcome };

export function solveBoundedLinearInequality(input: {
  equationLatex: string;
  target?: string | null;
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  angleUnit?: AngleUnit;
  outputStyle?: OutputStyle;
}): DisplayOutcome {
  if (input.answerMode !== 'exact') {
    return inequalityAnswerModeGuidanceOutcome({
      answerMode: input.answerMode,
      equationDomainIntent: input.equationDomainIntent,
    });
  }

  const result = solveInternal({
    equationLatex: input.equationLatex,
    target: input.target,
    angleUnit: input.angleUnit ?? 'rad',
    outputStyle: input.outputStyle ?? 'exact',
  });
  if (result.kind === 'stop') {
    return unsupportedInequalityOutcome({
      ...input,
      reason: result.reason,
    });
  }

  return buildSuccessOutcome({
    result,
    equationDomainIntent: input.equationDomainIntent,
  });
}

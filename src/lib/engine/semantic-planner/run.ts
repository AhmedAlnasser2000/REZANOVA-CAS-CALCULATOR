import { simplifyNode } from '../../symbolic-engine/differentiation';
import { canonicalizeMathInput } from '../../input/input-canonicalization';
import type {
  CalculusDerivativeStrategy,
  PlannerContext,
  PlannerOutcome,
  PlannerStep,
  SerializableMathJson,
} from '../../../types/calculator';
import {
  box,
  compactRepeatedFactors,
  parseLatex,
  reduceEquationSide,
  reduceNumericOperators,
} from './canonicalization';
import { replaceDifferentialSegments } from './derivative-routing';
import { splitTopLevelEquation } from './latex-segments';
import { attachCanonicalizationSteps, plannerBadgesFromSteps } from './badges';

export function planMathExecution(
  latex: string,
  context: PlannerContext,
): PlannerOutcome {
  const canonicalized = canonicalizeMathInput(latex, {
    mode: context.mode,
    screenHint: context.screenHint,
  });

  if (!canonicalized.ok) {
    return {
      kind: 'blocked',
      originalLatex: latex,
      canonicalLatex: latex,
      badges: ['Hard Stop'],
      steps: [{
        kind: 'unsupported-node',
        nodeKind: 'canonicalization',
        message: canonicalized.error,
      }],
      error: canonicalized.error,
    };
  }

  const steps: PlannerStep[] = [];
  attachCanonicalizationSteps(canonicalized.canonicalLatex, steps, canonicalized.originalLatex.trim());

  if (context.intent === 'equation-solve') {
    const split = splitTopLevelEquation(canonicalized.canonicalLatex);
    if (!split) {
      return {
        kind: 'blocked',
        originalLatex: latex,
        canonicalLatex: canonicalized.canonicalLatex,
        badges: ['Hard Stop'],
        steps: [
          ...steps,
          {
            kind: 'unsupported-node',
            nodeKind: 'relation',
            message: 'Enter an equation containing x.',
          },
        ],
        error: 'Enter an equation containing x.',
      };
    }

    if (!split.left || !split.right) {
      return {
        kind: 'blocked',
        originalLatex: latex,
        canonicalLatex: canonicalized.canonicalLatex,
        badges: ['Hard Stop'],
        steps: [
          ...steps,
          {
            kind: 'unsupported-node',
            nodeKind: 'relation',
            message: 'Enter an equation containing x.',
          },
        ],
        error: 'Enter an equation containing x.',
      };
    }

    const left = reduceEquationSide(split.left, steps);
    if (!left.ok) {
      return {
        kind: 'blocked',
        originalLatex: latex,
        canonicalLatex: canonicalized.canonicalLatex,
        badges: ['Hard Stop'],
        steps: [
          ...steps,
          {
            kind: 'unsupported-node',
            nodeKind: 'left-side',
            message: left.error,
          },
        ],
        error: left.error,
      };
    }

    const right = reduceEquationSide(split.right, steps);
    if (!right.ok) {
      return {
        kind: 'blocked',
        originalLatex: latex,
        canonicalLatex: canonicalized.canonicalLatex,
        badges: ['Hard Stop'],
        steps: [
          ...steps,
          {
            kind: 'unsupported-node',
            nodeKind: 'right-side',
            message: right.error,
          },
        ],
        error: right.error,
      };
    }

    const resolvedMathJson = ['Equal', left.node, right.node] as SerializableMathJson;
    const resolvedLatex = box(resolvedMathJson).latex;
    if (resolvedLatex !== canonicalized.canonicalLatex) {
      steps.push({
        kind: 'normalize-equation',
        before: canonicalized.canonicalLatex,
        after: resolvedLatex,
      });
    }

    return {
      kind: 'ready',
      originalLatex: latex,
      canonicalLatex: canonicalized.canonicalLatex,
      resolvedLatex,
      resolvedMathJson,
      badges: plannerBadgesFromSteps(latex, canonicalized.canonicalLatex, steps),
      steps,
    };
  }

  const derivativeStrategies = new Set<CalculusDerivativeStrategy>();
  const derivativeReduced = replaceDifferentialSegments(canonicalized.canonicalLatex, steps, derivativeStrategies);
  if (!derivativeReduced.ok) {
    return {
      kind: 'blocked',
      originalLatex: latex,
      canonicalLatex: canonicalized.canonicalLatex,
      badges: ['Hard Stop'],
      steps: [
        ...steps,
        {
          kind: 'unsupported-node',
          nodeKind: 'differential',
          message: derivativeReduced.error,
        },
      ],
      error: derivativeReduced.error,
    };
  }

  try {
    const parsed = parseLatex(derivativeReduced.latex);
    const compacted = compactRepeatedFactors(parsed.json, steps);
    const numericReduced = reduceNumericOperators(compacted, steps);
    const resolvedMathJson = simplifyNode(numericReduced) as SerializableMathJson;
    const resolvedLatex = box(resolvedMathJson).latex;

    return {
      kind: 'ready',
      originalLatex: latex,
      canonicalLatex: canonicalized.canonicalLatex,
      resolvedLatex,
      resolvedMathJson,
      badges: plannerBadgesFromSteps(latex, canonicalized.canonicalLatex, steps),
      steps,
      derivativeStrategies: derivativeReduced.derivativeStrategies.length > 0
        ? derivativeReduced.derivativeStrategies
        : undefined,
    };
  } catch {
    return {
      kind: 'blocked',
      originalLatex: latex,
      canonicalLatex: canonicalized.canonicalLatex,
      badges: ['Hard Stop'],
      steps: [
        ...steps,
        {
          kind: 'unsupported-node',
          nodeKind: 'parse',
          message: 'Expression could not be parsed or evaluated.',
        },
      ],
      error: 'Expression could not be parsed or evaluated.',
    };
  }
}

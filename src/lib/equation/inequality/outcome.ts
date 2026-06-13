import { inequalitySetToLatex, inequalitySetToText, periodicInequalitySetToLatex, periodicInequalitySetToText } from '../../algebra/inequality-core';
import type {
  DisplayDetailSection,
  DisplayOutcome,
  EquationAnswerMode,
  EquationDomainIntent,
} from '../../../types/calculator';
import { dedupeStrings, latexText } from './relation';
import type { FiniteInequalityResult, PeriodicInequalityResult } from './types';

function unsupportedInequalityOutcome(input: {
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  reason?: string;
}): DisplayOutcome {
  const lines = [
    'The guarded real inequality route supports one-variable inequalities with exact numeric constants: polynomial, factorable rational, textbook abs/radical, monotone log/exp, finite composition through 4 layers, direct affine trig, and representable two-layer trig cases, plus abs-affine periodic preimages.',
    input.reason ?? 'This inequality is outside the guarded real inequality engine.',
  ];
  if (input.equationDomainIntent === 'complex') {
    lines.push('Complex intent is enabled, but ordered inequalities are solved over the real line.');
  }

  return {
    kind: 'error',
    title: 'Inequality',
    error: 'This inequality is outside the supported guarded real inequality families.',
    warnings: [],
    answerMode: input.answerMode,
    answerDomain: 'conditional-real',
    solutionKind: 'condition-fact-only-stop',
    detailSections: [
      {
        title: 'Inequality Route',
        lines,
      },
      {
        title: 'What To Try',
        lines: [
          'Use Exact mode with one variable and exact numeric constants.',
          'Use an = equation when you need symbolic solving, Approximate, or Isolate.',
        ],
      },
    ],
  };
}

function inequalityAnswerModeGuidanceOutcome(input: {
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
}): DisplayOutcome {
  const modeLabel = input.answerMode === 'approximate' ? 'Approximate' : 'Isolate';
  return {
    kind: 'error',
    title: 'Inequality',
    error: `${modeLabel} answer mode does not solve inequalities.`,
    warnings: [],
    answerMode: input.answerMode,
    answerDomain: 'conditional-real',
    solutionKind: 'condition-fact-only-stop',
    detailSections: [
      {
        title: 'Answer Mode',
        lines: [
          `Answer mode: ${modeLabel}.`,
          'Use Exact mode for guarded real interval inequality sets.',
        ],
      },
      {
        title: 'Real Order',
        lines: [
          input.equationDomainIntent === 'complex'
            ? 'Complex intent is enabled, but ordered inequalities are solved over the real line.'
            : 'Ordered inequalities are solved over the real line.',
        ],
      },
    ],
  };
}

function buildSuccessOutcome(input: {
  result: FiniteInequalityResult | PeriodicInequalityResult;
  equationDomainIntent: EquationDomainIntent;
}): DisplayOutcome {
  const exactLatex = input.result.kind === 'finite'
    ? inequalitySetToLatex(input.result.set)
    : input.result.exactLatexOverride ?? periodicInequalitySetToLatex(input.result.set);
  const resultText = input.result.kind === 'finite'
    ? inequalitySetToText(input.result.set)
    : input.result.readbackTextOverride ?? periodicInequalitySetToText(input.result.set);
  const realOrderLatex = input.equationDomainIntent === 'complex'
    ? latexText('Complex intent is enabled; ordered inequalities are solved over the real line.')
    : latexText('Ordered inequalities are solved over the real line.');
  const validWhenLatex = dedupeStrings([
    ...input.result.validWhenLatex,
    realOrderLatex,
  ]);

  const detailSections: DisplayDetailSection[] = [
    {
      title: input.result.kind === 'periodic' ? 'Periodic Inequality Route' : 'Inequality Route',
      lines: [
        'Answer mode: Exact.',
        ...input.result.lines,
      ],
    },
  ];
  if (input.result.kind === 'periodic') {
    detailSections.push({
      title: 'Periodic Readback',
      lines: [
        `${resultText}.`,
      ],
    });
  }
  if (input.result.proofDetails.length > 0) {
    detailSections.push({
      title: 'Inequality Proof',
      lines: input.result.proofDetails,
    });
  }

  return {
    kind: 'success',
    title: 'Inequality',
    exactLatex,
    approxText: input.result.kind === 'periodic' ? input.result.approxText : undefined,
    warnings: [],
    answerMode: 'exact',
    answerDomain: 'conditional-real',
    solutionKind: 'inequality-solution-set',
    exactSupplementLatex: validWhenLatex,
    detailSections,
  };
}


export { buildSuccessOutcome, inequalityAnswerModeGuidanceOutcome, unsupportedInequalityOutcome };

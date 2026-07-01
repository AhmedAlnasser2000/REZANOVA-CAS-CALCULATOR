import type {
  AngleUnit,
  DisplayDetailSection,
  DisplayOutcome,
  EquationDomainIntent,
  NumericSolveInterval,
} from '../../../types/calculator';
import { buildNumericConfidenceSection } from '../../equation/numeric-confidence-readback';
import { classifyEquationNumericShape } from './numeric-shape-classifier';
import { hardDomainFactLines } from './numeric-search-diagnostics';

const UNSUPPORTED_EXACT_SYMBOLIC_FAMILY_ERROR =
  'This equation is outside the supported exact symbolic solve families.';
const NUMERIC_METHOD_PERIODIC_INTERVAL = 'Real periodic interval numeric solve';

function isPeriodicFallbackMiss(outcome: DisplayOutcome) {
  return outcome.kind === 'error'
    && (
      outcome.error === UNSUPPORTED_EXACT_SYMBOLIC_FAMILY_ERROR
      || (
        outcome.solveBadges?.includes('Periodic Family')
        && outcome.error.includes('Use Numeric Solve')
      )
      || (
        outcome.error.startsWith('This recognized periodic family reduces to ')
        && outcome.error.includes('Use Numeric Solve')
      )
    );
}

function uniqueLines(lines: readonly string[]) {
  return [...new Set(lines.filter((line) => line.trim().length > 0))];
}

export function tryRealPeriodicIntervalNumericFallback(input: {
  equationLatex: string;
  equationSolveTarget: string;
  angleUnit: AngleUnit;
  equationDomainIntent: EquationDomainIntent;
  numericInterval?: NumericSolveInterval;
  sharedOutcome: DisplayOutcome;
}): DisplayOutcome | undefined {
  if (
    !isPeriodicFallbackMiss(input.sharedOutcome)
    || input.equationDomainIntent !== 'real'
    || input.numericInterval
  ) {
    return undefined;
  }

  const classification = classifyEquationNumericShape({
    equationLatex: input.equationLatex,
    equationSolveTarget: input.equationSolveTarget,
    angleUnit: input.angleUnit,
  });
  if (
    !classification.numericReady
    || !classification.selectedTarget
    || classification.route !== 'periodic-interval'
  ) {
    return undefined;
  }

  const factLines = uniqueLines(hardDomainFactLines(classification.domainFacts));
  const routeEvidence = uniqueLines([
    ...classification.routeEvidence,
    ...classification.domainFacts
      .filter((fact) => fact.kind === 'periodic-carrier')
      .map((fact) => fact.message),
  ]);
  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Periodic Numeric Solve',
      lines: [
        'Periodic equations can have infinitely many roots, so numeric fallback needs a finite real interval.',
        'Exact symbolic periodic routes still run first when they can describe the branch family.',
        'No default interval was searched.',
      ],
    },
  ];
  const confidenceSection = buildNumericConfidenceSection([
    'Search may be incomplete until a finite real interval is chosen.',
    'All roots in this interval can be reported after Numeric Interval Solve runs.',
  ]);
  if (confidenceSection) {
    detailSections.push(confidenceSection);
  }

  const reducedFamilyLatex =
    input.sharedOutcome.kind === 'success' ? input.sharedOutcome.exactLatex : undefined;

  if (reducedFamilyLatex) {
    detailSections.push({
      title: 'Reduced Periodic Family',
      lines: [
        reducedFamilyLatex,
        'This reduced family is route evidence only; it is not being presented as a complete solved answer.',
      ],
    });
  }

  if (routeEvidence.length > 0) {
    detailSections.push({
      title: 'Numeric Route Evidence',
      lines: routeEvidence,
    });
  }

  if (factLines.length > 0) {
    detailSections.push({
      title: 'Domain and Exclusions',
      lines: factLines,
    });
  }

  detailSections.push({
    title: 'What To Try',
    lines: [
      'Open Numeric Interval Solve, choose finite real bounds, then run again.',
      'The numeric roots returned from that route are local to the chosen interval only.',
    ],
  });

  return {
    kind: 'error',
    title: 'Solve',
    error: 'Periodic numeric solving needs a real interval before it can enumerate local roots.',
    warnings: [],
    solutionKind: 'approximate-numeric',
    answerDomain: 'real',
    solveBadges: ['Numeric Interval', 'Candidate Checked'],
    numericMethod: NUMERIC_METHOD_PERIODIC_INTERVAL,
    detailSections,
  };
}

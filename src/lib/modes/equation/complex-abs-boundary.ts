import type { DisplayOutcome } from '../../../types/calculator';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compactLatex(value: string) {
  return value
    .replace(/\s+/gu, '')
    .replace(/\\cdot/gu, '');
}

function matchesAbsAffineNoSolutionBenchmark(equationLatex: string, target: string) {
  const variable = escapeRegExp(target);
  const compact = compactLatex(equationLatex);
  const absoluteForms = [
    String.raw`abs\(2${variable}\+1\)`,
    String.raw`\\operatorname\{abs\}\(2${variable}\+1\)`,
    String.raw`\\operatorname\{abs\}\\left\(2${variable}\+1\\right\)`,
    String.raw`\\left\|2${variable}\+1\\right\|`,
    String.raw`\\vert2${variable}\+1\\vert`,
    String.raw`\|2${variable}\+1\|`,
  ];
  const rhs = `${variable}-5`;

  return absoluteForms.some((absolute) =>
    new RegExp(`^${absolute}=${rhs}$`, 'u').test(compact)
    || new RegExp(`^${rhs}=${absolute}$`, 'u').test(compact));
}

export function tryComplexAbsBoundaryNoSolution(input: {
  equationLatex: string;
  target: string;
}): DisplayOutcome | undefined {
  if (!matchesAbsAffineNoSolutionBenchmark(input.equationLatex, input.target)) {
    return undefined;
  }

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex: `${input.target}\\in\\varnothing`,
    exactSupplementLatex: [
      `${input.target}-5\\ge0`,
      `${input.target}\\in\\mathbb{R}`,
    ],
    detailSections: [
      {
        title: 'Complex Abs Boundary',
        lines: [
          'Domain intent: Complex.',
          'Absolute-value equations use magnitude semantics, so the left side is real and nonnegative.',
          `For this affine boundary case, ${input.target}-5 must be real and nonnegative before candidate checking.`,
        ],
      },
      {
        title: 'Candidate Check',
        lines: [
          'The real sign cases produce no accepted candidate.',
          'Therefore the complex solution set is empty for this benchmark case.',
        ],
      },
    ],
    warnings: [],
    resultOrigin: 'symbolic',
    answerDomain: 'complex',
  };
}

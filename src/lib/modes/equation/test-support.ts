export const system2 = [
  [1, 1, 3],
  [2, -1, 0],
];

export const system3 = [
  [1, 1, 1, 6],
  [2, -1, 1, 3],
  [1, 2, -1, 3],
];

export function makeRequest() {
  return {
    equationLatex: 'x^2-5x+6=0',
    quadraticCoefficients: [1, -5, 6],
    cubicCoefficients: [1, -6, 11, -6],
    quarticCoefficients: [1, 0, -5, 0, 4],
    polynomialSystem2Latex: ['x+y=3', 'x-y=1'] as const,
    system2,
    system3,
    angleUnit: 'deg' as const,
    outputStyle: 'both' as const,
    ansLatex: '0',
  };
}

type OutcomeTextInput = {
  kind: string;
  error?: string;
  exactLatex?: string;
  exactSupplementLatex?: string[];
  detailSections?: Array<{ lines: string[] }>;
};

export function collectOutcomeText(result: OutcomeTextInput) {
  return [
    result.kind,
    result.exactLatex,
    result.error,
    ...(result.exactSupplementLatex ?? []),
    ...(result.detailSections?.flatMap((section) => section.lines) ?? []),
  ].join(' ');
}

import type { LanguageCatalog } from '../../types';

export const englishDisplay = {
  labels: {
    result: 'Result',
    answer: 'Answer',
    validWhen: 'Valid when',
    warnings: 'Warnings',
    error: 'Error',
    approx: 'Approx',
    representativeBranches: 'Representative Branches',
    principalRange: 'Principal Range',
    piecewiseExactBranches: 'Piecewise Exact Branches',
    parameterConstraints: 'Parameter Constraints',
    discoveredFamilies: 'Discovered Families',
    reducedCarrier: 'Reduced Carrier',
    exactClosureBoundary: 'Exact Closure Boundary',
    suggestedIntervals: 'Suggested Intervals',
  },
  actions: {
    showFullResult: 'Show full result',
    showRemainingBranches: 'Show remaining branches',
    copyResult: 'Copy Result',
    runNumeric: 'Run Numeric',
  },
  loading: {
    rendering: 'Rendering...',
    renderingFullFact: 'Rendering full fact...',
    renderingBranch: 'Rendering branch...',
  },
} satisfies LanguageCatalog['display'];

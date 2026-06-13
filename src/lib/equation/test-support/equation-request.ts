import type { GuardedSolveRequest } from '../../../types/calculator';

export const baseEquationSolveRequest = {
  originalLatex: '',
  resolvedLatex: '',
  angleUnit: 'deg',
  outputStyle: 'both',
  ansLatex: '0',
} satisfies GuardedSolveRequest;

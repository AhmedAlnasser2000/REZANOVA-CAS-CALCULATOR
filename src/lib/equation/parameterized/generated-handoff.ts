import { exactLatexForFiniteBranches } from '../readback/finite-branches';
import type { GeneratedFormulaHandoffPayload } from './generated-formula-handoff-payload';
import type { DisplayMathPayloadV1 } from '../../../types/calculator';

export type GeneratedHandoffSuccess = {
  kind: 'success';
  exactLatex: string;
  exactSupplementLatex?: string[];
  formulaPayload?: GeneratedFormulaHandoffPayload;
  canonicalMath?: DisplayMathPayloadV1;
};

export type GeneratedHandoffFailure<Reason extends string = string> = {
  kind: 'unsupported';
  reason?: Reason;
  message: string;
};

export function solutionExpressionsFromExactLatex(
  exactLatex: string,
  target: string,
  options: { dropComplexInfinity?: boolean } = {},
) {
  if (options.dropComplexInfinity && exactLatex.includes('\\tilde\\infty')) {
    return [];
  }

  const equalityPrefix = `${target}=`;
  if (exactLatex.startsWith(equalityPrefix)) {
    return [exactLatex.slice(equalityPrefix.length)];
  }

  const setPrefix = `${target}\\in\\left\\{`;
  if (exactLatex.startsWith(setPrefix) && exactLatex.endsWith('\\right\\}')) {
    return exactLatex
      .slice(setPrefix.length, -'\\right\\}'.length)
      .split(/,\\\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [exactLatex];
}

export function exactLatexForSolutions(target: string, solutionExpressions: string[]) {
  return exactLatexForFiniteBranches({
    targetLatex: target,
    branchesLatex: solutionExpressions.filter(Boolean),
    preserveOrder: true,
  });
}

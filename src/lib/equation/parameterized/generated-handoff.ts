export type GeneratedHandoffSuccess = {
  kind: 'success';
  exactLatex: string;
  exactSupplementLatex?: string[];
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
  const unique = [...new Set(solutionExpressions.filter(Boolean))];
  if (unique.length === 1) {
    return `${target}=${unique[0]}`;
  }
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

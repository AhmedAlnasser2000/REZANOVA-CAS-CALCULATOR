import { boxLatex } from '../patterns';

function escapeRegex(literal: string) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function compactRepeatedVariableLatex(latex: string, variable?: string) {
  if (!latex || !variable) {
    return latex;
  }

  const variableLatex = boxLatex(variable);
  if (!variableLatex) {
    return latex;
  }

  const escapedVariable = escapeRegex(variableLatex);
  const repeatedVariable = new RegExp(`(?:${escapedVariable}){2,}`, 'g');

  return latex.replace(repeatedVariable, (match) => {
    const occurrences = match.match(new RegExp(escapedVariable, 'g'))?.length ?? 1;
    return `${variableLatex}^{${occurrences}}`;
  });
}

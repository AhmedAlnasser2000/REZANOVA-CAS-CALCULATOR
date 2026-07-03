import type { BaseProfile } from './exp-log-types';
import {
  type MathJson,
  isArrayNode,
  latexForNode,
} from './math-json';

export function cleanExpLogLatex(latex: string) {
  return latex.replace(/\\exponentialE/g, 'e');
}

export function wrapLatexForPowerBase(node: MathJson) {
  const latex = latexForNode(node);
  return isArrayNode(node) && (node[0] === 'Add' || node[0] === 'Subtract' || node[0] === 'Power')
    ? `\\left(${latex}\\right)`
    : latex;
}

export function powerCarrierLatex(base: MathJson, exponent: MathJson) {
  return `${wrapLatexForPowerBase(base)}^{${latexForNode(exponent)}}`;
}

function isBaseProfile(input: BaseProfile | MathJson): input is BaseProfile {
  return Boolean(
    input
    && typeof input === 'object'
    && !Array.isArray(input)
    && 'kind' in input
    && 'latex' in input,
  );
}

export function logCarrierLatex(argument: MathJson, base: BaseProfile | MathJson) {
  const baseLatex = isBaseProfile(base) ? base.latex : latexForNode(base as MathJson);
  return `\\log_{${baseLatex}}\\left(${latexForNode(argument)}\\right)`;
}

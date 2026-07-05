import { ComputeEngine } from '@cortex-js/compute-engine';
import { containsTarget, isArrayNode, latexForNode } from './math-json';
import type { MathJson } from './types';

export type ComplexInfiniteFamilyReport = {
  hasInfiniteFamilyCandidate: boolean;
  families: string[];
  detailLines: string[];
};

const ce = new ComputeEngine();
const TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan']);
const LOG_OPERATORS = new Set(['Ln', 'Log']);

function zeroFormNode(node: MathJson): MathJson {
  return isArrayNode(node) && node[0] === 'Equal' && node.length === 3
    ? ['Subtract', node[1] as MathJson, node[2] as MathJson]
    : node;
}

function isExponentialPower(node: unknown, target: string) {
  if (!isArrayNode(node) || node[0] !== 'Power' || node.length !== 3) {
    return false;
  }
  const base = node[1];
  const exponent = node[2];
  if (!containsTarget(exponent, target)) {
    return false;
  }
  return base === 'ExponentialE'
    || typeof base === 'number'
    || (typeof base === 'string' && base !== target);
}

function familyLabelForNode(node: MathJson, target: string): string | null {
  if (!isArrayNode(node) || typeof node[0] !== 'string') {
    return null;
  }
  const operator = node[0];
  if (TRIG_OPERATORS.has(operator) && node.length >= 2 && containsTarget(node[1], target)) {
    return `${latexForNode(node)} periodic trig family`;
  }
  if (LOG_OPERATORS.has(operator) && node.length >= 2 && containsTarget(node[1], target)) {
    return `${latexForNode(node)} logarithmic branch family`;
  }
  if (isExponentialPower(node, target)) {
    return `${latexForNode(node)} exponential branch family`;
  }
  return null;
}

function collectFamilies(node: MathJson, target: string, families: string[]) {
  const label = familyLabelForNode(node, target);
  if (label) {
    families.push(label);
  }
  if (!isArrayNode(node)) {
    return;
  }
  for (const child of node.slice(1)) {
    collectFamilies(child as MathJson, target, families);
  }
}

export function diagnoseComplexInfiniteFamilyPolicyForLatex(
  expressionLatex: string,
  options: { target: string },
): ComplexInfiniteFamilyReport {
  const parsed = zeroFormNode(ce.parse(expressionLatex).json as MathJson);
  const families: string[] = [];
  collectFamilies(parsed, options.target, families);
  const uniqueFamilies = [...new Set(families)];
  if (uniqueFamilies.length === 0) {
    return {
      hasInfiniteFamilyCandidate: false,
      families: [],
      detailLines: ['No recognized periodic, logarithmic, or exponential infinite-family carrier was detected.'],
    };
  }
  return {
    hasInfiniteFamilyCandidate: true,
    families: uniqueFamilies,
    detailLines: [
      'Exact Complex branch-family routes are tried before bounded Complex Region solving.',
      `Detected family carriers: ${uniqueFamilies.join('; ')}.`,
      'Bounded Complex Region output enumerates verified roots only inside the selected rectangle.',
      'It is not a global solution set for infinite periodic or logarithmic/exponential branch families.',
      'Ledger scope for this route remains bounded-region; symbolic-family is reserved for exact branch-family outputs.',
    ],
  };
}

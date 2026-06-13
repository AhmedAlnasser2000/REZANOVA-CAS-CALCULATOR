import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import { relationToSymbol } from '../../algebra/inequality-sign-analysis-core';
import { normalizeRelationOperatorLatex } from '../../input/input-canonicalization';
import { readExactScalarNode, exactScalarToNumber } from '../../algebra/polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import {
  extractEquationPolynomialDomain,
  isEquationPolynomialRelation,
} from '../equation-polynomial-domain';
import {
  NUMERIC_CONSTANT_SYMBOLS,
  type InequalityRelation,
  type MathJson,
  type TopLevelInequality,
} from './types';

const ce = new ComputeEngine();

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function relationFromLatexFallback(latex: string) {
  const normalized = normalizeRelationOperatorLatex(latex);
  return /\\(?:le|ge)(?![A-Za-z])|[<>]/u.test(normalized);
}

function isTopLevelInequalityLatex(latex: string) {
  const normalizedLatex = normalizeRelationOperatorLatex(latex);
  const extracted = extractEquationPolynomialDomain({
    equationLatex: normalizedLatex,
    allowedRelations: ['Less', 'LessEqual', 'Greater', 'GreaterEqual'],
  });
  return extracted.kind === 'success'
    || (extracted.kind === 'stop' && extracted.reason !== 'unsupported-relation')
    || relationFromLatexFallback(normalizedLatex);
}

function relationText(relation: InequalityRelation) {
  return relationToSymbol(relation);
}

function latexText(text: string) {
  return `\\text{${text.replace(/[{}]/g, '')}}`;
}

function dedupeStrings(lines: readonly string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

function reverseRelation(relation: InequalityRelation): InequalityRelation {
  switch (relation) {
    case 'Less':
      return 'Greater';
    case 'LessEqual':
      return 'GreaterEqual';
    case 'Greater':
      return 'Less';
    case 'GreaterEqual':
      return 'LessEqual';
  }
}

function simplifyNode(node: unknown): MathJson {
  try {
    return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json) as MathJson;
  } catch {
    return normalizeAst(node) as MathJson;
  }
}

function expandAndSimplifyNode(node: unknown): MathJson {
  try {
    const expanded = expand(ce.box(node as Parameters<typeof ce.box>[0]) as never) as { json: unknown };
    return simplifyNode(expanded.json);
  } catch {
    return simplifyNode(node);
  }
}

function latexForNode(node: unknown) {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).latex.replaceAll('\\exponentialE', 'e');
  } catch {
    return '';
  }
}

function rawLatexForNode(node: unknown) {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).latex.replaceAll('\\exponentialE', 'e');
  } catch {
    return '';
  }
}

function topLevelInequality(equationLatex: string): TopLevelInequality | null {
  let json: unknown;
  try {
    json = ce.parse(normalizeRelationOperatorLatex(equationLatex)).json;
  } catch {
    return null;
  }
  if (!isNodeArray(json) || !isEquationPolynomialRelation(json[0]) || json[0] === 'Equal' || json.length !== 3) {
    return null;
  }
  return {
    relation: json[0],
    left: json[1] as MathJson,
    right: json[2] as MathJson,
  };
}

function collectVariables(node: unknown, variables = new Set<string>()) {
  if (typeof node === 'string') {
    if (!NUMERIC_CONSTANT_SYMBOLS.has(node)) {
      variables.add(node);
    }
    return variables;
  }
  if (!isNodeArray(node)) {
    return variables;
  }
  for (const child of node.slice(1)) {
    collectVariables(child, variables);
  }
  return variables;
}

function resolveTarget(inputTarget: string | null | undefined, left: unknown, right: unknown) {
  if (inputTarget?.trim()) {
    return inputTarget.trim();
  }
  const variables = collectVariables(['Add', left, right]);
  return variables.size === 1 ? [...variables][0] : null;
}

function numericValueForNode(node: unknown): number | null {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return exactScalarToNumber(scalar);
  }
  try {
    const numeric = ce.box(node as Parameters<typeof ce.box>[0]).evaluate().N?.()
      ?? ce.box(node as Parameters<typeof ce.box>[0]).evaluate();
    const json = numeric.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (typeof json === 'object' && json !== null && 'num' in json) {
      const parsed = Number((json as { num: string }).num);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }
  return null;
}


export {
  collectVariables,
  dedupeStrings,
  expandAndSimplifyNode,
  isNodeArray,
  isTopLevelInequalityLatex,
  latexForNode,
  latexText,
  numericValueForNode,
  rawLatexForNode,
  relationText,
  resolveTarget,
  reverseRelation,
  simplifyNode,
  topLevelInequality,
};

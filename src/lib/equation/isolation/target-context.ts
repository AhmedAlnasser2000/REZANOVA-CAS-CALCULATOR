import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import { ce, isArrayNode, type MathJson } from './math-json';

export function hasAmbiguousAdjacentProduct(latex: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.implicitCharacterProducts.some((product) => new Set(product.characters).size > 1);
}

export function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) => symbol.name !== target)
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name);
}

export type ParsedIsolationEquation =
  | { kind: 'success'; sourceLatex: string; parameterNames: string[]; json: MathJson[] }
  | { kind: 'parse-error'; sourceLatex: string; parameterNames: string[] }
  | { kind: 'non-equation'; sourceLatex: string; parameterNames: string[] };

export function parseIsolationEquation(equationLatex: string, target: string): ParsedIsolationEquation {
  const normalized = normalizeExplicitNamedVariablesInLatex(equationLatex);
  const sourceLatex = normalized.latex;
  const parameterNames = parameterNamesFromLatex(sourceLatex, target);

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(sourceLatex);
  } catch {
    return { kind: 'parse-error', sourceLatex, parameterNames };
  }

  const json = parsed.json as MathJson;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return { kind: 'non-equation', sourceLatex, parameterNames };
  }

  return { kind: 'success', sourceLatex, parameterNames, json };
}

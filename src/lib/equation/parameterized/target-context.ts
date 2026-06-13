import { analyzeVariablesFromLatex } from '../../algebra/variable-core';

export function hasAmbiguousAdjacentProduct(latex: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.implicitCharacterProducts.some((product) => new Set(product.characters).size > 1);
}

export function parameterNamesFromLatex(
  latex: string,
  target: string,
  options: { exclude?: string[] } = {},
) {
  const excluded = new Set(options.exclude ?? []);
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) =>
      symbol.name !== target
      && !excluded.has(symbol.name)
      && (
        symbol.identifierKind === 'named-variable'
        || (symbol.identifierKind === 'single-symbol-variable' && /^[A-Za-z]$/.test(symbol.name))
      ))
    .map((symbol) => symbol.name);
}

/**
 * Real curves read one-argument `log` as log10 (evaluator/evaluate.ts), while
 * the complex evaluator reads it as ln. Complex values of a real curve must use
 * the real curve's convention: log(a) becomes ln(a) / ln(10).
 */
export function graphRealLogConvention(node: unknown): unknown {
  if (!Array.isArray(node)) return node;
  const mapped = node.map((child, index) => (index === 0 ? child : graphRealLogConvention(child)));
  return mapped[0] === 'Log' && mapped.length === 2 ? ['Divide', ['Ln', mapped[1]], ['Ln', 10]] : mapped;
}

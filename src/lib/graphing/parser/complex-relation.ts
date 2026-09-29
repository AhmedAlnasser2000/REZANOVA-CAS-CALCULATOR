// Relations in the complex variable z alone (no x or y) come in two shapes:
// - a locus: both sides are real-valued (|z-1| = 2, Re(z^2) = 1, |z| < 2),
//   which is a curve or region in the complex plane;
// - roots: both sides are complex-valued (z^2 + z = 3, z^5 = 1), which are
//   isolated points.
// A real side compared with a complex side (|z| = z) is neither and is
// rejected with guidance.

/** Operators whose value is real whatever their complex argument. */
const REAL_CARRIERS = new Set(['Abs', 'Real', 'ImaginaryPart', 'Arg']);
/** Operators that keep a real argument real. */
const REAL_PRESERVING = new Set([
  'Add', 'Multiply', 'Divide', 'Negate', 'Power', 'Sqrt', 'Root', 'Exp', 'Ln', 'Log',
  'Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot', 'Sinh', 'Cosh', 'Tanh',
  'Arcsin', 'Arccos', 'Arctan', 'Arsinh', 'Arcosh', 'Artanh',
  'Floor', 'Ceil', 'Round', 'Sign', 'Min', 'Max', 'Mod', 'Rational',
]);

/**
 * True when the expression is real for every complex z: real numbers and
 * sliders, |.|, Re, Im and arg of anything, and real operations on real parts.
 * z itself, i, and conjugates are complex.
 */
export function isComplexRealValued(node: unknown): boolean {
  if (typeof node === 'number') return true;
  if (node && typeof node === 'object' && !Array.isArray(node) && 'num' in node) return true;
  if (typeof node === 'string') {
    if (node === 'z' || node === 'ImaginaryUnit') return false;
    return true;
  }
  if (!Array.isArray(node)) return false;
  const [head, ...operands] = node;
  if (typeof head !== 'string') return false;
  if (REAL_CARRIERS.has(head)) return true;
  if (head === 'Complex') return operands[1] === 0;
  if (REAL_PRESERVING.has(head)) return operands.every(isComplexRealValued);
  return false;
}

/** True when a z-free expression is a non-real constant such as 1 + i or 2i. */
export function isNonRealConstant(node: unknown): boolean {
  return !isComplexRealValued(node) && !usesSymbol(node, 'z');
}

function usesSymbol(node: unknown, symbol: string): boolean {
  if (node === symbol) return true;
  return Array.isArray(node) && node.slice(1).some((child) => usesSymbol(child, symbol));
}

/** Operators with no complex derivative: a Newton step in z is meaningless for them. */
const NON_HOLOMORPHIC = new Set(['Conjugate', 'Real', 'ImaginaryPart', 'Abs', 'Arg']);

/** True when a non-holomorphic operator is applied to something that depends on z (\overline{z} = z^2). */
export function isNonHolomorphicInZ(node: unknown): boolean {
  if (!Array.isArray(node)) return false;
  const [head, ...operands] = node;
  if (typeof head === 'string' && NON_HOLOMORPHIC.has(head) && operands.some((operand) => usesSymbol(operand, 'z'))) return true;
  return operands.some(isNonHolomorphicInZ);
}

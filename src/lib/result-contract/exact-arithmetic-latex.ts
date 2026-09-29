import type { SerializableMathJson } from '../../types/calculator';
export function exactSymbolLatex(name: string): string {
  if (['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'].includes(name)) return `\\${name}`;
  const match = /^([A-Za-z]+)_([0-9]+)$/.exec(name);
  return match ? `${match[1]}_{${match[2]}}` : name.length === 1 ? name : `\\mathrm{${name.replaceAll('_', '\\_')}}`;
}
/** Deterministic projection of the restricted, standard exact arithmetic tree. */
export function exactArithmeticLatex(value: SerializableMathJson): string {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return exactSymbolLatex(value);
  if (!Array.isArray(value)) {
    if (value && typeof value === 'object' && 'num' in value) return String(value.num);
    throw new Error('Unsupported exact arithmetic leaf.');
  }
  const [h, ...a] = value;
  const r = (i: number) => exactArithmeticLatex(a[i]);
  if (h === 'Add') return a.map(exactArithmeticLatex).join('+');
  if (h === 'Multiply') return a.map(v => `\\left(${exactArithmeticLatex(v)}\\right)`).join('');
  if (h === 'Negate') return `-\\left(${r(0)}\\right)`;
  if (h === 'Divide' || h === 'Rational') return `\\frac{${r(0)}}{${r(1)}}`;
  if (h === 'NotEqual') return `${r(0)}\\ne ${r(1)}`;
  if (h === 'Power') return `\\left(${r(0)}\\right)^{${r(1)}}`;
  throw new Error('Unsupported exact arithmetic operator.');
}

import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { autoTargets, parseRow } from '../../../../new-equation/parse';
import { lowerEquation } from '../../service/input';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { ExecutionContext } from '../execution';
import { ExpressionStore } from '../representation/expression';

// EQUATION-RECONSTRUCTION-CLOSEOUT1: corpus cases that ran past 60 s now decide and verify within a modest budget
// (work units, not time; the parameter cases run with the app's default limits).
function run(latex: string, domain: 'real' | 'complex', work = 400_000_000) {
  const limits = { ...DEFAULT_EQUATION_LIMITS, work };
  const ctx = new ExecutionContext(limits), store = new ExpressionStore(ctx);
  const row = parseRow(latex);
  if (row.kind === 'error') throw new Error(row.message);
  const { problem } = lowerEquation(store, { rows: [latex], targets: autoTargets([row]), domain, limits, digits: 6 });
  const outcome = decideEquation(problem);
  if (outcome.kind === 'solved' || outcome.kind === 'empty') verifyEquationOutcome(problem, outcome);
  return outcome.kind;
}

group('exact zeros hidden in unexpanded arguments and log sums', () => {
  it.each([
    ['\\ln\\left(2x+1\\right)=3', 'complex', 'solved'],
    ['10^{3x-4}=2', 'complex', 'solved'],
    ['12^{2x+1}=19', 'complex', 'solved'],
    ['\\ln\\left(x\\right)+\\ln\\left(x+1\\right)=2', 'complex', 'solved'],
    ['\\ln\\left(x\\right)-\\ln\\left(x+1\\right)=2', 'complex', 'solved'],
    ['\\ln((x-1)/(x+2))=4', 'complex', 'solved'],
    ['\\arcsin\\left(\\sin\\left(2x+10\\right)\\right)=30', 'real', 'empty'],
  ] as const)('%s over %s', (latex, domain, kind) => {
    expect(run(latex, domain)).toBe(kind);
  });
});

group('exact zeros behind domain-kept forms and complex radicals', () => {
  // e^{ln A}, 0·t, (√u)² and products of nested radicals: the definedness folds, the kernel normal form of
  // arguments, and field arithmetic over ℚ(π, i, √D) for complex quadratic roots.
  it.each([
    ['\\sin(x)+\\pi=0', 'complex'],
    ['\\ln(e^x+1)=2', 'complex'],
    ['\\sin\\left(x^2+x\\right)=\\frac{1}{2}', 'complex'],
    ['\\exp((x-1)/(x+2))=1', 'complex'],
    ['\\exp\\left(\\frac{x^2+1}{x-2}\\right)=\\imaginaryI', 'complex'],
    // Exponentials grouped by direction (exp(2 + 2i) = exp(1 + i)²) and log(exp a) = a for |Im a| < π.
    ['\\ln\\left(\\frac{x^2+1}{x-2}\\right)=1+\\imaginaryI', 'complex'],
    ['(\\ln x)^6-5(\\ln x)^3+4=0', 'complex'],
  ] as const)('%s over %s', (latex, domain) => {
    expect(run(latex, domain)).toBe('solved');
  });
});

group('parameters specialized at algebraic samples', () => {
  // Certified enclosures before exact arithmetic, one resultant for αⁿ, rational scaling without resultants,
  // memoized root identity, and zeros in ℚ(γ)[y] by dynamic evaluation instead of Liouville-bound refinement.
  it.each([
    ['z^4+z+1=b^6', 'real'],
    ['z^4+z+1=b^6', 'complex'],
    ['b^{45}=nvm^3', 'complex'],
    ['\\left(y^3+y+1\\right)^{12}=b', 'complex'],
  ] as const)('%s over %s', (latex, domain) => {
    expect(run(latex, domain, DEFAULT_EQUATION_LIMITS.work)).toBe('solved');
  }, 60_000);
});

group('angles: principal-branch identities, direct unit points, unit-circle parts', () => {
  // asin(−u) = −asin(u) and atan(tan 1) = 1 were hidden zeros; e^{i·arc u} from a direct annihilator and
  // cos θ, sin θ of unit points from self-reciprocal polynomials replace products whose resultants multiply degrees.
  it.each([
    ['\\cos(2\\sin(x))\\le0', 'real', 'solved'],
    ['\\arctan\\left(\\tan\\left(\\cos\\left(x\\right)\\right)\\right)=1', 'real', 'solved'],
    ['\\sin\\left(4x\\right)+\\sin\\left(6x\\right)=1', 'real', 'solved'],
    // Typed stops that now arrive in seconds (Phase 2 ledger rows: composition families).
    ['\\frac{\\tan\\left(\\left|x-4\\right|\\right)}{4}-55\\le4', 'real', 'incomplete-implementation'],
    ['2^{\\left|\\sin\\left(x^3+x\\right)\\right|}=2^{\\frac{1}{2}}', 'real', 'incomplete-implementation'],
    ['2^{\\left|\\sin\\left(x^5+x\\right)\\right|}=2^{\\frac{1}{2}}', 'real', 'incomplete-implementation'],
  ] as const)('%s over %s', (latex, domain, kind) => {
    expect(run(latex, domain, DEFAULT_EQUATION_LIMITS.work)).toBe(kind);
  }, 60_000);
});

group('internal errors and verification failures found by the corpus', () => {
  it.each([
    // The constant i in a problem over ℝ is a typed stop (it is undefined there), not a crash in the sign test.
    ['\\sin(x)=i', 'real', 'unsupported'],
    ['x=\\sqrt{13}\\left(\\cos\\left(\\arctan\\left(\\frac{3}{2}\\right)\\right)+i\\sin\\left(\\arctan\\left(\\frac{3}{2}\\right)\\right)\\right)', 'real', 'unsupported'],
    // The polynomial conversion reaches its fixed point (expression coefficients left 0·x·i for a second pass).
    ['\\frac{x^2+1}{x^2-2}=\\imaginaryI', 'complex', 'solved'],
    // A specialized sample with transcendental constants goes to the constants slice, as in the main route.
    ['\\sin\\left(A z+B\\right)=c', 'real', 'solved'],
    // Points where φ′ is undefined cut the monotone pieces; points where an atom is undefined do not satisfy it;
    // samples inside narrow interval-family members come from refined enclosures.
    ['\\arcsin\\left(\\sin\\left(x^{\\frac{1}{3}}-1\\right)\\right)=\\frac{1}{2}', 'real', 'incomplete-implementation'],
    ['\\tan\\left(\\sqrt{\\ln\\left(\\frac{1}{x^2}\\right)}\\right)\\le1', 'real', 'solved'],
  ] as const)('%s over %s', (latex, domain, kind) => {
    expect(run(latex, domain, DEFAULT_EQUATION_LIMITS.work)).toBe(kind);
  }, 60_000);
});

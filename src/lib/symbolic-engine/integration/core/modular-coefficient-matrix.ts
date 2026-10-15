/** Unit-pivot LU in a private modular quotient ring. No field capability or
 * domain cast is introduced for reducible/nonreduced coefficient algebras. */
import {demand, type ExecutionContext} from './execution';
import {matrixAllocation} from './arithmetic-matrix';
import type {NumberFieldModularImage} from './number-field-modular-image';

export interface ModularCoefficientLu {
  readonly permutation: readonly number[];
  readonly lower: readonly (readonly unknown[])[];
  readonly upper: readonly (readonly unknown[])[];
}
export function modularCoefficientLuWithin(ctx: ExecutionContext, image: NumberFieldModularImage, input: readonly (readonly unknown[])[], fixed?: readonly number[]): ModularCoefficientLu | null {
  const n = input.length, f = image.coefficients; matrixAllocation(ctx, n, 2 * n); ctx.allocate(n);
  const permutation = fixed ? [...fixed] : Array.from({length: n}, (_, i) => i);
  demand(permutation.length === n && permutation.every(i => Number.isSafeInteger(i) && i >= 0 && i < n) && new Set(permutation).size === n, 'invalid-input', 'modular LU permutation');
  const upper = permutation.map(i => {demand(input[i].length === n, 'invalid-input', 'modular square matrix'); for (const value of input[i]) f.assert(ctx, value); return [...input[i]];}), lower = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? f.one(ctx) : f.zero(ctx)));
  for (let j = 0; j < n; j++) {
    let row = j, inverse = f.inverse(ctx, upper[row][j]);
    if (!fixed) while (inverse === null && ++row < n) {ctx.tick(); inverse = f.inverse(ctx, upper[row][j]);}
    if (inverse === null) return null;
    if (row !== j) {
      [upper[row], upper[j]] = [upper[j], upper[row]]; [permutation[row], permutation[j]] = [permutation[j], permutation[row]];
      for (let k = 0; k < j; k++) {ctx.tick(); [lower[row][k], lower[j][k]] = [lower[j][k], lower[row][k]];}
    }
    for (let i = j + 1; i < n; i++) {
      const factor = f.multiply(ctx, upper[i][j], inverse); lower[i][j] = factor;
      for (let k = j; k < n; k++) upper[i][k] = f.add(ctx, upper[i][k], f.negate(ctx, f.multiply(ctx, factor, upper[j][k])));
    }
  }
  // A separate complete product check protects the modular producer itself.
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let value = f.zero(ctx); for (let k = 0; k < n; k++) value = f.add(ctx, value, f.multiply(ctx, lower[i][k], upper[k][j]));
    demand(f.equal(ctx, value, input[permutation[i]][j]), 'verification-failed', 'modular complete LU reconstruction');
  }
  ctx.allocate(2 * n + 4);
  return Object.freeze({permutation: Object.freeze(permutation), lower: Object.freeze(lower.map(row => Object.freeze(row))), upper: Object.freeze(upper.map(row => Object.freeze(row)))});
}

import { demand, type ExecutionContext } from './execution';
import type { ArithmeticField } from './arithmetic-linear';
export interface EuclideanPolynomialArithmetic<E, P> {
  readonly domain: ArithmeticField<E>;
  assert(ctx: ExecutionContext, p: P): void;
  zero(ctx: ExecutionContext): P; one(ctx: ExecutionContext): P;
  isZero(ctx: ExecutionContext, p: P): boolean; degree(ctx: ExecutionContext, p: P): number; leading(ctx: ExecutionContext, p: P): E;
  add(ctx: ExecutionContext, a: P, b: P): P; subtract(ctx: ExecutionContext, a: P, b: P): P;
  multiply(ctx: ExecutionContext, a: P, b: P): P; negate(ctx: ExecutionContext, a: P): P; scale(ctx: ExecutionContext, a: P, c: E): P;
  equal(ctx: ExecutionContext, a: P, b: P): boolean;
  divide(ctx: ExecutionContext, a: P, b: P): {readonly quotient: P; readonly remainder: P};
  rowUnit?(ctx:ExecutionContext,row:readonly P[]):E|null;
}

export type ArithmeticPolynomialMatrix<P> = readonly (readonly P[])[];
export type ArithmeticModuleOperation<E, P> = Readonly<
  {kind: 'swap'; target: number; source: number} |
  {kind: 'add'; target: number; source: number; factor: P} |
  {kind: 'scale'; target: number; factor: E}>;
export interface ArithmeticModuleEvidence<E, P> {
  readonly input: ArithmeticPolynomialMatrix<P>;
  readonly columns: number;
  readonly operations: readonly ArithmeticModuleOperation<E, P>[];
  readonly reduced: ArithmeticPolynomialMatrix<P>;
  readonly transformation: ArithmeticPolynomialMatrix<P>;
  readonly pivots: readonly number[];
}
function dimensions(ctx: ExecutionContext, rows: number, columns: number): void {
  demand(Number.isSafeInteger(rows) && rows >= 0 && Number.isSafeInteger(columns) && columns >= 0
    && Number.isSafeInteger(rows * (rows + columns)), 'invalid-input', 'polynomial module dimensions');
  ctx.allocate(rows * (rows + columns) + rows * 2 + columns);
}
function copy<E, P>(ctx: ExecutionContext, r: EuclideanPolynomialArithmetic<E, P>, matrix: ArithmeticPolynomialMatrix<P>, columns: number) {
  dimensions(ctx, matrix.length, columns);
  return matrix.map(row => {
    demand(row.length === columns, 'invalid-input', 'polynomial module row');
    for (const p of row) r.assert(ctx, p); return [...row];
  });
}
export function freezePolynomialMatrix<P>(ctx: ExecutionContext, matrix: P[][]): ArithmeticPolynomialMatrix<P> {
  ctx.allocate(matrix.length); return Object.freeze(matrix.map(row => Object.freeze(row)));
}
function identity<E, P>(ctx: ExecutionContext, r: EuclideanPolynomialArithmetic<E, P>, n: number) {
  return Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? r.one(ctx) : r.zero(ctx)));
}
function apply<E, P>(ctx: ExecutionContext, r: EuclideanPolynomialArithmetic<E, P>, a: P[][], op: ArithmeticModuleOperation<E, P>) {
  demand(Number.isSafeInteger(op.target) && op.target >= 0 && op.target < a.length,
    'verification-failed', 'module row target');
  if (op.kind === 'swap' || op.kind === 'add') demand(Number.isSafeInteger(op.source) && op.source >= 0
    && op.source < a.length && op.target !== op.source, 'verification-failed', 'module row source');
  if (op.kind === 'swap') { [a[op.target], a[op.source]] = [a[op.source], a[op.target]]; return; }
  if (op.kind === 'scale') {
    r.domain.assert(ctx, op.factor); demand(!r.domain.isZero(ctx, op.factor), 'verification-failed', 'module nonunit scaling');
  } else { demand(op.kind === 'add', 'verification-failed', 'module operation'); r.assert(ctx, op.factor); }
  for (let j = 0; j < a[op.target].length; j++) {
    ctx.tick(); a[op.target][j] = op.kind === 'scale' ? r.scale(ctx, a[op.target][j], op.factor)
      : r.add(ctx, a[op.target][j], r.multiply(ctx, op.factor, a[op.source][j]));
  }
}
/** Row Hermite form over the PID E[x]. Every operation is unimodular;
 * its zero rows therefore give the complete polynomial left kernel. */
export function arithmeticModuleHermite<E, P>(ctx: ExecutionContext, r: EuclideanPolynomialArithmetic<E, P>,
  input: ArithmeticPolynomialMatrix<P>, columns: number): ArithmeticModuleEvidence<E, P> {
  const a = copy(ctx, r, input, columns), u = identity(ctx, r, a.length), operations: ArithmeticModuleOperation<E, P>[] = [], pivots: number[] = [];
  const perform = (op: ArithmeticModuleOperation<E, P>) => {
    ctx.allocate(4); apply(ctx, r, a, op); apply(ctx, r, u, op); operations.push(Object.freeze(op));
  };
  for (let j = 0; j < columns && pivots.length < a.length; j++) {
    const k = pivots.length; let selected=-1;
    for(let row=k;row<a.length;row++)if(!r.isZero(ctx,a[row][j])&&(selected<0||r.degree(ctx,a[row][j])<r.degree(ctx,a[selected][j])))selected=row;
    if(selected<0)continue;if(selected!==k)perform({kind:'swap',target:k,source:selected});
    let i=k;
    const normalize=(row:number)=>{const factor=r.rowUnit?.(ctx,a[row])??r.domain.inverse(ctx,r.leading(ctx,a[row][j]));if(!r.domain.equal(ctx,factor,r.domain.fromInteger(ctx,1n)))perform({kind:'scale',target:row,factor});};
    normalize(k);
    for (i = k + 1; i < a.length; i++) {
      while (!r.isZero(ctx, a[i][j])) {
        normalize(i);
        const oldDegree = r.degree(ctx, a[k][j]), division = r.divide(ctx, a[i][j], a[k][j]);
        perform({kind: 'add', target: i, source: k, factor: r.negate(ctx, division.quotient)});
        if (!r.isZero(ctx, a[i][j])) {
          demand(r.degree(ctx, a[i][j]) < oldDegree, 'verification-failed', 'module Euclidean progress');
          perform({kind: 'swap', target: k, source: i});
          normalize(k);
        }
      }
    }
    perform({kind: 'scale', target: k, factor: r.domain.inverse(ctx, r.leading(ctx, a[k][j]))});
    for (i = 0; i < k; i++) {
      const q = r.divide(ctx, a[i][j], a[k][j]).quotient;
      if (!r.isZero(ctx, q)) perform({kind: 'add', target: i, source: k, factor: r.negate(ctx, q)});
    }
    ctx.allocate(1); pivots.push(j);
  }
  const result = Object.freeze({input: freezePolynomialMatrix(ctx, copy(ctx, r, input, columns)), columns,
    operations: Object.freeze(operations), reduced: freezePolynomialMatrix(ctx, a), transformation: freezePolynomialMatrix(ctx, u), pivots: Object.freeze(pivots)});
  verifyArithmeticModuleHermite(ctx, r, input, columns, result); return result;
}
export function verifyArithmeticModuleHermite<E, P>(ctx: ExecutionContext, r: EuclideanPolynomialArithmetic<E, P>,
  input: ArithmeticPolynomialMatrix<P>, columns: number, proof: ArithmeticModuleEvidence<E, P>): void {
  const a = copy(ctx, r, input, columns), u = identity(ctx, r, a.length);
  demand(proof.columns === columns && proof.input.length === input.length && proof.reduced.length === a.length
    && proof.transformation.length === a.length && proof.pivots.length <= Math.min(a.length, columns),
  'verification-failed', 'module evidence dimensions');
  for (const op of proof.operations) { ctx.tick(); apply(ctx, r, a, op); apply(ctx, r, u, op); }
  for (let i = 0; i < a.length; i++) {
    demand(proof.input[i].length === columns && proof.reduced[i].length === columns
      && proof.transformation[i].length === a.length, 'verification-failed', 'module evidence row');
    for (let j = 0; j < columns; j++) demand(r.equal(ctx, proof.input[i][j], input[i][j])
      && r.equal(ctx, proof.reduced[i][j], a[i][j]), 'verification-failed', 'module row replay');
    for (let j = 0; j < a.length; j++) demand(r.equal(ctx, u[i][j], proof.transformation[i][j]), 'verification-failed', 'module unimodular replay');
    let pivot = 0; while (pivot < columns && r.isZero(ctx, a[i][pivot])) pivot++;
    if (i >= proof.pivots.length) demand(pivot === columns, 'verification-failed', 'module missing pivot coverage');
    else {
      demand(pivot === proof.pivots[i] && (i === 0 || pivot > proof.pivots[i - 1])
        && r.domain.equal(ctx, r.leading(ctx, a[i][pivot]), r.domain.fromInteger(ctx, 1n)), 'verification-failed', 'module Hermite pivot');
      for (let k = 0; k < i; k++) demand(r.degree(ctx, a[k][pivot]) < r.degree(ctx, a[i][pivot]), 'verification-failed', 'module pivot residue');
    }
  }
}
/** Membership is exact polynomial division in the complete Hermite basis. */
export function arithmeticModuleCoordinates<E, P>(ctx: ExecutionContext, r: EuclideanPolynomialArithmetic<E, P>,
  proof: ArithmeticModuleEvidence<E, P>, value: readonly P[]): readonly P[] | null {
  verifyArithmeticModuleHermite(ctx, r, proof.input, proof.columns, proof);
  demand(value.length === proof.columns, 'invalid-input', 'module membership dimensions');
  ctx.allocate(value.length + proof.pivots.length); const remainder = [...value], coefficients: P[] = [];
  for (const p of value) r.assert(ctx, p);
  for (let i = 0; i < proof.pivots.length; i++) {
    const pivot = proof.pivots[i], d = r.divide(ctx, remainder[pivot], proof.reduced[i][pivot]);
    if (!r.isZero(ctx, d.remainder)) return null;
    coefficients.push(d.quotient);
    for (let j = 0; j < value.length; j++) remainder[j] = r.subtract(ctx, remainder[j], r.multiply(ctx, d.quotient, proof.reduced[i][j]));
  }
  return remainder.every(p => r.isZero(ctx, p)) ? Object.freeze(coefficients) : null;
}

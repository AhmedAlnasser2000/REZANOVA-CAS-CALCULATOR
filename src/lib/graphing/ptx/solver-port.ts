import type { ComplexValue } from '../../numeric/complex';
import type { GraphExpressionIR, GraphPiecewiseSpecV1, GraphViewportV1 } from '../contracts';
import type { PtxWindow } from './types';

// Everything PTX needs from evaluators and solvers goes through this port, so
// the planned Equation rebuild (with its new interval arithmetic) arrives as
// one new adapter (`solver-port-<name>.ts`) instead of edits across PTX.

export type PtxRealFunction = (value: number) => number | undefined;
export type PtxPlaneFunction = (x: number, y: number) => number | undefined;
export type PtxComplexFunction = (z: ComplexValue) => ComplexValue | null;

/** Solutions of an equation in z: `complete` when these are all of them (polynomials). */
export type PtxComplexRootsSolution = {
  roots: Array<{ re: number; im: number; exact: boolean; label: string | null; multiplicity: number }>;
  complete: boolean;
  degree: number | null;
};

export type PtxPolynomialRoot = { value: number; exact: boolean; label: string | null; multiplicity: number };

export type PtxSolverPort = {
  readonly id: string;
  /** f(variable) for an expression in x (or y), sliders fixed; null when it cannot be compiled. */
  realFunction(expression: GraphExpressionIR, variable: string, parameters: Readonly<Record<string, number>>): PtxRealFunction | null;
  /** A piecewise curve as one function: the first branch whose condition holds (or `otherwise`); undefined where none does. */
  piecewiseFunction(piecewise: GraphPiecewiseSpecV1, variable: string, parameters: Readonly<Record<string, number>>): PtxRealFunction | null;
  /** F(x, y) = left − right for a real relation in x and y. */
  planeFunction(left: GraphExpressionIR, right: GraphExpressionIR, parameters: Readonly<Record<string, number>>): PtxPlaneFunction | null;
  /** f(z) for an expression in z, principal branches. */
  complexFunction(mathJson: unknown, parameters: Readonly<Record<string, number>>): PtxComplexFunction | null;
  /** Real roots of a polynomial in `variable`, exact where it splits; null when the expression is not a polynomial. */
  realPolynomialRoots(mathJson: unknown, variable: string, parameters: Readonly<Record<string, number>>): PtxPolynomialRoot[] | null;
  /** Solutions of left = right in z (all of them for polynomials, those in view otherwise). */
  complexRoots(input: { left: GraphExpressionIR; right: GraphExpressionIR; parameters: Readonly<Record<string, number>>; viewport: GraphViewportV1 }): PtxComplexRootsSolution;
  /** Common zeros of two real functions of (x, y) in a window (seeded search, numeric). */
  planeSystemRoots(first: PtxPlaneFunction, second: PtxPlaneFunction, window: PtxWindow): Array<{ x: number; y: number }>;
  /**
   * Optional proof hook: true when a zero of `f` provably lies in [low, high].
   * Unused by the current adapter; an interval-arithmetic engine can supply it.
   */
  enclosesRealRoot?(f: PtxRealFunction, low: number, high: number): boolean;
};

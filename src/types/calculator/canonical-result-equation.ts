import type { CanonicalMathValue } from './canonical-result-common';

/**
 * Canonical Equation answer: typed Equation outcomes and solution sets.
 *
 * Every mathematical component is a  math value (producer-proven standard MathJSON). Algebraic numbers are
 * never a custom head inside a math leaf: they are declared once in `roots` as binders and referenced by their
 * symbol. Semantics live in the typed fields, never in the title, error text or warnings.
 */
export type CanonicalEquationMath = CanonicalMathValue;

/** A root binder. `polynomial` is in the binder's own symbol; with parameters only for `indexed-real-root`. */
export type CanonicalEquationRootBinder =
  | {
      kind: 'real-algebraic';
      symbol: string;
      /** The unique root of `polynomial` (integer coefficients) with lo < root < hi, or root = lo = hi. */
      polynomial: CanonicalEquationMath;
      lo: CanonicalEquationMath;
      hi: CanonicalEquationMath;
      /** A closed form (radicals) proven by the producer to equal the root. */
      form?: CanonicalEquationMath;
    }
  | {
      kind: 'complex-algebraic';
      symbol: string;
      /** The unique root of `polynomial` in the closed disk |z − (re + i·im)| ≤ radius. */
      polynomial: CanonicalEquationMath;
      re: CanonicalEquationMath;
      im: CanonicalEquationMath;
      radius: CanonicalEquationMath;
      form?: CanonicalEquationMath;
    }
  | {
      kind: 'indexed-real-root';
      symbol: string;
      /** The index-th real root (1 = smallest) of `polynomial`, whose coefficients may carry parameters. */
      polynomial: CanonicalEquationMath;
      index: number;
      /** Optional rational isolating bounds (constant, possibly transcendental, coefficients). */
      lo?: CanonicalEquationMath;
      hi?: CanonicalEquationMath;
    }
  | {
      kind: 'isolated-real-root';
      symbol: string;
      /**
       * The unique real zero of `expression` (in the binder's own symbol) with lo < zero < hi, where the expression is
       * defined and strictly monotone on [lo, hi] and changes sign there (EQUATION-CERTIFIED-NUMERICS1).
       */
      expression: CanonicalEquationMath;
      lo: CanonicalEquationMath;
      hi: CanonicalEquationMath;
    }
  | {
      kind: 'isolated-real-point';
      /** One fresh symbol per coordinate, in the problem's target order; answers reference these. */
      symbols: string[];
      /**
       * The unique real solution of the square system `equations` (each = 0, written in `symbols`) in `box`, where
       * every equation is defined and continuously differentiable and the Krawczyk test proves exactly one
       * solution (EQUATION-CERTIFIED-NUMERICS1 PR B).
       */
      equations: CanonicalEquationMath[];
      box: Array<{ lo: CanonicalEquationMath; hi: CanonicalEquationMath }>;
    };

export type CanonicalEquationCondition =
  | { kind: 'nonzero' | 'positive' | 'nonnegative' | 'in-domain'; expr: CanonicalEquationMath }
  | { kind: 'equal' | 'not-equal'; expr: CanonicalEquationMath; other: CanonicalEquationMath };

export type CanonicalEquationEndpoint =
  | { kind: 'value'; value: CanonicalEquationMath }
  | { kind: 'infinity'; sign: 1 | -1 };

export interface CanonicalEquationInterval {
  lo: CanonicalEquationEndpoint;
  hi: CanonicalEquationEndpoint;
  loClosed: boolean;
  hiClosed: boolean;
}

export interface CanonicalEquationRelation {
  op: 'eq' | 'ne' | 'lt' | 'le';
  lhs: CanonicalEquationMath;
  rhs: CanonicalEquationMath;
}

export type CanonicalEquationSet =
  | { kind: 'finite'; variables: string[]; points: CanonicalEquationMath[][] }
  | { kind: 'intervals'; variables: string[]; intervals: CanonicalEquationInterval[] }
  | { kind: 'cofinite'; variables: string[]; except: CanonicalEquationMath[][] }
  | { kind: 'union'; sets: CanonicalEquationSet[] }
  | { kind: 'case-tree'; cases: Array<{ conditions: CanonicalEquationCondition[]; set: CanonicalEquationSet }> }
  | {
      kind: 'periodic-set';
      variables: string[];
      period: CanonicalEquationMath;
      components: CanonicalEquationInterval[];
      range: CanonicalEquationInterval;
    }
  | {
      kind: 'interval-family';
      variables: string[];
      parameter: string;
      /** Decimal integer bounds on the parameter; absent means unbounded on that side. */
      from?: string;
      to?: string;
      lo: CanonicalEquationMath;
      hi: CanonicalEquationMath;
      loClosed: boolean;
      hiClosed: boolean;
    }
  | { kind: 'root-set'; variables: string[]; polynomial: CanonicalEquationMath }
  | {
      kind: 'periodic';
      variables: string[];
      values: CanonicalEquationMath[];
      integerParameters: string[];
      constraints: CanonicalEquationCondition[];
    }
  | {
      kind: 'parametric';
      variables: string[];
      values: CanonicalEquationMath[];
      freeParameters: string[];
      constraints: CanonicalEquationCondition[];
    }
  | {
      kind: 'reduced-form';
      targets: string[];
      relations: CanonicalEquationRelation[];
      conditions: CanonicalEquationCondition[];
    }
  | {
      kind: 'unconfirmed';
      variables: string[];
      candidates: Array<{ point: CanonicalEquationMath[]; derivations: string[] }>;
    };

export type CanonicalEquationOutcome =
  | { kind: 'solved'; set: CanonicalEquationSet }
  | { kind: 'empty' }
  | { kind: 'undecided'; reason: string }
  /** `owner` names the gate that will decide this (e.g. EQUATION-CERTIFIED-NUMERICS1), or `unassigned`. */
  | { kind: 'incomplete'; owner: string; reason: string }
  | { kind: 'unsupported'; reason: string }
  /** A typed resource stop; `result-size` means the answer exists but exceeds the result bounds. */
  | { kind: 'stopped'; stop: 'work' | 'allocation' | 'cancelled' | 'result-size' };

export interface CanonicalEquationPrimary {
  kind: 'equation-outcome';
  domain: 'real' | 'complex';
  targets: string[];
  parameters: string[];
  roots: CanonicalEquationRootBinder[];
  /**
   * Relations on the parameters only, entered beside the problem. When present, the outcome describes the
   * solutions for parameter values satisfying every assumption (cases ruled out by them are omitted).
   */
  assumptions?: CanonicalEquationRelation[];
  outcome: CanonicalEquationOutcome;
  /**
   * A summary only; derivations stay outside the document. Answers (solved, empty) were verified independently by
   * the producer before projection; non-answers have nothing to verify. `rules` lists the transform rules used.
   */
  provenance: { verification: 'independent' | 'not-applicable'; rules: string[] };
}

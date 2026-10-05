import type { CanonicalMathValueV2, CanonicalResultDocumentV2 } from './canonical-result-v2-types';

/**
 * Canonical-result V6: typed Equation outcomes and solution sets.
 *
 * Every mathematical component is a V2 math value (producer-proven standard MathJSON). Algebraic numbers are
 * never a custom head inside a math leaf: they are declared once in `roots` as binders and referenced by their
 * symbol. Semantics live in the typed fields, never in the title, error text or warnings.
 */
export type CanonicalEquationMathV6 = CanonicalMathValueV2;

/** A root binder. `polynomial` is in the binder's own symbol; with parameters only for `indexed-real-root`. */
export type CanonicalEquationRootBinderV6 =
  | {
      kind: 'real-algebraic';
      symbol: string;
      /** The unique root of `polynomial` (integer coefficients) with lo < root < hi, or root = lo = hi. */
      polynomial: CanonicalEquationMathV6;
      lo: CanonicalEquationMathV6;
      hi: CanonicalEquationMathV6;
      /** A closed form (radicals) proven by the producer to equal the root. */
      form?: CanonicalEquationMathV6;
    }
  | {
      kind: 'complex-algebraic';
      symbol: string;
      /** The unique root of `polynomial` in the closed disk |z − (re + i·im)| ≤ radius. */
      polynomial: CanonicalEquationMathV6;
      re: CanonicalEquationMathV6;
      im: CanonicalEquationMathV6;
      radius: CanonicalEquationMathV6;
      form?: CanonicalEquationMathV6;
    }
  | {
      kind: 'indexed-real-root';
      symbol: string;
      /** The index-th real root (1 = smallest) of `polynomial`, whose coefficients may carry parameters. */
      polynomial: CanonicalEquationMathV6;
      index: number;
      /** Optional rational isolating bounds (constant, possibly transcendental, coefficients). */
      lo?: CanonicalEquationMathV6;
      hi?: CanonicalEquationMathV6;
    };

export type CanonicalEquationConditionV6 =
  | { kind: 'nonzero' | 'positive' | 'nonnegative' | 'in-domain'; expr: CanonicalEquationMathV6 }
  | { kind: 'equal' | 'not-equal'; expr: CanonicalEquationMathV6; other: CanonicalEquationMathV6 };

export type CanonicalEquationEndpointV6 =
  | { kind: 'value'; value: CanonicalEquationMathV6 }
  | { kind: 'infinity'; sign: 1 | -1 };

export interface CanonicalEquationIntervalV6 {
  lo: CanonicalEquationEndpointV6;
  hi: CanonicalEquationEndpointV6;
  loClosed: boolean;
  hiClosed: boolean;
}

export interface CanonicalEquationRelationV6 {
  op: 'eq' | 'ne' | 'lt' | 'le';
  lhs: CanonicalEquationMathV6;
  rhs: CanonicalEquationMathV6;
}

export type CanonicalEquationSetV6 =
  | { kind: 'finite'; variables: string[]; points: CanonicalEquationMathV6[][] }
  | { kind: 'intervals'; variables: string[]; intervals: CanonicalEquationIntervalV6[] }
  | { kind: 'cofinite'; variables: string[]; except: CanonicalEquationMathV6[][] }
  | { kind: 'union'; sets: CanonicalEquationSetV6[] }
  | { kind: 'case-tree'; cases: Array<{ conditions: CanonicalEquationConditionV6[]; set: CanonicalEquationSetV6 }> }
  | {
      kind: 'periodic-set';
      variables: string[];
      period: CanonicalEquationMathV6;
      components: CanonicalEquationIntervalV6[];
      range: CanonicalEquationIntervalV6;
    }
  | {
      kind: 'interval-family';
      variables: string[];
      parameter: string;
      /** Decimal integer bounds on the parameter; absent means unbounded on that side. */
      from?: string;
      to?: string;
      lo: CanonicalEquationMathV6;
      hi: CanonicalEquationMathV6;
      loClosed: boolean;
      hiClosed: boolean;
    }
  | { kind: 'root-set'; variables: string[]; polynomial: CanonicalEquationMathV6 }
  | {
      kind: 'periodic';
      variables: string[];
      values: CanonicalEquationMathV6[];
      integerParameters: string[];
      constraints: CanonicalEquationConditionV6[];
    }
  | {
      kind: 'parametric';
      variables: string[];
      values: CanonicalEquationMathV6[];
      freeParameters: string[];
      constraints: CanonicalEquationConditionV6[];
    }
  | {
      kind: 'reduced-form';
      targets: string[];
      relations: CanonicalEquationRelationV6[];
      conditions: CanonicalEquationConditionV6[];
    }
  | {
      kind: 'unconfirmed';
      variables: string[];
      candidates: Array<{ point: CanonicalEquationMathV6[]; derivations: string[] }>;
    };

export type CanonicalEquationOutcomeV6 =
  | { kind: 'solved'; set: CanonicalEquationSetV6 }
  | { kind: 'empty' }
  | { kind: 'undecided'; reason: string }
  /** `owner` names the gate that will decide this (e.g. EQUATION-CERTIFIED-NUMERICS1), or `unassigned`. */
  | { kind: 'incomplete'; owner: string; reason: string }
  | { kind: 'unsupported'; reason: string }
  /** A typed resource stop; `result-size` means the answer exists but exceeds the result bounds. */
  | { kind: 'stopped'; stop: 'work' | 'allocation' | 'cancelled' | 'result-size' };

export interface CanonicalEquationPrimaryV6 {
  kind: 'equation-outcome';
  domain: 'real' | 'complex';
  targets: string[];
  parameters: string[];
  roots: CanonicalEquationRootBinderV6[];
  /**
   * Relations on the parameters only, entered beside the problem. When present, the outcome describes the
   * solutions for parameter values satisfying every assumption (cases ruled out by them are omitted).
   */
  assumptions?: CanonicalEquationRelationV6[];
  outcome: CanonicalEquationOutcomeV6;
  /**
   * A summary only; derivations stay outside the document. Answers (solved, empty) were verified independently by
   * the producer before projection; non-answers have nothing to verify. `rules` lists the transform rules used.
   */
  provenance: { verification: 'independent' | 'not-applicable'; rules: string[] };
}

export type CanonicalResultDocumentV6 = Omit<CanonicalResultDocumentV2, 'version' | 'primary'> & {
  version: 6;
  primary: CanonicalEquationPrimaryV6;
};

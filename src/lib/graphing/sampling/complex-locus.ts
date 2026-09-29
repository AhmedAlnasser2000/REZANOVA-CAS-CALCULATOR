import { createComplexNumericEvaluator } from '../../equation/complex-domain-public';
import type { GraphExpressionIR, GraphRelationIR, GraphStopReason } from '../contracts';
import { compileGraphComplexPlan } from '../evaluator/complex-plan';
import type { GraphEvaluationResult, GraphExpressionEvaluator } from '../evaluator';
import { complex } from '../../numeric/complex';
import type { GraphImplicitClause } from './implicit';

type ComplexLocus = Extract<GraphRelationIR, { kind: 'complex-locus' }>;
type ImplicitShape = Extract<GraphRelationIR, { kind: 'implicit-equality' | 'inequality' | 'chained-inequality' }>;

const UNDEFINED: GraphEvaluationResult = { status: 'non-finite', reason: 'domain' };

/**
 * One side of a locus clause as a real function of (x, y): its value at
 * z = x + iy. Sides are real-valued by classification (|.|, Re, Im, arg), so
 * the real part is the value; a side that turns out complex at a point is
 * treated as undefined there rather than silently truncated.
 */
function sideEvaluator(side: GraphExpressionIR, parameters: Readonly<Record<string, number>>): GraphExpressionEvaluator {
  const fast = compileGraphComplexPlan(side.mathJson, parameters);
  const evaluateAt = fast.ok
    ? (x: number, y: number) => fast.plan.evaluate(complex(x, y))
    : (() => {
      const reference = createComplexNumericEvaluator({ expressionMathJson: side.mathJson, target: 'z', parameters: { ...parameters } });
      return (x: number, y: number) => {
        const result = reference.evaluateAt(complex(x, y));
        return result.status === 'finite' ? result.value : null;
      };
    })();
  return {
    evaluate(environment) {
      const value = evaluateAt(environment.x ?? 0, environment.y ?? 0);
      if (!value || Math.abs(value.im) > 1e-9 * Math.max(1, Math.abs(value.re))) return UNDEFINED;
      return { status: 'finite', value: value.re };
    },
  };
}

/** Locus clauses for the implicit sampler, with jump rejection (arg, floor, sign). */
export function buildGraphComplexLocusClauses(
  relation: ComplexLocus,
  parameters: Readonly<Record<string, number>>,
): { ok: true; clauses: GraphImplicitClause[]; fillsRegion: boolean } | { ok: false; stopReason: GraphStopReason } {
  try {
    return {
      ok: true,
      clauses: relation.clauses.map((clause) => ({
        left: sideEvaluator(clause.left, parameters),
        right: sideEvaluator(clause.right, parameters),
        operator: clause.operator,
        rejectJumps: true,
      })),
      fillsRegion: relation.clauses.some((clause) => clause.operator !== '='),
    };
  } catch {
    return { ok: false, stopReason: { code: 'unsupported-relation', detailCode: 'complex-locus-evaluator' } };
  }
}

/** The implicit shape a locus has in the (Re z, Im z) plane. */
export function graphComplexLocusShape(relation: ComplexLocus): ImplicitShape {
  const [first] = relation.clauses;
  if (relation.clauses.length === 1 && first!.operator === '=') {
    return { kind: 'implicit-equality', left: first!.left, right: first!.right };
  }
  if (relation.clauses.length === 1 && first!.operator !== '=') {
    return { kind: 'inequality', left: first!.left, operator: first!.operator, right: first!.right };
  }
  return {
    kind: 'chained-inequality',
    operands: [relation.clauses[0]!.left, ...relation.clauses.map((clause) => clause.right)],
    operators: relation.clauses.map((clause) => (clause.operator === '=' ? '<=' : clause.operator)),
  };
}

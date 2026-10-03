import { decidePolynomialProblem } from './decision/solve';
import { verifyOutcome as verifyPolynomialOutcome } from './decision/verify';
import { decideGeneratorProblem } from './generators/solve';
import { verifyGeneratorOutcome } from './generators/verify';
import type { ExprId } from './representation/expression';
import type { RelationProblem } from './representation/relation';
import type { EquationOutcome } from './representation/solution-set';

/**
 * Entry point of the private Equation core: route a problem to the slice that
 * owns it. Problems whose target appears inside exp, log, Lambert W or an
 * exponent (slice 2), or inside an absolute value or a radical (slice 3, real
 * only), go to the closed-form engine; everything else starts at the
 * polynomial slice, which names the owning gate when it cannot decide.
 */
function someNode(problem: RelationProblem, test: (n: ExprId, x: string) => boolean): boolean {
  const s = problem.store, x = problem.targets[0];
  if (x === undefined) return false;
  const roots = [...problem.relations.flatMap(r => [r.lhs, r.rhs]), ...problem.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
  return s.postorder(roots).some(n => test(n, x));
}

export function hasTranscendentalKernels(problem: RelationProblem): boolean {
  const s = problem.store;
  return someNode(problem, (n, x) => {
    const node = s.node(n);
    if (node.kind === 'apply' && ['exp', 'log', 'lambertw', 'lambertwm1'].includes(node.fn) && s.freeSymbols(node.arg).includes(x)) return true;
    return node.kind === 'pow' && s.freeSymbols(node.exponent).includes(x);
  });
}

/** The target inside an absolute value or a non-integer rational power. */
export function hasConstraintKernels(problem: RelationProblem): boolean {
  const s = problem.store;
  return someNode(problem, (n, x) => {
    const node = s.node(n);
    if (node.kind === 'apply' && node.fn === 'abs' && s.freeSymbols(node.arg).includes(x)) return true;
    if (node.kind !== 'pow' || !s.freeSymbols(node.base).includes(x)) return false;
    const e = s.numberValue(node.exponent);
    return e !== undefined && e.denominator > 1n;
  });
}

const closedForm = (problem: RelationProblem) => hasTranscendentalKernels(problem) || hasConstraintKernels(problem);

export function decideEquation(problem: RelationProblem): EquationOutcome {
  if (problem.domain === 'complex' && hasConstraintKernels(problem)) {
    return { kind: 'unsupported', reason: 'absolute values and radicals of the target are decided over the reals only' };
  }
  return closedForm(problem) ? decideGeneratorProblem(problem) : decidePolynomialProblem(problem);
}

export function verifyEquationOutcome(problem: RelationProblem, outcome: EquationOutcome): void {
  if (closedForm(problem)) verifyGeneratorOutcome(problem, outcome); else verifyPolynomialOutcome(problem, outcome);
}

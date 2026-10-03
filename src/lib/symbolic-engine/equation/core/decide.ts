import { decidePolynomialProblem } from './decision/solve';
import { verifyOutcome as verifyPolynomialOutcome } from './decision/verify';
import { decideGeneratorProblem } from './generators/solve';
import { verifyGeneratorOutcome } from './generators/verify';
import type { RelationProblem } from './representation/relation';
import type { EquationOutcome } from './representation/solution-set';

/**
 * Entry point of the private Equation core: route a problem to the slice that
 * owns it. Problems whose target appears inside exp, log, Lambert W or an
 * exponent belong to the generators slice; everything else starts at the
 * polynomial slice, which names the owning gate when it cannot decide.
 */
export function hasTranscendentalKernels(problem: RelationProblem): boolean {
  const s = problem.store, x = problem.targets[0];
  if (x === undefined) return false;
  const roots = [...problem.relations.flatMap(r => [r.lhs, r.rhs]), ...problem.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
  for (const n of s.postorder(roots)) {
    const node = s.node(n);
    if (node.kind === 'apply' && ['exp', 'log', 'lambertw', 'lambertwm1'].includes(node.fn) && s.freeSymbols(node.arg).includes(x)) return true;
    if (node.kind === 'pow' && s.freeSymbols(node.exponent).includes(x)) return true;
  }
  return false;
}

export function decideEquation(problem: RelationProblem): EquationOutcome {
  return hasTranscendentalKernels(problem) ? decideGeneratorProblem(problem) : decidePolynomialProblem(problem);
}

export function verifyEquationOutcome(problem: RelationProblem, outcome: EquationOutcome): void {
  if (hasTranscendentalKernels(problem)) verifyGeneratorOutcome(problem, outcome); else verifyPolynomialOutcome(problem, outcome);
}

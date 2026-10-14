import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { autoTargets, parseRow } from '../../../../new-equation/parse';
import { lowerEquation } from '../../service/input';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { ExecutionContext } from '../execution';
import { ExpressionStore } from '../representation/expression';

// EQUATION-RECONSTRUCTION-CLOSEOUT1: corpus cases that ran past 60 s now decide and verify within a modest budget
// (work units, not time). Each was an exact zero the sign test refined forever.
function run(latex: string, domain: 'real' | 'complex') {
  const limits = { ...DEFAULT_EQUATION_LIMITS, work: 400_000_000 };
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

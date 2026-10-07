// One New Equation case, phase by phase (run by tools/equation-slow-case-probe.mjs in its own process).
// Each phase prints one JSON line as soon as it starts and ends, so a killed run still names its phase.
import { parseRow, autoTargets } from '../src/lib/new-equation/parse';
import { DEFAULT_EQUATION_LIMITS } from '../src/lib/new-equation/types';
import { decideEquation, verifyEquationOutcome } from '../src/lib/symbolic-engine/equation/core/decide';
import { ExecutionContext } from '../src/lib/symbolic-engine/equation/core/execution';
import { ExpressionStore } from '../src/lib/symbolic-engine/equation/core/representation/expression';
import { previewEquationDocument, projectEquationOutcome } from '../src/lib/symbolic-engine/equation/result';
import { presentEquation } from '../src/lib/symbolic-engine/equation/presentation/layout';
import { lowerEquation } from '../src/lib/symbolic-engine/equation/service/input';

const input = JSON.parse(process.argv[2] ?? '{}') as { rows: string[]; targets?: string[]; domain?: 'real' | 'complex' };
const emit = (line: Record<string, unknown>) => process.stdout.write(`${JSON.stringify(line)}\n`);
function phase<T>(name: string, run: () => T): T {
  emit({ phase: name, event: 'start' });
  const started = performance.now();
  const value = run();
  emit({ phase: name, event: 'end', ms: Math.round(performance.now() - started) });
  return value;
}

const parsed = phase('read rows', () => input.rows.map(parseRow));
const unreadable = parsed.find(r => r.kind === 'error');
if (unreadable) {
  // As on the page: a row that cannot be read blocks solving.
  emit({ phase: 'read rows', event: 'outcome', kind: `row error: ${unreadable.kind === 'error' ? unreadable.message : ''}` });
  emit({ phase: 'done', event: 'end' });
  process.exit(0);
}
const targets = input.targets ?? autoTargets(parsed);
const domain = input.domain ?? 'real';
const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS });
const store = new ExpressionStore(ctx);
const { problem, assumptions } = phase('lower', () => lowerEquation(store, { rows: input.rows, targets, domain, limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 }));
const outcome = phase('decide', () => decideEquation(problem));
emit({ phase: 'decide', event: 'outcome', kind: outcome.kind });
if (!assumptions.length && (outcome.kind === 'solved' || outcome.kind === 'empty')) {
  const draft = phase('preview layout', () => previewEquationDocument(problem, outcome));
  phase('preview present', () => presentEquation(draft, { outputStyle: 'both', approxDigits: 6 }, ctx));
}
phase('verify', () => verifyEquationOutcome(problem, outcome));
const document = phase('project and replay', () => projectEquationOutcome(problem, outcome).canonicalResult);
for (const style of ['exact', 'decimal', 'both'] as const) phase(`present ${style}`, () => presentEquation(document, { outputStyle: style, approxDigits: 6 }, ctx));
emit({ phase: 'done', event: 'end', work: ctx.usage.work });

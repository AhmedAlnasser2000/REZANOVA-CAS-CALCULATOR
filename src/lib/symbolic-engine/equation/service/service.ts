import type { OutputStyle } from '../../../../types/calculator';
import { equationError } from '../../../new-equation/error';
import {
  PRESENTATION_STYLES, validEquationRequest, type EquationPresentationSnapshot, type EquationRequest, type EquationResponse, type EquationRowNote, type EquationShownCondition,
} from '../../../new-equation/types';
import { decideEquation } from '../core/decide';
import { EquationAlgebraError, ExecutionContext } from '../core/execution';
import { assumeOutcome } from '../core/parameters/assume';
import { ExpressionStore } from '../core/representation/expression';
import { resourceOutcome, type EquationOutcome } from '../core/representation/solution-set';
import { presentConditionList, presentEquationV6 } from '../presentation/layout';
import { projectConditions, projectEquationOutcome } from '../result';
import { domainConditions, EquationInputError, lowerEquation } from './input';

const STOPPED: Readonly<Record<string, string>> = {
  work: 'Stopped: the work limit was reached.', allocation: 'Stopped: the memory limit was reached.', cancelled: 'Stopped: cancelled.',
};

/**
 * Worker-owned entry. One cumulative execution context covers reading the rows, deciding, applying assumptions,
 * verification, projection and presentation. A typed stop while presenting falls back to the plain presentation.
 */
export function executeEquation(request: EquationRequest): EquationResponse {
  const started = performance.now();
  let ctx: ExecutionContext | undefined;
  const base = { request, domainConditions: [] as EquationShownCondition[], assumptionsComplete: true };
  const failed = (message: string, title?: string, rowNotes: EquationRowNote[] = request.rows.map(() => ({ kind: 'empty' }))): EquationResponse =>
    ({ ...base, document: equationError(message, title), rowNotes, elapsedMs: performance.now() - started, usage: ctx?.usage ?? { work: 0, allocation: 0 } });
  try {
    if (!validEquationRequest(request)) return failed('Invalid request: rows exceed 64 KiB, no unknown is chosen, or the limits are invalid.');
    ctx = new ExecutionContext(request.limits);
    const store = new ExpressionStore(ctx);
    const { problem, assumptions, notes } = lowerEquation(store, request);
    const full = decideEquation(problem);
    let outcome: EquationOutcome = full, complete = true;
    try {
      const assumed = assumeOutcome(problem, assumptions, full);
      outcome = assumed.outcome;
      complete = assumed.complete;
    } catch (e) {
      outcome = resourceOutcome(e);
    }
    const document = projectEquationOutcome(problem, outcome, {}, assumptions.length ? { assumptions, full: outcome.kind === 'resource' ? outcome : full } : undefined).canonicalResult;
    const presentations: Partial<Record<OutputStyle, EquationPresentationSnapshot>> = {};
    for (const style of PRESENTATION_STYLES) {
      const p = presentEquationV6(document, { outputStyle: style, approxDigits: request.digits }, ctx);
      presentations[style] = { rows: p.rows.map(r => ({ ...r })), copyLatex: p.copyLatex, plainText: p.plainText, fallback: p.fallback };
    }
    let shown: EquationShownCondition[] = [];
    try {
      shown = presentConditionList(projectConditions(problem, domainConditions(problem)));
    } catch (e) {
      if (!(e instanceof EquationAlgebraError && e.code === 'resource')) throw e;
    }
    return { request, document, rowNotes: notes, presentations, domainConditions: shown, assumptionsComplete: complete,
      elapsedMs: performance.now() - started, usage: ctx.usage };
  } catch (e) {
    if (e instanceof EquationInputError) return failed(e.message, 'Check the rows', e.notes);
    if (e instanceof EquationAlgebraError && e.code === 'resource') return failed(STOPPED[e.stop ?? 'work'] ?? 'Stopped.', 'Stopped');
    if (e instanceof EquationAlgebraError && e.code === 'invalid-input') return failed(`The rows could not be solved as entered (${e.reason}).`, 'Check the rows');
    return failed(e instanceof Error ? e.message : String(e));
  }
}

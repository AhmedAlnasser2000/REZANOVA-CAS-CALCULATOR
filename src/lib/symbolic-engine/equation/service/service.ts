import type { OutputStyle } from '../../../../types/calculator';
import { equationError } from '../../../new-equation/error';
import { CanonicalResultAuthorityError } from '../../../result-contract/current';
import {
  PRESENTATION_STYLES, validEquationRequest, type EquationPresentationSnapshot, type EquationPreview, type EquationRequest, type EquationResponse, type EquationRowNote,
  type EquationShownCondition,
} from '../../../new-equation/types';
import { decideEquation } from '../core/decide';
import { EquationAlgebraError, ExecutionContext } from '../core/execution';
import { assumeOutcome } from '../core/parameters/assume';
import { ExpressionStore } from '../core/representation/expression';
import { resourceOutcome, type EquationOutcome } from '../core/representation/solution-set';
import { presentConditionList, presentEquation } from '../presentation/layout';
import { previewEquationDocument, projectConditions, projectEquationOutcome } from '../result';
import { domainConditions, EquationInputError, lowerEquation } from './input';

const STOPPED: Readonly<Record<string, string>> = {
  work: 'Stopped: the work limit was reached.', allocation: 'Stopped: the memory limit was reached.', cancelled: 'Stopped: cancelled.',
};

function presentAll(document: unknown, digits: number, ctx: ExecutionContext): Partial<Record<OutputStyle, EquationPresentationSnapshot>> {
  const presentations: Partial<Record<OutputStyle, EquationPresentationSnapshot>> = {};
  for (const style of PRESENTATION_STYLES) {
    const p = presentEquation(document, { outputStyle: style, approxDigits: digits }, ctx);
    presentations[style] = { rows: p.rows.map(r => ({ ...r })), copyLatex: p.copyLatex, plainText: p.plainText, fallback: p.fallback };
  }
  return presentations;
}

/**
 * Worker-owned entry. One cumulative execution context covers reading the rows, deciding, applying assumptions,
 * verification, projection and presentation. A typed stop while presenting falls back to the plain presentation.
 * With `onPreview`, a decided answer is handed over (laid out, not checked yet) before verification starts.
 */
export function executeEquation(request: EquationRequest, onPreview?: (preview: EquationPreview) => void): EquationResponse {
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
    if (onPreview && (outcome.kind === 'solved' || outcome.kind === 'empty')) {
      let presentations: EquationPreview['presentations'] | undefined;
      try {
        presentations = presentAll(previewEquationDocument(problem, outcome, assumptions), request.digits, ctx);
      } catch (e) {
        // No preview when it cannot be laid out (a typed stop or an oversized answer); verification still decides.
        if (!(e instanceof EquationAlgebraError && e.code === 'resource') && !(e instanceof CanonicalResultAuthorityError)) throw e;
      }
      if (presentations) onPreview({ request, presentations, rowNotes: notes, assumptionsComplete: complete });
    }
    const document = projectEquationOutcome(problem, outcome, {}, assumptions.length ? { assumptions, full: outcome.kind === 'resource' ? outcome : full } : undefined).canonicalResult;
    const presentations = presentAll(document, request.digits, ctx);
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

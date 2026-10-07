import { useState } from 'react';
import type { OutputStyle } from '../../types/calculator';
import type { CanonicalEquationDocument } from '../../types/calculator/canonical-result-current';
import { MathStatic } from '../../components/MathStatic';
import { writeTextClipboard } from '../../lib/clipboard/system-clipboard';
import type { EquationPresentationSnapshot, EquationPreview, EquationResponse } from '../../lib/new-equation/types';
import type { UncheckedReason } from '../runtime/useNewEquationRuntime';
import { verificationSummary } from '../../lib/new-equation/verification';

const STYLES: readonly [OutputStyle, string][] = [['exact', 'Exact'], ['decimal', 'Decimal'], ['both', 'Both']];
/** Plain words for the gate that will decide an unsolved problem (from the typed `incomplete.owner`). */
const LATER: Readonly<Record<string, string>> = {
  'EQUATION-CERTIFIED-NUMERICS1': 'Not solved yet: no certified method covers this equation yet. If it has infinitely many solutions, add a row such as −10 ≤ x ≤ 0 to search a range.',
  'EQUATION-SEMIALGEBRAIC1': 'Not solved yet: inequalities inside a system are coming in a later update.',
};

const UNCHECKED: Readonly<Record<UncheckedReason, string>> = {
  cancelled: 'Not checked: verification was stopped.',
  work: 'Not checked: the work limit was reached while verifying.',
  allocation: 'Not checked: the memory limit was reached while verifying.',
  'result-size': 'Not checked: the checked answer is too large to show.',
};

type Shared = { style: OutputStyle; outdated: boolean; onStyle: (style: OutputStyle) => void; onSolve: () => void };
type Props = Shared & { response?: EquationResponse; preview?: EquationPreview; unchecked?: UncheckedReason; withdrawn?: boolean };

/**
 * The answer panel: rows from the worker's presentation (typed roles and depths), never re-derived from text.
 * A decided answer shows at once, marked "Not checked yet", until verification passes (Verified exactly), fails
 * (the answer is withdrawn) or cannot finish (Stop, an edit or a limit: it stays, marked not checked).
 */
export function NewEquationAnswer({ response, preview, unchecked, withdrawn, ...shared }: Props) {
  if (preview) return <UncheckedAnswer preview={preview} unchecked={unchecked} {...shared} />;
  return response ? <CheckedAnswer response={response} withdrawn={withdrawn ?? false} {...shared} /> : null;
}

function useCopy(warning: string) {
  const [notice, setNotice] = useState('');
  const copy = (text: string, what: string) => void writeTextClipboard(text)
    .then(ok => setNotice(ok ? `${what} copied${warning}.` : 'Clipboard is unavailable.'), () => setNotice('Clipboard is unavailable.'));
  return { notice, copy };
}

function UncheckedAnswer({ preview, unchecked, style, outdated, onStyle, onSolve }: Shared & { preview: EquationPreview; unchecked?: UncheckedReason }) {
  const { notice, copy } = useCopy(' — this answer is not checked yet');
  const shown = preview.presentations[style];
  return <section className="ne-panel ne-answer ne-unchecked" data-testid="new-equation-answer" data-outdated={outdated} data-checked="no" aria-label="Answer">
    {outdated && <Outdated onSolve={onSolve} />}
    <div className="ne-answer-head">
      <h2>Answer <span className="ne-badge" data-testid="new-equation-unchecked">{unchecked ? 'Not checked' : 'Not checked yet'}</span></h2>
      <StyleToggle style={style} onStyle={onStyle} />
    </div>
    <Rows shown={shown} />
    {!preview.assumptionsComplete && <AssumptionsNote />}
    <p className="ne-checking" role="status">{unchecked ? UNCHECKED[unchecked] : 'Checking the answer exactly…'}</p>
    {shown && <CopyButtons shown={shown} copy={copy} />}
    {notice && <p role="status">{notice}</p>}
  </section>;
}

function CheckedAnswer({ response, withdrawn, style, outdated, onStyle, onSolve }: Shared & { response: EquationResponse; withdrawn: boolean }) {
  const { notice, copy } = useCopy('');
  const doc = response.document;
  if (withdrawn) {
    return <section className="ne-panel ne-answer" data-testid="new-equation-answer" data-outdated={outdated} data-checked="failed" aria-label="Answer">
      {outdated && <Outdated onSolve={onSolve} />}
      <h2>No answer</h2>
      <p role="alert" className="ne-message">Verification failed — this answer was withdrawn.</p>
      <details className="ne-technical"><summary>Technical reason</summary><p>{doc.error ?? doc.title}</p></details>
    </section>;
  }
  if (doc.primary?.kind !== 'equation-outcome') {
    return <section className="ne-panel ne-answer" data-testid="new-equation-answer" data-outdated={outdated} aria-label="Answer">
      {outdated && <Outdated onSolve={onSolve} />}
      <h2>{doc.title}</h2>
      <p role="alert" className="ne-message">{doc.error}</p>
    </section>;
  }
  const v6 = doc as CanonicalEquationDocument, outcome = v6.primary.outcome;
  const shown = response.presentations?.[style];
  const verified = verificationSummary(v6);
  const later = outcome.kind === 'incomplete' ? LATER[outcome.owner] ?? 'Not solved yet: this kind of problem is coming in a later update.' : undefined;
  return <section className="ne-panel ne-answer" data-testid="new-equation-answer" data-outdated={outdated} data-outcome={outcome.kind} data-checked={verified ? 'yes' : undefined} aria-label="Answer">
    {outdated && <Outdated onSolve={onSolve} />}
    <div className="ne-answer-head">
      <h2>{verified ? 'Answer' : 'No answer'}</h2>
      {verified && <StyleToggle style={style} onStyle={onStyle} />}
    </div>
    {later ? <div className="ne-rows-out"><p className="ne-message ne-plain">{later}</p>
      {outcome.kind === 'incomplete' && <details className="ne-technical"><summary>Technical reason</summary><p>{outcome.reason} ({outcome.owner})</p></details>}</div> : <Rows shown={shown} />}
    {!response.assumptionsComplete && <AssumptionsNote />}
    {verified && <details className="ne-verified" data-testid="new-equation-verified">
      <summary><span aria-hidden="true">✓</span> {verified.headline}</summary>
      <p>{verified.detail}</p>
    </details>}
    {verified && <details className="ne-conditions">
      <summary>Conditions used</summary>
      {response.domainConditions.length === 0 ? <p>No restrictions: every expression is defined everywhere.</p>
        : <>
          <p>Where the expressions are defined; the engine applies these automatically.</p>
          {response.domainConditions.map((c, i) => <MathStatic key={i} className="ne-math" latex={c.latex} block normalizeDisplay={false} />)}
        </>}
    </details>}
    {verified && shown && <CopyButtons shown={shown} copy={copy} />}
    {notice && <p role="status">{notice}</p>}
    <p className="ne-usage">{response.elapsedMs.toFixed(0)} ms · {response.usage.work.toLocaleString()} work units</p>
  </section>;
}

function StyleToggle({ style, onStyle }: { style: OutputStyle; onStyle: (style: OutputStyle) => void }) {
  return <div className="ne-segmented" role="group" aria-label="Answer style">
    {STYLES.map(([s, label]) => <button key={s} aria-pressed={style === s} onClick={() => onStyle(s)}>{label}</button>)}
  </div>;
}

function Rows({ shown }: { shown: EquationPresentationSnapshot | undefined }) {
  return <div className="ne-rows-out">
    {shown?.rows.map((r, i) => <div key={i} className={`ne-out ne-out-${r.role}`} style={{ marginInlineStart: `${r.depth * 1.5}rem` }}>
      {r.role === 'message' ? <p className="ne-message ne-plain">{r.text}</p> : <MathStatic className="ne-math" latex={r.latex} block normalizeDisplay={false} />}
    </div>)}
  </div>;
}

function CopyButtons({ shown, copy }: { shown: EquationPresentationSnapshot; copy: (text: string, what: string) => void }) {
  return <div className="ne-actions">
    <button onClick={() => copy(shown.copyLatex, 'LaTeX')}>Copy LaTeX</button>
    <button onClick={() => copy(shown.plainText, 'Text')}>Copy text</button>
  </div>;
}

function AssumptionsNote() {
  return <p className="ne-note">Some cases could not be checked against the assumptions and are shown as they are.</p>;
}

function Outdated({ onSolve }: { onSolve: () => void }) {
  return <p className="ne-outdated" role="status">Answer is for the previous problem — <button onClick={onSolve}>Solve again</button></p>;
}

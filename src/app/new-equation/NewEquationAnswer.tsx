import { useState } from 'react';
import type { CanonicalResultDocumentV6, OutputStyle } from '../../types/calculator';
import { MathStatic } from '../../components/MathStatic';
import { writeTextClipboard } from '../../lib/clipboard/system-clipboard';
import type { EquationResponse } from '../../lib/new-equation/types';
import { verificationSummary } from '../../lib/new-equation/verification';

const STYLES: readonly [OutputStyle, string][] = [['exact', 'Exact'], ['decimal', 'Decimal'], ['both', 'Both']];
/** Plain words for the gate that will decide an unsolved problem (from the typed `incomplete.owner`). */
const LATER: Readonly<Record<string, string>> = {
  'EQUATION-CERTIFIED-NUMERICS1': 'Not solved yet: this equation needs certified numerical methods, which are coming in a later update.',
  'EQUATION-SEMIALGEBRAIC1': 'Not solved yet: inequalities inside a system are coming in a later update.',
};

type Props = {
  response: EquationResponse;
  style: OutputStyle;
  outdated: boolean;
  onStyle: (style: OutputStyle) => void;
  onSolve: () => void;
};

/** The answer panel: rows from the worker's presentation (typed roles and depths), never re-derived from text. */
export function NewEquationAnswer({ response, style, outdated, onStyle, onSolve }: Props) {
  const [notice, setNotice] = useState('');
  const doc = response.document;
  const copy = (text: string, what: string) => void writeTextClipboard(text).then(ok => setNotice(ok ? `${what} copied.` : 'Clipboard is unavailable.'), () => setNotice('Clipboard is unavailable.'));
  if (doc.version !== 6) {
    return <section className="ne-panel ne-answer" data-testid="new-equation-answer" data-outdated={outdated} aria-label="Answer">
      {outdated && <Outdated onSolve={onSolve} />}
      <h2>{doc.title}</h2>
      <p role="alert" className="ne-message">{doc.error}</p>
    </section>;
  }
  const v6 = doc as CanonicalResultDocumentV6, outcome = v6.primary.outcome;
  const shown = response.presentations?.[style];
  const verified = verificationSummary(v6);
  const later = outcome.kind === 'incomplete' ? LATER[outcome.owner] ?? 'Not solved yet: this kind of problem is coming in a later update.' : undefined;
  return <section className="ne-panel ne-answer" data-testid="new-equation-answer" data-outdated={outdated} data-outcome={outcome.kind} aria-label="Answer">
    {outdated && <Outdated onSolve={onSolve} />}
    <div className="ne-answer-head">
      <h2>{verified ? 'Answer' : 'No answer'}</h2>
      {verified && <div className="ne-segmented" role="group" aria-label="Answer style">
        {STYLES.map(([s, label]) => <button key={s} aria-pressed={style === s} onClick={() => onStyle(s)}>{label}</button>)}
      </div>}
    </div>
    <div className="ne-rows-out">
      {later ? <><p className="ne-message ne-plain">{later}</p>
        {outcome.kind === 'incomplete' && <details className="ne-technical"><summary>Technical reason</summary><p>{outcome.reason} ({outcome.owner})</p></details>}</> : shown?.rows.map((r, i) => <div key={i} className={`ne-out ne-out-${r.role}`} style={{ marginInlineStart: `${r.depth * 1.5}rem` }}>
        {r.role === 'message' ? <p className="ne-message ne-plain">{r.text}</p> : <MathStatic className="ne-math" latex={r.latex} block normalizeDisplay={false} />}
      </div>)}
    </div>
    {!response.assumptionsComplete && <p className="ne-note">Some cases could not be checked against the assumptions and are shown as they are.</p>}
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
    {verified && shown && <div className="ne-actions">
      <button onClick={() => copy(shown.copyLatex, 'LaTeX')}>Copy LaTeX</button>
      <button onClick={() => copy(shown.plainText, 'Text')}>Copy text</button>
    </div>}
    {notice && <p role="status">{notice}</p>}
    <p className="ne-usage">{response.elapsedMs.toFixed(0)} ms · {response.usage.work.toLocaleString()} work units</p>
  </section>;
}

function Outdated({ onSolve }: { onSolve: () => void }) {
  return <p className="ne-outdated" role="status">Answer is for the previous problem — <button onClick={onSolve}>Solve again</button></p>;
}

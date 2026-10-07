import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useLightDismiss } from '../../components/useLightDismiss';
import type { MathfieldElement } from 'mathlive';
import { MathEditor } from '../../components/MathEditor';
import { checkRows, pickOrder } from '../../lib/new-equation/parse';
import type { EquationDraft, EquationLimits } from '../../lib/new-equation/types';
import type { WorkspaceInstance } from '../runtime/workspace-instances';
import { answerOutdated, resolvedTargets, type NewEquationRuntime } from '../runtime/useNewEquationRuntime';
import { NewEquationAnswer } from './NewEquationAnswer';
import { useRowReadings } from './useRowReadings';
import { newEquationKeyboardLayouts, symbolTooltip } from './symbols';
import '../../styles/app/new-equation.css';

const EXAMPLES: readonly { label: string; rows: string[] }[] = [
  { label: 'Quadratic', rows: ['x^2-5x+6=0'] },
  { label: 'System', rows: ['x^2+y^2=5', 'xy=2'] },
  { label: 'Inequality', rows: ['x^2-4\\le0'] },
  { label: 'Trigonometric', rows: ['\\sin x=\\frac{1}{2}'] },
  { label: 'With an assumption', rows: ['x^2=a', 'a>0'] },
  { label: 'Region', rows: ['x^2+y^2<1', 'y>x'] },
];
const LIMIT_LABELS: Readonly<Record<keyof EquationLimits, string>> = { work: 'Work', allocation: 'Memory (allocation units)' };

export default function NewEquationPage({ instance, runtime }: { instance: WorkspaceInstance; runtime: NewEquationRuntime }) {
  const draft = runtime.draftOf(instance.id), view = runtime.views[instance.id] ?? {};
  const fields = useRef<(MathfieldElement | null)[]>([]);
  // The Example picker closes on an outside press, Escape (focus back to its summary) or Tab out (GRAPHING-UI1).
  const [examplesOpen, setExamplesOpen] = useState(false);
  const examplesMenu = useRef<HTMLDivElement>(null);
  const examplesSummary = useRef<HTMLElement>(null);
  const examplesTriggers = useMemo(() => [examplesSummary], []);
  useLightDismiss({ open: examplesOpen, onClose: () => setExamplesOpen(false), layerRef: examplesMenu, triggerRefs: examplesTriggers });
  const focusRow = useRef<number | undefined>(undefined);
  const keyboardLayouts = useMemo(() => newEquationKeyboardLayouts(), []);
  // The tooltip of the logic symbol under the pointer in a row (∧, ∨, ¬), placed beside it.
  const [hover, setHover] = useState<{ row: number; text: string; x: number; y: number } | undefined>(undefined);
  const hoverAt = (i: number) => (e: PointerEvent<HTMLDivElement>) => {
    const field = fields.current[i];
    if (!field || typeof field.getOffsetFromPoint !== 'function') return;
    // The caret offset nearest the pointer sits beside the symbol: the atom on either side whose box holds the pointer.
    const offset = field.getOffsetFromPoint(e.clientX, e.clientY, { bias: 0 });
    const info = [offset, offset + 1].map(o => field.getElementInfo(o)).find(x => x?.bounds && x.bounds.left <= e.clientX && e.clientX <= x.bounds.right);
    const text = symbolTooltip(info?.latex);
    if (!text) { if (hover) setHover(undefined); return; }
    const box = e.currentTarget.getBoundingClientRect();
    if (hover?.row === i && hover.text === text) return;
    setHover({ row: i, text, x: (info?.bounds?.left ?? e.clientX) - box.left, y: (info?.bounds?.bottom ?? e.clientY) - box.top + 4 });
  };
  // Rows are read off the main thread (TYPING: an unfinished nested row can take long to read); never during render.
  const readings = useRowReadings(instance.id, draft.rows);
  const parsed = readings.settled;
  const targets = resolvedTargets(draft, parsed);
  const check = checkRows(parsed, targets, draft.domain);
  const names = pickOrder(parsed.flatMap(r => (r.kind === 'relation' ? r.symbols : [])));
  const response = view.response;
  const shownRun = view.preview ?? response;
  const outdated = answerOutdated(draft, shownRun, targets);
  const notes = shownRun && !outdated ? shownRun.rowNotes : undefined;
  const update = (patch: Partial<EquationDraft>) => runtime.change(instance.id, { ...draft, ...patch });
  const solve = () => void runtime.run(instance.id);

  // A row added by Shift+Enter or "+ Add row" takes the focus once it is rendered.
  useEffect(() => {
    if (focusRow.current === undefined) return;
    fields.current[focusRow.current]?.focus();
    focusRow.current = undefined;
  });

  const setRow = (i: number, latex: string) => update({ rows: draft.rows.map((r, k) => (k === i ? latex : r)) });
  const addRow = (after: number) => { update({ rows: [...draft.rows.slice(0, after + 1), '', ...draft.rows.slice(after + 1)] }); focusRow.current = after + 1; };
  const removeRow = (i: number) => update({ rows: draft.rows.length > 1 ? draft.rows.filter((_, k) => k !== i) : [''] });
  const rowKeys = (i: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); addRow(i); }
  };
  const setTargets = (next: string[] | null) => update({ targets: next });

  return <main className="new-equation-page" data-testid="new-equation-page">
    <header>
      <div><h1>New Equation</h1><p>Equations, inequalities and systems · exact answers, each verified</p></div>
      <button onClick={runtime.open}>New tab</button>
    </header>

    <section className="ne-panel" aria-label="Rows">
      <ol className="ne-rows">
        {draft.rows.map((latex, i) => {
          const pending = readings.current[i] === undefined, live = check.rows[i], solved = notes?.[i];
          const error = pending ? undefined : live.kind === 'error' ? live.message : solved?.kind === 'error' ? solved.message : undefined;
          return <li key={i} className="ne-row" data-row-kind={pending ? 'reading' : error ? 'error' : live.kind} onKeyDownCapture={rowKeys(i)}>
            <span className="ne-row-number" aria-hidden="true">{i + 1}</span>
            <div className="ne-row-field" onPointerMove={hoverAt(i)} onPointerLeave={() => setHover(undefined)}>
              <MathEditor ref={el => { fields.current[i] = el; }} value={latex} onChange={v => setRow(i, v)} onSubmit={solve} keyboardLayouts={keyboardLayouts}
                placeholder={i === 0 ? 'An equation, inequality or ≠' : 'Another row (optional)'} dataTestId={`new-equation-row-${i + 1}`} />
              {hover?.row === i && <span className="ne-symbol-tip" role="tooltip" data-testid="new-equation-symbol-tip" style={{ left: hover.x, top: hover.y }}>{hover.text}</span>}
              {pending && <p className="ne-row-reading" aria-hidden="true">Reading…</p>}
              {!pending && live.kind === 'assumption' && <p className="ne-row-hint">Assumption: cases where it fails are left out of the answer.</p>}
              {error && <p className="ne-row-note" role="alert">{error}</p>}
            </div>
            <button className="ne-remove" aria-label={`Remove row ${i + 1}`} onClick={() => removeRow(i)}>×</button>
          </li>;
        })}
      </ol>
      <div className="ne-actions">
        <button onClick={() => addRow(draft.rows.length - 1)}>+ Add row</button>
        <details className="ne-examples" open={examplesOpen} onToggle={e => setExamplesOpen(e.currentTarget.open)}>
          <summary ref={examplesSummary}>Example ▾</summary>
          <div role="menu" ref={examplesMenu}>{EXAMPLES.map(x => <button role="menuitem" key={x.label} onClick={() => { update({ rows: [...x.rows], targets: null }); setExamplesOpen(false); }}>{x.label}</button>)}</div>
        </details>
      </div>
      <p className="ne-tip">Enter to solve · Shift+Enter for a new row</p>
    </section>

    <section className="ne-panel ne-setup" aria-label="Setup">
      <div className="ne-solve-for" role="group" aria-label="Solve for">
        <span>Solve for</span>
        {targets.map(t => <span className="ne-chip" key={t}>{t}
          <button aria-label={`Stop solving for ${t}`} onClick={() => setTargets(targets.filter(x => x !== t))}>×</button></span>)}
        {names.filter(n => !targets.includes(n)).length > 0 && <select aria-label="Add an unknown" value="" onChange={e => { if (e.target.value) setTargets([...targets, e.target.value]); }}>
          <option value="">+</option>
          {names.filter(n => !targets.includes(n)).map(n => <option key={n} value={n}>{n}</option>)}
        </select>}
        {draft.targets !== null && <button className="ne-link" onClick={() => setTargets(null)}>Automatic</button>}
      </div>
      <div className="ne-segmented" role="group" aria-label="Number domain">
        <button aria-pressed={draft.domain === 'real'} onClick={() => update({ domain: 'real' })}>Real</button>
        <button aria-pressed={draft.domain === 'complex'} onClick={() => update({ domain: 'complex' })}>Complex</button>
      </div>
    </section>
    {check.orderOverComplex && <p className="ne-message" role="alert">Inequalities need real numbers. <button onClick={() => update({ domain: 'real' })}>Switch to Real</button></p>}
    {check.missingTargets.length > 0 && <p className="ne-message" role="alert">{check.missingTargets.join(', ')} {check.missingTargets.length > 1 ? 'do' : 'does'} not appear in an equation row.</p>}

    <div className="ne-actions ne-run">
      <button className="ne-primary" onClick={solve} disabled={!check.ready && !readings.reading}>{view.running ? 'Restart' : 'Solve'}</button>
      <button disabled={!view.running} onClick={() => runtime.stop(instance.id)}>Stop</button>
      {view.running && !view.preview && <span role="status">Solving…</span>}
      {view.notice && <span role="status">{view.notice}</span>}
    </div>

    {shownRun && <NewEquationAnswer response={response} preview={view.preview} unchecked={view.unchecked} withdrawn={view.withdrawn}
      style={draft.style} outdated={outdated} onStyle={style => update({ style })} onSolve={solve} />}

    <details className="ne-panel ne-limits-panel">
      <summary>Advanced limits</summary>
      <p>Solving stops when it reaches a limit and says which one. Work counts steps; memory counts allocation units, not bytes of RAM. Raise them for very large problems.</p>
      <div className="ne-limits">{(['work', 'allocation'] as const).map(key => <label key={key}>{LIMIT_LABELS[key]}
        <input type="number" aria-label={LIMIT_LABELS[key]} min={0} step="1" value={draft.limits[key]}
          onChange={e => { const n = Number(e.target.value); if (Number.isSafeInteger(n) && n >= 0) update({ limits: { ...draft.limits, [key]: n } }); }} /></label>)}</div>
    </details>

  </main>;
}

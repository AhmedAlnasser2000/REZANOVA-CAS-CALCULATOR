import { writeTextClipboard } from '../../lib/clipboard/system-clipboard';
import { useRef, useState } from 'react';
import type { MathfieldElement } from 'mathlive';
import { MathEditor } from '../../components/MathEditor';
import { MathStatic } from '../../components/MathStatic';
import type { WorkspaceInstance } from '../runtime/workspace-instances';
import type { NewIntegrationRuntime } from '../runtime/useNewIntegrationRuntime';
import { readIntegrationDraft } from '../runtime/new-integration-drafts';
import { MAX_INTEGRATION_ARTIFACT_BYTES, type IntegrationLimits } from '../../lib/calculus/new-integration/types';
import { readRationalPrimitiveV5 } from '../../lib/result-contract/rational-primitive-v5';
import { resolveCanonicalResultForConsumer } from '../../lib/result-contract/consumer';
import { exactSymbolLatex } from '../../lib/result-contract/exact-arithmetic-latex';
import '../../styles/app/new-integration.css';

export default function NewIntegrationPage({instance, runtime}: {instance: WorkspaceInstance; runtime: NewIntegrationRuntime}) {
  const editor = useRef<MathfieldElement>(null), file = useRef<HTMLInputElement>(null);
  const importAction = useRef<'open' | 'verify'>('open');
  const [notice, setNotice] = useState('');
  const draft = readIntegrationDraft(instance.surfaceState), view = runtime.views[instance.id] ?? {};
  const result = view.response, doc = result?.document;
  const formal = doc?.version === 5 ? readRationalPrimitiveV5(doc) : undefined;
  const ordinary = doc?.version === 2 ? resolveCanonicalResultForConsumer(doc.outcomeKind === 'success'
    ? {kind: 'success', canonicalResult: doc} : {kind: 'error', canonicalResult: doc}) : undefined;
  const latex = formal?.latex ?? (ordinary?.ok ? ordinary.presentation.primaryLatex : undefined);
  const conditions = formal?.conditions ?? (ordinary?.ok ? ordinary.presentation.supplements?.map((latex, i, all) => ({origin: i < all.length - 2 ? 'Source exclusion' : i === all.length - 2 ? 'Input denominator' : 'Primitive denominator', latex})) : []);
  const changeSource = (source: string) => runtime.change(instance.id, {...draft, source});
  function insertIntegral() {
    const field = editor.current;
    if (field && !field.selectionIsCollapsed) {
      field.insert(`\\int ${field.getValue(field.selection, 'latex')}\\,d\\placeholder{}`); changeSource(field.getValue('latex')); field.focus();
    } else {changeSource(`\\int ${draft.source || '\\placeholder{}'}\\,d\\placeholder{}`); field?.focus();}
  }
  function exportArtifact() {
    if (!result?.artifact) return;
    const url = URL.createObjectURL(new Blob([result.artifact], {type: 'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'new-integration.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(input: File | undefined) {
    if (!input) return;
    if (input.size > MAX_INTEGRATION_ARTIFACT_BYTES) {setNotice('Artifact exceeds 16 MiB.'); return;}
    try {const text = await input.text(); await runtime.run(instance.id, text, importAction.current);}
    catch (e) {setNotice(e instanceof Error ? e.message : 'Import failed.');}
  }
  const beginImport = (action: 'open' | 'verify') => {importAction.current = action; setNotice(''); file.current?.click();};
  return <main className="new-integration-page" data-testid="new-integration-page">
    <header><div><h1>New Integration</h1><p>Exact rational integration · editable mathematical expressions</p></div><button onClick={runtime.open}>New tab</button></header>
    <section className="ni-editor" aria-label="Integral expression">
      <MathEditor ref={editor} value={draft.source} onChange={changeSource} onSubmit={() => void runtime.run(instance.id)}
        onPasteCanonicalize={text => text} placeholder="Enter an integral with its differential" dataTestId="new-integration-editor" />
      <div className="ni-actions"><button onClick={insertIntegral}>Insert Integral</button>
        <button onClick={() => changeSource('\\int \\frac{1}{x^2+1}\\,dx')}>Example</button>
        <button className="ni-primary" onClick={() => void runtime.run(instance.id)}>{view.running ? 'Restart' : 'Integrate'}</button>
        <button disabled={!view.running} onClick={() => runtime.stop(instance.id)}>Stop</button></div>
      <p>Currently executes one indefinite integral with rational coefficients. The differential selects the variable.</p>
    </section>
    <details className="ni-panel"><summary>Advanced execution limits</summary><p>Work and cumulative allocation count execution activity; they do not measure free RAM. Limits must be finite integers.</p>
      <div className="ni-limits">{(['work', 'allocation', 'integerBits', 'degree'] as const).map(key => <label key={key}>{({work: 'Work', allocation: 'Cumulative allocation', integerBits: 'Integer bits', degree: 'Polynomial degree'} satisfies Record<keyof IntegrationLimits, string>)[key]}
        <input type="number" aria-label={key} min={key === 'integerBits' ? 1 : 0} step="1" value={draft.limits[key]}
          onChange={e => {const n = Number(e.target.value); if (Number.isSafeInteger(n) && n >= (key === 'integerBits' ? 1 : 0)) runtime.change(instance.id, {...draft, limits: {...draft.limits, [key]: n}});}} /></label>)}</div>
    </details>
    <div className="ni-actions"><button onClick={() => beginImport('open')}>Open saved problem</button><button onClick={() => beginImport('verify')}>Verify against current problem</button>
      <input ref={file} data-testid="integration-artifact-file" type="file" accept=".json,application/json" hidden onChange={e => {void importFile(e.target.files?.[0]); e.target.value = '';}} /></div>
    {(notice || view.notice) && <p role="status">{notice || view.notice}</p>}
    {view.running && <p role="status">Computing and verifying the complete answer…</p>}
    {doc && <section className="ni-panel ni-result" data-testid="integration-result" aria-label="Integration result">
      <h2>{doc.title}</h2>
      {result?.request.source !== draft.source && <p>Result for an earlier expression:</p>}
      {result?.request.source !== draft.source && <MathStatic className="ni-math" latex={result?.request.source} block normalizeDisplay={false} />}
      {doc.outcomeKind === 'error' ? <p role="alert">{doc.error}</p> : <>
        <p>Verified · formal local complex primitive. Logarithm choices differ locally by constants.</p>
        {formal ? <div className="ni-formal-answer"><MathStatic className="ni-math" block normalizeDisplay={false} latex={`${formal.document.primary.rationalPart.canonicalLatex}+${formal.document.primary.terms.map((_, i) => `L_{${i + 1}}`).join('+')}+${exactSymbolLatex(formal.document.primary.integrationConstant)}`} />
          {formal.document.primary.terms.map((t, i) => <div className="ni-term" key={t.rootVariable}>
            <MathStatic className="ni-math" block normalizeDisplay={false} latex={`L_{${i + 1}}=\\sum_{q_{${i + 1}}(${exactSymbolLatex(t.rootVariable)})=0}\\left(${t.weight.canonicalLatex}\\right)\\log\\left(G_{${i + 1}}(${exactSymbolLatex(formal.document.primary.variable)},${exactSymbolLatex(t.rootVariable)})\\right)`} />
            <MathStatic className="ni-math" block normalizeDisplay={false} latex={`q_{${i + 1}}(${exactSymbolLatex(t.rootVariable)})=${t.modulus.canonicalLatex}`} />
            <MathStatic className="ni-math" block normalizeDisplay={false} latex={`G_{${i + 1}}(${exactSymbolLatex(formal.document.primary.variable)},${exactSymbolLatex(t.rootVariable)})=${t.argument.canonicalLatex}`} />
            <p>Every distinct root is included once. No root ordering or principal logarithm is selected.</p>
          </div>)}
        </div> : <MathStatic className="ni-math" latex={latex} block normalizeDisplay={false} />}
        <div className="ni-actions"><button onClick={() => {if (latex) void writeTextClipboard(latex).then(ok => setNotice(ok ? 'LaTeX copied.' : 'Clipboard is unavailable.'), () => setNotice('Clipboard is unavailable.'));}}>Copy LaTeX</button>
          <button disabled={!result?.artifact} onClick={exportArtifact}>Export derivation</button></div>
        <details><summary>Conditions</summary>{conditions?.map((c, i) => <div className="ni-condition" key={i}><span>{c.origin}</span><MathStatic className="ni-math" latex={c.latex} block normalizeDisplay={false} /></div>)}</details>
        <details><summary>Verification details</summary><ul>{result?.checks.map(c => <li key={c}>{c}</li>)}</ul><p>{result?.elapsedMs.toFixed(1)} ms · {result?.usage.work.toLocaleString()} work · {result?.usage.allocation.toLocaleString()} cumulative allocation units</p></details>
      </>}
    </section>}
  </main>;
}

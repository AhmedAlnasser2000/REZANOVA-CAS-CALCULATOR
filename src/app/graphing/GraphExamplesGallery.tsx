import { useRef, useState, type RefObject } from 'react';
import { X } from 'lucide-react';
import { MathEditor } from '../../components/MathEditor';
import { useLightDismiss } from '../../components/useLightDismiss';
import {
  GRAPH_EXAMPLE_CATEGORIES,
  GRAPH_EXAMPLES,
  type GraphExample,
  type GraphExampleCategory,
} from './graph-examples';

// The Graph examples gallery (GRAPHING-PIECEWISE2): what Graphing can draw,
// by category. On an empty graph an example simply loads; otherwise the person
// chooses to add it to this graph or open it in a new graph tab, so nothing of
// theirs is replaced.

export function GraphExamplesGallery({ graphEmpty, onAdd, onClose, onLoad, onOpenInNewTab, triggerRefs }: {
  graphEmpty: boolean;
  onAdd: (example: GraphExample) => void;
  onClose: () => void;
  onLoad: (example: GraphExample) => void;
  onOpenInNewTab?: (example: GraphExample) => void;
  /** What can open the gallery; Escape returns focus to the first still on the page. */
  triggerRefs: readonly RefObject<HTMLElement | null>[];
}) {
  const [category, setCategory] = useState<GraphExampleCategory>('curves');
  const [pending, setPending] = useState<GraphExample | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  useLightDismiss({ open: true, onClose, layerRef, triggerRefs });
  const examples = GRAPH_EXAMPLES.filter((example) => example.category === category);
  const choose = (example: GraphExample) => {
    if (graphEmpty) { onLoad(example); onClose(); } else setPending(example);
  };
  return <div aria-label="Graph examples" aria-modal="false" className="graph-examples" data-testid="graph-examples" ref={layerRef} role="dialog">
    <div className="graph-examples-heading">
      <strong>Examples</strong>
      <span>What Graphing can draw. Pick one to try it.</span>
      <button aria-label="Close examples" className="graph-icon-button" onClick={onClose} type="button"><X aria-hidden="true" size={16} /></button>
    </div>
    <div aria-label="Example categories" className="graph-examples-tabs" role="tablist">
      {GRAPH_EXAMPLE_CATEGORIES.map((entry) => <button aria-selected={entry.category === category} key={entry.category}
        onClick={() => { setCategory(entry.category); setPending(null); }} role="tab" title={entry.description} type="button">{entry.title}</button>)}
    </div>
    <p className="graph-examples-description">{GRAPH_EXAMPLE_CATEGORIES.find((entry) => entry.category === category)?.description}</p>
    {pending ? <div className="graph-examples-choice" role="group" aria-label={`Use ${pending.title}`}>
      <p><strong>{pending.title}</strong>: your graph already has items. Where should the example go?</p>
      <div>
        <button className="is-primary" onClick={() => { onAdd(pending); onClose(); }} type="button">Add to this graph</button>
        {onOpenInNewTab ? <button onClick={() => { onOpenInNewTab(pending); onClose(); }} type="button">Open in new graph tab</button> : null}
        <button onClick={() => setPending(null)} type="button">Back</button>
      </div>
    </div> : <div className="graph-examples-grid" role="tabpanel">
      {examples.map((example) => <button className="graph-example-card" data-example-id={example.id} key={example.id}
        onClick={() => choose(example)} type="button">
        <strong>{example.title}</strong>
        <span>{example.description}</span>
        {/* Inert, so the press always reaches the card (a math field would take it). */}
        <span aria-hidden="true" className="graph-example-formula" inert>
          <MathEditor className="graph-example-math" onChange={() => undefined} readOnly value={example.latex.at(-1) ?? ''} />
        </span>
      </button>)}
    </div>}
  </div>;
}

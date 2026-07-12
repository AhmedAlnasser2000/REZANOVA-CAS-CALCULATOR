import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { Braces, CheckCircle2, FileCheck2 } from 'lucide-react';

import { MathStatic } from '../../../../components/MathStatic';

export function NotebookEvidenceNodeView({ node, selected }: ReactNodeViewProps) {
  const inputLatex = String(node.attrs.inputLatex ?? '');
  const resultLatex = String(node.attrs.resultLatex ?? '');
  const facts = Array.isArray(node.attrs.facts)
    ? node.attrs.facts.filter((fact): fact is string => typeof fact === 'string')
    : [];
  const hasEvidence = Boolean(inputLatex || resultLatex || facts.length);

  return (
    <NodeViewWrapper
      className={`notebook-rich-evidence${selected ? ' is-selected' : ''}`}
      data-testid="notebook-evidence-node"
      contentEditable={false}
    >
      <header>
        <span><FileCheck2 aria-hidden="true" size={15} /> {String(node.attrs.title ?? 'Evidence snapshot')}</span>
        <small>{String(node.attrs.source ?? 'manual-placeholder')}</small>
      </header>
      {hasEvidence ? (
        <div className="notebook-evidence-content">
          {inputLatex ? (
            <div><span>Input</span><MathStatic latex={inputLatex} /></div>
          ) : null}
          {resultLatex ? (
            <div><span>Result</span><MathStatic latex={resultLatex} /></div>
          ) : null}
          {facts.map((fact) => (
            <p key={fact}><CheckCircle2 aria-hidden="true" size={14} /> {fact}</p>
          ))}
        </div>
      ) : (
        <div className="notebook-evidence-empty">
          <Braces aria-hidden="true" size={18} />
          <span>Evidence snapshot</span>
        </div>
      )}
    </NodeViewWrapper>
  );
}

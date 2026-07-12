import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { Braces, FileCheck2 } from 'lucide-react';

export function NotebookEvidenceNodeView({ node, selected }: ReactNodeViewProps) {
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
      <div>
        <Braces aria-hidden="true" size={18} />
        <span>Compact evidence snapshot contract</span>
      </div>
    </NodeViewWrapper>
  );
}

import { convertLatexToMarkup } from 'mathlive';

import type { NotebookRichBlockNode } from '../document/types';
import type { NotebookCompatibilityFindingV1 } from './types';

function walk(
  nodes: readonly NotebookRichBlockNode[],
  visit: (node: NotebookRichBlockNode) => void,
) {
  nodes.forEach((node) => {
    visit(node);
    if (node.type === 'section' || node.type === 'semanticBlock') {
      walk(node.content, visit);
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      node.content.forEach((item) => walk(item.content, visit));
    }
  });
}

function mathFallback(latex: string) {
  try {
    const markup = convertLatexToMarkup(latex, { defaultMode: 'math' });
    return !markup || /ML__error|\\error|blacksquare/u.test(markup);
  } catch {
    return true;
  }
}

/** Preflights the same MathLive static conversion used by the PDF renderer. */
export function notebookPdfCompatibilityFindings(
  content: readonly NotebookRichBlockNode[],
): NotebookCompatibilityFindingV1[] {
  const findings: NotebookCompatibilityFindingV1[] = [];
  walk(content, (node) => {
    if (node.type === 'displayMath' && mathFallback(node.latex)) {
      findings.push({
        kind: 'equation-fallback',
        nodeId: node.id,
        message: 'This equation will be printed as its source text because static conversion failed.',
      });
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      node.content?.forEach((inline) => {
        if (inline.type === 'inlineMath' && mathFallback(inline.latex)) {
          findings.push({
            kind: 'equation-fallback',
            nodeId: inline.id,
            message: 'This inline equation will be printed as its source text because static conversion failed.',
          });
        }
      });
    }
  });
  return findings;
}

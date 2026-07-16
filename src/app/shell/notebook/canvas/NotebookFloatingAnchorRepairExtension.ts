import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { isNotebookObjectPlacement } from '../../../../lib/notebook/document/object-placement';

type ParagraphReference = { id: string; position: number };

function paragraphReferences(doc: ProseMirrorNode) {
  const paragraphs: ParagraphReference[] = [];
  doc.descendants((node, position) => {
    if (node.type.name === 'paragraph' && typeof node.attrs.id === 'string') {
      paragraphs.push({ id: node.attrs.id, position });
    }
  });
  return paragraphs;
}

function descendantParagraphIds(node: ProseMirrorNode) {
  const ids = new Set<string>();
  node.descendants((descendant) => {
    if (descendant.type.name === 'paragraph' && typeof descendant.attrs.id === 'string') {
      ids.add(descendant.attrs.id);
    }
  });
  return ids;
}

function replacementParagraphId(
  anchorId: string,
  oldParagraphs: readonly ParagraphReference[],
  newParagraphs: readonly ParagraphReference[],
  excludedIds: ReadonlySet<string>,
) {
  const survivingIds = new Set(
    newParagraphs.filter(({ id }) => !excludedIds.has(id)).map(({ id }) => id),
  );
  const oldIndex = oldParagraphs.findIndex(({ id }) => id === anchorId);
  if (oldIndex >= 0) {
    for (let index = oldIndex - 1; index >= 0; index -= 1) {
      const candidate = oldParagraphs[index]?.id;
      if (candidate && survivingIds.has(candidate)) return candidate;
    }
    for (let index = oldIndex + 1; index < oldParagraphs.length; index += 1) {
      const candidate = oldParagraphs[index]?.id;
      if (candidate && survivingIds.has(candidate)) return candidate;
    }
  }
  return newParagraphs.find(({ id }) => !excludedIds.has(id))?.id;
}

export const NotebookFloatingAnchorRepair = Extension.create({
  name: 'notebookFloatingAnchorRepair',

  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('notebook-floating-anchor-repair'),
      appendTransaction: (transactions, oldState, newState) => {
        if (!transactions.some((transaction) => transaction.docChanged)) return null;
        const oldParagraphs = paragraphReferences(oldState.doc);
        const newParagraphs = paragraphReferences(newState.doc);
        const newParagraphIds = new Set(newParagraphs.map(({ id }) => id));
        const transaction = newState.tr;
        let changed = false;
        newState.doc.descendants((node, position) => {
          const placement = node.attrs.notebookObjectPlacement;
          if (!isNotebookObjectPlacement(placement)
            || placement.mode !== 'floating'
            || placement.anchor.kind !== 'paragraph'
            || newParagraphIds.has(placement.anchor.nodeId)) {
            return;
          }
          const replacementId = replacementParagraphId(
            placement.anchor.nodeId,
            oldParagraphs,
            newParagraphs,
            descendantParagraphIds(node),
          );
          transaction.setNodeMarkup(position, undefined, {
            ...node.attrs,
            notebookObjectPlacement: {
              ...placement,
              anchor: replacementId
                ? { kind: 'paragraph', nodeId: replacementId }
                : { kind: 'page', pageNumber: 1 },
            },
          });
          changed = true;
        });
        return changed ? transaction : null;
      },
    })];
  },
});

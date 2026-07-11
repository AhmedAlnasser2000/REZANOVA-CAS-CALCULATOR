import { createNotebookNodeIdFactory, type NotebookRichFactoryOptions } from './model';
import type {
  NotebookRichBlockNode,
  NotebookStarterTemplateId,
} from './types';

export const NOTEBOOK_STARTER_TEMPLATES: readonly {
  id: NotebookStarterTemplateId;
  label: string;
  description: string;
}[] = [
  { id: 'lecture-notes', label: 'Lecture Notes', description: 'Organize a topic, key ideas, and examples.' },
  { id: 'worked-example', label: 'Worked Example', description: 'Write a problem, solution, and verification.' },
  { id: 'theorem-sheet', label: 'Theorem Sheet', description: 'State results with proofs and notes.' },
  { id: 'exercise-set', label: 'Exercise Set', description: 'Create exercises with optional hints and answers.' },
];

function paragraph(id: string, text = ''): NotebookRichBlockNode {
  return {
    type: 'paragraph',
    id,
    ...(text ? { content: [{ type: 'text', text }] } : {}),
  };
}

export function createNotebookStarterContent(
  templateId: NotebookStarterTemplateId,
  options: NotebookRichFactoryOptions = {},
): NotebookRichBlockNode[] {
  const nextId = createNotebookNodeIdFactory(options);
  const semantic = (
    variant: 'theorem' | 'proof' | 'example' | 'solution' | 'exercise' | 'hint' | 'answer' | 'note',
    text: string,
  ): NotebookRichBlockNode => ({
    type: 'semanticBlock',
    id: nextId(variant),
    variant,
    collapsed: variant === 'hint' || variant === 'answer',
    content: [paragraph(nextId('paragraph'), text)],
  });

  if (templateId === 'lecture-notes') {
    return [
      { type: 'heading', id: nextId('heading'), level: 2, content: [{ type: 'text', text: 'Topic' }] },
      paragraph(nextId('paragraph')),
      semantic('note', 'Key idea'),
      semantic('example', 'Example'),
    ];
  }
  if (templateId === 'worked-example') {
    return [semantic('example', 'Problem'), semantic('solution', 'Authored solution'), semantic('note', 'Verification')];
  }
  if (templateId === 'theorem-sheet') {
    return [semantic('theorem', 'Statement'), semantic('proof', 'Proof'), semantic('note', 'Conditions and consequences')];
  }
  return [semantic('exercise', 'Exercise'), semantic('hint', 'Hint'), semantic('answer', 'Answer')];
}

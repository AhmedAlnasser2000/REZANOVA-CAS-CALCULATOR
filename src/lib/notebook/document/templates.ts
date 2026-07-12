import { createNotebookNodeIdFactory, type NotebookRichFactoryOptions } from './model';
import type {
  NotebookInlineNode,
  NotebookRichBlockNode,
  NotebookSemanticKind,
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

export function createNotebookStarterContent(
  templateId: NotebookStarterTemplateId,
  options: NotebookRichFactoryOptions = {},
): NotebookRichBlockNode[] {
  const nextId = createNotebookNodeIdFactory(options);
  const text = (value: string): NotebookInlineNode => ({ type: 'text', text: value });
  const math = (sourceText: string, latex = sourceText): NotebookInlineNode => ({
    type: 'inlineMath',
    id: nextId('inlineMath'),
    sourceText,
    latex,
    workspaceTarget: 'calculate',
  });
  const paragraph = (...content: NotebookInlineNode[]): NotebookRichBlockNode => ({
    type: 'paragraph',
    id: nextId('paragraph'),
    ...(content.length ? { content } : {}),
  });
  const heading = (value: string, level: 1 | 2 | 3 = 2): NotebookRichBlockNode => ({
    type: 'heading',
    id: nextId('heading'),
    level,
    content: [text(value)],
  });
  const displayMath = (
    sourceText: string,
    latex: string,
    workspaceTarget: 'calculate' | 'equation' = 'calculate',
  ): NotebookRichBlockNode => ({
    type: 'displayMath',
    id: nextId('displayMath'),
    sourceText,
    latex,
    workspaceTarget,
  });
  const semantic = (
    variant: NotebookSemanticKind,
    content: NotebookRichBlockNode[],
    metadata: { label?: string; number?: string; collapsed?: boolean } = {},
  ): NotebookRichBlockNode => ({
    type: 'semanticBlock',
    id: nextId(variant),
    variant,
    ...metadata,
    content,
  });

  if (templateId === 'lecture-notes') {
    return [
      heading('Lecture topic', 1),
      paragraph(text('State the central question and the assumptions learners need.')),
      semantic('definition', [
        paragraph(text('Define the main object in precise language and place notation such as '), math('f(x)'), text(' directly in the prose.')),
      ], { label: 'Key concept' }),
      semantic('example', [
        paragraph(text('Work through one representative case, then connect it to the definition.')),
      ]),
      semantic('note', [paragraph(text('Record a useful interpretation, exception, or teaching note.'))]),
    ];
  }

  if (templateId === 'worked-example') {
    return [
      heading('Quadratic Equations: Factoring and Evidence', 1),
      paragraph(text('Solve a quadratic equation by factoring and verify the authored conclusion.')),
      semantic('example', [
        paragraph(text('Solve '), math('x^2-5x+6=0', 'x^2-5x+6=0'), text(' over the real numbers.')),
        displayMath('x^2-5x+6=0', 'x^2-5x+6=0', 'equation'),
      ], { label: 'Problem' }),
      semantic('solution', [
        paragraph(text('Factor the polynomial as '), math('(x-2)(x-3)=0', '(x-2)(x-3)=0'), text('.')),
        paragraph(text('Therefore '), math('x=2 or x=3', 'x=2\\text{ or }x=3'), text('.')),
      ], { label: 'Authored solution' }),
      {
        type: 'evidenceSnapshot',
        id: nextId('evidenceSnapshot'),
        source: 'manual-placeholder',
        title: 'Verification evidence',
        inputLatex: 'x^2-5x+6=0',
        resultLatex: 'x\\in\\{2,3\\}',
        facts: ['Both values substitute to zero.'],
        warnings: [],
      },
      semantic('note', [
        paragraph(text('This page uses authored reasoning and compact evidence rather than generated steps.')),
      ], { label: 'Authoring note' }),
    ];
  }

  if (templateId === 'theorem-sheet') {
    return [
      heading('Limit Laws', 1),
      paragraph(text('State each law with its conditions, then add an authored proof or example.')),
      semantic('theorem', [
        paragraph(text('If '), math('lim f(x)=L', '\\lim_{x\\to a}f(x)=L'), text(' and '), math('lim g(x)=M', '\\lim_{x\\to a}g(x)=M'), text(', then the sum law gives')),
        displayMath('lim(f+g)=L+M', '\\lim_{x\\to a}(f(x)+g(x))=L+M'),
      ], { number: '2.3.2', label: 'Limit Laws' }),
      semantic('proof', [paragraph(text('Write the argument and cite the exact hypotheses used at each transition.'))]),
      semantic('corollary', [paragraph(text('Record a direct consequence of the theorem.'))]),
    ];
  }

  return [
    heading('Practice Set', 1),
    paragraph(text('Author exercises, optional hints, and learner-facing answers.')),
    semantic('exercise', [
      paragraph(text('Evaluate '), math('lim x->2 (x^2-4)/(x-2)', '\\lim_{x\\to 2}\\frac{x^2-4}{x-2}'), text('.')),
    ], { number: '1' }),
    semantic('hint', [paragraph(text('Factor the numerator before substituting.'))], { collapsed: true }),
    semantic('answer', [paragraph(text('The limit is '), math('4'), text('.'))], { collapsed: true }),
  ];
}

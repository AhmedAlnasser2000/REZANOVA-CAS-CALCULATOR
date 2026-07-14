import type {
  NotebookBlock,
  NotebookDocument,
  NotebookEvidenceSnapshotBlock,
  NotebookMathEditorBlock,
  NotebookLegacySurfaceState,
  NotebookSurfaceState,
  NotebookTextBlock,
  NotebookWorkspaceTarget,
} from './types';
import {
  NOTEBOOK_DTO_VERSION,
  NOTEBOOK_SURFACE_STATE_KIND,
} from './types';

type NotebookFactoryOptions = {
  idPrefix?: string;
  now?: () => Date;
};

export const NOTEBOOK_FORBIDDEN_PACKAGE_FIELDS = [
  'history',
  'variables',
  'displayBlocks',
  'mathJson',
  'solverObject',
  'orderOfExecutionEnvelope',
  'diagnostics',
  'hostCommand',
  'localPath',
  'appState',
  'executableCode',
] as const;

export const NOTEBOOK_PACKAGE_BOUNDARY = {
  version: NOTEBOOK_DTO_VERSION,
  forbiddenFields: NOTEBOOK_FORBIDDEN_PACKAGE_FIELDS,
  futurePackageKinds: ['notebook', 'guidance-pack', 'learner-copy'],
} as const;

function isoNow(options: NotebookFactoryOptions = {}) {
  return (options.now ?? (() => new Date()))().toISOString();
}

function blockTimestamp(options: NotebookFactoryOptions = {}) {
  const timestamp = isoNow(options);
  return {
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function idFor(prefix: string, options: NotebookFactoryOptions = {}) {
  const stamp = (options.now ?? (() => new Date()))().getTime();
  return `${options.idPrefix ?? 'notebook'}.${prefix}.${stamp}`;
}

export function createNotebookTextBlock(
  text: string,
  options: NotebookFactoryOptions = {},
): NotebookTextBlock {
  return {
    id: idFor('text', options),
    kind: 'text',
    text,
    marks: [],
    mathSpans: [],
    ...blockTimestamp(options),
  };
}

export function createNotebookMathEditorBlock(
  options: NotebookFactoryOptions & {
    label?: string;
    latex?: string;
    workspaceTarget?: NotebookWorkspaceTarget;
  } = {},
): NotebookMathEditorBlock {
  return {
    id: idFor('math', options),
    kind: 'math-editor',
    label: options.label ?? 'Math input',
    latex: options.latex ?? '',
    workspaceTarget: options.workspaceTarget ?? 'calculate',
    ...blockTimestamp(options),
  };
}

export function createNotebookEvidencePlaceholderBlock(
  options: NotebookFactoryOptions = {},
): NotebookEvidenceSnapshotBlock {
  return {
    id: idFor('evidence', options),
    kind: 'evidence-snapshot',
    snapshot: {
      id: idFor('snapshot', options),
      source: 'manual-placeholder',
      title: 'Evidence snapshot',
      facts: [],
      warnings: [],
    },
    ...blockTimestamp(options),
  };
}

export function createNotebookDocument(
  options: NotebookFactoryOptions & {
    title?: string;
  } = {},
): NotebookDocument {
  const createdAt = isoNow(options);
  const textBlock = createNotebookTextBlock(
    'Write a solution note here. Try natural math such as lim x->0 sin(x)/x = 1 or x^2-5x+6=0.',
    options,
  );

  return {
    version: NOTEBOOK_DTO_VERSION,
    id: idFor('document', options),
    title: options.title ?? 'Untitled Notebook',
    createdAt,
    updatedAt: createdAt,
    selectedBlockId: textBlock.id,
    blocks: [
      {
        id: idFor('heading', options),
        kind: 'heading',
        level: 1,
        text: options.title ?? 'Untitled Notebook',
        createdAt,
        updatedAt: createdAt,
      },
      textBlock,
      createNotebookMathEditorBlock(options),
      createNotebookEvidencePlaceholderBlock(options),
    ],
  };
}

export function createNotebookSurfaceState(
  options: NotebookFactoryOptions & {
    title?: string;
  } = {},
): NotebookLegacySurfaceState {
  return {
    kind: NOTEBOOK_SURFACE_STATE_KIND,
    document: createNotebookDocument(options),
  };
}

export function isNotebookSurfaceState(value: unknown): value is NotebookLegacySurfaceState {
  return Boolean(
    value
      && typeof value === 'object'
      && (value as NotebookSurfaceState).kind === NOTEBOOK_SURFACE_STATE_KIND
      && (value as NotebookLegacySurfaceState).document?.version === NOTEBOOK_DTO_VERSION,
  );
}

export function notebookSurfaceStateFromSlot(
  value: unknown,
  options: NotebookFactoryOptions = {},
) {
  return isNotebookSurfaceState(value) ? value : createNotebookSurfaceState(options);
}

export function updateNotebookBlock(
  document: NotebookDocument,
  blockId: string,
  update: (block: NotebookBlock) => NotebookBlock,
): NotebookDocument {
  const updatedAt = new Date().toISOString();
  return {
    ...document,
    updatedAt,
    blocks: document.blocks.map((block) =>
      block.id === blockId ? { ...update(block), updatedAt } : block),
  };
}

export function selectNotebookBlock(
  document: NotebookDocument,
  blockId: string,
): NotebookDocument {
  if (!document.blocks.some((block) => block.id === blockId)) {
    return document;
  }

  return {
    ...document,
    selectedBlockId: blockId,
    updatedAt: new Date().toISOString(),
  };
}

export function insertNotebookBlockAfter(
  document: NotebookDocument,
  afterBlockId: string,
  block: NotebookBlock,
): NotebookDocument {
  const index = document.blocks.findIndex((candidate) => candidate.id === afterBlockId);
  const blocks = [...document.blocks];
  blocks.splice(index < 0 ? blocks.length : index + 1, 0, block);
  return {
    ...document,
    blocks,
    selectedBlockId: block.id,
    updatedAt: new Date().toISOString(),
  };
}

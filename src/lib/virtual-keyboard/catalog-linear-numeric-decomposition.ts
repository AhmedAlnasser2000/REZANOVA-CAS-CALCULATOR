import type { KeyboardKeySpec } from '../../types/calculator';

const COMMON: Pick<
  KeyboardKeySpec,
  'capability' | 'supportLevel' | 'pageId' | 'lessonRef' | 'modeVisibility'
> = {
  capability: 'linear-algebra-core',
  supportLevel: 'insert',
  pageId: 'matrixVec',
  lessonRef: 'milestone-04-linear-algebra-core',
  modeVisibility: ['matrix'],
};

export const LINEAR_NUMERIC_DECOMPOSITION_KEYS = [
  {
    ...COMMON,
    id: 'lin-svd',
    label: 'svd',
    action: { kind: 'insert-template', latex: '\\operatorname{svd}\\left(#0\\right)' },
    duplicateGroup: 'linear-svd',
  },
  {
    ...COMMON,
    id: 'lin-pinv',
    label: 'pinv',
    action: { kind: 'insert-template', latex: '\\operatorname{pinv}\\left(#0\\right)' },
    duplicateGroup: 'linear-pinv',
  },
  {
    ...COMMON,
    id: 'lin-cond',
    label: 'cond',
    action: { kind: 'insert-template', latex: '\\operatorname{cond}\\left(#0\\right)' },
    duplicateGroup: 'linear-cond',
  },
  {
    ...COMMON,
    id: 'lin-nrank',
    label: 'nrank',
    action: { kind: 'insert-template', latex: '\\operatorname{nrank}\\left(#0\\right)' },
    duplicateGroup: 'linear-nrank',
  },
] as const satisfies readonly KeyboardKeySpec[];

import type { InlineShortcutDefinitions } from 'mathlive';
import type { ModeId } from '../types/calculator';
import {
  derivativeInlineShortcuts,
  isDerivativeShortcutContext,
} from '../lib/input/derivative-shortcuts';

type InlineShortcutContext = {
  modeId?: ModeId;
  profile?: 'default' | 'graphing';
  screenHint?: string;
};

const LIMIT_SHORTCUT_SCREENS = new Set([
  'limit',
  'finiteLimit',
  'infiniteLimit',
]);

function isLimitShortcutContext(context?: InlineShortcutContext) {
  return context?.modeId === 'calculus'
    && LIMIT_SHORTCUT_SCREENS.has(context.screenHint ?? '');
}

function withoutAmbiguousWordShortcuts(
  existing: InlineShortcutDefinitions | undefined,
  excluded: ReadonlySet<string>,
) {
  if (!existing) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(existing).filter(([shortcut]) => !excluded.has(shortcut)),
  );
}

const SET_MEMBERSHIP_WORD_SHORTCUTS = new Set(['in', '!in']);

function safeExistingShortcuts(
  existing: InlineShortcutDefinitions | undefined,
  context?: InlineShortcutContext,
) {
  if (isLimitShortcutContext(context) || context?.profile === 'graphing') {
    return withoutAmbiguousWordShortcuts(existing, SET_MEMBERSHIP_WORD_SHORTCUTS);
  }
  return existing ?? {};
}

function limitInlineShortcuts() {
  return {
    infinity: '\\infty',
    infinty: '\\infty',
    infty: '\\infty',
  };
}

export function buildInlineShortcutOverrides(
  existing: InlineShortcutDefinitions | undefined,
  context?: InlineShortcutContext,
): InlineShortcutDefinitions {
  const limitContext = isLimitShortcutContext(context);

  return {
    ...safeExistingShortcuts(existing, context),
    sin: '\\sin',
    cos: '\\cos',
    tan: '\\tan',
    int: '\\int #?\\,dx',
    arcsin: '\\arcsin',
    arccos: '\\arccos',
    arctan: '\\arctan',
    asin: '\\arcsin',
    acos: '\\arccos',
    atan: '\\arctan',
    sinh: '\\sinh',
    cosh: '\\cosh',
    tanh: '\\tanh',
    sech: '\\operatorname{sech}',
    csch: '\\operatorname{csch}',
    coth: '\\operatorname{coth}',
    ln: '\\ln',
    log: '\\log',
    sqrt: '\\sqrt{#?}',
    abs: '\\left|#?\\right|',
    pi: '\\pi',
    ...(limitContext ? limitInlineShortcuts() : {}),
    ...(isDerivativeShortcutContext(context) ? derivativeInlineShortcuts() : {}),
  };
}

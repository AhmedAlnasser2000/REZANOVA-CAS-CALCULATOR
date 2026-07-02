import type { InlineShortcutDefinitions } from 'mathlive';
import type { ModeId } from '../types/calculator';
import {
  derivativeInlineShortcuts,
  isDerivativeShortcutContext,
} from '../lib/input/derivative-shortcuts';

type InlineShortcutContext = {
  modeId?: ModeId;
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

function limitSafeExistingShortcuts(existing: InlineShortcutDefinitions | undefined) {
  if (!existing) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(existing).filter(([shortcut]) => shortcut !== 'in'),
  );
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
    ...(limitContext ? limitSafeExistingShortcuts(existing) : (existing ?? {})),
    sin: '\\sin',
    cos: '\\cos',
    tan: '\\tan',
    int: '\\int #?\\,dx',
    asin: '\\arcsin',
    acos: '\\arccos',
    atan: '\\arctan',
    ln: '\\ln',
    log: '\\log',
    sqrt: '\\sqrt{#?}',
    abs: '\\left|#?\\right|',
    pi: '\\pi',
    ...(limitContext ? limitInlineShortcuts() : {}),
    ...(isDerivativeShortcutContext(context) ? derivativeInlineShortcuts() : {}),
  };
}

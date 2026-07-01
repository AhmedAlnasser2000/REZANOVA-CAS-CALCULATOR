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

export function buildInlineShortcutOverrides(
  existing: InlineShortcutDefinitions | undefined,
  context?: InlineShortcutContext,
): InlineShortcutDefinitions {
  return {
    ...(existing ?? {}),
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
    ...(isDerivativeShortcutContext(context) ? derivativeInlineShortcuts() : {}),
  };
}

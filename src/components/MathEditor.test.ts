import { describe, expect, it } from 'vitest';
import {
  configureMathLiveRuntime,
  MATHLIVE_SOUNDS_DIRECTORY,
} from '../mathlive-runtime';
import {
  shouldHandlePlainMathOperator,
  shouldHandlePlainSpace,
} from './math-editor-keyflow';
import { buildInlineShortcutOverrides } from './math-editor-shortcuts';

describe('MathEditor inline shortcuts', () => {
  it('keeps the typed integral shortcut as an indefinite-integral template', () => {
    const shortcuts = buildInlineShortcutOverrides({ foo: 'bar' });

    expect(shortcuts.foo).toBe('bar');
    expect(shortcuts.int).toBe('\\int #?\\,dx');
  });

  it('keeps function shortcuts as lightweight commands', () => {
    const shortcuts = buildInlineShortcutOverrides(undefined);

    expect(shortcuts.sin).toBe('\\sin');
    expect(shortcuts.ln).toBe('\\ln');
    expect(shortcuts.sqrt).toBe('\\sqrt{#?}');
    expect(shortcuts.pd).toBeUndefined();
  });

  it('adds derivative shortcuts only on guided derivative screens', () => {
    const derivativeShortcuts = buildInlineShortcutOverrides(undefined, {
      modeId: 'calculus',
      screenHint: 'partialDerivative',
    });
    const limitShortcuts = buildInlineShortcutOverrides(undefined, {
      modeId: 'calculus',
      screenHint: 'finiteLimit',
    });

    expect(derivativeShortcuts.pd).toBe('\\partial');
    expect(derivativeShortcuts.ddx).toBe('\\frac{d}{dx}');
    expect(derivativeShortcuts.pdx).toBe('\\frac{\\partial}{\\partial x}');
    expect(derivativeShortcuts.pdtheta).toBe('\\frac{\\partial}{\\partial \\theta}');
    expect(limitShortcuts.pd).toBeUndefined();
  });

  it('protects Limit infinity typing from the global set-membership shortcut', () => {
    const equationShortcuts = buildInlineShortcutOverrides({
      in: '\\in',
      foo: 'bar',
    }, {
      modeId: 'equation',
      screenHint: 'symbolic',
    });
    const limitShortcuts = buildInlineShortcutOverrides({
      in: '\\in',
      foo: 'bar',
    }, {
      modeId: 'calculus',
      screenHint: 'limit',
    });

    expect(equationShortcuts.in).toBe('\\in');
    expect(limitShortcuts.in).toBeUndefined();
    expect(limitShortcuts.foo).toBe('bar');
    expect(limitShortcuts.infinity).toBe('\\infty');
    expect(limitShortcuts.infinty).toBe('\\infty');
    expect(limitShortcuts.infty).toBe('\\infty');
  });
});

describe('MathEditor cursor keyflow', () => {
  it('recognizes plain space as editor spacing input', () => {
    expect(shouldHandlePlainSpace({
      altKey: false,
      ctrlKey: false,
      key: ' ',
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent)).toBe(true);

    expect(shouldHandlePlainSpace({
      altKey: false,
      ctrlKey: true,
      key: ' ',
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent)).toBe(false);
  });

  it('recognizes plain plus and minus as direct math operator input', () => {
    expect(shouldHandlePlainMathOperator({
      altKey: false,
      ctrlKey: false,
      key: '+',
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent)).toBe(true);

    expect(shouldHandlePlainMathOperator({
      altKey: false,
      ctrlKey: false,
      key: '-',
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent)).toBe(true);

    expect(shouldHandlePlainMathOperator({
      altKey: false,
      ctrlKey: true,
      key: '+',
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent)).toBe(false);
  });
});

describe('MathLive runtime configuration', () => {
  it('turns MathLive sounds off cleanly', () => {
    const target = {
      keypressSound: 'keypress-standard.wav' as string | null,
      plonkSound: 'plonk.wav',
      soundsDirectory: './sounds' as string | null,
    };

    configureMathLiveRuntime(target);

    expect(target.soundsDirectory).toBe(MATHLIVE_SOUNDS_DIRECTORY);
    expect(target.soundsDirectory).toBeNull();
    expect(target.keypressSound).toBeNull();
    expect(target.plonkSound).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import {
  configureMathLiveRuntime,
  MATHLIVE_SOUNDS_DIRECTORY,
} from '../mathlive-runtime';
import {
  moveMathfieldCursorWithBoundaryWrap,
  shouldHandlePlainHorizontalArrow,
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
  });
});

describe('MathEditor cursor keyflow', () => {
  it('wraps left and right only at whole-field boundaries', () => {
    const field = {
      commandLog: [] as string[],
      executeCommand(command: string) {
        this.commandLog.push(command);
        return false;
      },
      lastOffset: 3,
      position: 0,
      selectionIsCollapsed: true,
    };

    expect(moveMathfieldCursorWithBoundaryWrap(field, 'left')).toBe(true);
    expect(field.position).toBe(3);
    expect(field.commandLog).toEqual(['moveToPreviousChar']);

    expect(moveMathfieldCursorWithBoundaryWrap(field, 'right')).toBe(true);
    expect(field.position).toBe(0);
    expect(field.commandLog).toEqual(['moveToPreviousChar', 'moveToNextChar']);
  });

  it('lets MathLive handle boundary arrows before wrapping', () => {
    const field = {
      commandLog: [] as string[],
      executeCommand(command: string) {
        this.commandLog.push(command);
        return true;
      },
      lastOffset: 3,
      position: 3,
      selectionIsCollapsed: true,
    };

    expect(moveMathfieldCursorWithBoundaryWrap(field, 'right')).toBe(true);
    expect(field.position).toBe(3);
    expect(field.commandLog).toEqual(['moveToNextChar']);
  });

  it('delegates horizontal arrows inside the field to MathLive', () => {
    const field = {
      commandLog: [] as string[],
      executeCommand(command: string) {
        this.commandLog.push(command);
        return true;
      },
      lastOffset: 3,
      position: 1,
      selectionIsCollapsed: true,
    };

    expect(moveMathfieldCursorWithBoundaryWrap(field, 'right')).toBe(true);
    expect(field.commandLog).toEqual(['moveToNextChar']);

    expect(moveMathfieldCursorWithBoundaryWrap(field, 'left')).toBe(true);
    expect(field.commandLog).toEqual(['moveToNextChar', 'moveToPreviousChar']);
  });

  it('only intercepts plain horizontal arrow keys', () => {
    expect(shouldHandlePlainHorizontalArrow({
      altKey: false,
      ctrlKey: false,
      key: 'ArrowLeft',
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent)).toBe(true);

    expect(shouldHandlePlainHorizontalArrow({
      altKey: false,
      ctrlKey: false,
      key: 'ArrowRight',
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent)).toBe(false);
  });

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

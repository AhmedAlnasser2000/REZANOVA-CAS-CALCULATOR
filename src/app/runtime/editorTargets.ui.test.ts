import { describe, expect, it, vi } from 'vitest';
import {
  executeLatexEditorCommand,
  insertLatexIntoEditor,
} from './editorTargets';
import type { MathfieldElement } from 'mathlive';

describe('editorTargets', () => {
  it('focuses the active editor without scrolling before keypad insertion', () => {
    const field = {
      focus: vi.fn(),
      insert: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MathfieldElement;

    insertLatexIntoEditor({ current: field }, { current: null }, '\\sin(x)');

    expect(field.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(field.insert).toHaveBeenCalledWith('\\sin(x)');
  });

  it('focuses the active editor without scrolling before cursor commands', () => {
    const field = {
      focus: vi.fn(),
      executeCommand: vi.fn(),
      insert: vi.fn(),
    } as unknown as MathfieldElement;

    executeLatexEditorCommand({ current: field }, { current: null }, 'moveToNextChar');

    expect(field.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(field.executeCommand).toHaveBeenCalledWith('moveToNextChar');
  });
});

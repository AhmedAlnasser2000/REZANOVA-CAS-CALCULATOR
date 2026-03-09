import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

class MockMathFieldElement extends HTMLElement {
  private latexValue = '';

  readOnly = false;

  smartFence = true;

  inlineShortcuts: Record<string, string> = {};

  placeholder = '';

  mathVirtualKeyboardPolicy = 'auto';

  getValue() {
    return this.latexValue;
  }

  setValue(value: string) {
    this.latexValue = value;
    this.setAttribute('data-value', value);
  }
}

beforeAll(() => {
  if (!customElements.get('math-field')) {
    customElements.define('math-field', MockMathFieldElement);
  }

  if (!window.mathVirtualKeyboard) {
    const virtualKeyboard = new EventTarget() as unknown as Window['mathVirtualKeyboard'];
    (virtualKeyboard as { layouts: unknown; editToolbar: string }).layouts = [];
    (virtualKeyboard as { layouts: unknown; editToolbar: string }).editToolbar = 'default';
    window.mathVirtualKeyboard = virtualKeyboard;
  }

  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
    },
  });

  document.execCommand = vi.fn().mockReturnValue(true);
});

afterEach(() => {
  cleanup();
});

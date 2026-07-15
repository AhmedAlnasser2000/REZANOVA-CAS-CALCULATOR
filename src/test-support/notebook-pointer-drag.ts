import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

export function dragNotebookBlockForTest(
  source: Element,
  target: Element,
  placement: 'before' | 'after',
) {
  const original = document.elementsFromPoint;
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value: () => [target],
  });
  const rect = vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
    bottom: 146,
    height: 46,
    left: 20,
    right: 260,
    top: 100,
    width: 240,
    x: 20,
    y: 100,
    toJSON: () => ({}),
  });
  const clientY = placement === 'before' ? 90 : 140;
  fireEvent.pointerDown(source, { button: 0, clientX: 230, clientY: 300, pointerId: 7 });
  fireEvent.pointerMove(window, { clientX: 80, clientY, pointerId: 7 });
  const renderedPlacement = document.querySelector<HTMLElement>(
    '.notebook-block-drop-guide',
  )?.dataset.placement;
  fireEvent.pointerUp(window, { clientX: 80, clientY, pointerId: 7 });
  rect.mockRestore();
  if (original) {
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: original,
    });
  } else {
    Reflect.deleteProperty(document, 'elementsFromPoint');
  }
  return renderedPlacement;
}

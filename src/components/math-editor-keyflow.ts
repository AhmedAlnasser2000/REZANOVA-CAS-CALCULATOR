import type * as React from 'react';

type MathfieldCursorCommandTarget = {
  executeCommand?: (command: MathfieldMoveCommand) => boolean;
  lastOffset?: number;
  position?: number;
  selectionIsCollapsed?: boolean;
};

export type MathfieldCursorDirection = 'left' | 'right';
type MathfieldMoveCommand = 'moveToPreviousChar' | 'moveToNextChar';

function hasCollapsedBoundarySelection(field: MathfieldCursorCommandTarget) {
  return (
    field.selectionIsCollapsed === true
    && Number.isFinite(field.position)
    && Number.isFinite(field.lastOffset)
  );
}

export function moveMathfieldCursorWithBoundaryWrap(
  field: MathfieldCursorCommandTarget | null | undefined,
  direction: MathfieldCursorDirection,
) {
  if (!field) {
    return false;
  }

  const command = direction === 'left' ? 'moveToPreviousChar' : 'moveToNextChar';

  if (hasCollapsedBoundarySelection(field)) {
    const lastOffset = Math.max(0, field.lastOffset ?? 0);
    const position = field.position ?? 0;
    const atBoundary =
      (direction === 'left' && position <= 0)
      || (direction === 'right' && position >= lastOffset);

    if (atBoundary) {
      const commandHandled = field.executeCommand?.(command) ?? false;
      if (commandHandled) {
        return true;
      }

      field.position = direction === 'left' ? lastOffset : 0;
      return true;
    }
  }

  return field.executeCommand?.(command) ?? false;
}

export function shouldHandlePlainHorizontalArrow(event: KeyboardEvent | React.KeyboardEvent) {
  return (
    (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
  );
}

export function shouldHandlePlainSpace(event: KeyboardEvent | React.KeyboardEvent) {
  return (
    event.key === ' '
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
  );
}

import type * as React from 'react';

function isComposingKeyEvent(event: KeyboardEvent | React.KeyboardEvent) {
  const domComposing = (event as KeyboardEvent).isComposing;
  if (typeof domComposing === 'boolean') {
    return domComposing;
  }

  return Boolean((event as React.KeyboardEvent).nativeEvent?.isComposing);
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

export function shouldHandlePlainEnter(event: KeyboardEvent | React.KeyboardEvent) {
  return (
    event.key === 'Enter'
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
    && !isComposingKeyEvent(event)
  );
}

export function shouldHandlePlainMathOperator(event: KeyboardEvent | React.KeyboardEvent) {
  return (
    (event.key === '+' || event.key === '-')
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
  );
}

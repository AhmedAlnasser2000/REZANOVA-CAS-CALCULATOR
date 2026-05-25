import type * as React from 'react';

export function shouldHandlePlainSpace(event: KeyboardEvent | React.KeyboardEvent) {
  return (
    event.key === ' '
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
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

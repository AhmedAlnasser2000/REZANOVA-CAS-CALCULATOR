import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * Keyboard handling for a small `role="menu"`: arrows move between items
 * (wrapping), Home and End jump to the ends, Escape closes the menu and
 * returns focus to the button that opened it.
 */
export function graphMenuKeyDown(close: () => void) {
  return (event: ReactKeyboardEvent<HTMLElement>) => {
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focus = (next: number) => { event.preventDefault(); items[(next + items.length) % items.length]?.focus(); };
    if (event.key === 'ArrowDown') focus(index + 1);
    else if (event.key === 'ArrowUp') focus(index < 0 ? items.length - 1 : index - 1);
    else if (event.key === 'Home') focus(0);
    else if (event.key === 'End') focus(items.length - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      const opener = event.currentTarget.parentElement?.querySelector<HTMLElement>('[aria-haspopup="menu"]');
      close();
      opener?.focus();
    }
  };
}

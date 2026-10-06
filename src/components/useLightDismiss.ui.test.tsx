import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useLightDismiss } from './useLightDismiss';

function Menu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [triggers] = useState(() => [trigger]);
  useLightDismiss({ open, onClose: () => setOpen(false), layerRef: layer, triggerRefs: triggers });
  return <div>
    <button onClick={() => setOpen((value) => !value)} ref={trigger} type="button">{name}</button>
    {open ? <div aria-label={`${name} menu`} ref={layer} role="menu"><button type="button">{name} item</button></div> : null}
  </div>;
}

function Harness({ onGraphPress }: { onGraphPress: () => void }) {
  return <>
    <Menu name="First" />
    <Menu name="Second" />
    <div data-graph-dismiss-swallow="" data-testid="graph" onPointerDown={onGraphPress} />
    <div data-testid="elsewhere" />
  </>;
}

describe('useLightDismiss (GRAPHING-UI1)', () => {
  it('closes on an outside press but not on a press inside the menu or its trigger', () => {
    render(<Harness onGraphPress={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'First item' }));
    expect(screen.getByRole('menu', { name: 'First menu' })).toBeTruthy();
    fireEvent.pointerDown(screen.getByTestId('elsewhere'));
    expect(screen.queryByRole('menu', { name: 'First menu' })).toBeNull();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    render(<Harness onGraphPress={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    screen.getByRole('button', { name: 'First item' }).focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'First menu' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));
  });

  it('closes when focus moves out, and keeps one menu open at a time', () => {
    render(<Harness onGraphPress={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    fireEvent.click(screen.getByRole('button', { name: 'Second' }));
    expect(screen.queryByRole('menu', { name: 'First menu' })).toBeNull();
    expect(screen.getByRole('menu', { name: 'Second menu' })).toBeTruthy();
    fireEvent.focusIn(screen.getByRole('button', { name: 'First' }));
    expect(screen.queryByRole('menu', { name: 'Second menu' })).toBeNull();
  });

  it('swallows the press that closes a menu over the graph, and lets the next one through', () => {
    const onGraphPress = vi.fn();
    render(<Harness onGraphPress={onGraphPress} />);
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    fireEvent.pointerDown(screen.getByTestId('graph'));
    expect(screen.queryByRole('menu', { name: 'First menu' })).toBeNull();
    expect(onGraphPress).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByTestId('graph'));
    expect(onGraphPress).toHaveBeenCalledTimes(1);
  });
});

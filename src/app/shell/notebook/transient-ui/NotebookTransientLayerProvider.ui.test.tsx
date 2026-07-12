import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  NotebookTransientLayerProvider,
} from './NotebookTransientLayerProvider';
import { useNotebookTransientLayer } from './useNotebookTransientLayer';

function Layer({ id, label, parentId }: { id: string; label: string; parentId?: string }) {
  const layer = useNotebookTransientLayer({ id, parentId });
  return (
    <div>
      <button data-notebook-transient-trigger={layer.id} type="button" onClick={layer.toggle}>{label}</button>
      {layer.isOpen ? (
        <div data-notebook-transient-layer={layer.id} role="dialog" aria-label={`${label} layer`}>
          {label} content
        </div>
      ) : null}
    </div>
  );
}

function Harness() {
  return (
    <NotebookTransientLayerProvider>
      <Layer id="first" label="First" />
      <Layer id="second" label="Second" />
      <Layer id="child" label="Child" parentId="first" />
      <button type="button">Outside</button>
    </NotebookTransientLayerProvider>
  );
}

describe('NotebookTransientLayerProvider', () => {
  it('keeps unrelated siblings mutually exclusive', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'First' }));
    expect(screen.getByRole('dialog', { name: 'First layer' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Second' }));
    expect(screen.queryByRole('dialog', { name: 'First layer' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Second layer' })).toBeInTheDocument();
  });

  it('dismisses one nested layer for one Escape press and ignores repeat', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'First' }));
    await user.click(screen.getByRole('button', { name: 'Child' }));
    fireEvent.keyDown(document, { key: 'Escape', repeat: false });
    expect(screen.queryByRole('dialog', { name: 'Child layer' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'First layer' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape', repeat: true });
    expect(screen.getByRole('dialog', { name: 'First layer' })).toBeInTheDocument();
    fireEvent.keyUp(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Child' })).toHaveFocus();
  });

  it('dismisses the active chain on outside pointer input', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'First' }));
    await user.click(screen.getByRole('button', { name: 'Child' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

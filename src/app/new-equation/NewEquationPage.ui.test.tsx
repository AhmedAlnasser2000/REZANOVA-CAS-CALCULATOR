import { fireEvent, render, screen } from '@testing-library/react';
import { forwardRef } from 'react';
import { expect, it, vi } from 'vitest';
import NewEquationPage from './NewEquationPage';
import { blankEquationDraft } from '../runtime/new-equation-drafts';
import type { NewEquationRuntime } from '../runtime/useNewEquationRuntime';
import type { WorkspaceInstance } from '../runtime/workspace-instances';
import type { EquationDraft } from '../../lib/new-equation/types';

vi.mock('../../components/MathEditor', () => ({
  MathEditor: forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; onSubmit?: () => void; dataTestId?: string }>(
    ({ value, onChange, onSubmit, dataTestId }, ref) => <input ref={ref} data-testid={dataTestId} value={value}
      onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) onSubmit?.(); }} />),
}));

function setup(initial: Partial<EquationDraft> = {}) {
  let draft: EquationDraft = { ...blankEquationDraft(), ...initial };
  const runtime = {
    views: {}, open: vi.fn(), run: vi.fn(), stop: vi.fn(), draftOf: () => draft,
    change: vi.fn((_id: string, next: EquationDraft) => { draft = next; }),
  } as unknown as NewEquationRuntime;
  const instance = { id: 'tab-1' } as WorkspaceInstance;
  const view = render(<NewEquationPage instance={instance} runtime={runtime} />);
  const rerender = () => view.rerender(<NewEquationPage instance={instance} runtime={runtime} />);
  return { runtime, rerender, draft: () => draft };
}

it('solves on Enter and adds a row below on Shift+Enter, with the tip shown', () => {
  const t = setup({ rows: ['x^2=1', ''] });
  expect(screen.getByText('Enter to solve · Shift+Enter for a new row')).toBeTruthy();
  fireEvent.keyDown(screen.getByTestId('new-equation-row-1'), { key: 'Enter' });
  expect(t.runtime.run).toHaveBeenCalledWith('tab-1');
  fireEvent.keyDown(screen.getByTestId('new-equation-row-1'), { key: 'Enter', shiftKey: true });
  expect(t.draft().rows).toEqual(['x^2=1', '', '']);
  expect(t.runtime.run).toHaveBeenCalledTimes(1);
});

it('adds and removes rows, and loads examples with automatic unknowns', () => {
  const t = setup({ rows: ['x=1'] , targets: ['y'] });
  fireEvent.click(screen.getByRole('button', { name: '+ Add row' }));
  expect(t.draft().rows).toEqual(['x=1', '']);
  t.rerender();
  fireEvent.click(screen.getByRole('button', { name: 'Remove row 1' }));
  expect(t.draft().rows).toEqual(['']);
  fireEvent.click(screen.getByRole('menuitem', { name: 'System' }));
  expect(t.draft()).toMatchObject({ rows: ['x^2+y^2=5', 'xy=2'], targets: null });
});

it('shows automatic unknowns as chips, edits them, and returns to automatic', () => {
  const t = setup({ rows: ['x^2=a', 'a>0'] });
  expect(screen.getByRole('group', { name: 'Solve for' }).textContent).toContain('x');
  expect(screen.getByText('Assumption: cases where it fails are left out of the answer.')).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Add an unknown' }), { target: { value: 'a' } });
  expect(t.draft().targets).toEqual(['x', 'a']);
  t.rerender();
  fireEvent.click(screen.getByRole('button', { name: 'Stop solving for a' }));
  expect(t.draft().targets).toEqual(['x']);
  t.rerender();
  fireEvent.click(screen.getByRole('button', { name: 'Automatic' }));
  expect(t.draft().targets).toBeNull();
});

it('marks inequalities over ℂ, offers Switch to Real and blocks Solve', () => {
  const t = setup({ rows: ['x^2-4\\le0'], domain: 'complex' });
  expect(screen.getAllByText('Inequalities need real numbers.').length).toBeGreaterThan(0);
  expect((screen.getByRole('button', { name: 'Solve' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Real' }));
  expect(t.draft().domain).toBe('real');
});

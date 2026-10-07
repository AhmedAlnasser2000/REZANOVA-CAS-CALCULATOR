import { act, fireEvent, render, screen } from '@testing-library/react';
import { forwardRef } from 'react';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { blankEquationDraft } from '../runtime/new-equation-drafts';
import type { NewEquationRuntime } from '../runtime/useNewEquationRuntime';
import type { WorkspaceInstance } from '../runtime/workspace-instances';
import type { EquationDraft } from '../../lib/new-equation/types';
import { parseRow } from '../../lib/new-equation/parse';
import { ROW_READ_DEBOUNCE_MS } from './useRowReadings';
import NewEquationPage from './NewEquationPage';

// Typing freeze (NEW-EQUATION-RESPONSIVE1): an unfinished nested row once took minutes to parse on the main thread.
vi.mock('../../lib/new-equation/parse', async original => {
  const actual = await original<typeof import('../../lib/new-equation/parse')>();
  return { ...actual, parseRow: vi.fn(actual.parseRow) };
});
vi.mock('../../components/MathEditor', () => ({
  MathEditor: forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; dataTestId?: string }>(
    ({ value, onChange, dataTestId }, ref) => <input ref={ref} data-testid={dataTestId} value={value} onChange={e => onChange(e.target.value)} />),
}));

const workers: { posted: string[]; terminated: boolean }[] = [];
beforeAll(() => {
  vi.useFakeTimers();
  vi.stubGlobal('Worker', class {
    posted: string[] = [];
    terminated = false;
    onmessage = null;
    onerror = null;
    constructor() { workers.push(this); }
    postMessage(latex: string) { this.posted.push(latex); }
    terminate() { this.terminated = true; }
  });
});
afterAll(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('never parses on the main thread while typing; an edit abandons the old read', () => {
  let draft: EquationDraft = { ...blankEquationDraft(), rows: [''] };
  const runtime = { views: {}, open: vi.fn(), run: vi.fn(), stop: vi.fn(), draftOf: () => draft,
    change: vi.fn((_id: string, next: EquationDraft) => { draft = next; }) } as unknown as NewEquationRuntime;
  const instance = { id: 'tab-1' } as WorkspaceInstance;
  const view = render(<NewEquationPage instance={instance} runtime={runtime} />);
  const type = (latex: string) => {
    fireEvent.change(screen.getByTestId('new-equation-row-1'), { target: { value: latex } });
    view.rerender(<NewEquationPage instance={instance} runtime={runtime} />);
  };
  const nest = '\\left(\\left(\\left(\\left(\\left(x+';
  for (let i = 1; i <= nest.length; i += 6) type(nest.slice(0, i));
  type(nest);
  expect(workers.flatMap(w => w.posted)).toEqual([]);
  act(() => { vi.advanceTimersByTime(ROW_READ_DEBOUNCE_MS); });
  expect(workers.at(-1)?.posted).toEqual([nest]);
  expect(screen.getByRole('button', { name: 'Solve' })).toHaveProperty('disabled', false);
  type(`${nest}1`);
  act(() => { vi.advanceTimersByTime(ROW_READ_DEBOUNCE_MS); });
  expect(workers.at(-2)?.terminated).toBe(true);
  expect(workers.at(-1)?.posted).toEqual([`${nest}1`]);
  expect(vi.mocked(parseRow)).not.toHaveBeenCalled();
});

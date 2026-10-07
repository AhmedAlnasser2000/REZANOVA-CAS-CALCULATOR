import { fireEvent, render, screen } from '@testing-library/react';
import { forwardRef } from 'react';
import type { VirtualKeyboardLayout } from 'mathlive';
import { expect, it, vi } from 'vitest';
import NewEquationPage from './NewEquationPage';
import { LOGIC_SYMBOLS, newEquationKeyboardLayouts, symbolTooltip } from './symbols';
import { blankEquationDraft } from '../runtime/new-equation-drafts';
import type { NewEquationRuntime } from '../runtime/useNewEquationRuntime';
import type { WorkspaceInstance } from '../runtime/workspace-instances';

// Logic symbols in New Equation (EQUATION-SEMIALGEBRAIC1): keyboard keys with tooltips, and tooltips on hover in rows.
const seen = vi.hoisted(() => ({ layouts: vi.fn() }));
vi.mock('../../components/MathEditor', () => ({
  MathEditor: forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; dataTestId?: string; keyboardLayouts?: readonly VirtualKeyboardLayout[] }>(
    ({ value, onChange, dataTestId, keyboardLayouts }, ref) => { seen.layouts(keyboardLayouts); return <input ref={ref} data-testid={dataTestId} value={value} onChange={e => onChange(e.target.value)} />; }),
}));

function setup(rows: string[]) {
  const draft = { ...blankEquationDraft(), rows };
  const runtime = { views: {}, open: vi.fn(), run: vi.fn(), stop: vi.fn(), draftOf: () => draft, change: vi.fn() } as unknown as NewEquationRuntime;
  render(<NewEquationPage instance={{ id: 'tab-1' } as WorkspaceInstance} runtime={runtime} />);
}

it('adds a Logic keyboard page whose ∧ ∨ ¬ keys carry tooltips, after the Equation pages', () => {
  const layouts = newEquationKeyboardLayouts(), logic = layouts[layouts.length - 1] as { rows: { label?: string; tooltip?: string }[][] };
  expect(layouts.length).toBeGreaterThan(1);
  expect(logic.rows[0].map(k => k.label)).toEqual(['∧', '∨', '¬', '∀', '∃']);
  expect(symbolTooltip('\\forall')).toMatch(/for all/);
  expect(logic.rows[0].every(k => k.tooltip && k.tooltip.length > 10)).toBe(true);
  expect(symbolTooltip('\\vee')).toBe(LOGIC_SYMBOLS[1].tooltip);
  expect(symbolTooltip('x')).toBeUndefined();
  setup(['x<0\\lor x>1']);
  const given = seen.layouts.mock.calls.at(-1)?.[0] as readonly VirtualKeyboardLayout[];
  expect(given[given.length - 1].id).toBe('new-equation-logic');
});

it('shows the tooltip of the symbol under the pointer in a row, and hides it off the symbol', () => {
  setup(['x<0\\lor x>1']);
  const input = screen.getByTestId('new-equation-row-1') as HTMLInputElement & Record<string, unknown>;
  const at = { latex: '\\lor' as string | undefined };
  input.getOffsetFromPoint = () => 3;
  input.getElementInfo = (o: number) => (o === 3 ? { latex: at.latex, bounds: { left: 40, right: 50, bottom: 30 } } : undefined);
  const field = input.parentElement as HTMLElement;
  fireEvent.pointerMove(field, { clientX: 45, clientY: 20 });
  expect(screen.getByTestId('new-equation-symbol-tip').textContent).toBe(LOGIC_SYMBOLS[1].tooltip);
  at.latex = 'x';
  fireEvent.pointerMove(field, { clientX: 45, clientY: 20 });
  expect(screen.queryByTestId('new-equation-symbol-tip')).toBeNull();
  at.latex = '\\neg';
  fireEvent.pointerMove(field, { clientX: 45, clientY: 20 });
  expect(screen.getByRole('tooltip').textContent).toContain('not (¬)');
  fireEvent.pointerLeave(field);
  expect(screen.queryByRole('tooltip')).toBeNull();
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { NewEquationAnswer } from './NewEquationAnswer';
import { executeEquation } from '../../lib/symbolic-engine/equation/service/service';
import { DEFAULT_EQUATION_LIMITS } from '../../lib/new-equation/types';
import { writeTextClipboard } from '../../lib/clipboard/system-clipboard';

vi.mock('../../lib/clipboard/system-clipboard', () => ({ writeTextClipboard: vi.fn(async () => true) }));
const solve = (rows: string[], targets = ['x']) => executeEquation({ rows, targets, domain: 'real', limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });

it('shows the answer, the verified line, the assumption, the style toggle and exact copies', async () => {
  const onStyle = vi.fn();
  render(<NewEquationAnswer response={solve(['x^2=a', 'a>0'])} style="exact" outdated={false} onStyle={onStyle} onSolve={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Answer' })).toBeTruthy();
  expect(screen.getByTestId('new-equation-verified').textContent).toContain('Verified exactly');
  fireEvent.click(screen.getByRole('button', { name: 'Decimal' }));
  expect(onStyle).toHaveBeenCalledWith('decimal');
  fireEvent.click(screen.getByRole('button', { name: 'Copy text' }));
  await waitFor(() => expect(writeTextClipboard).toHaveBeenCalledWith('Assuming a > 0\nx = √a\nx = -√a'));
  fireEvent.click(screen.getByRole('button', { name: 'Copy LaTeX' }));
  await waitFor(() => expect(vi.mocked(writeTextClipboard).mock.calls[1][0]).toContain('\\text{Assuming }'));
});

it('marks an outdated answer and offers Solve again', () => {
  const onSolve = vi.fn();
  render(<NewEquationAnswer response={solve(['x^2=4'])} style="both" outdated onStyle={vi.fn()} onSolve={onSolve} />);
  expect(screen.getByTestId('new-equation-answer').getAttribute('data-outdated')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Solve again' }));
  expect(onSolve).toHaveBeenCalled();
});

it('words an unsolved problem plainly, with no verified line and no copy', () => {
  render(<NewEquationAnswer response={solve(['\\cos x=x'])} style="exact" outdated={false} onStyle={vi.fn()} onSolve={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'No answer' })).toBeTruthy();
  expect(screen.getByText(/^Not solved yet:/)).toBeTruthy();
  expect(screen.queryByTestId('new-equation-verified')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Copy LaTeX' })).toBeNull();
});

it('shows row errors from the input as a message', () => {
  render(<NewEquationAnswer response={solve(['x^2=a', 'a>1', 'a<0'])} style="exact" outdated={false} onStyle={vi.fn()} onSolve={vi.fn()} />);
  expect(screen.getByRole('alert').textContent).toBe('These assumptions cannot all hold.');
});

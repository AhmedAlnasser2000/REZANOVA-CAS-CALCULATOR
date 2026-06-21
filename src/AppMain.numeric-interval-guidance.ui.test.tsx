import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  openEquationSymbolic,
  renderAppMain,
  setMathFieldLatex,
} from './test/renderAppMain';

async function waitForDisplayOutcomeSuccess() {
  await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
  await waitFor(() => {
    expect(screen.getByTestId('display-status')).not.toHaveTextContent('Rendering result');
  });
}

describe('AppMain numeric interval guidance', () => {
  it('fills Numeric Interval Solve bounds from periodic suggested intervals without running', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1');
    await user.click(screen.getByTestId('soft-action-solve'));
    await waitForDisplayOutcomeSuccess();

    await user.click(await screen.findByRole('button', { name: 'Numeric Solve' }));
    await screen.findByText('Numeric Interval Solve');
    expect(screen.getByText(/it does not prove every root was found/i)).toBeInTheDocument();

    const subdivisionsInput = screen.getByLabelText('Subdivisions');
    await user.clear(subdivisionsInput);
    await user.type(subdivisionsInput, '777');

    const [suggestionButton] = await screen.findAllByRole('button', { name: /near x/i });
    const match = suggestionButton.textContent?.match(/\[([^,]+), ([^\]]+)\]/);
    expect(match).toBeTruthy();
    const [, start, end] = match ?? [];

    await user.click(suggestionButton);

    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe(start);
    expect((screen.getByLabelText('End') as HTMLInputElement).value).toBe(end);
    expect((subdivisionsInput as HTMLInputElement).value).toBe('777');
    expect(screen.queryByText('Route: Numeric Interval')).not.toBeInTheDocument();
  });
});

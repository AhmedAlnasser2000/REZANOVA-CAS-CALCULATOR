import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  openLauncherApp,
  renderAppMain,
  setMathFieldLatex,
} from '../../test/renderAppMain';

describe('Statistics Guided and Expression workspace', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('mounts one display authority inside Statistics and imports a valid expression', async () => {
    const { user } = await renderAppMain();
    await openLauncherApp(user, 'Data', 'Statistics');

    const host = await screen.findByTestId('statistics-display-panel-host');
    expect(within(host).getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Guided' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByTestId('main-editor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('display-outcome-success')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Expression' }));
    const editor = await screen.findByTestId('main-editor');
    expect(host).toContainElement(editor);
    expect(editor.getAttribute('data-value')).toContain('descriptive(values=');

    setMathFieldLatex('main-editor', 'regression(points={(1,2),(2,4),(3,6)})');
    await user.click(screen.getByRole('tab', { name: 'Probability' }));
    expect(screen.getByTestId('main-editor')).toHaveAttribute(
      'data-value',
      'regression(points={(1,2),(2,4),(3,6)})',
    );

    await user.click(screen.getByRole('radio', { name: 'Guided' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Relationships' }))
      .toHaveAttribute('aria-selected', 'true'));
    expect(screen.queryByTestId('main-editor')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Point 1 x value')).toHaveValue('1');
    expect(screen.getByLabelText('Point 3 y value')).toHaveValue('6');
    expect(screen.queryByTestId('display-outcome-success')).not.toBeInTheDocument();
  });

  it('keeps invalid expression text and its parser error in Expression mode', async () => {
    const { user } = await renderAppMain();
    await openLauncherApp(user, 'Data', 'Statistics');
    await user.click(screen.getByRole('radio', { name: 'Expression' }));
    await screen.findByTestId('main-editor');

    setMathFieldLatex('main-editor', 'normal(mean=0,sd=1,event=between)');
    await user.click(screen.getByRole('radio', { name: 'Guided' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'event=between needs lower=... and upper=....',
    );
    expect(screen.getByRole('radio', { name: 'Expression' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('main-editor')).toHaveAttribute(
      'data-value',
      'normal(mean=0,sd=1,event=between)',
    );
  });
});

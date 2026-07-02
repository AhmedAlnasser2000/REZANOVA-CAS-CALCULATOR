import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  openLauncherApp,
  renderAppMain,
  setMathFieldLatex,
} from '../../test/renderAppMain';

describe('Linear algebra editor source', () => {
  it('uses the main editor for Matrix and Vector without secondary notation pads', async () => {
    const { user } = await renderAppMain();

    await openLauncherApp(user, 'Linear', 'Matrix');
    await screen.findByText('Matrix Workspace');

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-placeholder', 'Enter a Matrix expression');
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();
    expect(screen.queryByText('Matrix Notation Pad')).not.toBeInTheDocument();
    setMathFieldLatex('main-editor', 'A+B');
    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'A+B'));

    await openLauncherApp(user, 'Linear', 'Vector');
    await screen.findByText('Vector Workspace');

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-placeholder', 'Enter a Vector expression');
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '');
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();
    expect(screen.queryByText('Vector Notation Pad')).not.toBeInTheDocument();
    setMathFieldLatex('main-editor', 'A\\cdot B');
    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'A\\cdot B'));
  });
});

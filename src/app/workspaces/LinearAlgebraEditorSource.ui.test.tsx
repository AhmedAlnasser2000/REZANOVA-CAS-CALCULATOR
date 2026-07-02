import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  openLauncherApp,
  renderAppMain,
  setMathFieldLatex,
} from '../../test/renderAppMain';

describe('Linear algebra editor source', () => {
  it('uses the main editor for Matrix and Vector without secondary notation pads', async () => {
    const { user } = await renderAppMain();

    expect(screen.queryByTestId('keypad-linear-rank')).not.toBeInTheDocument();
    expect(screen.getByTestId('keypad-sqrt')).toBeInTheDocument();

    await openLauncherApp(user, 'Linear', 'Matrix');
    await screen.findByText('Matrix Workspace');

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-placeholder', 'Enter a Matrix expression');
    expect(screen.getByTestId('keypad-linear-matrix-template')).toHaveTextContent('[ ]');
    expect(screen.getByTestId('keypad-linear-rank')).toHaveTextContent('rank');
    expect(screen.getByTestId('keypad-linear-rref')).toHaveTextContent('rref');
    expect(screen.queryByTestId('keypad-sqrt')).not.toBeInTheDocument();
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();
    expect(screen.queryByText('Matrix Notation Pad')).not.toBeInTheDocument();
    setMathFieldLatex('main-editor', 'A+B');
    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'A+B'));

    await openLauncherApp(user, 'Linear', 'Vector');
    await screen.findByText('Vector Workspace');

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-placeholder', 'Enter a Vector expression');
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '');
    expect(screen.getByText('Vector u')).toBeInTheDocument();
    expect(screen.getByText('Vector v')).toBeInTheDocument();
    expect(screen.queryByText('Vector A')).not.toBeInTheDocument();
    expect(screen.getByTestId('keypad-linear-vector-template')).toHaveTextContent('vec');
    expect(screen.getByTestId('keypad-linear-vector-u')).toHaveTextContent('u');
    expect(screen.getByTestId('keypad-linear-vector-v')).toHaveTextContent('v');
    expect(screen.getByTestId('keypad-linear-dot')).toHaveTextContent('dot');
    expect(screen.getByTestId('keypad-linear-cross')).toHaveTextContent('cross');
    expect(screen.queryByTestId('keypad-linear-rank')).not.toBeInTheDocument();
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();
    expect(screen.queryByText('Vector Notation Pad')).not.toBeInTheDocument();
    setMathFieldLatex('main-editor', 'u\\cdot v');
    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'u\\cdot v'));
  });

  it('focuses the Matrix editor from keypad clicks and backs out with Escape', async () => {
    const { user } = await renderAppMain();

    await openLauncherApp(user, 'Linear', 'Matrix');
    await screen.findByText('Matrix Workspace');

    const editor = screen.getByTestId('main-editor');
    editor.blur();
    await user.click(screen.getByTestId('keypad-linear-rank'));

    await waitFor(() => expect(editor).toHaveAttribute(
      'data-value',
      '\\operatorname{rank}\\left(#0\\right)',
    ));

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.launcher-panel')).toBeInTheDocument());
  });
});

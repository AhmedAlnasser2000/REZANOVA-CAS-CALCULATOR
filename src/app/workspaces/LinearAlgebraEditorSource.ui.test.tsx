import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  openLauncherApp,
  renderAppMain,
  setMathFieldLatex,
} from '../../test/renderAppMain';

describe('Linear algebra editor source', () => {
  it('keeps per-tab scalar selectors and validates i against the selected domain', async () => {
    const { user } = await renderAppMain();
    await user.click(screen.getByTestId('variables-toggle'));
    await screen.findByTestId('variables-panel');
    fireEvent.change(screen.getByTestId('variables-name-input'), { target: { value: 'a' } });
    fireEvent.change(screen.getByTestId('variables-value-input'), { target: { value: '5' } });
    await user.click(screen.getByTestId('variables-set-button'));
    await screen.findByTestId('variables-entry');
    await user.click(within(screen.getByTestId('variables-panel')).getByRole('button', { name: /close/i }));
    await openLauncherApp(user, 'Linear', 'Matrix');
    await screen.findByText('Matrix Workspace');

    expect(screen.getByLabelText('Scalar domain')).toHaveValue('real');
    expect(screen.getByLabelText('Parameter substitution')).toHaveValue('symbolic');
    const cell = screen.getByLabelText('Matrix A row 1 column 1') as HTMLElement & {
      setValue: (value: string) => void;
    };
    cell.setValue('i');
    fireEvent.input(cell);
    fireEvent.keyDown(cell, { key: 'Enter' });
    expect(await screen.findByRole('alert', {}, { timeout: 5_000 }))
      .toHaveTextContent('The imaginary unit i requires Complex mode.');

    fireEvent.change(screen.getByLabelText('Scalar domain'), { target: { value: 'complex' } });
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    cell.setValue('a');
    fireEvent.input(cell);
    fireEvent.change(screen.getByLabelText('Parameter substitution'), {
      target: { value: 'use-stored-values' },
    });
    await screen.findByText('Used: a=5');
    expect(cell).toHaveAttribute('data-value', 'a');
    expect(screen.getByTitle('Resolved stored-value preview')).toHaveTextContent('→ 5');

    await openLauncherApp(user, 'Linear', 'Vector');
    await screen.findByText('Vector Workspace');
    expect(screen.getByLabelText('Scalar domain')).toHaveValue('real');
    expect(screen.getByLabelText('Parameter substitution')).toHaveValue('symbolic');
  });

  it('moves between Matrix and Vector scalar cells with arrow keys at cell edges', async () => {
    const { user } = await renderAppMain();

    await openLauncherApp(user, 'Linear', 'Matrix');
    await screen.findByText('Matrix Workspace');

    const a11 = screen.getByLabelText('Matrix A row 1 column 1') as HTMLElement & {
      lastOffset: number;
      position: number;
      selectionIsCollapsed: boolean;
      setValue: (value: string) => void;
    };
    const a12 = screen.getByLabelText('Matrix A row 1 column 2') as HTMLElement & {
      lastOffset: number;
      position: number;
      selectionIsCollapsed: boolean;
    };
    const a21 = screen.getByLabelText('Matrix A row 2 column 1') as HTMLElement;

    a11.focus();
    a11.setValue('a');
    fireEvent.input(a11);
    a11.position = a11.lastOffset;
    a11.selectionIsCollapsed = true;
    fireEvent.keyDown(a11, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(a12);
    expect(a12.position).toBe(0);

    a12.selectionIsCollapsed = true;
    a12.position = 0;
    fireEvent.keyDown(a12, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(a11);
    expect(a11.position).toBe(a11.lastOffset);

    fireEvent.keyDown(a11, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(a21);

    await openLauncherApp(user, 'Linear', 'Vector');
    await screen.findByText('Vector Workspace');

    const u1 = screen.getByLabelText('Vector u component 1') as HTMLElement & {
      lastOffset: number;
      position: number;
      selectionIsCollapsed: boolean;
      setValue: (value: string) => void;
    };
    const u2 = screen.getByLabelText('Vector u component 2') as HTMLElement & {
      position: number;
      selectionIsCollapsed: boolean;
    };

    u1.focus();
    u1.setValue('p');
    fireEvent.input(u1);
    u1.position = u1.lastOffset;
    u1.selectionIsCollapsed = true;
    fireEvent.keyDown(u1, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(u2);
    expect(u2.position).toBe(0);

    u2.selectionIsCollapsed = true;
    u2.position = 0;
    fireEvent.keyDown(u2, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(u1);
  });

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
    expect(screen.getByTestId('keypad-linear-basis')).toHaveTextContent('basis');
    expect(screen.getByTestId('keypad-linear-charpoly')).toHaveTextContent('char');
    expect(screen.getByTestId('keypad-linear-7')).toHaveTextContent('7');
    expect(screen.getByTestId('keypad-left')).toHaveTextContent('◄');
    expect(screen.queryByTestId('keypad-sqrt')).not.toBeInTheDocument();
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();
    expect(screen.queryByText('Matrix Notation Pad')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Matrix' })).toBeInTheDocument();
    expect(screen.getByLabelText('Active Matrix left operand')).toHaveAttribute('data-value', 'matrix-a');
    expect(screen.getByLabelText('Active Matrix left operand')).toHaveTextContent('A');
    expect(screen.getByLabelText('Active Matrix right operand')).toHaveAttribute('data-value', 'matrix-b');
    expect(screen.getByLabelText('Active Matrix right operand')).toHaveTextContent('B');
    const matrixACard = screen.getByLabelText('Matrix A rows').closest('.editor-card') as HTMLElement;
    expect(screen.getByLabelText('Matrix A rows')).toHaveValue(2);
    expect(screen.getByLabelText('Matrix A columns')).toHaveValue(2);
    const matrixAGrid = matrixACard.querySelector('.matrix-grid') as HTMLElement;
    expect(within(matrixAGrid).getAllByRole('textbox')).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('Matrix A columns'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Matrix A rows'), { target: { value: '3' } });
    await waitFor(() => expect(screen.getByLabelText('Matrix A columns')).toHaveValue(3));
    expect(screen.getByLabelText('Matrix A rows')).toHaveValue(3);
    expect(within(matrixAGrid).getAllByRole('textbox')).toHaveLength(9);
    fireEvent.change(screen.getByLabelText('Matrix A columns'), { target: { value: '5' } });
    await waitFor(() => expect(screen.getByLabelText('Matrix A columns')).toHaveValue(5));
    expect(matrixACard).toHaveClass('linear-algebra-value-card--wide');
    expect(within(matrixAGrid).getAllByRole('textbox')).toHaveLength(15);
    setMathFieldLatex('main-editor', 'A+B');
    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'A+B'));
    await user.click(screen.getByTestId('keypad-layer-ctrl'));
    expect(screen.getByTestId('keypad-linear-invertible')).toHaveTextContent('definite');
    expect(screen.getByTestId('keypad-linear-rank')).toHaveTextContent('nrank');
    expect(screen.getByTestId('keypad-linear-eigen')).toHaveTextContent('cond');
    expect(screen.getByTestId('keypad-linear-inverse')).toHaveTextContent('pinv');
    expect(screen.getByTestId('keypad-linear-qr')).toHaveTextContent('svd');
    await user.click(screen.getByTestId('keypad-layer-shift'));
    expect(screen.getByTestId('keypad-linear-eigen')).toHaveTextContent('diagz');
    expect(screen.getByTestId('keypad-linear-basis')).toHaveTextContent('coords');
    expect(screen.getByTestId('keypad-linear-charpoly')).toHaveTextContent('pow');
    await user.click(screen.getByTestId('keypad-layer-base'));

    await openLauncherApp(user, 'Linear', 'Vector');
    await screen.findByText('Vector Workspace');

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-placeholder', 'Enter a Vector expression');
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '');
    expect(screen.getByLabelText('Vector u name')).toBeInTheDocument();
    expect(screen.getByLabelText('Vector v name')).toBeInTheDocument();
    expect(screen.queryByText('Vector A')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Vector' })).toBeInTheDocument();
    expect(screen.getByLabelText('Active Vector first operand')).toHaveAttribute('data-value', 'vector-u');
    expect(screen.getByLabelText('Active Vector first operand')).toHaveTextContent('u');
    expect(screen.getByLabelText('Active Vector second operand')).toHaveAttribute('data-value', 'vector-v');
    expect(screen.getByLabelText('Active Vector second operand')).toHaveTextContent('v');
    expect(screen.getByTestId('keypad-linear-vector-template')).toHaveTextContent('vec');
    expect(screen.getByTestId('keypad-linear-vector-u')).toHaveTextContent('u');
    expect(screen.getByTestId('keypad-linear-vector-v')).toHaveTextContent('v');
    expect(screen.getByTestId('keypad-linear-dot')).toHaveTextContent('dot');
    expect(screen.getByTestId('keypad-linear-cross')).toHaveTextContent('cross');
    expect(screen.getByTestId('keypad-linear-7')).toHaveTextContent('7');
    expect(screen.getByTestId('keypad-left')).toHaveTextContent('◄');
    expect(screen.queryByTestId('keypad-linear-basis')).not.toBeInTheDocument();
    expect(screen.queryByTestId('keypad-linear-charpoly')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('keypad-layer-ctrl'));
    expect(screen.getByTestId('keypad-linear-proj-u')).toHaveTextContent('parallel');
    expect(screen.getByTestId('keypad-linear-proj-v')).toHaveTextContent('distance');
    expect(screen.getByTestId('keypad-linear-unit')).toHaveTextContent('area');
    expect(screen.getByTestId('keypad-linear-gram')).toHaveTextContent('triArea');
    expect(screen.getByTestId('keypad-linear-orth-u')).toHaveTextContent('volume');
    expect(screen.queryByTestId('keypad-linear-rank')).not.toBeInTheDocument();
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();
    expect(screen.queryByText('Vector Notation Pad')).not.toBeInTheDocument();
    const vectorUCard = screen.getByLabelText('Vector u length').closest('.editor-card') as HTMLElement;
    expect(screen.getByLabelText('Vector u length')).toHaveValue(3);
    const vectorUGrid = vectorUCard.querySelector('.vector-grid') as HTMLElement;
    expect(within(vectorUGrid).getAllByRole('textbox')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Vector u length'), { target: { value: '5' } });
    await waitFor(() => expect(screen.getByLabelText('Vector u length')).toHaveValue(5));
    expect(vectorUCard).toHaveClass('linear-algebra-value-card--wide');
    expect(within(vectorUGrid).getAllByRole('textbox')).toHaveLength(5);
    setMathFieldLatex('main-editor', 'u\\cdot v');
    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'u\\cdot v'));
  });

  it('lets Matrix and Vector users manage named value library cards', async () => {
    const { user } = await renderAppMain();

    await openLauncherApp(user, 'Linear', 'Matrix');
    await screen.findByText('Matrix Workspace');

    await user.click(screen.getByRole('button', { name: 'Add Matrix' }));
    await screen.findByLabelText('Matrix C name');
    expect(screen.getByLabelText('Active Matrix left operand')).toHaveAttribute('data-value', 'matrix-1');
    expect(screen.getByLabelText('Active Matrix left operand')).toHaveTextContent('C');
    fireEvent.change(screen.getByLabelText('Matrix C name'), { target: { value: 'D' } });
    await waitFor(() => expect(screen.getByLabelText('Matrix D rows')).toHaveValue(2));
    expect(screen.getByLabelText('Active Matrix left operand')).toHaveAttribute('data-value', 'matrix-1');
    expect(screen.getByLabelText('Active Matrix left operand')).toHaveTextContent('D');
    expect(screen.getByTestId('soft-action-add')).toHaveTextContent('D+B');
    expect(screen.getByTestId('soft-action-detA')).toHaveTextContent('det(D)');
    await user.click(screen.getByRole('button', { name: 'Insert Matrix D in editor' }));
    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'D'));
    await user.click(screen.getByRole('button', { name: 'Set Matrix B as Left' }));
    expect(screen.getByLabelText('Active Matrix left operand')).toHaveAttribute('data-value', 'matrix-b');
    await user.click(screen.getByRole('button', { name: 'Set Matrix D as Right' }));
    expect(screen.getByLabelText('Active Matrix right operand')).toHaveAttribute('data-value', 'matrix-1');
    expect(screen.getByTestId('soft-action-add')).toHaveTextContent('B+D');
    fireEvent.change(screen.getByLabelText('Matrix D rows'), { target: { value: '3' } });
    await waitFor(() => expect(screen.getByLabelText('Matrix D rows')).toHaveValue(3));
    await user.click(screen.getByRole('button', { name: 'Duplicate Matrix D' }));
    await screen.findByLabelText('Matrix C name');
    expect(screen.getByLabelText('Active Matrix left operand')).toHaveTextContent('C');
    expect(screen.getByTestId('soft-action-add')).toHaveTextContent('C+D');
    fireEvent.change(screen.getByLabelText('Matrix C name'), { target: { value: 'D' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Name already exists.');
    await user.click(screen.getByRole('button', { name: 'Delete Matrix D' }));
    await waitFor(() => expect(screen.queryByLabelText('Matrix D name')).not.toBeInTheDocument());

    await openLauncherApp(user, 'Linear', 'Vector');
    await screen.findByText('Vector Workspace');

    await user.click(screen.getByRole('button', { name: 'Add Vector' }));
    await screen.findByLabelText('Vector p name');
    expect(screen.getByLabelText('Active Vector first operand')).toHaveAttribute('data-value', 'vector-1');
    expect(screen.getByLabelText('Active Vector first operand')).toHaveTextContent('p');
    fireEvent.change(screen.getByLabelText('Vector p name'), { target: { value: 'q' } });
    await waitFor(() => expect(screen.getByLabelText('Vector q length')).toHaveValue(3));
    expect(screen.getByLabelText('Active Vector first operand')).toHaveAttribute('data-value', 'vector-1');
    expect(screen.getByTestId('soft-action-dot')).toHaveTextContent('q·v');
    expect(screen.getByTestId('soft-action-normA')).toHaveTextContent('‖q‖');
    await user.click(screen.getByRole('button', { name: 'Insert Vector q in editor' }));
    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'q'));
    await user.click(screen.getByRole('button', { name: 'Set Vector v as First' }));
    expect(screen.getByLabelText('Active Vector first operand')).toHaveAttribute('data-value', 'vector-v');
    await user.click(screen.getByRole('button', { name: 'Set Vector q as Second' }));
    expect(screen.getByLabelText('Active Vector second operand')).toHaveAttribute('data-value', 'vector-1');
    expect(screen.getByTestId('soft-action-dot')).toHaveTextContent('v·q');
    fireEvent.change(screen.getByLabelText('Vector q length'), { target: { value: '4' } });
    await waitFor(() => expect(screen.getByLabelText('Vector q length')).toHaveValue(4));
    await user.click(screen.getByRole('button', { name: 'Duplicate Vector q' }));
    await screen.findByLabelText('Vector p name');
    expect(screen.getByLabelText('Active Vector first operand')).toHaveTextContent('p');
    expect(screen.getByTestId('soft-action-dot')).toHaveTextContent('p·q');
    fireEvent.change(screen.getByLabelText('Vector p name'), { target: { value: 'q' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Name already exists.');
    await user.click(screen.getByRole('button', { name: 'Delete Vector q' }));
    await waitFor(() => expect(screen.queryByLabelText('Vector q name')).not.toBeInTheDocument());
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

  it('inserts editable Matrix and Vector templates with controlled blank-slot errors', async () => {
    const { user } = await renderAppMain();

    await openLauncherApp(user, 'Linear', 'Matrix');
    await screen.findByText('Matrix Workspace');

    const matrixEditor = screen.getByTestId('main-editor');
    matrixEditor.blur();
    await user.click(screen.getByTestId('keypad-linear-matrix-template'));
    await waitFor(() => expect(matrixEditor).toHaveAttribute(
      'data-value',
      '\\begin{bmatrix}#0 & #?\\\\#? & #?\\end{bmatrix}',
    ));
    await user.click(screen.getByTestId('editor-runtime-run'));
    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(
      'Fill every Matrix/Vector template slot before running it.',
    ));

    await openLauncherApp(user, 'Linear', 'Vector');
    await screen.findByText('Vector Workspace');

    const vectorEditor = screen.getByTestId('main-editor');
    vectorEditor.blur();
    await user.click(screen.getByTestId('keypad-linear-vector-template'));
    await waitFor(() => expect(vectorEditor).toHaveAttribute(
      'data-value',
      '\\begin{bmatrix}#0\\\\#?\\\\#?\\end{bmatrix}',
    ));
    await user.click(screen.getByTestId('editor-runtime-run'));
    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(
      'Fill every Matrix/Vector template slot before running it.',
    ));
  });
});

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
    setMathFieldLatex('main-editor', 'A+B');
    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'A+B'));

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

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MathEditor } from './MathEditor';

describe('MathEditor typing behavior', () => {
  it('disables smart superscript auto-exit so exponent typing stays intentional', () => {
    render(
      <MathEditor
        value=""
        onChange={() => {}}
        dataTestId="math-editor"
        modeId="calculate"
        screenHint="standard"
      />,
    );

    const field = screen.getByTestId('math-editor') as HTMLElement & {
      smartSuperscript: boolean;
    };

    expect(field.smartSuperscript).toBe(false);
  });

  it('reports raw typed latex without rewriting the field on every input stroke', () => {
    const handleChange = vi.fn();
    render(
      <MathEditor
        value=""
        onChange={handleChange}
        dataTestId="math-editor"
        modeId="calculate"
        screenHint="standard"
      />,
    );

    const field = screen.getByTestId('math-editor') as HTMLElement & {
      getValue: () => string;
      setValue: (value: string) => void;
    };

    field.setValue('sin(');
    fireEvent.input(field);

    expect(handleChange).toHaveBeenLastCalledWith('sin(');
    expect(field.getValue()).toBe('sin(');
  });

  it('leaves arrow keys to MathLive navigation', () => {
    render(
      <MathEditor
        value="x+1"
        onChange={() => {}}
        dataTestId="math-editor"
        modeId="calculate"
        screenHint="standard"
      />,
    );

    const field = screen.getByTestId('math-editor') as HTMLElement & {
      commandLog: string[];
      lastOffset: number;
      position: number;
      selectionIsCollapsed: boolean;
      setValue: (value: string) => void;
    };

    field.setValue('x+1');
    field.selectionIsCollapsed = true;
    field.position = 1;

    fireEvent.keyDown(field, { key: 'ArrowRight' });
    expect(field.commandLog).toEqual([]);
  });

  it('inserts visible math spacing for a plain space key', () => {
    render(
      <MathEditor
        value="x+1"
        onChange={() => {}}
        dataTestId="math-editor"
        modeId="calculate"
        screenHint="standard"
      />,
    );

    const field = screen.getByTestId('math-editor') as HTMLElement & {
      getValue: () => string;
      position: number;
      setValue: (value: string) => void;
    };

    field.setValue('x+1');
    field.position = field.getValue().length;

    fireEvent.keyDown(field, { key: ' ' });

    expect(field.getValue()).toBe('x+1\\quad');
  });

  it('inserts plus and minus directly so exponent operators stay editable', () => {
    render(
      <MathEditor
        value="x^3"
        onChange={() => {}}
        dataTestId="math-editor"
        modeId="calculate"
        screenHint="standard"
      />,
    );

    const field = screen.getByTestId('math-editor') as HTMLElement & {
      getValue: () => string;
      position: number;
      setValue: (value: string) => void;
    };

    field.setValue('x^3');
    field.position = field.getValue().length;

    fireEvent.keyDown(field, { key: '+', shiftKey: true });
    fireEvent.keyDown(field, { key: '-' });

    expect(field.getValue()).toBe('x^3+-');
  });
});

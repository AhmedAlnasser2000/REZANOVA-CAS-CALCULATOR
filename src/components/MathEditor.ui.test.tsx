import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorAnalysisControlProvider } from '../lib/editor/editor-analysis-control-provider';
import { MathEditor, MathEditorContainment } from './MathEditor';

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

  it('normalizes pasted split relation operators before updating app state', () => {
    const handleChange = vi.fn();
    render(
      <MathEditor
        value=""
        onChange={handleChange}
        dataTestId="math-editor"
        modeId="equation"
        screenHint="symbolic"
      />,
    );

    const field = screen.getByTestId('math-editor') as HTMLElement & {
      getValue: () => string;
      setValue: (value: string) => void;
    };

    field.setValue('(x-1)^2 < = 0');
    fireEvent.input(field);

    expect(handleChange).toHaveBeenLastCalledWith('(x-1)^2 \\le 0');
    expect(field.getValue()).toBe('(x-1)^2 < = 0');
  });

  it('normalizes unicode and reversed pasted relation operators before updating app state', () => {
    const handleChange = vi.fn();
    render(
      <MathEditor
        value=""
        onChange={handleChange}
        dataTestId="math-editor"
        modeId="equation"
        screenHint="symbolic"
      />,
    );

    const field = screen.getByTestId('math-editor') as HTMLElement & {
      getValue: () => string;
      setValue: (value: string) => void;
    };

    field.setValue('(x-1)^2 =< 0');
    fireEvent.input(field);
    field.setValue('x≤2');
    fireEvent.input(field);

    expect(handleChange).toHaveBeenNthCalledWith(1, '(x-1)^2 \\le 0');
    expect(handleChange).toHaveBeenNthCalledWith(2, 'x\\le2');
    expect(field.getValue()).toBe('x≤2');
  });

  it('groups multi-digit powers before updating app state', () => {
    const handleChange = vi.fn();
    render(
      <MathEditor
        value=""
        onChange={handleChange}
        dataTestId="math-editor"
        modeId="equation"
        screenHint="symbolic"
      />,
    );

    const field = screen.getByTestId('math-editor') as HTMLElement & {
      getValue: () => string;
      setValue: (value: string) => void;
    };

    field.setValue('(x+a)^12=b');
    fireEvent.input(field);

    expect(handleChange).toHaveBeenLastCalledWith('(x+a)^{12}=b');
    expect(field.getValue()).toBe('(x+a)^12=b');
  });

  it('canonicalizes pasted function names and grouped powers before insertion', () => {
    render(
      <MathEditor
        value=""
        onChange={() => {}}
        dataTestId="math-editor"
        modeId="calculus"
        screenHint="indefinite-integral"
      />,
    );

    const field = screen.getByTestId('math-editor') as HTMLElement & {
      getValue: () => string;
    };

    fireEvent.paste(field, {
      clipboardData: {
        getData: () => 'csc(2x+3)^2+e^(x/2+1)+(1/2)^(3x-1)',
      },
    });

    expect(field.getValue()).toBe(
      '\\csc(2x+3)^2+\\exponentialE^{x/2+1}+(1/2)^{3x-1}',
    );
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

  it('remounts the math field when the editor generation changes', () => {
    const { rerender } = render(
      <EditorAnalysisControlProvider value={{ stopped: false, generation: 0 }}>
        <MathEditor
          value="x+1"
          onChange={() => {}}
          dataTestId="math-editor"
          modeId="calculate"
          screenHint="standard"
        />
      </EditorAnalysisControlProvider>,
    );

    const firstField = screen.getByTestId('math-editor');

    rerender(
      <EditorAnalysisControlProvider value={{ stopped: false, generation: 1 }}>
        <MathEditor
          value="x+1"
          onChange={() => {}}
          dataTestId="math-editor"
          modeId="calculate"
          screenHint="standard"
        />
      </EditorAnalysisControlProvider>,
    );

    expect(screen.getByTestId('math-editor')).not.toBe(firstField);
  });

  it('contains render failures and exposes the editor restart action', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const restartEditor = vi.fn();

    function BrokenEditor() {
      throw new Error('mathlive render failed');
      return null;
    }

    try {
      const { rerender } = render(
        <MathEditorContainment onRestart={restartEditor} resetKey={0}>
          <BrokenEditor />
        </MathEditorContainment>,
      );

      expect(screen.getByTestId('math-editor-containment-fallback')).toHaveTextContent(
        'Editor crashed.',
      );

      fireEvent.click(screen.getByRole('button', { name: 'Restart Editor' }));
      expect(restartEditor).toHaveBeenCalled();

      rerender(
        <MathEditorContainment onRestart={restartEditor} resetKey={1}>
          <div data-testid="contained-editor-ok">Editor recovered</div>
        </MathEditorContainment>,
      );

      expect(screen.getByTestId('contained-editor-ok')).toHaveTextContent('Editor recovered');
    } finally {
      consoleError.mockRestore();
    }
  });
});

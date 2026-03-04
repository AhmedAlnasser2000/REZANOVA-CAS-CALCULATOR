import type { ModeId } from '../types/calculator';

export type SoftAction = {
  id: string;
  label: string;
  hotkey?: string;
};

export type KeypadButton = {
  id: string;
  label: string;
  secondary?: string;
  variant: 'utility' | 'function' | 'digit' | 'confirm';
  latex?: string;
  command?:
    | 'history'
    | 'clear'
    | 'delete'
    | 'cursor-left'
    | 'cursor-right'
    | 'evaluate'
    | 'cycle-angle'
    | 'open-menu';
};

export const MODE_LABELS: Record<ModeId, string> = {
  calculate: 'Calculate',
  equation: 'Equation',
  matrix: 'Matrix',
  vector: 'Vector',
  table: 'Table',
  guide: 'Guide',
  advancedCalculus: 'Advanced Calc',
  trigonometry: 'Trigonometry',
  statistics: 'Statistics',
  geometry: 'Geometry',
};

export const SOFT_MENU_BY_MODE: Record<ModeId, SoftAction[]> = {
  calculate: [
    { id: 'simplify', label: 'Simplify', hotkey: 'F1' },
    { id: 'factor', label: 'Factor', hotkey: 'F2' },
    { id: 'expand', label: 'Expand', hotkey: 'F3' },
    { id: 'numeric', label: 'Numeric', hotkey: 'F4' },
    { id: 'clear', label: 'Clear', hotkey: 'F5' },
    { id: 'history', label: 'History', hotkey: 'F6' },
  ],
  equation: [
    { id: 'solve', label: 'Solve', hotkey: 'F1' },
    { id: 'symbolic', label: 'Symbolic', hotkey: 'F2' },
    { id: 'linear2', label: '2x2', hotkey: 'F3' },
    { id: 'linear3', label: '3x3', hotkey: 'F4' },
    { id: 'clear', label: 'Clear', hotkey: 'F5' },
    { id: 'history', label: 'History', hotkey: 'F6' },
  ],
  matrix: [
    { id: 'add', label: 'A+B', hotkey: 'F1' },
    { id: 'subtract', label: 'A-B', hotkey: 'F2' },
    { id: 'multiply', label: 'A×B', hotkey: 'F3' },
    { id: 'detA', label: 'det(A)', hotkey: 'F4' },
    { id: 'inverseA', label: 'A⁻¹', hotkey: 'F5' },
    { id: 'transposeA', label: 'Aᵀ', hotkey: 'F6' },
  ],
  vector: [
    { id: 'dot', label: 'Dot', hotkey: 'F1' },
    { id: 'cross', label: 'Cross', hotkey: 'F2' },
    { id: 'normA', label: '‖A‖', hotkey: 'F3' },
    { id: 'angle', label: '∠', hotkey: 'F4' },
    { id: 'add', label: 'A+B', hotkey: 'F5' },
    { id: 'subtract', label: 'A-B', hotkey: 'F6' },
  ],
  table: [
    { id: 'build', label: 'Build', hotkey: 'F1' },
    { id: 'toggleSecondary', label: 'g(x)', hotkey: 'F2' },
    { id: 'clear', label: 'Clear', hotkey: 'F3' },
    { id: 'history', label: 'History', hotkey: 'F4' },
  ],
  guide: [
    { id: 'open', label: 'Open', hotkey: 'F1' },
    { id: 'search', label: 'Search', hotkey: 'F2' },
    { id: 'symbols', label: 'Symbols', hotkey: 'F3' },
    { id: 'modes', label: 'Modes', hotkey: 'F4' },
    { id: 'back', label: 'Back', hotkey: 'F5' },
    { id: 'exit', label: 'Exit', hotkey: 'F6' },
  ],
  advancedCalculus: [
    { id: 'open', label: 'Open', hotkey: 'F1' },
    { id: 'guide', label: 'Guide', hotkey: 'F2' },
    { id: 'back', label: 'Back', hotkey: 'F5' },
    { id: 'exit', label: 'Exit', hotkey: 'F6' },
  ],
  trigonometry: [
    { id: 'open', label: 'Open', hotkey: 'F1' },
    { id: 'guide', label: 'Guide', hotkey: 'F2' },
    { id: 'back', label: 'Back', hotkey: 'F5' },
    { id: 'exit', label: 'Exit', hotkey: 'F6' },
  ],
  statistics: [
    { id: 'open', label: 'Open', hotkey: 'F1' },
    { id: 'guide', label: 'Guide', hotkey: 'F2' },
    { id: 'back', label: 'Back', hotkey: 'F5' },
    { id: 'exit', label: 'Exit', hotkey: 'F6' },
  ],
  geometry: [
    { id: 'open', label: 'Open', hotkey: 'F1' },
    { id: 'guide', label: 'Guide', hotkey: 'F2' },
    { id: 'back', label: 'Back', hotkey: 'F5' },
    { id: 'exit', label: 'Exit', hotkey: 'F6' },
  ],
};

export const KEYPAD_ROWS: KeypadButton[][] = [
  [
    { id: 'menu', label: 'Menu', variant: 'utility', command: 'open-menu' },
    { id: 'history', label: 'Hist', variant: 'utility', command: 'history' },
    { id: 'angle', label: 'Ang', variant: 'utility', command: 'cycle-angle' },
    { id: 'left-paren', label: '(', variant: 'utility', latex: '(' },
    { id: 'right-paren', label: ')', variant: 'utility', latex: ')' },
    { id: 'delete', label: 'DEL', variant: 'utility', command: 'delete' },
  ],
  [
    { id: 'sqrt', label: '√', variant: 'function', latex: '\\sqrt{#0}' },
    { id: 'square', label: 'x²', variant: 'function', latex: '^{2}' },
    { id: 'power', label: 'xʸ', variant: 'function', latex: '^{#0}' },
    { id: 'fraction', label: 'a/b', variant: 'function', latex: '\\frac{#0}{#?}' },
    { id: 'pi', label: 'π', variant: 'function', latex: '\\pi' },
    { id: 'clear', label: 'AC', variant: 'utility', command: 'clear' },
  ],
  [
    { id: 'sin', label: 'sin', variant: 'function', latex: '\\sin\\left(#0\\right)' },
    { id: 'cos', label: 'cos', variant: 'function', latex: '\\cos\\left(#0\\right)' },
    { id: 'tan', label: 'tan', variant: 'function', latex: '\\tan\\left(#0\\right)' },
    { id: 'log', label: 'log', variant: 'function', latex: '\\log\\left(#0\\right)' },
    { id: 'ln', label: 'ln', variant: 'function', latex: '\\ln\\left(#0\\right)' },
    { id: 'divide', label: '÷', variant: 'function', latex: '\\div' },
  ],
  [
    { id: '7', label: '7', variant: 'digit', latex: '7' },
    { id: '8', label: '8', variant: 'digit', latex: '8' },
    { id: '9', label: '9', variant: 'digit', latex: '9' },
    { id: 'multiply', label: '×', variant: 'function', latex: '\\times' },
    { id: 'equal', label: '=', variant: 'function', latex: '=' },
    { id: 'left', label: '◂', variant: 'utility', command: 'cursor-left' },
  ],
  [
    { id: '4', label: '4', variant: 'digit', latex: '4' },
    { id: '5', label: '5', variant: 'digit', latex: '5' },
    { id: '6', label: '6', variant: 'digit', latex: '6' },
    { id: 'minus', label: '−', variant: 'function', latex: '-' },
    { id: 'x', label: 'x', variant: 'function', latex: 'x' },
    { id: 'right', label: '▸', variant: 'utility', command: 'cursor-right' },
  ],
  [
    { id: '1', label: '1', variant: 'digit', latex: '1' },
    { id: '2', label: '2', variant: 'digit', latex: '2' },
    { id: '3', label: '3', variant: 'digit', latex: '3' },
    { id: 'plus', label: '+', variant: 'function', latex: '+' },
    { id: 'dot', label: '.', variant: 'digit', latex: '.' },
    { id: 'execute', label: 'EXE', variant: 'confirm', command: 'evaluate' },
  ],
  [
    { id: '0', label: '0', variant: 'digit', latex: '0' },
    { id: '00', label: '00', variant: 'digit', latex: '00' },
    { id: 'comma', label: ',', variant: 'digit', latex: ',' },
    { id: 'ans', label: 'Ans', variant: 'function', latex: 'Ans' },
    { id: 'exp', label: '×10ˣ', variant: 'function', latex: '\\times10^{#0}' },
    { id: 'derivative', label: 'd/dx', variant: 'function', latex: '\\frac{d}{dx}#0' },
  ],
];

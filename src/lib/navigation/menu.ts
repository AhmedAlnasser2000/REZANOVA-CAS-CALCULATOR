import type {
  CalculusScreen,
  ModeId,
} from '../../types/calculator';

export type SoftAction = {
  id: string;
  label: string;
  hotkey?: string;
};

export type KeypadLayer = 'base' | 'shift' | 'alpha' | 'ctrl';

export type KeypadCommand =
  | 'history'
  | 'clear'
  | 'delete'
  | 'cursor-left'
  | 'cursor-right'
  | 'evaluate'
  | 'cycle-angle'
  | 'open-menu';

export type KeypadLayerAction = {
  label: string;
  latex?: string;
  command?: KeypadCommand;
};

export type KeypadButton = {
  id: string;
  label: string;
  secondary?: string;
  alpha?: string;
  ctrl?: string;
  variant: 'utility' | 'function' | 'digit' | 'confirm';
  latex?: string;
  command?: KeypadCommand;
  layers?: Partial<Record<Exclude<KeypadLayer, 'base'>, KeypadLayerAction>>;
};

export type WorkspaceKeypadContext = {
  mode: ModeId;
  calculusScreen?: CalculusScreen;
};

export function getKeypadLayerAction(button: KeypadButton, layer: KeypadLayer) {
  return layer === 'base' ? undefined : button.layers?.[layer];
}

export function resolveKeypadButtonForLayer(button: KeypadButton, layer: KeypadLayer): KeypadButton {
  const action = getKeypadLayerAction(button, layer);
  if (!action) {
    return button;
  }

  return {
    ...button,
    label: action.label,
    latex: action.latex,
    command: action.command,
  };
}

export const MODE_LABELS: Record<ModeId, string> = {
  calculate: 'Calculate',
  equation: 'Equation',
  matrix: 'Matrix',
  vector: 'Vector',
  table: 'Table',
  guide: 'Guide',
  calculus: 'Calculus',
  trigonometry: 'Trigonometry',
  statistics: 'Statistics',
  geometry: 'Geometry',
  labs: 'Labs',
};

export const SOFT_MENU_BY_MODE: Record<ModeId, SoftAction[]> = {
  calculate: [
    { id: 'simplify', label: 'Simplify', hotkey: 'F1' },
    { id: 'factor', label: 'Factor', hotkey: 'F2' },
    { id: 'expand', label: 'Expand', hotkey: 'F3' },
    { id: 'algebra', label: 'Algebra', hotkey: 'F4' },
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
    { id: 'dot', label: 'u·v', hotkey: 'F1' },
    { id: 'cross', label: 'u×v', hotkey: 'F2' },
    { id: 'normA', label: '‖u‖', hotkey: 'F3' },
    { id: 'angle', label: '∠(u,v)', hotkey: 'F4' },
    { id: 'add', label: 'u+v', hotkey: 'F5' },
    { id: 'subtract', label: 'u-v', hotkey: 'F6' },
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
  calculus: [
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
  labs: [
    { id: 'open', label: 'Open', hotkey: 'F1' },
    { id: 'back', label: 'Back', hotkey: 'F5' },
    { id: 'exit', label: 'Exit', hotkey: 'F6' },
  ],
};

export const KEYPAD_ROWS: KeypadButton[][] = [
  [
    {
      id: 'menu',
      label: 'Menu',
      alpha: '@',
      ctrl: 'Open',
      variant: 'utility',
      command: 'open-menu',
      layers: {
        alpha: { label: '@', latex: '@' },
        ctrl: { label: 'Open', command: 'open-menu' },
      },
    },
    {
      id: 'history',
      label: 'Hist',
      secondary: 'Ans',
      ctrl: 'Panel',
      variant: 'utility',
      command: 'history',
      layers: {
        shift: { label: 'Ans', latex: 'Ans' },
        ctrl: { label: 'Panel', command: 'history' },
      },
    },
    {
      id: 'angle',
      label: 'Ang',
      secondary: 'deg',
      alpha: 'alpha',
      ctrl: 'Ang',
      variant: 'utility',
      command: 'cycle-angle',
      layers: {
        shift: { label: 'deg', latex: '^{\\circ}' },
        alpha: { label: 'alpha', latex: '\\alpha' },
        ctrl: { label: 'Ang', command: 'cycle-angle' },
      },
    },
    {
      id: 'left-paren',
      label: '(',
      secondary: '[',
      alpha: '{',
      variant: 'utility',
      latex: '(',
      layers: {
        shift: { label: '[', latex: '[' },
        alpha: { label: '{', latex: '\\{' },
      },
    },
    {
      id: 'right-paren',
      label: ')',
      secondary: ']',
      alpha: '}',
      variant: 'utility',
      latex: ')',
      layers: {
        shift: { label: ']', latex: ']' },
        alpha: { label: '}', latex: '\\}' },
      },
    },
    {
      id: 'delete',
      label: 'DEL',
      secondary: 'DEL',
      ctrl: 'AC',
      variant: 'utility',
      command: 'delete',
      layers: {
        shift: { label: 'DEL', command: 'delete' },
        ctrl: { label: 'AC', command: 'clear' },
      },
    },
  ],
  [
    {
      id: 'sqrt',
      label: '√',
      secondary: 'x^(1/2)',
      alpha: 'Delta',
      variant: 'function',
      latex: '\\sqrt{#0}',
      layers: {
        shift: { label: 'x^(1/2)', latex: '^{1/2}' },
        alpha: { label: 'Delta', latex: '\\Delta' },
      },
    },
    {
      id: 'square',
      label: 'x²',
      secondary: 'sqrt',
      alpha: 'i',
      variant: 'function',
      latex: '^{2}',
      layers: {
        shift: { label: 'sqrt', latex: '\\sqrt{#0}' },
        alpha: { label: 'i', latex: 'i' },
      },
    },
    {
      id: 'power',
      label: 'xʸ',
      secondary: 'root',
      alpha: 'j',
      variant: 'function',
      latex: '^{#0}',
      layers: {
        shift: { label: 'root', latex: '\\sqrt[#0]{#?}' },
        alpha: { label: 'j', latex: 'j' },
      },
    },
    {
      id: 'fraction',
      label: 'a/b',
      secondary: 'abs',
      alpha: 'lambda',
      variant: 'function',
      latex: '\\frac{#0}{#?}',
      layers: {
        shift: { label: 'abs', latex: '\\left|#0\\right|' },
        alpha: { label: 'lambda', latex: '\\lambda' },
      },
    },
    {
      id: 'pi',
      label: 'π',
      secondary: 'e',
      alpha: 'theta',
      variant: 'function',
      latex: '\\pi',
      layers: {
        shift: { label: 'e', latex: 'e' },
        alpha: { label: 'theta', latex: '\\theta' },
      },
    },
    {
      id: 'clear',
      label: 'AC',
      secondary: 'AC',
      ctrl: 'Clear',
      variant: 'utility',
      command: 'clear',
      layers: {
        shift: { label: 'AC', command: 'clear' },
        ctrl: { label: 'Clear', command: 'clear' },
      },
    },
  ],
  [
    {
      id: 'sin',
      label: 'sin',
      secondary: 'asin',
      alpha: 'a',
      variant: 'function',
      latex: '\\sin\\left(#0\\right)',
      layers: {
        shift: { label: 'asin', latex: '\\arcsin\\left(#0\\right)' },
        alpha: { label: 'a', latex: 'a' },
      },
    },
    {
      id: 'cos',
      label: 'cos',
      secondary: 'acos',
      alpha: 'b',
      variant: 'function',
      latex: '\\cos\\left(#0\\right)',
      layers: {
        shift: { label: 'acos', latex: '\\arccos\\left(#0\\right)' },
        alpha: { label: 'b', latex: 'b' },
      },
    },
    {
      id: 'tan',
      label: 'tan',
      secondary: 'atan',
      alpha: 'c',
      variant: 'function',
      latex: '\\tan\\left(#0\\right)',
      layers: {
        shift: { label: 'atan', latex: '\\arctan\\left(#0\\right)' },
        alpha: { label: 'c', latex: 'c' },
      },
    },
    {
      id: 'log',
      label: 'log',
      secondary: '10^x',
      alpha: 'n',
      variant: 'function',
      latex: '\\log\\left(#0\\right)',
      layers: {
        shift: { label: '10^x', latex: '10^{#0}' },
        alpha: { label: 'n', latex: 'n' },
      },
    },
    {
      id: 'ln',
      label: 'ln',
      secondary: 'e^x',
      alpha: 'k',
      variant: 'function',
      latex: '\\ln\\left(#0\\right)',
      layers: {
        shift: { label: 'e^x', latex: 'e^{#0}' },
        alpha: { label: 'k', latex: 'k' },
      },
    },
    {
      id: 'divide',
      label: '÷',
      secondary: 'mod',
      alpha: 'mu',
      variant: 'function',
      latex: '\\div',
      layers: {
        shift: { label: 'mod', latex: '\\bmod' },
        alpha: { label: 'mu', latex: '\\mu' },
      },
    },
  ],
  [
    { id: '7', label: '7', secondary: '<=', alpha: 'd', variant: 'digit', latex: '7', layers: { shift: { label: '<=', latex: '\\le' }, alpha: { label: 'd', latex: 'd' } } },
    { id: '8', label: '8', secondary: '>=', alpha: 'e', variant: 'digit', latex: '8', layers: { shift: { label: '>=', latex: '\\ge' }, alpha: { label: 'e', latex: 'e' } } },
    { id: '9', label: '9', secondary: 'inf', alpha: 'f', variant: 'digit', latex: '9', layers: { shift: { label: 'inf', latex: '\\infty' }, alpha: { label: 'f', latex: 'f' } } },
    { id: 'multiply', label: '×', secondary: 'dot', alpha: 'g', variant: 'function', latex: '\\times', layers: { shift: { label: 'dot', latex: '\\cdot' }, alpha: { label: 'g', latex: 'g' } } },
    { id: 'equal', label: '=', secondary: '!=', alpha: 'h', variant: 'function', latex: '=', layers: { shift: { label: '!=', latex: '\\ne' }, alpha: { label: 'h', latex: 'h' } } },
    { id: 'left', label: '◂', secondary: 'left', ctrl: 'Left', variant: 'utility', command: 'cursor-left', layers: { shift: { label: 'left', command: 'cursor-left' }, ctrl: { label: 'Left', command: 'cursor-left' } } },
  ],
  [
    { id: '4', label: '4', secondary: '<', alpha: 'i', variant: 'digit', latex: '4', layers: { shift: { label: '<', latex: '<' }, alpha: { label: 'i', latex: 'i' } } },
    { id: '5', label: '5', secondary: '>', alpha: 'j', variant: 'digit', latex: '5', layers: { shift: { label: '>', latex: '>' }, alpha: { label: 'j', latex: 'j' } } },
    { id: '6', label: '6', secondary: '+/-', alpha: 'l', variant: 'digit', latex: '6', layers: { shift: { label: '+/-', latex: '\\pm' }, alpha: { label: 'l', latex: 'l' } } },
    { id: 'minus', label: '−', secondary: '-/+', alpha: 'm', variant: 'function', latex: '-', layers: { shift: { label: '-/+', latex: '\\mp' }, alpha: { label: 'm', latex: 'm' } } },
    { id: 'x', label: 'x', secondary: 'y', alpha: 'xi', variant: 'function', latex: 'x', layers: { shift: { label: 'y', latex: 'y' }, alpha: { label: 'xi', latex: '\\xi' } } },
    { id: 'right', label: '▸', secondary: 'right', ctrl: 'Right', variant: 'utility', command: 'cursor-right', layers: { shift: { label: 'right', command: 'cursor-right' }, ctrl: { label: 'Right', command: 'cursor-right' } } },
  ],
  [
    { id: '1', label: '1', secondary: '!', alpha: 'o', variant: 'digit', latex: '1', layers: { shift: { label: '!', latex: '!' }, alpha: { label: 'o', latex: 'o' } } },
    { id: '2', label: '2', secondary: 'nCr', alpha: 'p', variant: 'digit', latex: '2', layers: { shift: { label: 'nCr', latex: '\\binom{#0}{#?}' }, alpha: { label: 'p', latex: 'p' } } },
    { id: '3', label: '3', secondary: 'cbrt', alpha: 'q', variant: 'digit', latex: '3', layers: { shift: { label: 'cbrt', latex: '\\sqrt[3]{#0}' }, alpha: { label: 'q', latex: 'q' } } },
    { id: 'plus', label: '+', secondary: 'or', alpha: 'r', variant: 'function', latex: '+', layers: { shift: { label: 'or', latex: '\\lor' }, alpha: { label: 'r', latex: 'r' } } },
    { id: 'dot', label: '.', secondary: ':', alpha: 's', variant: 'digit', latex: '.', layers: { shift: { label: ':', latex: ':' }, alpha: { label: 's', latex: 's' } } },
    { id: 'execute', label: 'EXE', ctrl: 'Run', variant: 'confirm', command: 'evaluate', layers: { ctrl: { label: 'Run', command: 'evaluate' } } },
  ],
  [
    { id: '0', label: '0', secondary: 'space', alpha: 't', variant: 'digit', latex: '0', layers: { shift: { label: 'space', latex: '\\;' }, alpha: { label: 't', latex: 't' } } },
    { id: '00', label: '00', secondary: '000', alpha: 'u', variant: 'digit', latex: '00', layers: { shift: { label: '000', latex: '000' }, alpha: { label: 'u', latex: 'u' } } },
    { id: 'comma', label: ',', secondary: ';', alpha: 'v', variant: 'digit', latex: ',', layers: { shift: { label: ';', latex: ';' }, alpha: { label: 'v', latex: 'v' } } },
    { id: 'ans', label: 'Ans', secondary: 'prev', alpha: 'w', variant: 'function', latex: 'Ans', layers: { shift: { label: 'prev', latex: 'Ans' }, alpha: { label: 'w', latex: 'w' } } },
    { id: 'exp', label: '×10ˣ', secondary: '10^x', alpha: 'y', variant: 'function', latex: '\\times10^{#0}', layers: { shift: { label: '10^x', latex: '10^{#0}' }, alpha: { label: 'y', latex: 'y' } } },
    { id: 'derivative', label: 'd/dx', secondary: 'int', alpha: 'z', variant: 'function', latex: '\\frac{d}{dx}#0', layers: { shift: { label: 'int', latex: '\\int #0\\,dx' }, alpha: { label: 'z', latex: 'z' } } },
  ],
];

const DERIVATIVE_KEYPAD_SCREENS = new Set<CalculusScreen>([
  'derivative',
  'derivativePoint',
  'partialDerivative',
  'implicitDerivative',
]);

const DERIVATIVE_OPERATOR_TEMPLATE_ROW: KeypadButton[] = [
  {
    id: 'derivative-partial-symbol',
    label: '∂',
    variant: 'function',
    latex: '\\partial',
  },
  {
    id: 'derivative-ordinary-template',
    label: 'd/dx',
    variant: 'function',
    latex: '\\frac{d}{dx}\\left(#0\\right)',
  },
  {
    id: 'derivative-higher-template',
    label: 'dⁿ/dxⁿ',
    variant: 'function',
    latex: '\\frac{d^{#0}}{dx^{#0}}\\left(#?\\right)',
  },
  {
    id: 'derivative-partial-template',
    label: '∂/∂x',
    variant: 'function',
    latex: '\\frac{\\partial}{\\partial x}\\left(#0\\right)',
  },
  {
    id: 'derivative-mixed-partial-template',
    label: '∂ⁿ/(...)',
    variant: 'function',
    latex: '\\frac{\\partial^{#0}}{\\partial x\\partial y}\\left(#?\\right)',
  },
  {
    id: 'derivative-implicit-template',
    label: 'dy/dx',
    variant: 'function',
    latex: '\\frac{dy}{dx}',
  },
];

const LINEAR_ALGEBRA_TEMPLATE_ROW: KeypadButton[] = [
  { id: 'menu', label: 'Menu', alpha: '@', ctrl: 'Open', variant: 'utility', command: 'open-menu', layers: { alpha: { label: '@', latex: '@' }, ctrl: { label: 'Open', command: 'open-menu' } } },
  { id: 'history', label: 'Hist', secondary: 'Ans', variant: 'utility', command: 'history', layers: { shift: { label: 'Ans', latex: 'Ans' } } },
  { id: 'linear-matrix-template', label: '[ ]', variant: 'function', latex: '\\begin{bmatrix}#0 & #?\\\\#? & #?\\end{bmatrix}' },
  { id: 'linear-vector-template', label: 'vec', variant: 'function', latex: '\\begin{bmatrix}#0\\\\#?\\\\#?\\end{bmatrix}' },
  { id: 'linear-row-break', label: 'row', variant: 'function', latex: '\\\\' },
  { id: 'delete', label: 'DEL', variant: 'utility', command: 'delete', layers: { ctrl: { label: 'AC', command: 'clear' } } },
];

const MATRIX_OPERATOR_ROW: KeypadButton[] = [
  { id: 'linear-matrix-a', label: 'A', variant: 'function', latex: 'A' },
  { id: 'linear-matrix-b', label: 'B', variant: 'function', latex: 'B' },
  { id: 'linear-det', label: 'det', variant: 'function', latex: '\\det\\left(#0\\right)' },
  { id: 'linear-rank', label: 'rank', variant: 'function', latex: '\\operatorname{rank}\\left(#0\\right)' },
  { id: 'linear-rref', label: 'rref', variant: 'function', latex: '\\operatorname{rref}\\left(#0\\right)' },
  { id: 'linear-clear', label: 'AC', variant: 'utility', command: 'clear' },
];

const MATRIX_MODIFIER_ROW: KeypadButton[] = [
  { id: 'linear-transpose', label: 'Aᵀ', variant: 'function', latex: '^{\\mathsf{T}}' },
  { id: 'linear-inverse', label: 'A⁻¹', variant: 'function', latex: '^{-1}' },
  { id: 'linear-null', label: 'null', variant: 'function', latex: '\\operatorname{null}\\left(#0\\right)' },
  { id: 'linear-col', label: 'col', variant: 'function', latex: '\\operatorname{col}\\left(#0\\right)' },
  { id: 'linear-cross', label: '×', variant: 'function', latex: '\\times' },
  { id: 'linear-equals', label: '=', alpha: 'h', variant: 'function', latex: '=', layers: { alpha: { label: 'h', latex: 'h' } } },
];

const VECTOR_OPERATOR_ROW: KeypadButton[] = [
  { id: 'linear-vector-u', label: 'u', variant: 'function', latex: 'u' },
  { id: 'linear-vector-v', label: 'v', variant: 'function', latex: 'v' },
  { id: 'linear-dot', label: 'dot', variant: 'function', latex: '\\cdot' },
  { id: 'linear-cross', label: 'cross', variant: 'function', latex: '\\times' },
  { id: 'linear-norm', label: 'norm', variant: 'function', latex: '\\left\\lVert#0\\right\\rVert' },
  { id: 'linear-clear', label: 'AC', variant: 'utility', command: 'clear' },
];

const VECTOR_MODIFIER_ROW: KeypadButton[] = [
  {
    id: 'linear-left-paren',
    label: '(',
    secondary: '[',
    alpha: 'ell',
    variant: 'function',
    latex: '\\left(',
    layers: {
      shift: { label: '[', latex: '[' },
      alpha: { label: 'ell', latex: '\\ell' },
    },
  },
  {
    id: 'linear-right-paren',
    label: ')',
    secondary: ']',
    alpha: '}',
    variant: 'function',
    latex: '\\right)',
    layers: {
      shift: { label: ']', latex: ']' },
      alpha: { label: '}', latex: '}' },
    },
  },
  {
    id: 'linear-plus',
    label: '+',
    secondary: 'or',
    alpha: 'r',
    variant: 'function',
    latex: '+',
    layers: {
      shift: { label: 'or', latex: '\\lor' },
      alpha: { label: 'r', latex: 'r' },
    },
  },
  {
    id: 'linear-minus',
    label: '−',
    secondary: '-/+',
    alpha: 'm',
    variant: 'function',
    latex: '-',
    layers: {
      shift: { label: '-/+', latex: '\\mp' },
      alpha: { label: 'm', latex: 'm' },
    },
  },
  {
    id: 'linear-multiply',
    label: '×',
    secondary: 'dot',
    alpha: 'g',
    variant: 'function',
    latex: '\\times',
    layers: {
      shift: { label: 'dot', latex: '\\cdot' },
      alpha: { label: 'g', latex: 'g' },
    },
  },
  {
    id: 'linear-equals',
    label: '=',
    alpha: 'h',
    variant: 'function',
    latex: '=',
    layers: {
      alpha: { label: 'h', latex: 'h' },
    },
  },
];

function buildLinearAlgebraKeypadRows(
  rows: KeypadButton[][],
  firstOperatorRow: KeypadButton[],
  secondOperatorRow: KeypadButton[],
) {
  return [
    LINEAR_ALGEBRA_TEMPLATE_ROW,
    firstOperatorRow,
    secondOperatorRow,
    ...rows.slice(3),
  ];
}

export function getWorkspaceKeypadRows(
  rows: KeypadButton[][],
  context: WorkspaceKeypadContext,
) {
  if (context.mode === 'matrix') {
    return buildLinearAlgebraKeypadRows(rows, MATRIX_OPERATOR_ROW, MATRIX_MODIFIER_ROW);
  }

  if (context.mode === 'vector') {
    return buildLinearAlgebraKeypadRows(rows, VECTOR_OPERATOR_ROW, VECTOR_MODIFIER_ROW);
  }

  if (context.mode !== 'calculus' || !DERIVATIVE_KEYPAD_SCREENS.has(context.calculusScreen ?? 'home')) {
    return rows;
  }

  return rows.map((row, index) =>
    index === rows.length - 1 ? DERIVATIVE_OPERATOR_TEMPLATE_ROW : row);
}

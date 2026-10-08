import type { VirtualKeyboardLayout } from 'mathlive';
import { buildVirtualKeyboardLayouts } from '../../lib/virtual-keyboard/layouts';
import { createKeyboardContext } from '../../lib/virtual-keyboard/capabilities';

/**
 * The logic symbols New Equation rows accept (EQUATION-SEMIALGEBRAIC1), each with the words a tooltip shows: on its
 * keyboard key, and when the pointer rests on the symbol inside a typed row. New Equation only; the shared editor
 * and the other workspaces keep their keyboards.
 */
export interface LogicSymbol {
  /** The LaTeX commands MathLive reports for the symbol in a row (the first is what the key inserts). */
  readonly commands: readonly string[];
  readonly label: string;
  /** What the key inserts (#0 is the selection, #? a placeholder). */
  readonly insert: string;
  readonly tooltip: string;
}

export const LOGIC_SYMBOLS: readonly LogicSymbol[] = [
  { commands: ['\\land', '\\wedge'], label: '∧', insert: '\\land', tooltip: 'and (∧): both sides must hold, e.g. x > 0 ∧ y > 0' },
  { commands: ['\\lor', '\\vee'], label: '∨', insert: '\\lor', tooltip: 'or (∨): at least one side must hold, e.g. x < −1 ∨ x > 1' },
  { commands: ['\\neg', '\\lnot'], label: '¬', insert: '\\neg\\left(#0\\right)', tooltip: 'not (¬): the relation in the parentheses must fail, e.g. ¬(x² ≤ 1)' },
  { commands: ['\\forall'], label: '∀', insert: '\\forall #?:', tooltip: 'for all (∀): the row must hold for every real value of the named variable, e.g. ∀x: x² + ax + 1 > 0' },
  { commands: ['\\exists'], label: '∃', insert: '\\exists #?:', tooltip: 'there exists (∃): the row must hold for some real value of the named variable, e.g. ∃y: x² + y² < 1' },
];

/** The tooltip of a symbol as MathLive reports it (its LaTeX command), if it is one of the logic symbols. */
export function symbolTooltip(latex: string | undefined): string | undefined {
  const command = latex?.trim();
  return command ? LOGIC_SYMBOLS.find(s => s.commands.includes(command))?.tooltip : undefined;
}

/** The Equation keyboard pages, then a Logic page with ∧ ∨ ¬ and parentheses. */
export function newEquationKeyboardLayouts(): VirtualKeyboardLayout[] {
  const logic: VirtualKeyboardLayout = {
    id: 'new-equation-logic',
    label: '∧∨¬∀',
    tooltip: 'Logic: and, or, not, for all, there exists',
    displayEditToolbar: true,
    rows: [
      LOGIC_SYMBOLS.map(s => ({ latex: s.insert, label: s.label, tooltip: s.tooltip })),
      [
        { latex: '\\left(#0\\right)', label: '( )', tooltip: 'parentheses' },
        { latex: '<', label: '<' }, { latex: '\\le', label: '≤' }, { latex: '>', label: '>' }, { latex: '\\ge', label: '≥' },
        { latex: '=', label: '=' }, { latex: '\\ne', label: '≠' },
      ],
    ],
  };
  return [...buildVirtualKeyboardLayouts(createKeyboardContext('equation')), logic];
}

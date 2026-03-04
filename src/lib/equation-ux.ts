import type {
  DisplayOutcome,
  EquationRouteMeta,
  EquationScreen,
} from '../types/calculator';

const ROUTE_META: Record<EquationScreen, EquationRouteMeta> = {
  home: {
    screen: 'home',
    label: 'Equation Home',
    shortLabel: 'Home',
    description: 'Choose an equation tool.',
    breadcrumb: ['Equation', 'Home'],
    helpText: 'Choose an equation tool. Use EXE/F1 or keys 1-3.',
    selectionHint: '1-3: Open | ◂/▸: Move | EXE/F1: Select | F6: History',
    focusTarget: 'menu',
  },
  symbolic: {
    screen: 'symbolic',
    label: 'Symbolic Solve',
    shortLabel: 'Symbolic',
    description: 'Solve a typed equation in x.',
    breadcrumb: ['Equation', 'Symbolic'],
    badge: 'Symbolic',
    helpText: 'Enter an equation in x, then press EXE or F1 to solve.',
    focusTarget: 'symbolic',
  },
  polynomialMenu: {
    screen: 'polynomialMenu',
    label: 'Polynomial Menu',
    shortLabel: 'Polynomial',
    description: 'Choose quadratic, cubic, or quartic solving.',
    breadcrumb: ['Equation', 'Polynomial'],
    helpText: 'Choose quadratic, cubic, or quartic. F5 or Esc goes back.',
    selectionHint: '1-3: Open | ◂/▸: Move | EXE/F1: Select | F5/Esc: Back',
    focusTarget: 'menu',
  },
  quadratic: {
    screen: 'quadratic',
    label: 'Quadratic',
    shortLabel: 'Quadratic',
    description: 'Guided coefficient entry for ax^2+bx+c=0.',
    breadcrumb: ['Equation', 'Polynomial', 'Quadratic'],
    badge: 'Quadratic',
    helpText: 'Enter coefficients, then press EXE or F1 to solve.',
    focusTarget: 'polynomial',
  },
  cubic: {
    screen: 'cubic',
    label: 'Cubic',
    shortLabel: 'Cubic',
    description: 'Guided coefficient entry for ax^3+bx^2+cx+d=0.',
    breadcrumb: ['Equation', 'Polynomial', 'Cubic'],
    badge: 'Cubic',
    helpText: 'Enter coefficients, then press EXE or F1 to solve.',
    focusTarget: 'polynomial',
  },
  quartic: {
    screen: 'quartic',
    label: 'Quartic',
    shortLabel: 'Quartic',
    description: 'Guided coefficient entry for ax^4+bx^3+cx^2+dx+e=0.',
    breadcrumb: ['Equation', 'Polynomial', 'Quartic'],
    badge: 'Quartic',
    helpText: 'Enter coefficients, then press EXE or F1 to solve.',
    focusTarget: 'polynomial',
  },
  simultaneousMenu: {
    screen: 'simultaneousMenu',
    label: 'Simultaneous Menu',
    shortLabel: 'Simultaneous',
    description: 'Choose a 2x2 or 3x3 linear system.',
    breadcrumb: ['Equation', 'Simultaneous'],
    helpText: 'Choose 2x2 or 3x3. F5 or Esc goes back.',
    selectionHint: '1-3: Open | ◂/▸: Move | EXE/F1: Select | F5/Esc: Back',
    focusTarget: 'menu',
  },
  linear2: {
    screen: 'linear2',
    label: '2x2 Linear System',
    shortLabel: '2x2',
    description: 'Solve a 2x2 linear system.',
    breadcrumb: ['Equation', 'Simultaneous', '2x2'],
    badge: '2x2',
    helpText: 'Fill the grid, then press EXE or F1 to solve.',
    focusTarget: 'simultaneous',
  },
  linear3: {
    screen: 'linear3',
    label: '3x3 Linear System',
    shortLabel: '3x3',
    description: 'Solve a 3x3 linear system.',
    breadcrumb: ['Equation', 'Simultaneous', '3x3'],
    badge: '3x3',
    helpText: 'Fill the grid, then press EXE or F1 to solve.',
    focusTarget: 'simultaneous',
  },
};

export function getEquationRouteMeta(screen: EquationScreen): EquationRouteMeta {
  return ROUTE_META[screen];
}

export function getEquationMenuFooterText(screen: EquationScreen) {
  return ROUTE_META[screen].selectionHint ?? '';
}

export function getEquationDisplayTitle(
  screen: EquationScreen,
  outcome: DisplayOutcome | null,
) {
  if (screen === 'home' || screen === 'polynomialMenu' || screen === 'simultaneousMenu') {
    return 'Menu';
  }

  if (outcome?.kind === 'error' || outcome?.kind === 'success') {
    return ROUTE_META[screen].shortLabel;
  }

  return ROUTE_META[screen].shortLabel;
}

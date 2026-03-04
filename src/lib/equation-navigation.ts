import type {
  EquationMenuEntry,
  EquationScreen,
  PolynomialEquationView,
  SimultaneousEquationView,
} from '../types/calculator';
import type { SoftAction } from './menu';

type EquationMenuScreen = 'home' | 'polynomialMenu' | 'simultaneousMenu';

const HOME_ENTRIES: EquationMenuEntry[] = [
  {
    id: 'symbolic',
    label: 'Symbolic',
    description: 'Solve a typed equation in x',
    hotkey: '1',
    target: 'symbolic',
  },
  {
    id: 'polynomial',
    label: 'Polynomial',
    description: 'Guided quadratic, cubic, quartic solver',
    hotkey: '2',
    target: 'polynomialMenu',
  },
  {
    id: 'simultaneous',
    label: 'Simultaneous',
    description: '2x2 and 3x3 linear systems',
    hotkey: '3',
    target: 'simultaneousMenu',
  },
];

const POLYNOMIAL_ENTRIES: EquationMenuEntry[] = [
  {
    id: 'quadratic',
    label: 'Quadratic',
    description: 'Guided coefficient entry for ax^2+bx+c=0',
    hotkey: '1',
    target: 'quadratic',
  },
  {
    id: 'cubic',
    label: 'Cubic',
    description: 'Guided coefficient entry for ax^3+bx^2+cx+d=0',
    hotkey: '2',
    target: 'cubic',
  },
  {
    id: 'quartic',
    label: 'Quartic',
    description: 'Guided coefficient entry for ax^4+bx^3+cx^2+dx+e=0',
    hotkey: '3',
    target: 'quartic',
  },
];

const SIMULTANEOUS_ENTRIES: EquationMenuEntry[] = [
  {
    id: 'linear2',
    label: '2x2',
    description: 'Solve a 2x2 linear system',
    hotkey: '1',
    target: 'linear2',
  },
  {
    id: 'linear3',
    label: '3x3',
    description: 'Solve a 3x3 linear system',
    hotkey: '2',
    target: 'linear3',
  },
];

export function isEquationMenuScreen(screen: EquationScreen): screen is EquationMenuScreen {
  return screen === 'home' || screen === 'polynomialMenu' || screen === 'simultaneousMenu';
}

export function isPolynomialEquationScreen(
  screen: EquationScreen,
): screen is PolynomialEquationView {
  return screen === 'quadratic' || screen === 'cubic' || screen === 'quartic';
}

export function isSimultaneousEquationScreen(
  screen: EquationScreen,
): screen is SimultaneousEquationView {
  return screen === 'linear2' || screen === 'linear3';
}

export function getEquationMenuEntries(screen: EquationMenuScreen): EquationMenuEntry[] {
  if (screen === 'home') {
    return HOME_ENTRIES;
  }

  if (screen === 'polynomialMenu') {
    return POLYNOMIAL_ENTRIES;
  }

  return SIMULTANEOUS_ENTRIES;
}

export function getEquationMenuEntryAtIndex(
  entries: EquationMenuEntry[],
  selectedIndex: number,
) {
  if (entries.length === 0) {
    return undefined;
  }

  const safeIndex = Math.min(Math.max(selectedIndex, 0), entries.length - 1);
  return entries[safeIndex];
}

export function getEquationMenuEntryByHotkey(
  entries: EquationMenuEntry[],
  hotkey: string,
) {
  return entries.find((entry) => entry.hotkey === hotkey);
}

export function moveEquationMenuIndex(
  currentIndex: number,
  delta: number,
  total: number,
) {
  if (total <= 0) {
    return 0;
  }

  return Math.min(Math.max(currentIndex + delta, 0), total - 1);
}

export function getEquationParentScreen(screen: EquationScreen): EquationScreen | null {
  if (screen === 'home') {
    return null;
  }

  if (screen === 'symbolic' || screen === 'polynomialMenu' || screen === 'simultaneousMenu') {
    return 'home';
  }

  if (isPolynomialEquationScreen(screen)) {
    return 'polynomialMenu';
  }

  if (isSimultaneousEquationScreen(screen)) {
    return 'simultaneousMenu';
  }

  return null;
}

export function getEquationSoftActions(screen: EquationScreen): SoftAction[] {
  if (screen === 'home') {
    return [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'history', label: 'History', hotkey: 'F6' },
    ];
  }

  if (screen === 'polynomialMenu' || screen === 'simultaneousMenu') {
    return [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'history', label: 'History', hotkey: 'F6' },
    ];
  }

  if (screen === 'symbolic') {
    return [
      { id: 'solve', label: 'Solve', hotkey: 'F1' },
      { id: 'menu', label: 'Menu', hotkey: 'F2' },
      { id: 'clear', label: 'Clear', hotkey: 'F5' },
      { id: 'history', label: 'History', hotkey: 'F6' },
    ];
  }

  if (isPolynomialEquationScreen(screen)) {
    return [
      { id: 'solve', label: 'Solve', hotkey: 'F1' },
      { id: 'polynomialMenu', label: 'Poly Menu', hotkey: 'F2' },
      { id: 'clear', label: 'Clear', hotkey: 'F5' },
      { id: 'history', label: 'History', hotkey: 'F6' },
    ];
  }

  return [
    { id: 'solve', label: 'Solve', hotkey: 'F1' },
    { id: 'simultaneousMenu', label: 'Simul Menu', hotkey: 'F2' },
    { id: 'clear', label: 'Clear', hotkey: 'F5' },
    { id: 'history', label: 'History', hotkey: 'F6' },
  ];
}

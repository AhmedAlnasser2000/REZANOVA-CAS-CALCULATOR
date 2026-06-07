import type {
  AdvancedCalcScreen,
  CalculateRouteMeta,
  CalculateScreen,
} from '../../types/calculator';
import type { SoftAction } from '../navigation/menu';

export type CalculateMenuTarget =
  | { kind: 'calculate'; screen: Exclude<CalculateScreen, 'standard'> }
  | { kind: 'advancedCalculus'; screen: AdvancedCalcScreen };

export type CalculateMenuEntry = {
  id: string;
  label: string;
  description: string;
  hotkey: string;
  target: CalculateMenuTarget;
};

const SECTION_MENU_ENTRIES: CalculateMenuEntry[] = [
  {
    id: 'derivatives',
    label: 'Derivatives',
    description: 'Derivative and derivative-at-point workflows',
    hotkey: '1',
    target: { kind: 'calculate', screen: 'derivativesHome' },
  },
  {
    id: 'integrals',
    label: 'Integrals',
    description: 'Indefinite, definite, and improper workflows',
    hotkey: '2',
    target: { kind: 'advancedCalculus', screen: 'integralsHome' },
  },
  {
    id: 'limits',
    label: 'Limits',
    description: 'Finite and infinite-target limit analysis',
    hotkey: '3',
    target: { kind: 'advancedCalculus', screen: 'limitsHome' },
  },
  {
    id: 'series',
    label: 'Series',
    description: 'Maclaurin and Taylor expansions',
    hotkey: '4',
    target: { kind: 'advancedCalculus', screen: 'seriesHome' },
  },
  {
    id: 'ode',
    label: 'Differential Equations',
    description: 'First order, second order, and numeric IVP workflows',
    hotkey: '5',
    target: { kind: 'advancedCalculus', screen: 'odeHome' },
  },
  {
    id: 'partials',
    label: 'Partials',
    description: 'First-order partial derivatives in x, y, or z',
    hotkey: '6',
    target: { kind: 'advancedCalculus', screen: 'partialsHome' },
  },
];

const DERIVATIVES_MENU_ENTRIES: CalculateMenuEntry[] = [
  {
    id: 'derivative',
    label: 'Derivative',
    description: 'Differentiate an expression in x',
    hotkey: '1',
    target: { kind: 'calculate', screen: 'derivative' },
  },
  {
    id: 'derivativePoint',
    label: 'Derivative at Point',
    description: 'Evaluate the slope at one numeric x value',
    hotkey: '2',
    target: { kind: 'calculate', screen: 'derivativePoint' },
  },
];

const ROUTE_META: Record<CalculateScreen, CalculateRouteMeta> = {
  standard: {
    screen: 'standard',
    label: 'Calculate',
    breadcrumb: ['Calculate'],
    description: 'Direct symbolic and numeric textbook calculations.',
    helpText: 'Use the keypad, physical keyboard, or the curated CAS pages for direct entry.',
    focusTarget: 'editor',
  },
  calculusHome: {
    screen: 'calculusHome',
    label: 'Calculus',
    breadcrumb: ['Calculus'],
    description: 'Choose a calculus section for a guided workflow.',
    helpText: 'Choose a calculus section. Use EXE/F1 or keys 1-6.',
    previewTitle: 'Calculus Workbench',
    previewSubtitle: 'Choose Derivatives, Integrals, Limits, Series, Differential Equations, or Partials.',
    emptyStateTitle: 'Choose a calculus section.',
    emptyStateDescription: 'Open a section to build a guided calculus request.',
    focusTarget: 'menu',
  },
  derivativesHome: {
    screen: 'derivativesHome',
    label: 'Derivatives',
    breadcrumb: ['Calculus', 'Derivatives'],
    description: 'Choose a derivative workflow.',
    helpText: 'Choose a derivative workflow. Use EXE/F1 or keys 1-2.',
    previewTitle: 'Derivatives',
    previewSubtitle: 'Derivative and derivative-at-point workflows.',
    emptyStateTitle: 'Choose a derivative workflow.',
    emptyStateDescription: 'Open Derivative or Derivative at Point to build a guided calculus expression.',
    focusTarget: 'menu',
  },
  derivative: {
    screen: 'derivative',
    label: 'Derivative',
    breadcrumb: ['Calculus', 'Derivatives', 'Derivative'],
    description: 'Differentiate an expression in x.',
    helpText: 'Enter an expression in x, then press EXE or F1 to differentiate.',
    guideArticleId: 'calculus-derivatives',
    previewTitle: 'Generated Derivative',
    previewSubtitle: 'Calculus derivative in x',
    emptyStateTitle: 'Derivative body needed',
    emptyStateDescription: 'Enter an expression in x to generate the derivative form.',
    focusTarget: 'body',
  },
  derivativePoint: {
    screen: 'derivativePoint',
    label: 'Derivative at Point',
    breadcrumb: ['Calculus', 'Derivatives', 'Derivative at Point'],
    description: 'Evaluate a derivative at one numeric point.',
    helpText: 'Enter an expression in x and a numeric point, then press EXE or F1.',
    guideArticleId: 'calculus-derivatives',
    previewTitle: 'Generated Derivative at a Point',
    previewSubtitle: 'Calculus point-slope workflow',
    emptyStateTitle: 'Body and point needed',
    emptyStateDescription: 'Enter an expression and a point value to build the derivative-at-point form.',
    focusTarget: 'body',
  },
  integral: {
    screen: 'integral',
    label: 'Integral',
    breadcrumb: ['Calculus', 'Integrals', 'Integral'],
    description: 'Work with indefinite or definite integrals in x.',
    helpText: 'Enter an integrand, choose the kind, then press EXE or F1.',
    guideArticleId: 'calculus-integrals-limits',
    previewTitle: 'Generated Integral',
    previewSubtitle: 'Calculus integral workflow',
    emptyStateTitle: 'Integrand needed',
    emptyStateDescription: 'Enter an integrand and choose the integral kind to build the calculus form.',
    focusTarget: 'body',
  },
  limit: {
    screen: 'limit',
    label: 'Limit',
    breadcrumb: ['Calculus', 'Limits', 'Limit'],
    description: 'Evaluate a limit near a finite target or toward +/-infinity in x.',
    helpText: 'Enter an expression, choose a finite target or +/-infinity, then press EXE or F1.',
    guideArticleId: 'calculus-integrals-limits',
    previewTitle: 'Generated Limit',
    previewSubtitle: 'Calculus finite and infinite-target limit workflow',
    emptyStateTitle: 'Body and target needed',
    emptyStateDescription: 'Enter the body and choose a finite or infinite target to build the limit expression.',
    focusTarget: 'body',
  },
};

function entriesForScreen(screen: CalculateScreen) {
  if (screen === 'calculusHome') {
    return SECTION_MENU_ENTRIES;
  }

  if (screen === 'derivativesHome') {
    return DERIVATIVES_MENU_ENTRIES;
  }

  return [];
}

export function isCalculateMenuScreen(screen: CalculateScreen) {
  return screen === 'calculusHome' || screen === 'derivativesHome';
}

export function isCalculateWorkbenchScreen(screen: CalculateScreen) {
  return screen !== 'standard';
}

export function isCalculateToolScreen(
  screen: CalculateScreen,
): screen is Exclude<CalculateScreen, 'standard' | 'calculusHome' | 'derivativesHome'> {
  return screen === 'derivative'
    || screen === 'derivativePoint'
    || screen === 'integral'
    || screen === 'limit';
}

export function getCalculateMenuEntries(screen: CalculateScreen = 'calculusHome') {
  return entriesForScreen(screen);
}

export function getCalculateMenuEntryAtIndex(
  screen: CalculateScreen,
  selectedIndex: number,
) {
  const entries = entriesForScreen(screen);
  if (entries.length === 0) {
    return undefined;
  }

  const safeIndex = Math.min(Math.max(selectedIndex, 0), entries.length - 1);
  return entries[safeIndex];
}

export function getCalculateMenuEntryByHotkey(
  screen: CalculateScreen,
  hotkey: string,
) {
  return entriesForScreen(screen).find((entry) => entry.hotkey === hotkey);
}

export function moveCalculateMenuIndex(
  screen: CalculateScreen,
  currentIndex: number,
  delta: number,
) {
  const entries = entriesForScreen(screen);
  return Math.min(Math.max(currentIndex + delta, 0), Math.max(entries.length - 1, 0));
}

export function getCalculateParentScreen(screen: CalculateScreen): CalculateScreen | null {
  if (screen === 'standard') {
    return null;
  }

  if (screen === 'calculusHome') {
    return 'standard';
  }

  if (screen === 'derivativesHome') {
    return 'calculusHome';
  }

  if (screen === 'derivative' || screen === 'derivativePoint') {
    return 'derivativesHome';
  }

  return 'calculusHome';
}

export function getCalculateRouteMeta(screen: CalculateScreen) {
  return ROUTE_META[screen];
}

export function getCalculateMenuFooterText(screen: CalculateScreen) {
  if (screen === 'calculusHome') {
    return '1-6: Open | Up/Down: Move | EXE/F1: Select | F5/Esc: Standard';
  }

  if (screen === 'derivativesHome') {
    return '1-2: Open | Up/Down: Move | EXE/F1: Select | F5/Esc: Back';
  }

  return '';
}

export function getCalculateSoftActions(screen: CalculateScreen): SoftAction[] {
  if (screen === 'standard') {
    return [
      { id: 'simplify', label: 'Simplify', hotkey: 'F1' },
      { id: 'factor', label: 'Factor', hotkey: 'F2' },
      { id: 'expand', label: 'Expand', hotkey: 'F3' },
      { id: 'algebra', label: 'Algebra', hotkey: 'F4' },
      { id: 'clear', label: 'Clear', hotkey: 'F5' },
      { id: 'history', label: 'History', hotkey: 'F6' },
    ];
  }

  if (screen === 'calculusHome' || screen === 'derivativesHome') {
    return [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'standard', label: 'Standard', hotkey: 'F2' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'history', label: 'History', hotkey: 'F6' },
    ];
  }

  if (screen === 'integral') {
    return [
      { id: 'evaluate', label: 'Evaluate', hotkey: 'F1' },
      { id: 'toEditor', label: 'To Editor', hotkey: 'F2' },
      { id: 'toggleIntegralKind', label: 'Indef/Def', hotkey: 'F3' },
      { id: 'clear', label: 'Clear', hotkey: 'F5' },
      { id: 'history', label: 'History', hotkey: 'F6' },
    ];
  }

  if (screen === 'limit') {
    return [
      { id: 'evaluate', label: 'Evaluate', hotkey: 'F1' },
      { id: 'toEditor', label: 'To Editor', hotkey: 'F2' },
      { id: 'cycleLimitDirection', label: 'Direction', hotkey: 'F3' },
      { id: 'clear', label: 'Clear', hotkey: 'F5' },
      { id: 'history', label: 'History', hotkey: 'F6' },
    ];
  }

  return [
    { id: 'evaluate', label: 'Evaluate', hotkey: 'F1' },
    { id: 'toEditor', label: 'To Editor', hotkey: 'F2' },
    { id: 'calculusMenu', label: 'Calculus', hotkey: 'F3' },
    { id: 'clear', label: 'Clear', hotkey: 'F5' },
    { id: 'history', label: 'History', hotkey: 'F6' },
  ];
}

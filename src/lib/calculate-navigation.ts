import type { CalculateRouteMeta, CalculateScreen } from '../types/calculator';
import type { SoftAction } from './menu';

type CalculateMenuEntry = {
  id: Exclude<CalculateScreen, 'standard' | 'calculusHome'>;
  label: string;
  description: string;
  hotkey: string;
  target: Exclude<CalculateScreen, 'standard' | 'calculusHome'>;
};

const CALCULUS_MENU_ENTRIES: CalculateMenuEntry[] = [
  {
    id: 'derivative',
    label: 'Derivative',
    description: 'Differentiate an expression in x',
    hotkey: '1',
    target: 'derivative',
  },
  {
    id: 'derivativePoint',
    label: 'Derivative at Point',
    description: 'Evaluate the slope at one numeric x value',
    hotkey: '2',
    target: 'derivativePoint',
  },
  {
    id: 'integral',
    label: 'Integral',
    description: 'Work with indefinite or definite integrals',
    hotkey: '3',
    target: 'integral',
  },
  {
    id: 'limit',
    label: 'Limit',
    description: 'Evaluate finite or infinite-target limits',
    hotkey: '4',
    target: 'limit',
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
    label: 'Calculus Tools',
    breadcrumb: ['Calculate', 'Calculus'],
    description: 'Choose a calculus tool for a guided workflow.',
    helpText: 'Choose a calculus tool. Use EXE/F1 or keys 1-4.',
    previewTitle: 'Core Calculus Workbench',
    previewSubtitle: 'Choose a simpler single-variable calculus tool or jump to the advanced version when needed.',
    emptyStateTitle: 'Choose a calculus tool.',
    emptyStateDescription: 'Open Derivative, Derivative at Point, Integral, or Limit to build a guided calculus expression.',
    focusTarget: 'menu',
  },
  derivative: {
    screen: 'derivative',
    label: 'Derivative',
    breadcrumb: ['Calculate', 'Calculus', 'Derivative'],
    description: 'Differentiate an expression in x.',
    helpText: 'Enter an expression in x, then press EXE or F1 to differentiate.',
    guideArticleId: 'calculus-derivatives',
    previewTitle: 'Generated Derivative',
    previewSubtitle: 'Core Calculus derivative in x',
    emptyStateTitle: 'Derivative body needed',
    emptyStateDescription: 'Enter an expression in x to generate the derivative form.',
    focusTarget: 'body',
  },
  derivativePoint: {
    screen: 'derivativePoint',
    label: 'Derivative at Point',
    breadcrumb: ['Calculate', 'Calculus', 'Derivative at Point'],
    description: 'Evaluate a derivative at one numeric point.',
    helpText: 'Enter an expression in x and a numeric point, then press EXE or F1.',
    guideArticleId: 'calculus-derivatives',
    previewTitle: 'Generated Derivative at a Point',
    previewSubtitle: 'Core Calculus point-slope workflow',
    emptyStateTitle: 'Body and point needed',
    emptyStateDescription: 'Enter an expression and a point value to build the derivative-at-point form.',
    focusTarget: 'body',
  },
  integral: {
    screen: 'integral',
    label: 'Integral',
    breadcrumb: ['Calculate', 'Calculus', 'Integral'],
    description: 'Work with indefinite or definite integrals in x.',
    helpText: 'Enter an integrand, choose the kind, then press EXE or F1.',
    guideArticleId: 'calculus-integrals-limits',
    previewTitle: 'Generated Integral',
    previewSubtitle: 'Core Calculus integral workflow',
    emptyStateTitle: 'Integrand needed',
    emptyStateDescription: 'Enter an integrand and choose the integral kind to build the calculus form.',
    focusTarget: 'body',
  },
  limit: {
    screen: 'limit',
    label: 'Limit',
    breadcrumb: ['Calculate', 'Calculus', 'Limit'],
    description: 'Evaluate a limit near a finite target or toward ±∞ in x.',
    helpText: 'Enter an expression, choose a finite target or ±∞, then press EXE or F1.',
    guideArticleId: 'calculus-integrals-limits',
    previewTitle: 'Generated Limit',
    previewSubtitle: 'Core Calculus finite and infinite-target limit workflow',
    emptyStateTitle: 'Body and target needed',
    emptyStateDescription: 'Enter the body and choose a finite or infinite target to build the limit expression.',
    focusTarget: 'body',
  },
};

export function isCalculateMenuScreen(screen: CalculateScreen) {
  return screen === 'calculusHome';
}

export function isCalculateWorkbenchScreen(screen: CalculateScreen) {
  return screen !== 'standard';
}

export function isCalculateToolScreen(
  screen: CalculateScreen,
): screen is Exclude<CalculateScreen, 'standard' | 'calculusHome'> {
  return screen === 'derivative'
    || screen === 'derivativePoint'
    || screen === 'integral'
    || screen === 'limit';
}

export function getCalculateMenuEntries() {
  return CALCULUS_MENU_ENTRIES;
}

export function getCalculateMenuEntryAtIndex(selectedIndex: number) {
  if (CALCULUS_MENU_ENTRIES.length === 0) {
    return undefined;
  }

  const safeIndex = Math.min(Math.max(selectedIndex, 0), CALCULUS_MENU_ENTRIES.length - 1);
  return CALCULUS_MENU_ENTRIES[safeIndex];
}

export function getCalculateMenuEntryByHotkey(hotkey: string) {
  return CALCULUS_MENU_ENTRIES.find((entry) => entry.hotkey === hotkey);
}

export function moveCalculateMenuIndex(currentIndex: number, delta: number) {
  return Math.min(Math.max(currentIndex + delta, 0), CALCULUS_MENU_ENTRIES.length - 1);
}

export function getCalculateParentScreen(screen: CalculateScreen): CalculateScreen | null {
  if (screen === 'standard') {
    return null;
  }

  if (screen === 'calculusHome') {
    return 'standard';
  }

  return 'calculusHome';
}

export function getCalculateRouteMeta(screen: CalculateScreen) {
  return ROUTE_META[screen];
}

export function getCalculateMenuFooterText(screen: CalculateScreen) {
  if (screen === 'calculusHome') {
    return '1-4: Open | ◂/▸: Move | EXE/F1: Select | F5/Esc: Standard';
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

  if (screen === 'calculusHome') {
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
    { id: 'calculusMenu', label: 'Calc Menu', hotkey: 'F3' },
    { id: 'clear', label: 'Clear', hotkey: 'F5' },
    { id: 'history', label: 'History', hotkey: 'F6' },
  ];
}

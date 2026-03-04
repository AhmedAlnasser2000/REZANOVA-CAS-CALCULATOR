import type { AdvancedCalcScreen } from '../../types/calculator';
import type { SoftAction } from '../menu';

type AdvancedCalcMenuEntry = {
  id: string;
  label: string;
  description: string;
  hotkey: string;
  target: AdvancedCalcScreen;
};

export type AdvancedCalcRouteMeta = {
  screen: AdvancedCalcScreen;
  label: string;
  breadcrumb: string[];
  description: string;
  helpText: string;
  previewTitle: string;
  previewSubtitle: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  guideArticleId?: string;
  focusTarget: 'menu' | 'body' | 'bounds' | 'center' | 'target' | 'coefficients';
};

const HOME_ENTRIES: AdvancedCalcMenuEntry[] = [
  {
    id: 'integrals',
    label: 'Integrals',
    description: 'Harder indefinite, definite, and improper integrals',
    hotkey: '1',
    target: 'integralsHome',
  },
  {
    id: 'limits',
    label: 'Limits',
    description: 'Finite and infinite-target limit analysis',
    hotkey: '2',
    target: 'limitsHome',
  },
  {
    id: 'series',
    label: 'Series',
    description: 'Maclaurin and Taylor expansions',
    hotkey: '3',
    target: 'seriesHome',
  },
  {
    id: 'ode',
    label: 'ODE',
    description: 'Symbolic ODE flows and numeric IVP solving',
    hotkey: '4',
    target: 'odeHome',
  },
  {
    id: 'partials',
    label: 'Partials',
    description: 'First-order partial derivatives in x, y, or z',
    hotkey: '5',
    target: 'partialsHome',
  },
];

const INTEGRAL_ENTRIES: AdvancedCalcMenuEntry[] = [
  {
    id: 'indefinite',
    label: 'Indefinite',
    description: 'Symbolic antiderivatives with stronger rule coverage',
    hotkey: '1',
    target: 'indefiniteIntegral',
  },
  {
    id: 'definite',
    label: 'Definite',
    description: 'Finite definite integrals with symbolic-first evaluation',
    hotkey: '2',
    target: 'definiteIntegral',
  },
  {
    id: 'improper',
    label: 'Improper',
    description: 'Convergent improper definite integrals',
    hotkey: '3',
    target: 'improperIntegral',
  },
];

const LIMIT_ENTRIES: AdvancedCalcMenuEntry[] = [
  {
    id: 'finiteLimit',
    label: 'Finite Target',
    description: 'Directional and two-sided limits near a numeric target',
    hotkey: '1',
    target: 'finiteLimit',
  },
  {
    id: 'infiniteLimit',
    label: 'Infinite Target',
    description: 'Limits as x approaches +∞ or -∞',
    hotkey: '2',
    target: 'infiniteLimit',
  },
];

const SERIES_ENTRIES: AdvancedCalcMenuEntry[] = [
  {
    id: 'maclaurin',
    label: 'Maclaurin',
    description: 'Series about 0 up to order 8',
    hotkey: '1',
    target: 'maclaurin',
  },
  {
    id: 'taylor',
    label: 'Taylor',
    description: 'Series about a numeric center up to order 8',
    hotkey: '2',
    target: 'taylor',
  },
];

const ODE_ENTRIES: AdvancedCalcMenuEntry[] = [
  {
    id: 'odeFirstOrder',
    label: 'First Order',
    description: 'Guided symbolic first-order workflows',
    hotkey: '1',
    target: 'odeFirstOrder',
  },
  {
    id: 'odeSecondOrder',
    label: 'Second Order',
    description: 'Constant-coefficient second-order ODEs',
    hotkey: '2',
    target: 'odeSecondOrder',
  },
  {
    id: 'odeNumericIvp',
    label: 'Numeric IVP',
    description: 'Numeric initial-value solving with RK4/RK45',
    hotkey: '3',
    target: 'odeNumericIvp',
  },
];

const PARTIAL_ENTRIES: AdvancedCalcMenuEntry[] = [
  {
    id: 'partialDerivative',
    label: 'First Order',
    description: 'Differentiate with respect to x, y, or z while treating the others as constants',
    hotkey: '1',
    target: 'partialDerivative',
  },
];

const ROUTE_META: Record<AdvancedCalcScreen, AdvancedCalcRouteMeta> = {
  home: {
    screen: 'home',
    label: 'Advanced Calc',
    breadcrumb: ['Advanced Calc'],
    description: 'Choose a heavy-duty single-variable calculus or ODE tool.',
    helpText: 'Choose a section. Use EXE/F1 or keys 1-5.',
    previewTitle: 'Advanced Calculus Workbench',
    previewSubtitle: 'Choose the domain that best matches the calculus or symbolic task you want to run.',
    emptyStateTitle: 'Choose a section to begin.',
    emptyStateDescription: 'Open Integrals, Limits, Series, ODE, or Partials to build a guided advanced-calculus request.',
    focusTarget: 'menu',
  },
  integralsHome: {
    screen: 'integralsHome',
    label: 'Integrals',
    breadcrumb: ['Advanced Calc', 'Integrals'],
    description: 'Choose an integral workflow.',
    helpText: 'Choose Indefinite, Definite, or Improper. F5 or Esc goes back.',
    previewTitle: 'Integrals Menu',
    previewSubtitle: 'Choose the integral workflow that matches the kind of bounds and result you need.',
    emptyStateTitle: 'Choose an integral workflow.',
    emptyStateDescription: 'Open Indefinite, Definite, or Improper to build an advanced integral request.',
    guideArticleId: 'advanced-integrals',
    focusTarget: 'menu',
  },
  indefiniteIntegral: {
    screen: 'indefiniteIntegral',
    label: 'Indefinite Integral',
    breadcrumb: ['Advanced Calc', 'Integrals', 'Indefinite'],
    description: 'Solve harder symbolic antiderivatives in x.',
    helpText: 'Enter an integrand in x, then press EXE or F1.',
    previewTitle: 'Generated Antiderivative Form',
    previewSubtitle: 'Stronger symbolic antiderivative rules in x',
    emptyStateTitle: 'Integrand needed',
    emptyStateDescription: 'Enter an integrand to generate the antiderivative form.',
    guideArticleId: 'advanced-integrals',
    focusTarget: 'body',
  },
  definiteIntegral: {
    screen: 'definiteIntegral',
    label: 'Definite Integral',
    breadcrumb: ['Advanced Calc', 'Integrals', 'Definite'],
    description: 'Evaluate finite definite integrals symbolically or numerically.',
    helpText: 'Enter an integrand and numeric bounds, then press EXE or F1.',
    previewTitle: 'Generated Definite Integral',
    previewSubtitle: 'Finite bounds with numeric fallback when allowed',
    emptyStateTitle: 'Integrand and bounds needed',
    emptyStateDescription: 'Enter an integrand with lower and upper bounds to build the definite integral.',
    guideArticleId: 'advanced-integrals',
    focusTarget: 'body',
  },
  improperIntegral: {
    screen: 'improperIntegral',
    label: 'Improper Integral',
    breadcrumb: ['Advanced Calc', 'Integrals', 'Improper'],
    description: 'Evaluate supported convergent improper integrals.',
    helpText: 'Choose finite or infinite bounds, then press EXE or F1.',
    previewTitle: 'Generated Improper Integral',
    previewSubtitle: 'Infinite-bound workflows with controlled divergence errors',
    emptyStateTitle: 'Integrand or bounds missing',
    emptyStateDescription: 'Enter an integrand and choose the finite or infinite bounds to build the improper integral.',
    guideArticleId: 'advanced-integrals',
    focusTarget: 'body',
  },
  limitsHome: {
    screen: 'limitsHome',
    label: 'Limits',
    breadcrumb: ['Advanced Calc', 'Limits'],
    description: 'Choose a finite or infinite-target limit workflow.',
    helpText: 'Choose Finite or Infinite target. F5 or Esc goes back.',
    previewTitle: 'Limits Menu',
    previewSubtitle: 'Choose a finite-target or infinity-target workflow.',
    emptyStateTitle: 'Choose a limit workflow.',
    emptyStateDescription: 'Open Finite Target or Infinite Target to build a guided limit request.',
    guideArticleId: 'advanced-limits',
    focusTarget: 'menu',
  },
  finiteLimit: {
    screen: 'finiteLimit',
    label: 'Finite Limit',
    breadcrumb: ['Advanced Calc', 'Limits', 'Finite Target'],
    description: 'Evaluate a directional or two-sided finite-target limit.',
    helpText: 'Enter a body and numeric target, then press EXE or F1.',
    previewTitle: 'Generated Finite Limit',
    previewSubtitle: 'Finite target with left, right, or two-sided analysis',
    emptyStateTitle: 'Body and target needed',
    emptyStateDescription: 'Enter the body and target value to build the finite-limit expression.',
    guideArticleId: 'advanced-limits',
    focusTarget: 'body',
  },
  infiniteLimit: {
    screen: 'infiniteLimit',
    label: 'Infinite Limit',
    breadcrumb: ['Advanced Calc', 'Limits', 'Infinite Target'],
    description: 'Evaluate a limit as x approaches +∞ or -∞.',
    helpText: 'Enter a body, choose +∞ or -∞, then press EXE or F1.',
    previewTitle: 'Generated Infinite Limit',
    previewSubtitle: 'End behavior as x approaches infinity',
    emptyStateTitle: 'Body needed',
    emptyStateDescription: 'Enter the body to build the infinite-target limit expression.',
    guideArticleId: 'advanced-limits',
    focusTarget: 'body',
  },
  seriesHome: {
    screen: 'seriesHome',
    label: 'Series',
    breadcrumb: ['Advanced Calc', 'Series'],
    description: 'Choose a Maclaurin or Taylor expansion.',
    helpText: 'Choose a series type. F5 or Esc goes back.',
    previewTitle: 'Series Menu',
    previewSubtitle: 'Choose a Maclaurin or Taylor expansion workflow.',
    emptyStateTitle: 'Choose a series workflow.',
    emptyStateDescription: 'Open Maclaurin or Taylor to build a guided series request.',
    guideArticleId: 'advanced-series',
    focusTarget: 'menu',
  },
  maclaurin: {
    screen: 'maclaurin',
    label: 'Maclaurin Series',
    breadcrumb: ['Advanced Calc', 'Series', 'Maclaurin'],
    description: 'Expand around 0 to a chosen order.',
    helpText: 'Enter a body and order, then press EXE or F1.',
    previewTitle: 'Generated Maclaurin Request',
    previewSubtitle: 'Centered at 0',
    emptyStateTitle: 'Body and order needed',
    emptyStateDescription: 'Enter a body and choose an order to build the Maclaurin series form.',
    guideArticleId: 'advanced-series',
    focusTarget: 'body',
  },
  taylor: {
    screen: 'taylor',
    label: 'Taylor Series',
    breadcrumb: ['Advanced Calc', 'Series', 'Taylor'],
    description: 'Expand around a numeric center to a chosen order.',
    helpText: 'Enter a body, center, and order, then press EXE or F1.',
    previewTitle: 'Generated Taylor Request',
    previewSubtitle: 'Centered at a numeric value',
    emptyStateTitle: 'Body, center, and order needed',
    emptyStateDescription: 'Enter a body, center, and order to build the Taylor series form.',
    guideArticleId: 'advanced-series',
    focusTarget: 'body',
  },
  odeHome: {
    screen: 'odeHome',
    label: 'ODE',
    breadcrumb: ['Advanced Calc', 'ODE'],
    description: 'Choose symbolic or numeric ODE tools.',
    helpText: 'Choose First Order, Second Order, or Numeric IVP.',
    previewTitle: 'ODE Menu',
    previewSubtitle: 'Choose the ODE workflow that matches the class of equation you want to solve.',
    emptyStateTitle: 'Choose an ODE workflow.',
    emptyStateDescription: 'Open First Order, Second Order, or Numeric IVP to build a guided ODE request.',
    guideArticleId: 'advanced-odes',
    focusTarget: 'menu',
  },
  partialsHome: {
    screen: 'partialsHome',
    label: 'Partials',
    breadcrumb: ['Advanced Calc', 'Partials'],
    description: 'Choose a partial-derivative workflow.',
    helpText: 'Open the partial tool. F5 or Esc goes back.',
    previewTitle: 'Partial Derivatives',
    previewSubtitle: 'First-order symbolic partials in x, y, or z',
    emptyStateTitle: 'Choose the partial-derivative tool.',
    emptyStateDescription: 'Open the partial tool to differentiate with respect to x, y, or z.',
    guideArticleId: 'advanced-partials',
    focusTarget: 'menu',
  },
  partialDerivative: {
    screen: 'partialDerivative',
    label: 'Partial Derivative',
    breadcrumb: ['Advanced Calc', 'Partials', 'First Order'],
    description: 'Differentiate an explicit multivariable expression with respect to x, y, or z.',
    helpText: 'Enter the body, choose x, y, or z, then press EXE or F1.',
    previewTitle: 'Generated Partial Derivative',
    previewSubtitle: 'Treat other variables as constants',
    emptyStateTitle: 'Expression needed',
    emptyStateDescription: 'Enter a multivariable expression to build the first-order partial derivative.',
    guideArticleId: 'advanced-partials',
    focusTarget: 'body',
  },
  odeFirstOrder: {
    screen: 'odeFirstOrder',
    label: 'First-Order ODE',
    breadcrumb: ['Advanced Calc', 'ODE', 'First Order'],
    description: 'Guided first-order symbolic ODE workflows.',
    helpText: 'Set the classification and equation, then press EXE or F1.',
    previewTitle: 'Generated First-Order ODE',
    previewSubtitle: 'Guided symbolic class selection',
    emptyStateTitle: 'Equation pieces needed',
    emptyStateDescription: 'Enter the left-hand side and right-hand side to build the first-order ODE.',
    guideArticleId: 'advanced-odes',
    focusTarget: 'body',
  },
  odeSecondOrder: {
    screen: 'odeSecondOrder',
    label: 'Second-Order ODE',
    breadcrumb: ['Advanced Calc', 'ODE', 'Second Order'],
    description: 'Constant-coefficient second-order ODEs with simple forcing.',
    helpText: 'Set coefficients and forcing, then press EXE or F1.',
    previewTitle: 'Generated Second-Order ODE',
    previewSubtitle: 'Constant-coefficient forms',
    emptyStateTitle: 'Coefficients and forcing needed',
    emptyStateDescription: 'Enter the coefficients and forcing term to build the second-order ODE.',
    guideArticleId: 'advanced-odes',
    focusTarget: 'coefficients',
  },
  odeNumericIvp: {
    screen: 'odeNumericIvp',
    label: 'Numeric IVP',
    breadcrumb: ['Advanced Calc', 'ODE', 'Numeric IVP'],
    description: 'Solve y\' = f(x,y) numerically with initial values.',
    helpText: 'Enter the RHS and initial values, then press EXE or F1.',
    previewTitle: 'Generated Numeric IVP',
    previewSubtitle: 'Numeric initial-value solving',
    emptyStateTitle: 'IVP data needed',
    emptyStateDescription: 'Enter y\' = f(x,y), initial values, and a step size to build the IVP.',
    guideArticleId: 'advanced-odes',
    focusTarget: 'body',
  },
};

function entriesForScreen(screen: AdvancedCalcScreen) {
  switch (screen) {
    case 'home':
      return HOME_ENTRIES;
    case 'integralsHome':
      return INTEGRAL_ENTRIES;
    case 'limitsHome':
      return LIMIT_ENTRIES;
    case 'seriesHome':
      return SERIES_ENTRIES;
    case 'odeHome':
      return ODE_ENTRIES;
    case 'partialsHome':
      return PARTIAL_ENTRIES;
    default:
      return [];
  }
}

export function isAdvancedCalcMenuScreen(screen: AdvancedCalcScreen) {
  return screen === 'home'
    || screen === 'integralsHome'
    || screen === 'limitsHome'
    || screen === 'seriesHome'
    || screen === 'odeHome'
    || screen === 'partialsHome';
}

export function getAdvancedCalcMenuEntries(screen: AdvancedCalcScreen) {
  return entriesForScreen(screen);
}

export function getAdvancedCalcMenuEntryAtIndex(
  screen: AdvancedCalcScreen,
  selectedIndex: number,
) {
  const entries = entriesForScreen(screen);
  if (entries.length === 0) {
    return undefined;
  }

  const safeIndex = Math.min(Math.max(selectedIndex, 0), entries.length - 1);
  return entries[safeIndex];
}

export function getAdvancedCalcMenuEntryByHotkey(
  screen: AdvancedCalcScreen,
  hotkey: string,
) {
  return entriesForScreen(screen).find((entry) => entry.hotkey === hotkey);
}

export function moveAdvancedCalcMenuIndex(
  screen: AdvancedCalcScreen,
  currentIndex: number,
  delta: number,
) {
  const entries = entriesForScreen(screen);
  return Math.min(Math.max(currentIndex + delta, 0), Math.max(entries.length - 1, 0));
}

export function getAdvancedCalcParentScreen(screen: AdvancedCalcScreen): AdvancedCalcScreen | null {
  switch (screen) {
    case 'home':
      return null;
    case 'integralsHome':
    case 'limitsHome':
    case 'seriesHome':
    case 'odeHome':
    case 'partialsHome':
      return 'home';
    case 'indefiniteIntegral':
    case 'definiteIntegral':
    case 'improperIntegral':
      return 'integralsHome';
    case 'finiteLimit':
    case 'infiniteLimit':
      return 'limitsHome';
    case 'maclaurin':
    case 'taylor':
      return 'seriesHome';
    case 'odeFirstOrder':
    case 'odeSecondOrder':
    case 'odeNumericIvp':
      return 'odeHome';
    case 'partialDerivative':
      return 'partialsHome';
    default:
      return 'home';
  }
}

export function getAdvancedCalcRouteMeta(screen: AdvancedCalcScreen) {
  return ROUTE_META[screen];
}

export function getAdvancedCalcSoftActions(screen: AdvancedCalcScreen): SoftAction[] {
  if (
    screen === 'home'
    || screen === 'integralsHome'
    || screen === 'limitsHome'
    || screen === 'seriesHome'
    || screen === 'odeHome'
    || screen === 'partialsHome'
  ) {
    return [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'guide', label: 'Guide', hotkey: 'F2' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'exit', label: 'Exit', hotkey: 'F6' },
    ];
  }

  return [
    { id: 'evaluate', label: 'Evaluate', hotkey: 'F1' },
    { id: 'toEditor', label: 'To Editor', hotkey: 'F2' },
    { id: 'menu', label: 'Menu', hotkey: 'F3' },
    { id: 'clear', label: 'Clear', hotkey: 'F5' },
    { id: 'history', label: 'History', hotkey: 'F6' },
  ];
}

export function getAdvancedCalcMenuFooterText(screen: AdvancedCalcScreen) {
  switch (screen) {
    case 'home':
      return '1-5: Open | EXE/F1: Select | F2: Guide | F5/Esc: MENU | F6: Exit';
    case 'integralsHome':
      return '1-3: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    case 'limitsHome':
      return '1-2: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    case 'seriesHome':
      return '1-2: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    case 'odeHome':
      return '1-3: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    case 'partialsHome':
      return '1: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    default:
      return '';
  }
}

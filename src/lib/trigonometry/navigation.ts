import type { TrigScreen } from '../../types/calculator';
import type { SoftAction } from '../navigation/menu';

type TrigMenuEntry = {
  id: string;
  label: string;
  description: string;
  hotkey: string;
  target: TrigScreen;
};

export type TrigRouteMeta = {
  screen: TrigScreen;
  label: string;
  breadcrumb: string[];
  description: string;
  helpText: string;
  guideArticleId?: string;
  focusTarget: 'menu' | 'guidedForm' | 'editor';
  editorMode: 'editable';
};

const HOME_ENTRIES: TrigMenuEntry[] = [
  { id: 'identities', label: 'Identities', description: 'Simplify and convert bounded trig identities', hotkey: '1', target: 'identitiesHome' },
  { id: 'triangles', label: 'Triangles', description: 'Right-triangle, sine-rule, and cosine-rule solvers', hotkey: '2', target: 'trianglesHome' },
  { id: 'angleConvert', label: 'Angle Convert', description: 'Convert degree, radian, and grad values', hotkey: '3', target: 'angleConvert' },
  { id: 'periodPhase', label: 'Period & Phase', description: 'Analyze affine sin, cos, and tan waves', hotkey: '4', target: 'periodPhase' },
];

const IDENTITY_ENTRIES: TrigMenuEntry[] = [
  { id: 'identitySimplify', label: 'Simplify', description: 'Apply bounded trig identity simplifications', hotkey: '1', target: 'identitySimplify' },
  { id: 'identityConvert', label: 'Convert Form', description: 'Convert to product-sum, sum-product, double-angle, or half-angle form', hotkey: '2', target: 'identityConvert' },
];

const EQUATION_ENTRIES: TrigMenuEntry[] = [
  { id: 'equationSolve', label: 'Solve Trig Equation', description: 'Solve bounded one-variable trig equations', hotkey: '1', target: 'equationSolve' },
];

const TRIANGLE_ENTRIES: TrigMenuEntry[] = [
  { id: 'rightTriangle', label: 'Right Triangle', description: 'Solve a right triangle from two known values', hotkey: '1', target: 'rightTriangle' },
  { id: 'sineRule', label: 'Sine Rule', description: 'Solve side-angle triangle cases with the sine rule', hotkey: '2', target: 'sineRule' },
  { id: 'cosineRule', label: 'Cosine Rule', description: 'Solve SSS or SAS cases with the cosine rule', hotkey: '3', target: 'cosineRule' },
];

const ROUTE_META: Record<TrigScreen, TrigRouteMeta> = {
  home: {
    screen: 'home',
    label: 'Trigonometry',
    breadcrumb: ['Trigonometry'],
    description: 'Choose a guided identity, triangle, angle-conversion, or period-and-phase workflow.',
    helpText: 'Use EXE/F1 or keys 1-4 to open a guided trig workflow. Use Calculate for quick trig values and Equation for trig equations.',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  functions: {
    screen: 'functions',
    label: 'Functions',
    breadcrumb: ['Trigonometry', 'Functions'],
    description: 'Legacy direct trig-value surface. New quick trig evaluation belongs in Calculate.',
    helpText: 'Legacy saved records still load here; use Calculate for new direct trig-value evaluation.',
    guideArticleId: 'trig-special-angles',
    focusTarget: 'editor',
    editorMode: 'editable',
  },
  identitiesHome: {
    screen: 'identitiesHome',
    label: 'Identities',
    breadcrumb: ['Trigonometry', 'Identities'],
    description: 'Choose a simplification or conversion workflow, or focus the top editor to run a trig identity draft directly.',
    helpText: 'Use EXE/F1 or keys 1-2 to open an identity tool. Focus the top editor when you want to run a draft directly.',
    guideArticleId: 'trig-identities',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  identitySimplify: {
    screen: 'identitySimplify',
    label: 'Identity Simplify',
    breadcrumb: ['Trigonometry', 'Identities', 'Simplify'],
    description: 'Apply bounded Pythagorean and quotient-form simplifications through the shared trig editor.',
    helpText: 'Enter a supported trig identity in the top editor, then press EXE or F1.',
    guideArticleId: 'trig-identities',
    focusTarget: 'editor',
    editorMode: 'editable',
  },
  identityConvert: {
    screen: 'identityConvert',
    label: 'Identity Convert',
    breadcrumb: ['Trigonometry', 'Identities', 'Convert'],
    description: 'Convert a bounded identity into the chosen target form using the shared trig editor.',
    helpText: 'Enter an identity in the top editor, choose the target form, then press EXE or F1.',
    guideArticleId: 'trig-identities',
    focusTarget: 'editor',
    editorMode: 'editable',
  },
  equationsHome: {
    screen: 'equationsHome',
    label: 'Equations',
    breadcrumb: ['Trigonometry', 'Equations'],
    description: 'Legacy trig-equation menu. New trig equation solving belongs in Equation.',
    helpText: 'Legacy saved records still load here; use Equation for new trig equation solving.',
    guideArticleId: 'trig-equations',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  equationSolve: {
    screen: 'equationSolve',
    label: 'Solve Trig Equation',
    breadcrumb: ['Trigonometry', 'Equations', 'Solve'],
    description: 'Legacy bounded trig-equation surface. New trig equations should open in Equation symbolic solve.',
    helpText: 'Legacy saved records still load here; use Send Eqn or Equation for new trig equation solving.',
    guideArticleId: 'trig-equations',
    focusTarget: 'editor',
    editorMode: 'editable',
  },
  trianglesHome: {
    screen: 'trianglesHome',
    label: 'Triangles',
    breadcrumb: ['Trigonometry', 'Triangles'],
    description: 'Choose a triangle-solving workflow below, or focus the top editor to run a trig-triangle draft directly.',
    helpText: 'Use EXE/F1 or keys 1-3 to open a triangle tool. Focus the top editor when you want to run a draft directly.',
    guideArticleId: 'trig-triangles',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  rightTriangle: {
    screen: 'rightTriangle',
    label: 'Right Triangle',
    breadcrumb: ['Trigonometry', 'Triangles', 'Right Triangle'],
    description: 'Solve a right triangle from any valid two-value combination, with the guided form feeding the shared trig editor.',
    helpText: 'Enter exactly two known values, with at least one side, then press EXE or F1. Use the top editor when you want to edit the trig request directly.',
    guideArticleId: 'trig-triangles',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  sineRule: {
    screen: 'sineRule',
    label: 'Sine Rule',
    breadcrumb: ['Trigonometry', 'Triangles', 'Sine Rule'],
    description: 'Solve side-angle triangle cases using the sine rule, with the guided form feeding the shared trig editor.',
    helpText: 'Enter a matching side-angle pair and enough extra data to define the triangle. Use the top editor when you want to edit the trig request directly.',
    guideArticleId: 'trig-triangles',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  cosineRule: {
    screen: 'cosineRule',
    label: 'Cosine Rule',
    breadcrumb: ['Trigonometry', 'Triangles', 'Cosine Rule'],
    description: 'Solve SSS or SAS triangle cases using the cosine rule, with the guided form feeding the shared trig editor.',
    helpText: 'Enter three sides or two sides plus the included angle, then press EXE or F1. Use the top editor when you want to edit the trig request directly.',
    guideArticleId: 'trig-triangles',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  angleConvert: {
    screen: 'angleConvert',
    label: 'Angle Convert',
    breadcrumb: ['Trigonometry', 'Angle Convert'],
    description: 'Convert degree, radian, and grad values through a guided form or a shared trig request.',
    helpText: 'Enter a numeric value, choose the source and target units, then press EXE or F1. Use the top editor when you want to edit the trig request directly.',
    guideArticleId: 'trig-special-angles',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  periodPhase: {
    screen: 'periodPhase',
    label: 'Period & Phase',
    breadcrumb: ['Trigonometry', 'Period & Phase'],
    description: 'Read amplitude, period, phase shift, midline, and landmarks from affine sin, cos, and tan expressions.',
    helpText: 'Enter an expression such as 2sin(3x-pi)+1, cos(2x+pi/3)-4, or tan(x-pi/4). Use Equation for trig equations.',
    focusTarget: 'editor',
    editorMode: 'editable',
  },
  specialAngles: {
    screen: 'specialAngles',
    label: 'Special Angles',
    breadcrumb: ['Trigonometry', 'Special Angles'],
    description: 'Legacy special-angle evaluator. New unit-circle and special-angle reference material lives in Guide.',
    helpText: 'Legacy saved records still load here; open Guide > Trigonometry > Unit Circle for reference material.',
    guideArticleId: 'trig-special-angles',
    focusTarget: 'editor',
    editorMode: 'editable',
  },
};

function entriesForScreen(screen: TrigScreen) {
  switch (screen) {
    case 'home':
      return HOME_ENTRIES;
    case 'identitiesHome':
      return IDENTITY_ENTRIES;
    case 'equationsHome':
      return EQUATION_ENTRIES;
    case 'trianglesHome':
      return TRIANGLE_ENTRIES;
    default:
      return [];
  }
}

export function isTrigMenuScreen(screen: TrigScreen) {
  return screen === 'home' || screen === 'identitiesHome' || screen === 'equationsHome' || screen === 'trianglesHome';
}

export function getTrigMenuEntries(screen: TrigScreen) {
  return entriesForScreen(screen);
}

export function getTrigMenuEntryAtIndex(screen: TrigScreen, selectedIndex: number) {
  const entries = entriesForScreen(screen);
  if (entries.length === 0) {
    return undefined;
  }
  const safeIndex = Math.min(Math.max(selectedIndex, 0), entries.length - 1);
  return entries[safeIndex];
}

export function getTrigMenuEntryByHotkey(screen: TrigScreen, hotkey: string) {
  return entriesForScreen(screen).find((entry) => entry.hotkey === hotkey);
}

export function moveTrigMenuIndex(screen: TrigScreen, currentIndex: number, delta: number) {
  const entries = entriesForScreen(screen);
  return Math.min(Math.max(currentIndex + delta, 0), Math.max(entries.length - 1, 0));
}

export function getTrigParentScreen(screen: TrigScreen): TrigScreen | null {
  switch (screen) {
    case 'home':
      return null;
    case 'functions':
    case 'identitiesHome':
    case 'equationsHome':
    case 'trianglesHome':
    case 'angleConvert':
    case 'periodPhase':
    case 'specialAngles':
      return 'home';
    case 'identitySimplify':
    case 'identityConvert':
      return 'identitiesHome';
    case 'equationSolve':
      return 'equationsHome';
    case 'rightTriangle':
    case 'sineRule':
    case 'cosineRule':
      return 'trianglesHome';
    default:
      return 'home';
  }
}

export function getTrigRouteMeta(screen: TrigScreen) {
  return ROUTE_META[screen];
}

export function getTrigSoftActions(screen: TrigScreen): SoftAction[] {
  if (isTrigMenuScreen(screen)) {
    return [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'guide', label: 'Guide', hotkey: 'F2' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'exit', label: 'Exit', hotkey: 'F6' },
    ];
  }

  const actions: SoftAction[] = [
    { id: 'evaluate', label: 'Evaluate', hotkey: 'F1' },
    { id: 'menu', label: 'Menu', hotkey: 'F3' },
    { id: 'clear', label: 'Clear', hotkey: 'F5' },
    { id: 'history', label: 'History', hotkey: 'F6' },
  ];

  if (screen === 'equationSolve') {
    actions.splice(1, 0, { id: 'sendToEquation', label: 'Send Eqn', hotkey: 'F2' });
  } else if (screen === 'functions' || screen === 'identitySimplify' || screen === 'identityConvert' || screen === 'specialAngles') {
    actions.splice(1, 0, { id: 'sendToCalc', label: 'Send Calc', hotkey: 'F2' });
  }

  return actions;
}

export function getTrigMenuFooterText(screen: TrigScreen) {
  switch (screen) {
    case 'home':
      return '1-4: Open | EXE/F1: Select | F2: Guide | F5/Esc: Back | F6: Exit';
    case 'identitiesHome':
      return '1-2: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    case 'equationsHome':
      return '1: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    case 'trianglesHome':
      return '1-3: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    default:
      return '';
  }
}

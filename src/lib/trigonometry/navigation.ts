import type { TrigScreen } from '../../types/calculator';
import type { SoftAction } from '../menu';

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
  { id: 'functions', label: 'Functions', description: 'Evaluate sin, cos, tan, and inverse trig functions', hotkey: '1', target: 'functions' },
  { id: 'identities', label: 'Identities', description: 'Simplify and convert bounded trig identities', hotkey: '2', target: 'identitiesHome' },
  { id: 'equations', label: 'Equations', description: 'Solve bounded trig equations in x', hotkey: '3', target: 'equationsHome' },
  { id: 'triangles', label: 'Triangles', description: 'Right-triangle, sine-rule, and cosine-rule solvers', hotkey: '4', target: 'trianglesHome' },
  { id: 'angleConvert', label: 'Angle Convert', description: 'Convert degree, radian, and grad values', hotkey: '5', target: 'angleConvert' },
  { id: 'specialAngles', label: 'Special Angles', description: 'Exact-value reference for the standard special angles', hotkey: '6', target: 'specialAngles' },
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
    description: 'Type a Trigonometry request above or choose a guided trig workflow below.',
    helpText: 'Use EXE/F1 or keys 1-6 to open a trig tool. Focus the top editor when you want to run a trig draft directly.',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  functions: {
    screen: 'functions',
    label: 'Functions',
    breadcrumb: ['Trigonometry', 'Functions'],
    description: 'Evaluate a single trig or inverse-trig expression using the shared trig editor and the current angle unit.',
    helpText: 'Enter a single trig expression such as sin(30), cos(pi/3), or asin(1/2) in the top editor, then press EXE or F1.',
    guideArticleId: 'trig-functions',
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
    description: 'Choose the trig-equation solver, or focus the top editor to run a trig-equation draft directly.',
    helpText: 'Use EXE/F1 or key 1 to open the solver. Focus the top editor when you want to run a draft directly.',
    guideArticleId: 'trig-equations',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  equationSolve: {
    screen: 'equationSolve',
    label: 'Solve Trig Equation',
    breadcrumb: ['Trigonometry', 'Equations', 'Solve'],
    description: 'Solve bounded equations such as sin(x+30)=1/2, sin(2x)=0, sin(x)cos(x)=1/2, 2cos^2(x)-1=0, tan^2(x)-1=0, or a*sin(A)+b*cos(A)=c through the shared trig editor.',
    helpText: 'Enter a supported equation in x in the top editor, then press EXE or F1. Selected exact trig rewrites, square forms, affine-argument families, and single-carrier substitution families are reduced automatically before solve. Use Send Eqn when you need interval-based numeric solving.',
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
  specialAngles: {
    screen: 'specialAngles',
    label: 'Special Angles',
    breadcrumb: ['Trigonometry', 'Special Angles'],
    description: 'Reference the exact values for the standard special angles while evaluating supported expressions in the shared trig editor.',
    helpText: 'Review the table or evaluate a supported special-angle expression in the top editor.',
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
  } else {
    actions.splice(1, 0, { id: 'useInTrig', label: 'Use in Trig', hotkey: 'F2' });
  }

  return actions;
}

export function getTrigMenuFooterText(screen: TrigScreen) {
  switch (screen) {
    case 'home':
      return '1-6: Open | EXE/F1: Select | F2: Guide | F5/Esc: Back | F6: Exit';
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

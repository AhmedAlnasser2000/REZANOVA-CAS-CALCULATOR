import type { Settings } from '../../types/calculator';

export type ProbePolicyClass =
  | 'semantic-runtime'
  | 'formatting'
  | 'shell-accessibility'
  | 'persistence-privacy';

export type ExecutableProbeKind = 'native' | 'component' | 'persistence';

export type ExecutableFeatureProbe = {
  kind: ExecutableProbeKind;
  testFile: string;
  testName: string;
};

export const EXECUTABLE_FEATURE_PROBES = {
  'language-setting-component': {
    kind: 'component',
    testFile: 'src/components/SettingsPanel.ui.test.tsx',
    testName: 'shows the English language setting and patches languageCode from the chip',
  },
  'inverse-trig-angle-units-native': {
    kind: 'native',
    testFile: 'src/lib/engine/math-engine/numeric-evaluation.test.ts',
    testName: 'keeps exact inverse-trig special values',
  },
  'output-style-native': {
    kind: 'native',
    testFile: 'src/lib/equation/equation-complex.test.ts',
    testName: 'respects output style for bounded complex branches',
  },
  'equation-answer-mode-native': {
    kind: 'native',
    testFile: 'src/lib/modes/equation/answer-modes.test.ts',
    testName: 'keeps exact symbolic parameters exact and asks for missing values only on numeric routes',
  },
  'equation-domain-native': {
    kind: 'native',
    testFile: 'src/lib/modes/equation/complex-domain.test.ts',
    testName: 'keeps simple real linear equations stable when Complex intent is enabled',
  },
  'complex-exact-form-native': {
    kind: 'native',
    testFile: 'src/lib/equation/equation-complex.test.ts',
    testName: 'uses the selected exact form for awkward exact imaginary-unit power branches',
  },
  'math-notation-native': {
    kind: 'native',
    testFile: 'src/lib/display/notation/math-notation.test.ts',
    testName: 'keeps canonical latex when latex mode is selected',
  },
  'history-notation-component': {
    kind: 'component',
    testFile: 'src/app/shell/SettingsPage.ui.test.tsx',
    testName: 'exposes full-page History notation controls with rendered-math confirmation',
  },
  'history-disabled-persistence': {
    kind: 'persistence',
    testFile: 'src/app/runtime/useHistoryDisplayRuntime.ui.test.tsx',
    testName: 'keeps display and Ans while discarding history when history is disabled',
  },
  'calculator-memory-restore-persistence': {
    kind: 'persistence',
    testFile: 'src/app/runtime/useAppPersistenceRuntime.ui.test.tsx',
    testName: 'restores calculator memory before bootstrap state when saved memory is enabled',
  },
  'calculator-memory-policy-persistence': {
    kind: 'persistence',
    testFile: 'src/lib/app-state/settings.test.ts',
    testName: 'defaults calculator memory settings and clamps interval to at least 20 seconds',
  },
  'calculator-memory-settings-component': {
    kind: 'component',
    testFile: 'src/components/SettingsPanel.ui.test.tsx',
    testName: 'configures calculator memory and exposes reset actions',
  },
  'notebook-settings-component': {
    kind: 'component',
    testFile: 'src/app/shell/SettingsPage.ui.test.tsx',
    testName: 'persists Notebook preferences through the Settings page',
  },
  'auto-equation-component': {
    kind: 'component',
    testFile: 'src/app/shell/ModeStrip.ui.test.tsx',
    testName: 'renders language-backed utility labels and keeps callbacks wired',
  },
  'surface-scale-contrast-component': {
    kind: 'component',
    testFile: 'src/app/shell/ActiveSurfaceHost.ui.test.tsx',
    testName: 'applies page scale and high contrast to page surfaces without calculator context',
  },
  'symbolic-notation-native': {
    kind: 'native',
    testFile: 'src/lib/display/notation/symbolic-display.test.ts',
    testName: 'flattens nested roots in root mode and prefers powers in power/auto modes',
  },
  'numeric-precision-native': {
    kind: 'native',
    testFile: 'src/lib/display/notation/numeric-output.test.ts',
    testName: 'formats decimal output with the configured digits',
  },
  'numeric-scientific-native': {
    kind: 'native',
    testFile: 'src/lib/display/notation/numeric-output.test.ts',
    testName: 'formats scientific output in e notation when requested',
  },
  'detailed-facts-component': {
    kind: 'component',
    testFile: 'src/components/SettingsPanel.ui.test.tsx',
    testName: 'offers detailed facts as an opt-in display setting',
  },
} as const satisfies Record<string, ExecutableFeatureProbe>;

export type FeatureProbeId = keyof typeof EXECUTABLE_FEATURE_PROBES;

export type ProbePolicy = {
  policyClass: ProbePolicyClass;
  probes: readonly [FeatureProbeId, ...FeatureProbeId[]];
};

export const FEATURE_PROBE_REGISTRY = {
  languageCode: {
    policyClass: 'shell-accessibility',
    probes: ['language-setting-component'],
  },
  angleUnit: {
    policyClass: 'semantic-runtime',
    probes: ['inverse-trig-angle-units-native'],
  },
  outputStyle: {
    policyClass: 'semantic-runtime',
    probes: ['output-style-native'],
  },
  equationAnswerMode: {
    policyClass: 'semantic-runtime',
    probes: ['equation-answer-mode-native'],
  },
  equationDomainIntent: {
    policyClass: 'semantic-runtime',
    probes: ['equation-domain-native'],
  },
  complexExactForm: {
    policyClass: 'formatting',
    probes: ['complex-exact-form-native'],
  },
  mathNotationDisplay: {
    policyClass: 'formatting',
    probes: ['math-notation-native'],
  },
  historyInspectorNotationMode: {
    policyClass: 'formatting',
    probes: ['history-notation-component'],
  },
  historyPageNotationMode: {
    policyClass: 'formatting',
    probes: ['history-notation-component'],
  },
  historyEnabled: {
    policyClass: 'persistence-privacy',
    probes: ['history-disabled-persistence'],
  },
  calculatorMemoryEnabled: {
    policyClass: 'persistence-privacy',
    probes: ['calculator-memory-restore-persistence', 'calculator-memory-settings-component'],
  },
  calculatorMemoryAutosaveMode: {
    policyClass: 'persistence-privacy',
    probes: ['calculator-memory-policy-persistence', 'calculator-memory-settings-component'],
  },
  calculatorMemoryAutosaveIntervalSeconds: {
    policyClass: 'persistence-privacy',
    probes: ['calculator-memory-policy-persistence', 'calculator-memory-settings-component'],
  },
  notebook: {
    policyClass: 'persistence-privacy',
    probes: ['notebook-settings-component'],
  },
  autoSwitchToEquation: {
    policyClass: 'shell-accessibility',
    probes: ['auto-equation-component'],
  },
  uiScale: {
    policyClass: 'shell-accessibility',
    probes: ['surface-scale-contrast-component'],
  },
  mathScale: {
    policyClass: 'shell-accessibility',
    probes: ['surface-scale-contrast-component'],
  },
  resultScale: {
    policyClass: 'shell-accessibility',
    probes: ['surface-scale-contrast-component'],
  },
  highContrast: {
    policyClass: 'shell-accessibility',
    probes: ['surface-scale-contrast-component'],
  },
  symbolicDisplayMode: {
    policyClass: 'formatting',
    probes: ['symbolic-notation-native'],
  },
  flattenNestedRootsWhenSafe: {
    policyClass: 'formatting',
    probes: ['symbolic-notation-native'],
  },
  approxDigits: {
    policyClass: 'formatting',
    probes: ['numeric-precision-native'],
  },
  numericNotationMode: {
    policyClass: 'formatting',
    probes: ['numeric-precision-native', 'numeric-scientific-native'],
  },
  scientificNotationStyle: {
    policyClass: 'formatting',
    probes: ['numeric-scientific-native'],
  },
  detailedFactsEnabled: {
    policyClass: 'formatting',
    probes: ['detailed-facts-component'],
  },
} as const satisfies Record<keyof Settings, ProbePolicy>;

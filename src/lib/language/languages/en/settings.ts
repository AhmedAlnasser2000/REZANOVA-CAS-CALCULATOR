import type { LanguageCatalog } from '../../types';

export const englishSettings = {
  title: 'Settings',
  description: 'Live app preferences and symbolic display defaults.',
  sections: {
    display: 'Display',
    numericOutput: 'Numeric Output',
    symbolicDisplay: 'Symbolic Display',
    complex: 'Complex',
    general: 'General',
    history: 'History',
    calculatorMemory: 'Calculator Memory',
  },
  fields: {
    uiScale: 'UI Scale',
    mathSize: 'Math Size',
    resultSize: 'Result Size',
    highContrast: 'High Contrast',
    detailedFacts: 'Detailed Facts',
    approximateDigits: 'Approximate digits',
    notation: 'Notation',
    scientificFormat: 'Scientific format',
    powerRootStyle: 'Power / Root Style',
    flattenNestedRootsWhenSafe: 'Flatten Nested Roots When Safe',
    exactBranchForm: 'Exact Branch Form',
    language: 'Language',
    angleUnit: 'Angle Unit',
    mathNotation: 'Math Notation',
    outputStyle: 'Output Style',
    equationAnswerMode: 'Equation Answer Mode',
    autoSwitchToEquation: 'Auto Switch to Equation',
    historyEnabled: 'History Enabled',
    saveCalculatorMemory: 'Save Calculator Memory',
    autosaveMode: 'Autosave Mode',
    autosaveInterval: 'Autosave Interval',
  },
  options: {
    scalePercent: (value) => `${value}%`,
    numericNotation: {
      decimal: 'Decimal',
      scientific: 'Scientific',
      auto: 'Auto',
    },
    scientificStyle: {
      times10: '×10^n',
      e: 'e',
    },
    symbolicDisplay: {
      roots: 'Prefer Roots',
      powers: 'Prefer Powers',
      auto: 'Auto',
    },
    complexExactForm: {
      rectangular: 'Rectangular',
      polar: 'Polar',
      cis: 'cis',
    },
    angleUnit: {
      deg: 'DEG',
      rad: 'RAD',
      grad: 'GRAD',
    },
    mathNotation: {
      rendered: 'Rendered',
      plainText: 'Plain Text',
      latex: 'LaTeX',
    },
    outputStyle: {
      exact: 'EXACT',
      decimal: 'DECIMAL',
      both: 'BOTH',
    },
    equationAnswerMode: {
      exact: 'Exact',
      approximate: 'Approx',
      isolate: 'Isolate',
    },
    calculatorMemoryAutosaveMode: {
      settled: 'After Settled Changes',
      interval: 'Every N Seconds',
    },
  },
  previews: {
    preview: 'Preview',
    previewInput: 'Preview Input',
    previewOutput: 'Preview Output',
    symbolicSummary: {
      powers: 'Previewing the power-preferred exact form.',
      auto: 'Previewing the default power-leaning exact form while keeping plain roots readable.',
      flattenedRoots: 'Previewing a flattened radical form when it is safe.',
      nestedRoots: 'Previewing a nested-radical form without flattening.',
    },
  },
  help: {
    detailedFacts:
      'Shows the full domain, interval, candidate, and trust checks behind result details.',
    numericOutput: 'Controls approximate output only. Exact symbolic lines stay exact.',
    language: 'English is the only installed language for now.',
    complex:
      'Controls exact complex branch display. The top Complex button still controls whether Equation may use complex answers.',
    history:
      'Controls whether new history entries are recorded. The top-row history button still only opens or closes the history panel.',
    calculatorMemory:
      'Stores work, variables, Ans, history, and safe result cards. The interval cannot go below 20 seconds.',
  },
  actions: {
    resetHistory: 'Reset History',
    resetCalculatorMemory: 'Reset Calculator Memory',
  },
} satisfies LanguageCatalog['settings'];

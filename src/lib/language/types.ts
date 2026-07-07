export const DEFAULT_LANGUAGE_CODE = 'en' as const;
export const SUPPORTED_LANGUAGE_CODES = [DEFAULT_LANGUAGE_CODE] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGE_CODES[number];
export type LanguageDirection = 'ltr' | 'rtl';

export type LanguageMetadata = {
  code: LanguageCode;
  label: string;
  direction: LanguageDirection;
};

export type LanguageStringFactory<Args extends readonly unknown[]> = (...args: Args) => string;

export type CommonLanguageCatalog = {
  actions: {
    run: string;
    stop: string;
    open: string;
    close: string;
    clear: string;
    cancel: string;
    save: string;
    back: string;
    history: string;
    settings: string;
    guide: string;
    copy: string;
    paste: string;
    toEditor: string;
    rename: string;
    duplicate: string;
  };
  status: {
    ready: string;
    loading: string;
    computing: string;
    stopping: string;
    renderingResult: string;
  };
};

export type ShellLanguageCatalog = {
  modeStrip: {
    guide: string;
    guideTitle: string;
    settings: string;
    settingsTitle: string;
    variables: string;
    variablesTitle: string;
    ooeDiagnostics: string;
    ooeDiagnosticsTitle: string;
    autoEquationOn: string;
    autoEquationOff: string;
    complexOn: string;
    complexOff: string;
    showHistory: string;
    hideHistory: string;
    desktopRuntime: string;
  };
  launcher: {
    openHere: string;
    openInNewTab: string;
    openInNewTabAria: string;
    openEntryInNewTab: LanguageStringFactory<[label: string]>;
  };
  workspaceTabs: {
    workspaceTabs: string;
    openWorkspaces: string;
    newCalculateTab: string;
    openCreateMenu: string;
    createMenuTitle: string;
    newNotebookPage: string;
    openGuidePage: string;
    openSettingsPage: string;
    openHistoryPage: string;
    openActions: string;
    workspaceTabName: string;
    save: string;
    cancel: string;
    close: string;
    rename: string;
    duplicate: string;
    closeOthers: string;
    clearTabState: string;
    stopJobsInThisTab: string;
    cancelJobsAndClose: string;
    keepOpen: string;
    closeWithActiveJobs: string;
    activeWorkCloseMessage: string;
    runningMeta: string;
    stoppingMeta: string;
    closeTab: LanguageStringFactory<[title: string]>;
    openActionsFor: LanguageStringFactory<[title: string]>;
    closeTabPrompt: LanguageStringFactory<[title: string]>;
    closeOtherTabsAround: LanguageStringFactory<[title: string]>;
    otherTabsActiveWorkCloseMessage: LanguageStringFactory<[count: number]>;
    otherTabsActiveJobs: LanguageStringFactory<[count: number]>;
  };
  runtimeControls: {
    run: string;
    stop: string;
    restartEditor: string;
    runTitle: string;
    stopTitle: string;
    restartEditorTitle: string;
  };
  menuInspector: {
    menu: string;
    close: string;
  };
};

export type DisplayLanguageCatalog = {
  labels: {
    result: string;
    answer: string;
    validWhen: string;
    warnings: string;
    error: string;
    approx: string;
    representativeBranches: string;
    principalRange: string;
    piecewiseExactBranches: string;
    parameterConstraints: string;
    discoveredFamilies: string;
    reducedCarrier: string;
    exactClosureBoundary: string;
    suggestedIntervals: string;
  };
  actions: {
    showFullResult: string;
    showRemainingBranches: string;
    copyResult: string;
    runNumeric: string;
  };
  loading: {
    rendering: string;
    renderingFullFact: string;
    renderingBranch: string;
  };
};

export type SettingsLanguageCatalog = {
  title: string;
  description: string;
  sections: {
    display: string;
    numericOutput: string;
    symbolicDisplay: string;
    complex: string;
    general: string;
    history: string;
    calculatorMemory: string;
  };
  fields: {
    uiScale: string;
    mathSize: string;
    resultSize: string;
    highContrast: string;
    detailedFacts: string;
    approximateDigits: string;
    notation: string;
    scientificFormat: string;
    powerRootStyle: string;
    flattenNestedRootsWhenSafe: string;
    exactBranchForm: string;
    language: string;
    angleUnit: string;
    mathNotation: string;
    historyInspectorNotation: string;
    historyPageNotation: string;
    outputStyle: string;
    equationAnswerMode: string;
    autoSwitchToEquation: string;
    historyEnabled: string;
    saveCalculatorMemory: string;
    autosaveMode: string;
    autosaveInterval: string;
  };
  options: {
    scalePercent: LanguageStringFactory<[value: number]>;
    numericNotation: {
      decimal: string;
      scientific: string;
      auto: string;
    };
    scientificStyle: {
      times10: string;
      e: string;
    };
    symbolicDisplay: {
      roots: string;
      powers: string;
      auto: string;
    };
    complexExactForm: {
      rectangular: string;
      polar: string;
      cis: string;
    };
    angleUnit: {
      deg: string;
      rad: string;
      grad: string;
    };
    mathNotation: {
      rendered: string;
      plainText: string;
      latex: string;
    };
    outputStyle: {
      exact: string;
      decimal: string;
      both: string;
    };
    equationAnswerMode: {
      exact: string;
      approximate: string;
      isolate: string;
    };
    calculatorMemoryAutosaveMode: {
      settled: string;
      interval: string;
    };
  };
  previews: {
    preview: string;
    previewInput: string;
    previewOutput: string;
    symbolicSummary: {
      powers: string;
      auto: string;
      flattenedRoots: string;
      nestedRoots: string;
    };
  };
  help: {
    detailedFacts: string;
    numericOutput: string;
    language: string;
    complex: string;
    history: string;
    renderedHistoryMathWarning: string;
    renderedHistoryMathConfirmation: string;
    calculatorMemory: string;
  };
  actions: {
    openFullPage: string;
    resetHistory: string;
    resetCalculatorMemory: string;
    useRenderedMath: string;
  };
  confirmations: {
    renderedHistoryMathTitle: string;
  };
};

export type HistoryLanguageCatalog = {
  title: string;
  empty: string;
  replay: string;
  actions: {
    openFullPage: string;
    clear: string;
    close: string;
    stop: string;
    replayCurrentTab: string;
    openInNewTab: string;
    copyResult: string;
    deleteEntry: string;
    deleteSelected: string;
    selectEntry: string;
  };
  filters: {
    search: string;
    allWorkspaces: string;
    allDates: string;
  };
  pending: {
    running: string;
    stopping: string;
    statusWithElapsed: LanguageStringFactory<[status: string, elapsed: string]>;
    tabLabel: LanguageStringFactory<[label: string]>;
  };
  aria: {
    collapseEntry: string;
    expandEntry: string;
    deleteEntry: string;
  };
  labels: {
    answer: string;
    approx: string;
    domain: string;
    complex: string;
    solution: string;
    inequalitySet: string;
    validWhen: string;
    details: string;
    input: string;
    result: string;
    status: string;
  };
  timeline: {
    pending: string;
    selected: string;
    entries: LanguageStringFactory<[count: number]>;
  };
  staleAnswer: string;
};

export type VariablesLanguageCatalog = {
  title: string;
  description: string;
  fields: {
    name: string;
    value: string;
  };
  actions: {
    set: string;
    insert: string;
    edit: string;
    clear: string;
    clearAll: string;
    close: string;
  };
  empty: string;
  messages: {
    stored: LanguageStringFactory<[name: string]>;
    inserted: LanguageStringFactory<[latex: string]>;
  };
};

export type LanguageCatalog = {
  metadata: LanguageMetadata;
  common: CommonLanguageCatalog;
  shell: ShellLanguageCatalog;
  display: DisplayLanguageCatalog;
  settings: SettingsLanguageCatalog;
  history: HistoryLanguageCatalog;
  variables: VariablesLanguageCatalog;
  diagnostics: {
    title: string;
  };
  guide: {
    title: string;
  };
  errors: {
    generic: string;
  };
};

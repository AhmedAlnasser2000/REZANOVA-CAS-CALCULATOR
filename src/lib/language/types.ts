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

export type LanguageCatalog = {
  metadata: LanguageMetadata;
  common: CommonLanguageCatalog;
  shell: ShellLanguageCatalog;
  display: DisplayLanguageCatalog;
  settings: {
    title: string;
  };
  history: {
    title: string;
  };
  variables: {
    title: string;
  };
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

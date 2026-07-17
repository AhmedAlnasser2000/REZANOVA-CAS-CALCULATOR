export const NOTEBOOK_AUTOSAVE_SECONDS_OPTIONS = [0.5, 0.75, 1.5, 3] as const;
export const NOTEBOOK_PERIODIC_VERSION_MINUTES_OPTIONS = [5, 10, 15, 30] as const;
export const NOTEBOOK_RETAINED_VERSION_OPTIONS = [25, 50, 100] as const;
export const NOTEBOOK_RETENTION_DAYS_OPTIONS = [7, 30, 90] as const;
export const NOTEBOOK_GRID_STEP_PT_OPTIONS = [6, 12, 18, 24] as const;

export type NotebookObjectDefaultPlacement = 'flow' | 'floating';
export type NotebookFloatingAnchorPreference = 'paragraph' | 'page';
export type NotebookFloatingReferencePreference = 'margins' | 'page';
export type NotebookFloatingWrapPreference = 'square' | 'top-and-bottom' | 'in-front' | 'behind';
export type NotebookInitialOutlinePreference = 'open' | 'collapsed';
export type NotebookContextualTabPreference = 'automatic' | 'manual';
export type NotebookObjectsLayersPreference = 'outline' | 'objects';
export type NotebookStatusBarPreference = 'standard' | 'coordinates';
export type NotebookLargeDocumentPreference = 'ask' | 'draft';
export type NotebookImageWarningPreference = 'confirm' | 'notify';
export type NotebookExportScopePreference = 'document' | 'sections';

export type NotebookPreferences = {
  authoring: {
    advancedArrangeVisible: boolean;
    defaultFloatingAnchor: NotebookFloatingAnchorPreference;
    defaultObjectPlacement: NotebookObjectDefaultPlacement;
    defaultObjectWidthPt: number;
    defaultReference: NotebookFloatingReferencePreference;
    defaultWrap: NotebookFloatingWrapPreference;
    gridStepPt: typeof NOTEBOOK_GRID_STEP_PT_OPTIONS[number];
    showAnchors: boolean;
    showBoundaries: boolean;
    showCoordinates: boolean;
    showGrid: boolean;
    showGuides: boolean;
    textDistancePt: number;
  };
  export: {
    defaultScope: NotebookExportScopePreference;
    rememberChoices: boolean;
  };
  images: {
    defaultAlignment: 'left' | 'center' | 'right';
    defaultWidthPt: number;
    numberCaptionsByDefault: boolean;
    warningMode: NotebookImageWarningPreference;
  };
  interface: {
    contextualTabs: NotebookContextualTabPreference;
    initialInspectorMode: 'auto' | 'manual' | 'pinned' | 'collapsed';
    initialObjectsLayersState: NotebookObjectsLayersPreference;
    initialOutlineState: NotebookInitialOutlinePreference;
    statusBarDetail: NotebookStatusBarPreference;
  };
  largeDocuments: {
    openBehavior: NotebookLargeDocumentPreference;
  };
  newDocuments: {
    defaultViewMode: 'print' | 'draft';
    differentFirstPage: boolean;
    margins: 'normal' | 'narrow' | 'moderate' | 'wide';
    orientation: 'portrait' | 'landscape';
    pageNumbering: boolean;
    paper: 'a4' | 'letter' | 'legal';
  };
  savingHistory: {
    autosaveSeconds: typeof NOTEBOOK_AUTOSAVE_SECONDS_OPTIONS[number];
    periodicVersionMinutes: typeof NOTEBOOK_PERIODIC_VERSION_MINUTES_OPTIONS[number];
    retainedVersions: typeof NOTEBOOK_RETAINED_VERSION_OPTIONS[number];
    retentionDays: typeof NOTEBOOK_RETENTION_DAYS_OPTIONS[number];
  };
};

export const DEFAULT_NOTEBOOK_PREFERENCES: NotebookPreferences = {
  authoring: {
    advancedArrangeVisible: true,
    defaultFloatingAnchor: 'paragraph',
    defaultObjectPlacement: 'flow',
    defaultObjectWidthPt: 360,
    defaultReference: 'margins',
    defaultWrap: 'square',
    gridStepPt: 12,
    showAnchors: true,
    showBoundaries: true,
    showCoordinates: true,
    showGrid: false,
    showGuides: true,
    textDistancePt: 9,
  },
  export: {
    defaultScope: 'document',
    rememberChoices: true,
  },
  images: {
    defaultAlignment: 'center',
    defaultWidthPt: 360,
    numberCaptionsByDefault: false,
    warningMode: 'confirm',
  },
  interface: {
    contextualTabs: 'automatic',
    initialInspectorMode: 'auto',
    initialObjectsLayersState: 'outline',
    initialOutlineState: 'open',
    statusBarDetail: 'standard',
  },
  largeDocuments: {
    openBehavior: 'draft',
  },
  newDocuments: {
    defaultViewMode: 'print',
    differentFirstPage: false,
    margins: 'normal',
    orientation: 'portrait',
    pageNumbering: true,
    paper: 'a4',
  },
  savingHistory: {
    autosaveSeconds: 0.75,
    periodicVersionMinutes: 5,
    retainedVersions: 50,
    retentionDays: 30,
  },
};

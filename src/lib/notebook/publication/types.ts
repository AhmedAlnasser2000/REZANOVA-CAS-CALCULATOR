import type {
  NotebookHeaderFooterSettings,
  NotebookPageSetup,
  NotebookRichBlockNode,
} from '../document/types';
import type {
  NotebookAssetMetadataV1,
} from '../persistence/contracts';
import type { NotebookPaginationFragment } from '../document/pagination';

export const NOTEBOOK_PUBLICATION_PROJECTION_VERSION = 1 as const;
export const NOTEBOOK_COMPATIBILITY_REPORT_VERSION = 1 as const;

export const NOTEBOOK_EXPORT_FORMATS = ['pdf', 'docx', 'web'] as const;
export type NotebookExportFormat = typeof NOTEBOOK_EXPORT_FORMATS[number];

export type NotebookExportScope =
  | { readonly kind: 'document' }
  | { readonly kind: 'page-range'; readonly fromPage: number; readonly toPage: number }
  | { readonly kind: 'sections'; readonly sectionIds: readonly string[] };

export type NotebookExportRequest = {
  readonly format: NotebookExportFormat;
  readonly scope: NotebookExportScope;
};

export type NotebookPublicationLayoutV1 = {
  readonly pageCount: number;
  readonly fragments: readonly NotebookPaginationFragment[];
};

export type NotebookPublicationAssetV1 = {
  readonly metadata: Readonly<NotebookAssetMetadataV1>;
  readonly blob: Blob;
};

export const NOTEBOOK_COMPATIBILITY_FINDING_KINDS = [
  'video-static-substitution',
  'equation-fallback',
  'font-substitution',
  'layout-approximation',
] as const;
export type NotebookCompatibilityFindingKind =
  typeof NOTEBOOK_COMPATIBILITY_FINDING_KINDS[number];

export type NotebookCompatibilityFindingV1 = {
  readonly kind: NotebookCompatibilityFindingKind;
  readonly message: string;
  readonly nodeId?: string;
};

export type NotebookCompatibilityReportV1 = {
  readonly version: typeof NOTEBOOK_COMPATIBILITY_REPORT_VERSION;
  readonly format: NotebookExportFormat;
  readonly findings: readonly NotebookCompatibilityFindingV1[];
  readonly summary: {
    readonly videoSubstitutions: number;
    readonly equationFallbacks: number;
    readonly fontSubstitutions: number;
    readonly layoutApproximations: number;
  };
};

export type NotebookPublicationProjectionV1 = {
  readonly version: typeof NOTEBOOK_PUBLICATION_PROJECTION_VERSION;
  readonly createdAt: string;
  readonly source: {
    readonly libraryId: string;
    readonly revision: number;
    readonly savedAt: string;
    readonly documentId: string;
    readonly documentUpdatedAt: string;
  };
  readonly request: NotebookExportRequest;
  readonly title: string;
  readonly pageSetup: Readonly<NotebookPageSetup>;
  readonly headerFooter: Readonly<NotebookHeaderFooterSettings>;
  readonly content: readonly NotebookRichBlockNode[];
  readonly assets: readonly NotebookPublicationAssetV1[];
  readonly sourceLayout: NotebookPublicationLayoutV1;
  readonly compatibility: NotebookCompatibilityReportV1;
};

export type NotebookPublicationJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type NotebookPublicationJob = {
  readonly id: string;
  readonly request: NotebookExportRequest;
  readonly sourceRevision: number;
  readonly status: NotebookPublicationJobStatus;
  cancel(): void;
  run(): Promise<NotebookPublicationProjectionV1>;
};

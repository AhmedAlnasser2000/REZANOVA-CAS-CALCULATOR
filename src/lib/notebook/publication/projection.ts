import {
  collectNotebookAssetIds,
  isNotebookRichDocument,
} from '../document/model';
import type { NotebookHeaderFooterSettings, NotebookRichBlockNode } from '../document/types';
import {
  cloneNotebookStoredRecordV1,
  isNotebookAssetMetadataV1,
  isNotebookStoredRecordV1,
  type NotebookStoredRecordV1,
} from '../persistence/contracts';
import type { NotebookAssetPort } from '../persistence/port';
import {
  NOTEBOOK_COMPATIBILITY_FINDING_KINDS,
  NOTEBOOK_COMPATIBILITY_REPORT_VERSION,
  NOTEBOOK_EXPORT_FORMATS,
  NOTEBOOK_PUBLICATION_PROJECTION_VERSION,
  type NotebookCompatibilityFindingV1,
  type NotebookCompatibilityReportV1,
  type NotebookExportFormat,
  type NotebookExportRequest,
  type NotebookPublicationLayoutV1,
  type NotebookPublicationProjectionV1,
} from './types';

export type BuildNotebookPublicationProjectionOptions = {
  assetPort: NotebookAssetPort;
  compatibilityFindings?: readonly NotebookCompatibilityFindingV1[];
  createdAt?: string;
  layout: NotebookPublicationLayoutV1;
  record: NotebookStoredRecordV1;
  request: NotebookExportRequest;
  signal?: AbortSignal;
  yieldControl?: () => Promise<void>;
};

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || value instanceof Blob) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function assertNotCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Notebook export was cancelled.', 'AbortError');
}

function validateLayout(layout: NotebookPublicationLayoutV1) {
  if (!Number.isSafeInteger(layout.pageCount) || layout.pageCount < 1) {
    throw new TypeError('Notebook publication page count is invalid.');
  }
  if (!Array.isArray(layout.fragments) || !layout.fragments.every((fragment) => (
    typeof fragment.id === 'string'
    && fragment.id.length > 0
    && Number.isSafeInteger(fragment.page)
    && fragment.page >= 1
    && fragment.page <= layout.pageCount
    && Number.isFinite(fragment.offsetPt)
    && fragment.offsetPt >= 0
    && Number.isFinite(fragment.heightPt)
    && fragment.heightPt >= 0
    && Number.isFinite(fragment.scale)
    && fragment.scale > 0
    && Number.isSafeInteger(fragment.fragment)
    && fragment.fragment >= 0
  ))) {
    throw new TypeError('Notebook publication layout fragments are invalid.');
  }
}

function validateRequest(
  request: NotebookExportRequest,
  layout: NotebookPublicationLayoutV1,
) {
  if (!NOTEBOOK_EXPORT_FORMATS.includes(request.format)) {
    throw new TypeError('Notebook export format is invalid.');
  }
  if (request.scope.kind === 'document') return;
  if (request.scope.kind === 'page-range') {
    if (request.format !== 'pdf') {
      throw new TypeError('Physical page ranges are available only for PDF export.');
    }
    if (!Number.isSafeInteger(request.scope.fromPage)
      || !Number.isSafeInteger(request.scope.toPage)
      || request.scope.fromPage < 1
      || request.scope.toPage < request.scope.fromPage
      || request.scope.toPage > layout.pageCount) {
      throw new TypeError('Notebook PDF page range is invalid.');
    }
    return;
  }
  if (request.scope.kind !== 'sections'
    || request.scope.sectionIds.length === 0
    || request.scope.sectionIds.some((id) => typeof id !== 'string' || !id)
    || new Set(request.scope.sectionIds).size !== request.scope.sectionIds.length) {
    throw new TypeError('Notebook section export scope is invalid.');
  }
}

function scopedContent(
  content: readonly NotebookRichBlockNode[],
  request: NotebookExportRequest,
): NotebookRichBlockNode[] {
  if (request.scope.kind !== 'sections') return cloneValue([...content]);
  const selected = new Set(request.scope.sectionIds);
  const topLevelSections = content.filter((node) => node.type === 'section');
  if (request.scope.sectionIds.some((id) => !topLevelSections.some((node) => node.id === id))) {
    throw new TypeError('Notebook export accepts top-level Sections only.');
  }
  return cloneValue(topLevelSections.filter((node) => selected.has(node.id)));
}

function walkNodes(
  nodes: readonly NotebookRichBlockNode[],
  visit: (node: NotebookRichBlockNode) => void,
) {
  const pending = [...nodes];
  while (pending.length > 0) {
    const node = pending.shift();
    if (!node) continue;
    visit(node);
    if (node.type === 'section' || node.type === 'semanticBlock') {
      pending.unshift(...node.content);
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      node.content.slice().reverse().forEach((item) => pending.unshift(...item.content));
    }
  }
}

function requiredAssetIds(
  content: readonly NotebookRichBlockNode[],
  format: NotebookExportFormat,
) {
  if (format === 'web') return collectNotebookAssetIds(content);
  const ids = new Set<string>();
  walkNodes(content, (node) => {
    if (node.type === 'imageFigure') ids.add(node.assetId);
    if (node.type === 'videoFigure' && node.posterAssetId) ids.add(node.posterAssetId);
  });
  return [...ids].sort();
}

function compatibilityReport(
  content: readonly NotebookRichBlockNode[],
  headerFooter: NotebookHeaderFooterSettings,
  request: NotebookExportRequest,
  additional: readonly NotebookCompatibilityFindingV1[],
): NotebookCompatibilityReportV1 {
  const findings: NotebookCompatibilityFindingV1[] = [];
  const scopedNodeIds = new Set<string>();
  walkNodes(content, (node) => {
    scopedNodeIds.add(node.id);
    if (node.type === 'paragraph' || node.type === 'heading') {
      node.content?.forEach((inline) => {
        if (inline.type === 'inlineMath') scopedNodeIds.add(inline.id);
      });
    }
    if (node.type === 'videoFigure' && request.format !== 'web') {
      findings.push({
        kind: 'video-static-substitution',
        nodeId: node.id,
        message: node.posterAssetId
          ? 'Interactive video will be represented by its poster and descriptive text.'
          : 'Interactive video has no poster and will be represented by descriptive text only.',
      });
    }
    if ((node.type === 'imageFigure' || node.type === 'videoFigure')
      && request.format !== 'pdf'
      && node.placement
      && node.placement !== 'normal') {
      findings.push({
        kind: 'layout-approximation',
        nodeId: node.id,
        message: `The target will approximate the Notebook ${node.type === 'imageFigure' ? 'image' : 'video'} wrapping preference.`,
      });
    }
  });
  if (request.format === 'docx' || request.format === 'web') {
    findings.push({
      kind: 'layout-approximation',
      message: `${request.format.toUpperCase()} output reflows and does not preserve Notebook physical page numbers.`,
    });
  } else if (request.scope.kind === 'sections') {
    findings.push({
      kind: 'layout-approximation',
      message: 'Selected Sections are repaginated as a new PDF publication.',
    });
  }
  if (request.format === 'web') {
    const runningSets = [
      headerFooter.defaultHeader,
      headerFooter.defaultFooter,
      headerFooter.firstPageHeader,
      headerFooter.firstPageFooter,
    ];
    const hasPageField = runningSets.some((regions) => (
      (['left', 'center', 'right'] as const).some((region) => regions[region].some(
        (paragraph) => paragraph.content?.some((inline) => inline.type === 'pageNumber'),
      ))
    ));
    if (hasPageField) findings.push({
      kind: 'layout-approximation',
      message: 'Responsive Web output omits live page numbers on screen; print CSS requests page counters where the browser supports them.',
    });
  }
  additional.forEach((finding) => {
    if (!NOTEBOOK_COMPATIBILITY_FINDING_KINDS.includes(finding.kind)
      || typeof finding.message !== 'string'
      || !finding.message.trim()
      || (finding.nodeId !== undefined && (typeof finding.nodeId !== 'string' || !finding.nodeId))) {
      throw new TypeError('Notebook compatibility finding is invalid.');
    }
    if (finding.nodeId && !scopedNodeIds.has(finding.nodeId)) return;
    findings.push(cloneValue(finding));
  });
  return {
    version: NOTEBOOK_COMPATIBILITY_REPORT_VERSION,
    format: request.format,
    findings,
    summary: {
      videoSubstitutions: findings.filter((item) => item.kind === 'video-static-substitution').length,
      equationFallbacks: findings.filter((item) => item.kind === 'equation-fallback').length,
      fontSubstitutions: findings.filter((item) => item.kind === 'font-substitution').length,
      layoutApproximations: findings.filter((item) => item.kind === 'layout-approximation').length,
    },
  };
}

export async function buildNotebookPublicationProjection(
  options: BuildNotebookPublicationProjectionOptions,
): Promise<NotebookPublicationProjectionV1> {
  if (!isNotebookStoredRecordV1(options.record)) {
    throw new TypeError('Notebook publication requires a valid stored record.');
  }
  validateLayout(options.layout);
  validateRequest(options.request, options.layout);
  assertNotCancelled(options.signal);
  const record = cloneNotebookStoredRecordV1(options.record);
  if (!isNotebookRichDocument(record.document)) {
    throw new TypeError('Notebook publication source document is invalid.');
  }
  const content = scopedContent(record.document.content, options.request);
  const requiredIds = requiredAssetIds(content, options.request.format);
  if (requiredIds.some((assetId) => !record.assetIds.includes(assetId))) {
    throw new Error('Notebook publication source is missing a declared asset.');
  }
  const assets = [];
  for (const assetId of requiredIds) {
    assertNotCancelled(options.signal);
    await options.yieldControl?.();
    assertNotCancelled(options.signal);
    const payload = await options.assetPort.load(assetId);
    assertNotCancelled(options.signal);
    if (!payload
      || !isNotebookAssetMetadataV1(payload.metadata)
      || payload.metadata.id !== assetId
      || payload.metadata.byteLength !== payload.bytes.byteLength) {
      throw new Error(`Notebook publication asset ${assetId} is unavailable or invalid.`);
    }
    assets.push({
      metadata: { ...payload.metadata },
      blob: new Blob([payload.bytes as BlobPart], { type: payload.metadata.mimeType }),
    });
  }
  const createdAt = options.createdAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(createdAt))) {
    throw new TypeError('Notebook publication creation time is invalid.');
  }
  const request = cloneValue(options.request);
  const projection: NotebookPublicationProjectionV1 = {
    version: NOTEBOOK_PUBLICATION_PROJECTION_VERSION,
    createdAt,
    source: {
      libraryId: record.libraryId,
      revision: record.revision,
      savedAt: record.savedAt,
      documentId: record.document.id,
      documentUpdatedAt: record.document.updatedAt,
    },
    request,
    title: record.document.title,
    pageSetup: cloneValue(record.document.pageSetup),
    headerFooter: cloneValue(record.document.headerFooter),
    content,
    assets,
    sourceLayout: cloneValue(options.layout),
    compatibility: compatibilityReport(
      content,
      record.document.headerFooter,
      request,
      options.compatibilityFindings ?? [],
    ),
  };
  return deepFreeze(projection);
}

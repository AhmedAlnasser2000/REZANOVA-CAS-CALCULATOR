import { describe, expect, it } from 'vitest';
import {
  createGraphWorkspaceSessionState,
  renameGraphWorkspaceSessionState,
} from './graph-workspace-session';
import { migrateGraphWorkspaceSessionState } from './graph-workspace-session-validation';

describe('Graph workspace session V6', () => {
  it('migrates a validated V1 session without changing mathematical identity', () => {
    const current = createGraphWorkspaceSessionState('graph.1', 'Graph');
    const legacy = {
      ...current,
      version: 1,
      surface: { ...current.surface, version: 1 },
      document: {
        version: 1,
        documentId: current.document.documentId,
        title: current.document.title,
        documentRevision: 7,
        items: [],
      },
    };
    delete (legacy.surface as { appearance?: unknown }).appearance;
    delete (legacy.surface as { panes?: unknown }).panes;
    delete (legacy.surface as { analyze?: unknown }).analyze;
    expect(migrateGraphWorkspaceSessionState(legacy)).toMatchObject({
      version: 6,
      document: { version: 3, contentRevision: 7, mathematicsRevision: 7 },
      surface: {
        version: 5,
        appearance: { theme: 'technical', colorVisionMode: 'standard' },
        panes: {
          real: { version: 1, dimension: '2d', camera3d: { projection: 'perspective' } },
          complex: { version: 1, dimension: '2d', camera3d: { projection: 'perspective' } },
        },
        analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] },
      },
    });
  });

  it('migrates a V2 session with the technical appearance default', () => {
    const current = createGraphWorkspaceSessionState('graph.2', 'Graph');
    const legacy = { ...current, version: 2, document: { ...current.document, version: 2 },
      surface: { ...current.surface, version: 1 } };
    delete (legacy.surface as { appearance?: unknown }).appearance;
    delete (legacy.surface as { panes?: unknown }).panes;
    delete (legacy.surface as { analyze?: unknown }).analyze;
    expect(migrateGraphWorkspaceSessionState(legacy)).toMatchObject({
      version: 6,
      surface: {
        version: 5,
        appearance: { theme: 'technical', colorVisionMode: 'standard' },
        panes: { real: { dimension: '2d' }, complex: { dimension: '2d' } },
        analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] },
      },
    });
  });

  it('migrates V3 appearance state with independent default pane cameras', () => {
    const current = createGraphWorkspaceSessionState('graph.3', 'Graph');
    const legacy = {
      ...current,
      version: 3,
      document: { ...current.document, version: 2 },
      surface: { ...current.surface, version: 2 },
    };
    delete (legacy.surface as { panes?: unknown }).panes;
    delete (legacy.surface as { analyze?: unknown }).analyze;
    const migrated = migrateGraphWorkspaceSessionState(legacy);
    expect(migrated).toMatchObject({
      version: 6,
      surface: { version: 5, panes: { real: { dimension: '2d' }, complex: { dimension: '2d' } },
        analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] } },
    });
    expect(migrated?.surface.panes.real).not.toBe(migrated?.surface.panes.complex);
  });

  it('migrates V4 Three state into bounded Analyze state', () => {
    const current = createGraphWorkspaceSessionState('graph.4', 'Graph');
    const legacy = { ...current, version: 4, document: { ...current.document, version: 2 },
      surface: { ...current.surface, version: 3 } };
    delete (legacy.surface as { analyze?: unknown }).analyze;
    expect(migrateGraphWorkspaceSessionState(legacy)).toMatchObject({
      version: 6,
      surface: { version: 5, analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] } },
    });
  });

  it('migrates V5 Analyze pins into the z-capable surface state', () => {
    const current = createGraphWorkspaceSessionState('graph.5', 'Graph');
    const legacy = {
      ...current,
      version: 5,
      document: { ...current.document, version: 2 },
      surface: {
        ...current.surface,
        version: 4,
        analyze: {
          ...current.surface.analyze,
          pinnedAnnotations: [{
            version: 1, annotationId: 'pin.1', feature: 'root', level: 'exact-proved',
            itemIds: ['item.1'], coordinates: {
              x: { kind: 'exact', value: { canonicalLatex: '0', mathJson: 0 } },
              y: { kind: 'exact', value: { canonicalLatex: '0', mathJson: 0 } },
            },
          }],
        },
      },
    };
    expect(migrateGraphWorkspaceSessionState(legacy)).toMatchObject({
      version: 6,
      document: { version: 3 },
      surface: { version: 5, analyze: { pinnedAnnotations: [{
        version: 2, coordinates: { x: { kind: 'exact' }, y: { kind: 'exact' } },
      }] } },
    });
  });

  it('renames content without advancing mathematics', () => {
    const current = createGraphWorkspaceSessionState('graph.1', 'Graph');
    expect(renameGraphWorkspaceSessionState(current, 'Named graph')).toMatchObject({
      document: { title: 'Named graph', contentRevision: 1, mathematicsRevision: 0 },
    });
  });
});

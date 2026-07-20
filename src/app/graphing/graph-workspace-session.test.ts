import { describe, expect, it } from 'vitest';
import {
  createGraphWorkspaceSessionState,
  renameGraphWorkspaceSessionState,
} from './graph-workspace-session';
import { migrateGraphWorkspaceSessionState } from './graph-workspace-session-validation';

describe('Graph workspace session V4', () => {
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
    expect(migrateGraphWorkspaceSessionState(legacy)).toMatchObject({
      version: 4,
      document: { version: 2, contentRevision: 7, mathematicsRevision: 7 },
      surface: {
        version: 3,
        appearance: { theme: 'technical', colorVisionMode: 'standard' },
        panes: {
          real: { version: 1, dimension: '2d', camera3d: { projection: 'perspective' } },
          complex: { version: 1, dimension: '2d', camera3d: { projection: 'perspective' } },
        },
      },
    });
  });

  it('migrates a V2 session with the technical appearance default', () => {
    const current = createGraphWorkspaceSessionState('graph.2', 'Graph');
    const legacy = { ...current, version: 2, surface: { ...current.surface, version: 1 } };
    delete (legacy.surface as { appearance?: unknown }).appearance;
    delete (legacy.surface as { panes?: unknown }).panes;
    expect(migrateGraphWorkspaceSessionState(legacy)).toMatchObject({
      version: 4,
      surface: {
        version: 3,
        appearance: { theme: 'technical', colorVisionMode: 'standard' },
        panes: { real: { dimension: '2d' }, complex: { dimension: '2d' } },
      },
    });
  });

  it('migrates V3 appearance state with independent default pane cameras', () => {
    const current = createGraphWorkspaceSessionState('graph.3', 'Graph');
    const legacy = {
      ...current,
      version: 3,
      surface: { ...current.surface, version: 2 },
    };
    delete (legacy.surface as { panes?: unknown }).panes;
    const migrated = migrateGraphWorkspaceSessionState(legacy);
    expect(migrated).toMatchObject({
      version: 4,
      surface: { version: 3, panes: { real: { dimension: '2d' }, complex: { dimension: '2d' } } },
    });
    expect(migrated?.surface.panes.real).not.toBe(migrated?.surface.panes.complex);
  });

  it('renames content without advancing mathematics', () => {
    const current = createGraphWorkspaceSessionState('graph.1', 'Graph');
    expect(renameGraphWorkspaceSessionState(current, 'Named graph')).toMatchObject({
      document: { title: 'Named graph', contentRevision: 1, mathematicsRevision: 0 },
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  createGraphWorkspaceSessionState,
  renameGraphWorkspaceSessionState,
} from './graph-workspace-session';
import { migrateGraphWorkspaceSessionState } from './graph-workspace-session-validation';

describe('Graph workspace session V3', () => {
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
    expect(migrateGraphWorkspaceSessionState(legacy)).toMatchObject({
      version: 3,
      document: { version: 2, contentRevision: 7, mathematicsRevision: 7 },
      surface: { version: 2, appearance: { theme: 'technical', colorVisionMode: 'standard' } },
    });
  });

  it('migrates a V2 session with the technical appearance default', () => {
    const current = createGraphWorkspaceSessionState('graph.2', 'Graph');
    const legacy = { ...current, version: 2, surface: { ...current.surface, version: 1 } };
    delete (legacy.surface as { appearance?: unknown }).appearance;
    expect(migrateGraphWorkspaceSessionState(legacy)).toMatchObject({
      version: 3,
      surface: { version: 2, appearance: { theme: 'technical', colorVisionMode: 'standard' } },
    });
  });

  it('renames content without advancing mathematics', () => {
    const current = createGraphWorkspaceSessionState('graph.1', 'Graph');
    expect(renameGraphWorkspaceSessionState(current, 'Named graph')).toMatchObject({
      document: { title: 'Named graph', contentRevision: 1, mathematicsRevision: 0 },
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  createGraphWorkspaceSessionState,
  renameGraphWorkspaceSessionState,
} from './graph-workspace-session';
import { migrateGraphWorkspaceSessionState } from './graph-workspace-session-validation';

describe('Graph workspace session V2', () => {
  it('migrates a validated V1 session without changing mathematical identity', () => {
    const current = createGraphWorkspaceSessionState('graph.1', 'Graph');
    const legacy = {
      ...current,
      version: 1,
      document: {
        version: 1,
        documentId: current.document.documentId,
        title: current.document.title,
        documentRevision: 7,
        items: [],
      },
    };
    expect(migrateGraphWorkspaceSessionState(legacy)).toMatchObject({
      version: 2,
      document: { version: 2, contentRevision: 7, mathematicsRevision: 7 },
    });
  });

  it('renames content without advancing mathematics', () => {
    const current = createGraphWorkspaceSessionState('graph.1', 'Graph');
    expect(renameGraphWorkspaceSessionState(current, 'Named graph')).toMatchObject({
      document: { title: 'Named graph', contentRevision: 1, mathematicsRevision: 0 },
    });
  });
});

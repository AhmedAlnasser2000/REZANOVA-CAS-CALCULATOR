import { describe, expect, it } from 'vitest';
import { GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2 } from '../contracts';
import { classifyGraphSource } from './source';

describe('Graph parser performance-workload alignment', () => {
  it('keeps every authored workload source parseable as its committed item class', () => {
    for (const item of GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2.items) {
      if (item.kind === 'parameter' || item.kind === 'note') continue;
      const classified = classifyGraphSource(item.source);
      if (item.kind === 'invalid-relation-draft') {
        expect(classified, item.itemId).toMatchObject({ ok: false });
        continue;
      }
      expect(classified, item.itemId).toMatchObject({ ok: true });
      if (!classified.ok) continue;
      if (item.kind === 'piecewise') {
        expect(classified.itemKind, item.itemId).toBe('piecewise');
      } else if (item.kind === 'point-set') {
        expect(classified.itemKind, item.itemId).toBe('point-set');
      } else {
        expect(classified.itemKind, item.itemId).toBe('relation');
        if (classified.itemKind === 'relation') {
          expect(classified.relation.kind, item.itemId).toBe(item.relation.kind);
        }
      }
    }
  });
});

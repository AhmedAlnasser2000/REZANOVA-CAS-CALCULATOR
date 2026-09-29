import { expect, it } from 'vitest';
import { INTEGRATION_DRAFT_KEY, loadIntegrationDrafts, readIntegrationDraft, saveIntegrationDrafts } from './new-integration-drafts';
it('restores only validated drafts, titles and limits, never results or jobs', () => {
  const values = new Map<string, string>(), storage = {getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => {values.set(k, v);}};
  const draft = readIntegrationDraft(null); draft.source = '\\int x\\,dx'; draft.limits.degree = 42;
  saveIntegrationDrafts(storage, [{title: 'My integral', draft}]); expect(loadIntegrationDrafts(storage)).toEqual([{title: 'My integral', draft}]);
  values.set(INTEGRATION_DRAFT_KEY, JSON.stringify([{title: 'Test', draft: {...draft, verified: true, response: {}}}]));
  expect(loadIntegrationDrafts(storage)[0].draft).toEqual(draft);
  values.set(INTEGRATION_DRAFT_KEY, JSON.stringify([{title: 'Test', draft: {...draft, limits: {work: Infinity}}}]));
  expect(loadIntegrationDrafts(storage)).toEqual([]);
});
it('retains an oversized live draft so execution rejects it without erasing input', () => {
  const source = 'x'.repeat(65537); expect(readIntegrationDraft({...readIntegrationDraft(null), source}).source).toBe(source);
});

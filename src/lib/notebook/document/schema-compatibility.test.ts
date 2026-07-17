import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  NOTEBOOK_DOCUMENT_COMPATIBILITY_MANIFEST,
} from './compatibility';
import { migrateNotebookRichDocument } from './migrate';
import { isNotebookRichDocument } from './model';
import { NOTEBOOK_RICH_DOCUMENT_VERSION } from './types';

type FixtureDocument = Record<string, unknown> & { version: number };

type FixtureEntry = {
  schema: number;
  document: FixtureDocument;
};

function loadFixtures(): FixtureEntry[] {
  const path = fileURLToPath(new URL('./schema-compatibility.fixtures.json', import.meta.url));
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { fixtures?: FixtureEntry[] };
  return raw.fixtures ?? [];
}

describe('Notebook schema compatibility boundary', () => {
  it('declares Schema 14 as current and durable support from V6 onward', () => {
    expect(NOTEBOOK_DOCUMENT_COMPATIBILITY_MANIFEST.currentSchema).toBe(
      NOTEBOOK_RICH_DOCUMENT_VERSION,
    );
    expect(NOTEBOOK_DOCUMENT_COMPATIBILITY_MANIFEST.minimumDurableSchema).toBe(6);
    expect(NOTEBOOK_DOCUMENT_COMPATIBILITY_MANIFEST.supportedDurableSchemas).toEqual([
      6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
    expect(NOTEBOOK_DOCUMENT_COMPATIBILITY_MANIFEST.bestEffortRecoverySchemas).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it('migrates the shared durable V6-V14 fixtures into strict current documents', () => {
    const fixtures = loadFixtures();
    expect(fixtures.map((fixture) => fixture.schema)).toEqual([
      6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);

    for (const fixture of fixtures) {
      expect(fixture.document.version).toBe(fixture.schema);
      const migrated = migrateNotebookRichDocument(fixture.document);
      expect(migrated?.version).toBe(NOTEBOOK_RICH_DOCUMENT_VERSION);
      expect(isNotebookRichDocument(migrated)).toBe(true);
      expect(migrated?.content[0]?.type).toBe('paragraph');
    }
  });
});

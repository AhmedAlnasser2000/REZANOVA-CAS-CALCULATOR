import type { NotebookDocument } from '../types';
import { migrateNotebookDocumentV1 } from './migrate-v1';
import { migrateNotebookDocumentV2 } from './migrate-v2';
import { migrateNotebookDocumentV3 } from './migrate-v3';
import { migrateNotebookDocumentV4 } from './migrate-v4';
import { migrateNotebookDocumentV5 } from './migrate-v5';
import { migrateNotebookDocumentV6 } from './migrate-v6';
import { migrateNotebookDocumentV7 } from './migrate-v7';
import { migrateNotebookDocumentV8 } from './migrate-v8';
import { migrateNotebookDocumentV9 } from './migrate-v9';
import { migrateNotebookDocumentV10 } from './migrate-v10';
import { migrateNotebookDocumentV11 } from './migrate-v11';
import { migrateNotebookDocumentV12 } from './migrate-v12';
import { migrateNotebookDocumentV13 } from './migrate-v13';
import {
  isNotebookRichDocument,
} from './model';
import {
  isNotebookRichDocumentV10,
  isNotebookRichDocumentV11,
  isNotebookRichDocumentV12,
  isNotebookRichDocumentV13,
  isNotebookRichDocumentV2,
  isNotebookRichDocumentV3,
  isNotebookRichDocumentV4,
  isNotebookRichDocumentV5,
  isNotebookRichDocumentV6,
  isNotebookRichDocumentV7,
  isNotebookRichDocumentV8,
  isNotebookRichDocumentV9,
  NOTEBOOK_DOCUMENT_COMPATIBILITY_MANIFEST,
} from './compatibility';
import type { NotebookRichDocument } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNotebookDocumentV1(value: unknown): value is NotebookDocument {
  return isRecord(value)
    && value.version === 1
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && Array.isArray(value.blocks);
}

function documentSchema(value: unknown): number | null {
  if (!isRecord(value)) return null;
  return typeof value.version === 'number' && Number.isInteger(value.version)
    ? value.version
    : null;
}

const SUPPORTED_SOURCE_SCHEMAS = new Set<number>([
  ...NOTEBOOK_DOCUMENT_COMPATIBILITY_MANIFEST.bestEffortRecoverySchemas,
  ...NOTEBOOK_DOCUMENT_COMPATIBILITY_MANIFEST.supportedDurableSchemas,
]);

export function migrateNotebookRichDocument(
  value: unknown,
): NotebookRichDocument | null {
  if (isNotebookRichDocument(value)) return value;
  const schema = documentSchema(value);
  if (schema === null || !SUPPORTED_SOURCE_SCHEMAS.has(schema)) return null;
  switch (schema) {
    case 1:
      return isNotebookDocumentV1(value) ? migrateNotebookDocumentV1(value) : null;
    case 2:
      return isNotebookRichDocumentV2(value) ? migrateNotebookDocumentV2(value) : null;
    case 3:
      return isNotebookRichDocumentV3(value) ? migrateNotebookDocumentV3(value) : null;
    case 4:
      return isNotebookRichDocumentV4(value) ? migrateNotebookDocumentV4(value) : null;
    case 5:
      return isNotebookRichDocumentV5(value) ? migrateNotebookDocumentV5(value) : null;
    case 6:
      return isNotebookRichDocumentV6(value) ? migrateNotebookDocumentV6(value) : null;
    case 7:
      return isNotebookRichDocumentV7(value) ? migrateNotebookDocumentV7(value) : null;
    case 8:
      return isNotebookRichDocumentV8(value) ? migrateNotebookDocumentV8(value) : null;
    case 9:
      return isNotebookRichDocumentV9(value) ? migrateNotebookDocumentV9(value) : null;
    case 10:
      return isNotebookRichDocumentV10(value) ? migrateNotebookDocumentV10(value) : null;
    case 11:
      return isNotebookRichDocumentV11(value) ? migrateNotebookDocumentV11(value) : null;
    case 12:
      return isNotebookRichDocumentV12(value) ? migrateNotebookDocumentV12(value) : null;
    case 13:
      return isNotebookRichDocumentV13(value) ? migrateNotebookDocumentV13(value) : null;
    default:
      return null;
  }
}

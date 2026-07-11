import {
  isNotebookRichDocument,
  summarizeNotebookDocument,
} from '../document/model';
import type {
  NotebookDocumentSummary,
  NotebookRichDocument,
} from '../document/types';

export type NotebookPersistencePort = {
  list(): Promise<NotebookDocumentSummary[]>;
  load(id: string): Promise<NotebookRichDocument | null>;
  save(document: NotebookRichDocument): Promise<void>;
  delete(id: string): Promise<void>;
};

function cloneDocument(document: NotebookRichDocument): NotebookRichDocument {
  return JSON.parse(JSON.stringify(document)) as NotebookRichDocument;
}

export function createInMemoryNotebookPersistencePort(
  initialDocuments: readonly NotebookRichDocument[] = [],
): NotebookPersistencePort {
  const documents = new Map<string, NotebookRichDocument>();
  initialDocuments.forEach((document) => {
    if (!isNotebookRichDocument(document)) {
      throw new TypeError('Notebook persistence accepts version 2 documents only.');
    }
    documents.set(document.id, cloneDocument(document));
  });

  return {
    async list() {
      return [...documents.values()]
        .map(summarizeNotebookDocument)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    async load(id) {
      const document = documents.get(id);
      return document ? cloneDocument(document) : null;
    },
    async save(document) {
      if (!isNotebookRichDocument(document)) {
        throw new TypeError('Notebook persistence accepts version 2 documents only.');
      }
      documents.set(document.id, cloneDocument(document));
    },
    async delete(id) {
      documents.delete(id);
    },
  };
}

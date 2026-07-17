import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import type { NotebookRichDocument } from '../document/types';
import { createNotebookStoredRecordV1 } from '../persistence/contracts';
import { createInMemoryNotebookAssetPort } from '../persistence/port';
import { buildNotebookDocx, notebookDocxCompatibilityFindings } from './docx';
import { convertNotebookLatexToOmml } from './docx-math';
import { buildNotebookPublicationProjection } from './projection';

const NOW = '2026-07-14T11:00:00.000Z';
const PNG = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAgIAX8jx0gAAAABJRU5ErkJggg==',
  'base64',
));

describe('Notebook DOCX publication', () => {
  it('converts a bounded LaTeX subset to editable OMML and fails closed otherwise', () => {
    expect(convertNotebookLatexToOmml('x^2+\\frac{1}{n}')).toMatchObject({ kind: 'omml' });
    expect(convertNotebookLatexToOmml('\\sqrt{x_1}+\\alpha')).toMatchObject({ kind: 'omml' });
    expect(convertNotebookLatexToOmml('\\begin{matrix}1&2\\end{matrix}')).toMatchObject({ kind: 'fallback' });
    expect(convertNotebookLatexToOmml('')).toMatchObject({ kind: 'fallback' });
  });

  it('packages editable OOXML with headings, lists, math, images, and running content', async () => {
    const assetPort = createInMemoryNotebookAssetPort();
    const image = await assetPort.put(PNG, 'image/png', NOW);
    const base = createNotebookRichDocument({ now: () => new Date(NOW), title: 'Limit laws / notes' });
    const document: NotebookRichDocument = {
      ...base,
      pageSetup: { paperSize: 'letter', orientation: 'landscape', marginsPt: { top: 54, right: 54, bottom: 54, left: 54 } },
      headerFooter: {
        ...structuredClone(base.headerFooter),
        defaultHeader: { ...base.headerFooter.defaultHeader, left: [{ type: 'paragraph', content: [{ type: 'text', text: 'Calculus', marks: [{ type: 'bold' }] }] }] },
        defaultFooter: { ...base.headerFooter.defaultFooter, left: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rezanova' }] }], right: [{ type: 'paragraph', content: [{ type: 'pageNumber', marks: [{ type: 'underline' }, { type: 'textStyle', color: '#335577', fontSize: 120 }] }] }] },
        differentFirstPage: true,
        pageNumberStart: 3,
      },
      content: [
        {
          type: 'heading', id: 'heading', level: 1,
          content: [{ type: 'text', text: 'Limit laws', marks: [{ type: 'underline' }] }],
        },
        {
          type: 'paragraph', id: 'prose', format: {
            alignment: 'justify', lineSpacing: 1.5, spaceAfterPt: 12, leftIndentPt: 72,
          },
          content: [
            { type: 'text', text: 'For ' },
            { type: 'inlineMath', id: 'inline', sourceText: 'x^2', latex: 'x^2', workspaceTarget: 'calculate' },
            { type: 'text', text: ', continue.' },
          ],
        },
        {
          type: 'orderedList', id: 'list', style: 'lower-alpha',
          content: [{ type: 'listItem', id: 'item', content: [{ type: 'paragraph', id: 'item-p', content: [{ type: 'text', text: 'First result' }] }] }],
        },
        {
          type: 'semanticBlock', id: 'theorem', variant: 'theorem', label: 'Limit law', accentColor: '#84bfe8',
          content: [{ type: 'displayMath', id: 'equation', sourceText: '\\frac{a}{b}', latex: '\\frac{a}{b}', workspaceTarget: 'calculate' }],
        },
        {
          type: 'imageFigure', id: 'image', assetId: image.id, altText: 'Limit graph', caption: 'A graph',
          numbered: true, widthPercent: 100, displayAspectRatio: 1.25, rotation: 137,
          objectPlacement: {
            mode: 'floating',
            anchor: { kind: 'page', pageNumber: 1 },
            horizontalReference: 'margins',
            verticalReference: 'margins',
            xPt: 72,
            yPt: 96,
            widthPt: 240,
            wrap: 'square',
            textDistancePt: {
              top: 6,
              right: 6,
              bottom: 6,
              left: 6,
            },
            zOrder: 0,
          },
        },
        {
          type: 'section', id: 'section', title: 'Applications',
          content: [{ type: 'displayMath', id: 'fallback', sourceText: '\\begin{matrix}', latex: '\\begin{matrix}', workspaceTarget: 'calculate' }],
        },
        { type: 'pageBreak', id: 'break' },
      ],
    };
    const record = createNotebookStoredRecordV1(document, {
      libraryId: 'library.docx', revision: 5, savedAt: NOW,
    });
    const findings = notebookDocxCompatibilityFindings(document.content);
    expect(findings.some((item) => item.kind === 'equation-fallback')).toBe(true);
    expect(findings).toContainEqual(expect.objectContaining({
      kind: 'layout-approximation',
      message: expect.stringContaining('floating Notebook object'),
      nodeId: 'image',
    }));
    const projection = await buildNotebookPublicationProjection({
      assetPort,
      compatibilityFindings: findings,
      createdAt: NOW,
      layout: { pageCount: 2, fragments: [] },
      record,
      request: { format: 'docx', scope: { kind: 'document' } },
    });
    const output = await buildNotebookDocx(projection, {
      rasterize: async () => ({ width: 640, height: 360, png: PNG }),
    });

    expect(output.fileName).toBe('Limit laws - notes.docx');
    expect(output.bytes.slice(0, 2)).toEqual(Uint8Array.from([0x50, 0x4b]));
    const zip = await JSZip.loadAsync(output.bytes);
    const documentXml = await zip.file('word/document.xml')!.async('string');
    const numberingXml = await zip.file('word/numbering.xml')!.async('string');
    const relationshipsXml = await zip.file('word/_rels/document.xml.rels')!.async('string');
    const contentTypesXml = await zip.file('[Content_Types].xml')!.async('string');
    expect(documentXml).toContain('<m:oMath>');
    expect(documentXml).toContain('<mc:AlternateContent>');
    expect(documentXml).toContain('<mc:Fallback>');
    expect(documentXml).toContain('<w:numPr>');
    expect(documentXml).toContain('<w:ind w:left="1440"/>');
    expect(documentXml).toContain('rot="8220000"');
    expect(documentXml).toContain('cx="5943600" cy="4752975"');
    expect(documentXml).toContain('Limit law');
    expect(documentXml).toContain('w:pgSz');
    expect(numberingXml).toContain('lowerLetter');
    expect(relationshipsXml).toContain('/image');
    expect(contentTypesXml).toContain('image/svg+xml');
    expect(zip.file('word/header1.xml')).not.toBeNull();
    expect(zip.file('word/footer1.xml')).not.toBeNull();
    const runningMatterXml = (await Promise.all(Object.keys(zip.files)
      .filter((name) => /^word\/(?:header|footer)\d+\.xml$/u.test(name))
      .map((name) => zip.file(name)!.async('string')))).join('\n');
    expect(runningMatterXml).toContain('Calculus');
    expect(runningMatterXml).toContain('<w:b/>');
    expect(runningMatterXml).toContain('PAGE');
    expect(runningMatterXml).toContain('<w:u w:val="single"/>');
    expect(runningMatterXml).toContain('<w:color w:val="335577"/>');
    expect([...Object.keys(zip.files)].some((name) => name.endsWith('.svg'))).toBe(true);
    expect([...Object.keys(zip.files)].some((name) => name.endsWith('.png'))).toBe(true);
  });

  it('rejects non-DOCX projections and physical-page scopes', async () => {
    const base = createNotebookRichDocument({ now: () => new Date(NOW) });
    const projection = {
      version: 1,
      createdAt: NOW,
      source: { libraryId: 'library', revision: 1, savedAt: NOW, documentId: base.id, documentUpdatedAt: NOW },
      request: { format: 'pdf', scope: { kind: 'document' } },
      title: base.title,
      pageSetup: base.pageSetup,
      headerFooter: base.headerFooter,
      content: base.content,
      assets: [],
      sourceLayout: { pageCount: 1, fragments: [] },
      compatibility: {
        version: 1, format: 'pdf', findings: [],
        summary: { equationFallbacks: 0, fontSubstitutions: 0, layoutApproximations: 0 },
      },
    } as const;
    await expect(buildNotebookDocx(projection, {
      rasterize: async () => ({ width: 1, height: 1, png: PNG }),
    })).rejects.toThrow('DOCX publication projection');
  });
});

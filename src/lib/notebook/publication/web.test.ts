import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import type { NotebookRichDocument } from '../document/types';
import { createNotebookStoredRecordV1 } from '../persistence/contracts';
import { createInMemoryNotebookAssetPort } from '../persistence/port';
import { buildNotebookPublicationProjection } from './projection';
import { buildNotebookWebPackage, notebookWebCompatibilityFindings } from './web';

const NOW = '2026-07-14T14:00:00.000Z';

async function fixture() {
  const assets = createInMemoryNotebookAssetPort();
  const image = await assets.put(new Uint8Array([1, 2, 3]), 'image/png', NOW);
  const svg = await assets.put(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4"/></svg>'), 'image/svg+xml', NOW);
  const base = createNotebookRichDocument({ now: () => new Date(NOW), title: 'Limits <script>alert(1)</script>' });
  const document: NotebookRichDocument = {
    ...base,
    pageSetup: { paperSize: 'letter', orientation: 'landscape', marginsPt: { top: 54, right: 48, bottom: 54, left: 48 } },
    headerFooter: {
      ...structuredClone(base.headerFooter),
      defaultHeader: { ...base.headerFooter.defaultHeader, left: [{ type: 'paragraph', content: [{ type: 'text', text: 'Calculus & analysis' }] }] },
      defaultFooter: { ...base.headerFooter.defaultFooter, left: [{ type: 'paragraph', content: [{ type: 'text', text: 'Offline publication' }] }], right: [{ type: 'paragraph', content: [{ type: 'pageNumber', marks: [{ type: 'bold' }, { type: 'textStyle', color: '#335577' }] }] }] },
    },
    content: [
      {
        type: 'heading', id: 'heading', level: 1,
        content: [{ type: 'text', text: 'Limit laws', marks: [{ type: 'bold' }, { type: 'textStyle', color: '#335577', fontSize: 120 }] }],
      },
      {
        type: 'paragraph', id: 'prose', format: {
          alignment: 'justify', lineSpacing: 1.5, spaceAfterPt: 12, leftIndentPt: 72,
        },
        content: [
          { type: 'text', text: '<img src=x onerror=alert(1)> For ' },
          { type: 'inlineMath', id: 'inline', sourceText: 'x^2', latex: 'x^2', workspaceTarget: 'calculate' },
          { type: 'text', text: ' use the theorem.', marks: [{ type: 'underline' }] },
        ],
      },
      {
        type: 'semanticBlock', id: 'theorem', variant: 'theorem', label: 'Sum law', accentColor: '#84bfe8',
        content: [{ type: 'displayMath', id: 'equation', sourceText: '\\frac{a}{b}', latex: '\\frac{a}{b}', workspaceTarget: 'calculate' }],
      },
      {
        type: 'orderedList', id: 'list', style: 'lower-roman',
        content: [{ type: 'listItem', id: 'item', content: [{ type: 'paragraph', id: 'item-p', content: [{ type: 'text', text: 'First' }] }] }],
      },
      {
        type: 'imageFigure', id: 'figure', assetId: image.id, altText: 'Limit graph', caption: 'Finite limit',
        numbered: true, widthPercent: 50, placement: 'square-left', displayAspectRatio: 1.25,
        rotation: 137, crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      },
      { type: 'imageFigure', id: 'vector', assetId: svg.id, decorative: true, widthPercent: 25 },
      {
        type: 'section', id: 'section', title: 'Applications',
        content: [{ type: 'evidenceSnapshot', id: 'evidence', source: 'manual-placeholder', title: 'Verification', inputLatex: 'x+1', facts: ['Exact result'], warnings: ['Check assumptions'] }],
      },
      { type: 'pageBreak', id: 'break' },
    ],
  };
  return {
    assets,
    document,
    record: createNotebookStoredRecordV1(document, { libraryId: 'library.web', revision: 9, savedAt: NOW }),
  };
}

describe('Notebook Web publication', () => {
  it('creates an offline ZIP with escaped author content, safe MathML, hashed assets, and print CSS', async () => {
    const source = await fixture();
    const findings = notebookWebCompatibilityFindings(source.document.content);
    expect(findings).toContainEqual(expect.objectContaining({
      kind: 'layout-approximation', nodeId: 'figure',
    }));
    const projection = await buildNotebookPublicationProjection({
      assetPort: source.assets,
      compatibilityFindings: findings,
      createdAt: NOW,
      layout: { pageCount: 2, fragments: [] },
      record: source.record,
      request: { format: 'web', scope: { kind: 'document' } },
    });
    const output = await buildNotebookWebPackage(projection);

    expect(output.fileName).toBe('Limits -script-alert(1)-script- - Web.zip');
    expect(output.bytes.slice(0, 2)).toEqual(Uint8Array.from([0x50, 0x4b]));
    const zip = await JSZip.loadAsync(output.bytes);
    const html = await zip.file('index.html')!.async('string');
    const css = await zip.file('styles.css')!.async('string');
    expect(html).toContain("script-src 'none'");
    expect(html).toContain("connect-src 'none'");
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"');
    expect(html).toContain('Calculus &amp; analysis');
    expect(html).toContain('Offline publication');
    expect(html).toContain('web-page-number');
    expect(html).toContain('<strong><span class="web-page-number"');
    expect(html).toContain('is-square-left');
    expect(html).not.toMatch(/\b(?:src|href)=["'](?:file:|https?:|data:|blob:)/u);
    expect(html).not.toContain('serviceWorker');
    expect(css).toContain('.cwiz-notebook');
    expect(css).toContain('mtext { padding-inline: .16em; }');
    expect(css).toContain('@media print');
    expect(css).toContain('@page { size: Letter landscape;');
    expect(css).toContain('margin-inline-start: 72pt');
    expect(css).toContain('aspect-ratio: 1.25');
    expect(css).toContain('transform: rotate(137deg)');
    expect(css).toContain('color: #335577');
    expect(projection.compatibility.findings).toContainEqual(expect.objectContaining({
      message: expect.stringContaining('omits live page numbers on screen'),
    }));
    const assetFiles = Object.keys(zip.files).filter((name) => name.startsWith('assets/') && !name.endsWith('/'));
    expect(assetFiles).toHaveLength(2);
    expect(assetFiles.every((name) => /^assets\/[a-f0-9]{64}\.(?:jpg|png|svg|webp)$/u.test(name))).toBe(true);
  });

  it('reports unsafe MathML conversion and emits escaped source text', async () => {
    const source = await fixture();
    const badDocument: NotebookRichDocument = {
      ...source.document,
      content: [{ type: 'displayMath', id: 'bad', sourceText: '\\unknowncommand{x}', latex: '\\unknowncommand{x}', workspaceTarget: 'calculate' }],
    };
    const findings = notebookWebCompatibilityFindings(badDocument.content);
    expect(findings).toEqual([expect.objectContaining({ kind: 'equation-fallback', nodeId: 'bad' })]);
    const projection = await buildNotebookPublicationProjection({
      assetPort: source.assets,
      compatibilityFindings: findings,
      layout: { pageCount: 1, fragments: [] },
      record: createNotebookStoredRecordV1(badDocument, { libraryId: 'library.bad-web', revision: 1, savedAt: NOW }),
      request: { format: 'web', scope: { kind: 'document' } },
    });
    const zip = await JSZip.loadAsync((await buildNotebookWebPackage(projection)).bytes);
    const html = await zip.file('index.html')!.async('string');
    expect(html).toContain('<code class="math-fallback">\\unknowncommand{x}</code>');
    expect(html).not.toContain('<merror');
  });

  it('supports top-level Section scope and rejects non-Web projections', async () => {
    const source = await fixture();
    const projection = await buildNotebookPublicationProjection({
      assetPort: source.assets,
      layout: { pageCount: 2, fragments: [] },
      record: source.record,
      request: { format: 'web', scope: { kind: 'sections', sectionIds: ['section'] } },
    });
    const zip = await JSZip.loadAsync((await buildNotebookWebPackage(projection)).bytes);
    const html = await zip.file('index.html')!.async('string');
    expect(html).toContain('Applications');
    await expect(buildNotebookWebPackage({
      ...projection,
      request: { format: 'pdf', scope: { kind: 'document' } },
    })).rejects.toThrow('Web publication projection');
  });
});

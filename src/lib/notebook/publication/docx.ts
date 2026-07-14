import {
  AlignmentType,
  BorderStyle,
  BuilderElement,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Math as DocxMath,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  type FileChild,
  type ParagraphChild,
} from 'docx';

import { notebookPageGeometry } from '../document/page-layout';
import { notebookSemanticTitle } from '../document/semantics';
import type {
  NotebookInlineNode,
  NotebookParagraphFormat,
  NotebookRichBlockNode,
  NotebookRichMark,
} from '../document/types';
import { convertNotebookLatexToOmml } from './docx-math';
import {
  notebookEquationFallbackSvg,
  type NotebookDocxRasterizer,
} from './docx-media';
import type {
  NotebookCompatibilityFindingV1,
  NotebookPublicationAssetV1,
  NotebookPublicationProjectionV1,
} from './types';

const BULLET_GLYPHS = { disc: '•', circle: '◦', square: '▪', dash: '–' } as const;
const LIST_REFERENCES = [
  'bullet-disc', 'bullet-circle', 'bullet-square', 'bullet-dash',
  'number-decimal', 'number-lower-alpha', 'number-lower-roman',
] as const;

type PreparedImage = {
  readonly height: number;
  readonly original: Uint8Array;
  readonly png: Uint8Array;
  readonly type: string;
  readonly width: number;
};

type RenderContext = {
  readonly assets: ReadonlyMap<string, PreparedImage>;
  readonly labels: ReadonlyMap<string, string>;
  readonly mathFallbacks: ReadonlyMap<string, PreparedImage>;
};

export type NotebookDocxOutput = {
  readonly bytes: Uint8Array;
  readonly fileName: string;
};

function walkNodes(nodes: readonly NotebookRichBlockNode[], visit: (node: NotebookRichBlockNode) => void) {
  nodes.forEach((node) => {
    visit(node);
    if (node.type === 'section' || node.type === 'semanticBlock') walkNodes(node.content, visit);
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      node.content.forEach((item) => walkNodes(item.content, visit));
    }
  });
}

function inlineMathEntries(nodes: readonly NotebookRichBlockNode[]) {
  const entries: { id: string; latex: string }[] = [];
  walkNodes(nodes, (node) => {
    if (node.type === 'paragraph' || node.type === 'heading') {
      node.content?.forEach((inline) => {
        if (inline.type === 'inlineMath') entries.push({ id: inline.id, latex: inline.latex });
      });
    } else if (node.type === 'displayMath') {
      entries.push({ id: node.id, latex: node.latex });
    } else if (node.type === 'evidenceSnapshot') {
      if (node.inputLatex) entries.push({ id: `${node.id}.input`, latex: node.inputLatex });
      if (node.resultLatex) entries.push({ id: `${node.id}.result`, latex: node.resultLatex });
    }
  });
  return entries;
}

export function notebookDocxCompatibilityFindings(
  nodes: readonly NotebookRichBlockNode[],
): NotebookCompatibilityFindingV1[] {
  const findings: NotebookCompatibilityFindingV1[] = [];
  let editableEquationCount = 0;
  inlineMathEntries(nodes).forEach(({ id, latex }) => {
    const conversion = convertNotebookLatexToOmml(latex);
    if (conversion.kind === 'fallback') {
      findings.push({
        kind: 'equation-fallback',
        nodeId: id.split('.')[0],
        message: `An equation will use a static SVG/PNG visual in Word: ${conversion.reason}`,
      });
    } else {
      editableEquationCount += 1;
    }
  });
  if (editableEquationCount > 0) {
    findings.push({
      kind: 'equation-fallback',
      message: 'Word receives editable OMML equations; readers without OMML support use the included static SVG/PNG alternate content.',
    });
  }
  walkNodes(nodes, (node) => {
    if (node.type === 'imageFigure' && node.crop) {
      findings.push({
        kind: 'layout-approximation',
        nodeId: node.id,
        message: 'Word will preserve the image and rotation but approximate its Notebook crop.',
      });
    }
  });
  return findings;
}

function alignment(value?: NotebookParagraphFormat['alignment']) {
  if (value === 'center') return AlignmentType.CENTER;
  if (value === 'right') return AlignmentType.RIGHT;
  if (value === 'justify') return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function paragraphOptions(format?: NotebookParagraphFormat) {
  return {
    alignment: alignment(format?.alignment),
    indent: format?.leftIndentPt
      ? { left: format.leftIndentPt * 20 }
      : undefined,
    spacing: {
      before: (format?.spaceBeforePt ?? 0) * 20,
      after: (format?.spaceAfterPt ?? 6) * 20,
      line: Math.round((format?.lineSpacing ?? 1.15) * 240),
    },
  };
}

function textRun(text: string, marks: readonly NotebookRichMark[] = []) {
  const textStyle = marks.find((mark) => mark.type === 'textStyle');
  const highlight = marks.find((mark) => mark.type === 'highlight');
  return new TextRun({
    text,
    bold: marks.some((mark) => mark.type === 'bold'),
    italics: marks.some((mark) => mark.type === 'italic'),
    strike: marks.some((mark) => mark.type === 'strike'),
    underline: marks.some((mark) => mark.type === 'underline')
      ? { type: UnderlineType.SINGLE }
      : undefined,
    color: textStyle?.type === 'textStyle' ? textStyle.color?.replace('#', '') : undefined,
    size: textStyle?.type === 'textStyle' && textStyle.fontSize
      ? Math.round(22 * textStyle.fontSize / 100)
      : undefined,
    highlight: highlight?.type === 'highlight' ? 'yellow' : undefined,
  });
}

function imageRun(
  image: PreparedImage,
  widthPercent = 100,
  rotation = 0,
  alt = '',
  displayAspectRatio?: number,
) {
  const maximumWidth = 624 * Math.max(0.1, Math.min(1, widthPercent / 100));
  const scale = Math.min(1, maximumWidth / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const transformation = {
    width,
    height: Math.max(1, Math.round(displayAspectRatio ? width / displayAspectRatio : image.height * scale)),
    rotation,
  };
  const altText = { name: alt || 'Notebook image', description: alt };
  if (image.type === 'image/svg+xml') {
    return new ImageRun({
      type: 'svg',
      data: image.original,
      fallback: { type: 'png', data: image.png },
      transformation,
      altText,
    });
  }
  if (image.type === 'image/jpeg') {
    return new ImageRun({ type: 'jpg', data: image.original, transformation, altText });
  }
  return new ImageRun({
    type: 'png',
    data: image.type === 'image/png' ? image.original : image.png,
    transformation,
    altText,
  });
}

function inlineChildren(content: readonly NotebookInlineNode[] | undefined, context: RenderContext) {
  const children: ParagraphChild[] = [];
  content?.forEach((inline) => {
    if (inline.type === 'text') {
      children.push(textRun(inline.text, inline.marks));
      return;
    }
    const conversion = convertNotebookLatexToOmml(inline.latex);
    if (conversion.kind === 'omml') {
      const fallback = context.mathFallbacks.get(inline.id);
      if (!fallback) throw new Error('An equation interoperability fallback is unavailable.');
      children.push(alternateMath(
        new DocxMath({ children: conversion.children }),
        imageRun(fallback, 22, 0, `Equation: ${inline.latex}`),
      ));
    } else {
      const fallback = context.mathFallbacks.get(inline.id);
      if (!fallback) throw new Error('An equation fallback image is unavailable.');
      children.push(imageRun(fallback, 50, 0, `Equation: ${inline.latex}`));
    }
  });
  return children;
}

function alternateMath(math: DocxMath, fallback: ImageRun) {
  const choice = new BuilderElement({
    name: 'mc:Choice',
    attributes: { requires: { key: 'Requires', value: 'm' } },
    children: [math],
  });
  const visualFallback = new BuilderElement({ name: 'mc:Fallback', children: [fallback] });
  return new BuilderElement({
    name: 'mc:AlternateContent',
    children: [choice, visualFallback],
  }) as unknown as ParagraphChild;
}

function collectLabels(nodes: readonly NotebookRichBlockNode[]) {
  const labels = new Map<string, string>();
  let figure = 0;
  let video = 0;
  walkNodes(nodes, (node) => {
    if (node.type === 'imageFigure' && node.numbered) labels.set(node.id, `Figure ${++figure}`);
    if (node.type === 'videoFigure' && node.numbered) labels.set(node.id, `Video ${++video}`);
  });
  return labels;
}

function caption(nodeId: string, value: string | undefined, context: RenderContext) {
  if (!value) return null;
  const label = context.labels.get(nodeId);
  return new Paragraph({
    children: [new TextRun({ text: `${label ? `${label}: ` : ''}${value}`, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  });
}

function renderMath(id: string, latex: string, label: string | undefined, context: RenderContext) {
  const conversion = convertNotebookLatexToOmml(latex);
  const paragraph = conversion.kind === 'omml'
    ? new Paragraph({
      children: [alternateMath(
        new DocxMath({ children: conversion.children }),
        imageRun(context.mathFallbacks.get(id)!, 80, 0, `Equation: ${latex}`),
      )],
      alignment: AlignmentType.CENTER,
    })
    : new Paragraph({
      children: [imageRun(context.mathFallbacks.get(id)!, 80, 0, `Equation: ${latex}`)],
      alignment: AlignmentType.CENTER,
    });
  return label
    ? [paragraph, new Paragraph({ text: label, alignment: AlignmentType.CENTER, spacing: { after: 120 } })]
    : [paragraph];
}

function renderStructured(node: Extract<NotebookRichBlockNode, { type: 'semanticBlock' }>, context: RenderContext, depth: number) {
  const accent = (node.accentColor ?? '#6f8e55').replace('#', '');
  const children = renderNodes(node.content, context, depth);
  const tint = accent.match(/^[0-9a-f]{6}$/iu)
    ? accent.match(/../gu)!.map((part) => Math.round(Number.parseInt(part, 16) * 0.18 + 255 * 0.82)
      .toString(16).padStart(2, '0')).join('')
    : 'f2f6ef';
  const borders = {
    left: { color: accent, size: 18, style: BorderStyle.SINGLE },
    top: { color: accent, size: 4, style: BorderStyle.SINGLE },
    right: { color: accent, size: 4, style: BorderStyle.SINGLE },
    bottom: { color: accent, size: 4, style: BorderStyle.SINGLE },
  } as const;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    rows: [
      new TableRow({
        children: [new TableCell({
          borders,
          shading: { fill: tint, type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [new TextRun({ text: notebookSemanticTitle(node.variant, node.number, node.label), bold: true, color: accent })],
          })],
        })],
      }),
      new TableRow({
        children: [new TableCell({
          borders,
          shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
          children: [
            ...children,
          ],
        })],
      }),
    ],
  });
}

function listReference(node: Extract<NotebookRichBlockNode, { type: 'bulletList' | 'orderedList' }>) {
  if (node.type === 'bulletList') return `bullet-${node.style ?? 'disc'}`;
  return `number-${node.style ?? 'decimal'}`;
}

function renderList(node: Extract<NotebookRichBlockNode, { type: 'bulletList' | 'orderedList' }>, context: RenderContext, depth: number) {
  const output: FileChild[] = [];
  node.content.forEach((item) => {
    const [first, ...rest] = item.content;
    if (first?.type === 'paragraph' || first?.type === 'heading') {
      output.push(new Paragraph({
        children: inlineChildren(first.content, context),
        numbering: { reference: listReference(node), level: Math.min(depth, 8) },
        ...paragraphOptions(first.format),
      }));
      output.push(...renderNodes(rest, context, depth + 1));
    } else {
      output.push(new Paragraph({
        text: '',
        numbering: { reference: listReference(node), level: Math.min(depth, 8) },
      }));
      output.push(...renderNodes(item.content, context, depth + 1));
    }
  });
  return output;
}

function renderNodes(nodes: readonly NotebookRichBlockNode[], context: RenderContext, depth = 0): FileChild[] {
  const output: FileChild[] = [];
  nodes.forEach((node) => {
    if (node.type === 'paragraph') {
      output.push(new Paragraph({ children: inlineChildren(node.content, context), ...paragraphOptions(node.format) }));
    } else if (node.type === 'heading') {
      output.push(new Paragraph({
        children: inlineChildren(node.content, context),
        heading: node.level === 1 ? HeadingLevel.HEADING_1 : node.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        ...paragraphOptions(node.format),
      }));
    } else if (node.type === 'displayMath') {
      output.push(...renderMath(node.id, node.latex, node.label, context));
    } else if (node.type === 'horizontalRule') {
      output.push(new Paragraph({ border: { bottom: { color: '808080', size: 6, style: BorderStyle.SINGLE } } }));
    } else if (node.type === 'pageBreak') {
      output.push(new Paragraph({ children: [new PageBreak()] }));
    } else if (node.type === 'imageFigure') {
      const image = context.assets.get(node.assetId);
      if (!image) throw new Error(`Image asset ${node.assetId} is unavailable.`);
      output.push(new Paragraph({
        children: [imageRun(
          image,
          node.widthPercent,
          node.rotation,
          node.decorative ? '' : node.altText,
          node.displayAspectRatio,
        )],
        alignment: alignment(node.alignment),
      }));
      const imageCaption = caption(node.id, node.caption, context);
      if (imageCaption) output.push(imageCaption);
    } else if (node.type === 'videoFigure') {
      if (node.posterAssetId) {
        const poster = context.assets.get(node.posterAssetId);
        if (poster) output.push(new Paragraph({
          children: [imageRun(poster, node.widthPercent, 0, '', node.displayAspectRatio)],
          alignment: alignment(node.alignment),
        }));
      }
      output.push(new Paragraph({ children: [new TextRun({ text: node.title || 'Video', bold: true })] }));
      if (node.description) output.push(new Paragraph(node.description));
      const videoCaption = caption(node.id, node.caption, context);
      if (videoCaption) output.push(videoCaption);
      output.push(new Paragraph({ children: [new TextRun({ text: 'Interactive playback is available in the Web package.', italics: true })] }));
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      output.push(...renderList(node, context, depth));
    } else if (node.type === 'semanticBlock') {
      output.push(renderStructured(node, context, depth));
    } else if (node.type === 'section') {
      output.push(new Paragraph({
        text: node.title || 'Untitled section',
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: output.length > 0,
      }));
      output.push(...renderNodes(node.content, context, depth));
    } else {
      output.push(new Paragraph({ children: [new TextRun({ text: node.title, bold: true })] }));
      if (node.inputLatex) output.push(...renderMath(`${node.id}.input`, node.inputLatex, undefined, context));
      if (node.resultLatex) output.push(...renderMath(`${node.id}.result`, node.resultLatex, undefined, context));
      node.facts.forEach((fact) => output.push(new Paragraph(fact)));
      node.warnings.forEach((warning) => output.push(new Paragraph(`Warning: ${warning}`)));
    }
  });
  return output;
}

function numberingConfiguration() {
  return LIST_REFERENCES.map((reference) => {
    const ordered = reference.startsWith('number-');
    const style = reference.slice(reference.indexOf('-') + 1);
    const format = style === 'lower-alpha' ? LevelFormat.LOWER_LETTER
      : style === 'lower-roman' ? LevelFormat.LOWER_ROMAN
        : ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET;
    const bullet = BULLET_GLYPHS[style as keyof typeof BULLET_GLYPHS] ?? '•';
    return {
      reference,
      levels: Array.from({ length: 9 }, (_, level) => ({
        level,
        format,
        text: ordered ? `%${level + 1}.` : bullet,
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720 + level * 360, hanging: 360 } } },
      })),
    };
  });
}

async function prepareAsset(asset: NotebookPublicationAssetV1, rasterize: NotebookDocxRasterizer): Promise<PreparedImage> {
  const rasterized = await rasterize(asset.blob);
  if (!Number.isFinite(rasterized.width) || !Number.isFinite(rasterized.height)
    || rasterized.width < 1 || rasterized.height < 1 || rasterized.png.byteLength === 0) {
    throw new Error(`Notebook asset ${asset.metadata.id} could not be prepared for Word.`);
  }
  return {
    height: rasterized.height,
    original: new Uint8Array(await asset.blob.arrayBuffer()),
    png: rasterized.png,
    type: asset.metadata.mimeType,
    width: rasterized.width,
  };
}

function safeFileName(title: string) {
  const base = title.trim().replace(/[\\/:*?"<>|]+/gu, '-').replace(/\s+/gu, ' ').slice(0, 120);
  return `${base || 'Untitled Notebook'}.docx`;
}

export async function buildNotebookDocx(
  projection: NotebookPublicationProjectionV1,
  options: { readonly rasterize: NotebookDocxRasterizer },
): Promise<NotebookDocxOutput> {
  if (projection.request.format !== 'docx') throw new TypeError('DOCX export requires a DOCX publication projection.');
  if (projection.request.scope.kind === 'page-range') throw new TypeError('DOCX export does not accept physical page ranges.');
  const assets = new Map<string, PreparedImage>();
  for (const asset of projection.assets) {
    assets.set(asset.metadata.id, await prepareAsset(asset, options.rasterize));
  }
  const mathFallbacks = new Map<string, PreparedImage>();
  for (const entry of inlineMathEntries(projection.content)) {
    const original = notebookEquationFallbackSvg(entry.latex);
    const blob = new Blob([original as BlobPart], { type: 'image/svg+xml' });
    const rasterized = await options.rasterize(blob);
    mathFallbacks.set(entry.id, {
      height: rasterized.height,
      original,
      png: rasterized.png,
      type: 'image/svg+xml',
      width: rasterized.width,
    });
  }
  const geometry = notebookPageGeometry(projection.pageSetup);
  const headerText = projection.headerFooter.headerText;
  const footerChildren: ParagraphChild[] = [];
  if (projection.headerFooter.footerText) footerChildren.push(new TextRun(projection.headerFooter.footerText));
  if (projection.headerFooter.pageNumbering.enabled) {
    if (footerChildren.length) footerChildren.push(new TextRun('  '));
    footerChildren.push(new TextRun({ children: [PageNumber.CURRENT] }));
  }
  const footerAlignment = alignment(projection.headerFooter.pageNumbering.position);
  const context: RenderContext = { assets, labels: collectLabels(projection.content), mathFallbacks };
  const document = new Document({
    title: projection.title,
    creator: 'Calcwiz Notebook',
    revision: projection.source.revision,
    numbering: { config: numberingConfiguration() },
    sections: [{
      properties: {
        titlePage: projection.headerFooter.differentFirstPage,
        page: {
          size: { width: `${geometry.width}pt`, height: `${geometry.height}pt`, orientation: projection.pageSetup.orientation },
          margin: {
            top: `${projection.pageSetup.marginsPt.top}pt`,
            right: `${projection.pageSetup.marginsPt.right}pt`,
            bottom: `${projection.pageSetup.marginsPt.bottom}pt`,
            left: `${projection.pageSetup.marginsPt.left}pt`,
          },
          pageNumbers: { start: projection.headerFooter.pageNumbering.startAt },
        },
      },
      headers: headerText ? {
        default: new Header({ children: [new Paragraph(headerText)] }),
        first: projection.headerFooter.differentFirstPage ? new Header({ children: [new Paragraph('')] }) : undefined,
      } : undefined,
      footers: footerChildren.length ? {
        default: new Footer({ children: [new Paragraph({ children: footerChildren, alignment: footerAlignment })] }),
        first: projection.headerFooter.differentFirstPage ? new Footer({ children: [new Paragraph('')] }) : undefined,
      } : undefined,
      children: renderNodes(projection.content, context),
    }],
  });
  return {
    bytes: new Uint8Array(await Packer.toArrayBuffer(document)),
    fileName: safeFileName(projection.title),
  };
}

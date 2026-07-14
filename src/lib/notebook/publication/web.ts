import JSZip from 'jszip';
import { convertLatexToMathMl } from 'mathlive';

import { notebookSemanticTitle } from '../document/semantics';
import type {
  NotebookInlineNode,
  NotebookParagraphFormat,
  NotebookRichBlockNode,
  NotebookRichMark,
} from '../document/types';
import type {
  NotebookCompatibilityFindingV1,
  NotebookPublicationProjectionV1,
} from './types';

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'text/vtt': 'vtt',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
} as const;

const SAFE_MATHML_TAGS = new Set([
  'math', 'mrow', 'mi', 'mn', 'mo', 'mtext', 'mspace', 'ms', 'mfrac', 'msqrt',
  'mroot', 'mstyle', 'mpadded', 'mphantom', 'mfenced', 'menclose', 'msub', 'msup',
  'msubsup', 'munder', 'mover', 'munderover', 'mmultiscripts', 'mprescripts', 'none',
  'mtable', 'mtr', 'mtd', 'maligngroup', 'malignmark', 'semantics', 'annotation',
]);

const BASE_CSS = `
:root { color-scheme: light; background: #eef1ec; }
* { box-sizing: border-box; }
body { margin: 0; color: #1b211b; background: #eef1ec; font: 17px/1.55 Georgia, "Times New Roman", serif; }
.cwiz-notebook { width: min(920px, calc(100% - 32px)); margin: 32px auto; padding: clamp(28px, 6vw, 72px); background: #fff; box-shadow: 0 18px 60px rgba(22, 35, 25, .14); }
.cwiz-notebook > header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #d9ded7; }
.cwiz-notebook > header p, .cwiz-notebook > footer p { color: #586257; }
h1, h2, h3 { line-height: 1.2; color: #172017; }
h1 { font-size: clamp(2rem, 5vw, 3rem); }
h2 { font-size: 1.7rem; }
h3 { font-size: 1.3rem; }
p { margin: 0 0 .75rem; }
a { color: inherit; }
math { font-family: "Cambria Math", "STIX Two Math", serif; }
.cwiz-notebook mtext { padding-inline: .16em; }
.math-display { display: block; margin: 1.25rem auto; overflow-x: auto; text-align: center; }
.math-fallback { display: inline-block; padding: .15rem .35rem; color: #612f28; background: #fff0ed; border-radius: 3px; font: .9em/1.35 ui-monospace, monospace; }
.equation { margin: 1.4rem 0; text-align: center; }
.equation figcaption, .media figcaption { margin-top: .5rem; color: #4b554a; font-size: .92rem; }
.semantic { --accent: #6f8e55; margin: 1.25rem 0; border: 1px solid color-mix(in srgb, var(--accent), #fff 55%); border-left: 5px solid var(--accent); }
.semantic > header { padding: .55rem .8rem; color: color-mix(in srgb, var(--accent), #000 28%); background: color-mix(in srgb, var(--accent), #fff 82%); font-weight: 700; }
.semantic > div { padding: .85rem 1rem; }
.notebook-section { margin: 2.25rem 0; }
.notebook-section > h2 { padding-bottom: .35rem; border-bottom: 2px solid var(--accent, #6f8e55); }
.evidence { margin: 1rem 0; padding: 1rem; background: #f4f6f2; border: 1px solid #d7ddd4; }
.evidence .warning { color: #8b3d27; }
.media { max-width: 100%; margin: 1.25rem auto; text-align: center; }
.media img, .media video { display: block; max-width: 100%; height: auto; margin: 0 auto; }
.media.has-display-aspect img, .media.has-display-aspect video { width: 100%; height: 100%; object-fit: fill; }
.media video { width: 100%; background: #111; }
.media.is-left { margin-left: 0; }
.media.is-right { margin-right: 0; }
.media.is-square-left { float: left; margin: .25rem 1.25rem .75rem 0; }
.media.is-square-right { float: right; margin: .25rem 0 .75rem 1.25rem; }
.media.is-top-and-bottom { clear: both; }
.media-description { text-align: left; }
.video-note { color: #586257; font-size: .88rem; }
.page-break { clear: both; height: 0; margin: 2rem 0; border: 0; border-top: 1px dashed #aab2a7; }
.divider { clear: both; border: 0; border-top: 1px solid #aeb6ac; }
.list-dash { list-style-type: "–  "; }
.list-lower-alpha { list-style-type: lower-alpha; }
.list-lower-roman { list-style-type: lower-roman; }
.list-circle { list-style-type: circle; }
.list-square { list-style-type: square; }
.align-center { text-align: center; }
.align-right { text-align: right; }
.align-justify { text-align: justify; }
.decorative-caption { font-style: italic; }
.cwiz-notebook > footer { clear: both; margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #d9ded7; }
@media (max-width: 700px) {
  body { font-size: 16px; }
  .cwiz-notebook { width: 100%; margin: 0; padding: 24px 18px; box-shadow: none; }
  .media.is-square-left, .media.is-square-right { float: none; margin: 1.25rem auto; }
}
@media print {
  :root, body { background: #fff; }
  .cwiz-notebook { width: auto; margin: 0; padding: 0; box-shadow: none; }
  .page-break { break-after: page; border: 0; }
  .semantic, .media, .evidence { break-inside: avoid; }
  video { display: none !important; }
  .video-note { display: block; }
}
`;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function walkNodes(nodes: readonly NotebookRichBlockNode[], visit: (node: NotebookRichBlockNode) => void) {
  nodes.forEach((node) => {
    visit(node);
    if (node.type === 'section' || node.type === 'semanticBlock') walkNodes(node.content, visit);
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      node.content.forEach((item) => walkNodes(item.content, visit));
    }
  });
}

function safeMathMl(latex: string) {
  try {
    const fragment = convertLatexToMathMl(latex);
    if (!fragment || /<merror\b/iu.test(fragment)) return null;
    const tags = fragment.match(/<[^>]+>/gu) ?? [];
    if (tags.some((tag) => {
      const match = /^<\/?([a-z][a-z0-9-]*)(?:\s[^>]*)?>$/iu.exec(tag);
      if (!match || !SAFE_MATHML_TAGS.has(match[1].toLowerCase())) return true;
      return /\b(?:href|src|style|on[a-z]+)\s*=|(?:javascript|data|https?):|\/\//iu.test(tag);
    })) return null;
    return fragment;
  } catch {
    return null;
  }
}

function mathHtml(latex: string, display: boolean) {
  const mathMl = safeMathMl(latex);
  if (!mathMl) return `<code class="math-fallback">${escapeHtml(latex)}</code>`;
  return `<math xmlns="http://www.w3.org/1998/Math/MathML"${display ? ' display="block" class="math-display"' : ''}>${mathMl}</math>`;
}

export function notebookWebCompatibilityFindings(
  nodes: readonly NotebookRichBlockNode[],
): NotebookCompatibilityFindingV1[] {
  const findings: NotebookCompatibilityFindingV1[] = [];
  walkNodes(nodes, (node) => {
    if (node.type === 'displayMath' && !safeMathMl(node.latex)) {
      findings.push({
        kind: 'equation-fallback', nodeId: node.id,
        message: 'An equation will use escaped source text because safe static MathML conversion failed.',
      });
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      node.content?.forEach((inline) => {
        if (inline.type === 'inlineMath' && !safeMathMl(inline.latex)) {
          findings.push({
            kind: 'equation-fallback', nodeId: inline.id,
            message: 'An inline equation will use escaped source text because safe static MathML conversion failed.',
          });
        }
      });
    }
    if (node.type === 'imageFigure' && node.crop) {
      findings.push({
        kind: 'layout-approximation', nodeId: node.id,
        message: 'The Web publication approximates the Notebook image crop with a static clip region.',
      });
    }
  });
  return findings;
}

class StyleRegistry {
  private readonly dynamic = new Map<string, string>();
  private readonly rules: string[] = [];

  add(key: string, declaration: string) {
    const existing = this.dynamic.get(key);
    if (existing) return existing;
    const name = `d${this.dynamic.size + 1}`;
    this.dynamic.set(key, name);
    this.rules.push(`.cwiz-notebook .${name} { ${declaration} }`);
    return name;
  }

  css(pageRule: string) {
    return `${BASE_CSS}\n${this.rules.join('\n')}\n${pageRule}\n`;
  }
}

function markClasses(marks: readonly NotebookRichMark[], styles: StyleRegistry) {
  const declarations: string[] = [];
  marks.forEach((mark) => {
    if (mark.type === 'highlight') declarations.push(`background-color: ${mark.color ?? '#fff2a8'}`);
    if (mark.type === 'textStyle' && mark.color) declarations.push(`color: ${mark.color}`);
    if (mark.type === 'textStyle' && mark.fontSize) declarations.push(`font-size: ${mark.fontSize}%`);
  });
  return declarations.length ? styles.add(`mark:${declarations.join(';')}`, declarations.join('; ')) : '';
}

function textHtml(text: string, marks: readonly NotebookRichMark[] = [], styles: StyleRegistry) {
  let html = escapeHtml(text);
  if (marks.some((mark) => mark.type === 'bold')) html = `<strong>${html}</strong>`;
  if (marks.some((mark) => mark.type === 'italic')) html = `<em>${html}</em>`;
  if (marks.some((mark) => mark.type === 'underline')) html = `<u>${html}</u>`;
  if (marks.some((mark) => mark.type === 'strike')) html = `<s>${html}</s>`;
  const className = markClasses(marks, styles);
  return className ? `<span class="${className}">${html}</span>` : html;
}

function inlineHtml(content: readonly NotebookInlineNode[] | undefined, styles: StyleRegistry) {
  return content?.map((inline) => inline.type === 'text'
    ? textHtml(inline.text, inline.marks, styles)
    : mathHtml(inline.latex, false)).join('') ?? '';
}

function paragraphClass(format: NotebookParagraphFormat | undefined, styles: StyleRegistry) {
  const classes: string[] = [];
  if (format?.alignment && format.alignment !== 'left') classes.push(`align-${format.alignment}`);
  const declarations: string[] = [];
  if (format?.lineSpacing) declarations.push(`line-height: ${format.lineSpacing}`);
  if (format?.spaceBeforePt !== undefined) declarations.push(`margin-top: ${format.spaceBeforePt}pt`);
  if (format?.spaceAfterPt !== undefined) declarations.push(`margin-bottom: ${format.spaceAfterPt}pt`);
  if (format?.leftIndentPt !== undefined) declarations.push(`margin-inline-start: ${format.leftIndentPt}pt`);
  if (declarations.length) classes.push(styles.add(`paragraph:${declarations.join(';')}`, declarations.join('; ')));
  return classes.join(' ');
}

function assetFileName(assetId: string, mimeType: keyof typeof MIME_EXTENSIONS) {
  const hash = assetId.startsWith('sha256:') ? assetId.slice(7) : assetId;
  if (!/^[a-f0-9]{64}$/u.test(hash)) throw new Error('Web publication asset identity is invalid.');
  return `assets/${hash}.${MIME_EXTENSIONS[mimeType]}`;
}

function collectLabels(nodes: readonly NotebookRichBlockNode[]) {
  const labels = new Map<string, string>();
  let figures = 0;
  let videos = 0;
  walkNodes(nodes, (node) => {
    if (node.type === 'imageFigure' && node.numbered) labels.set(node.id, `Figure ${++figures}`);
    if (node.type === 'videoFigure' && node.numbered) labels.set(node.id, `Video ${++videos}`);
  });
  return labels;
}

type RenderContext = {
  readonly assetPaths: ReadonlyMap<string, string>;
  readonly labels: ReadonlyMap<string, string>;
  readonly styles: StyleRegistry;
};

function mediaClasses(
  widthPercent: number | undefined,
  alignment: string | undefined,
  placement: string | undefined,
  displayAspectRatio: number | undefined,
  styles: StyleRegistry,
) {
  const classes = ['media', `is-${alignment ?? 'center'}`];
  if (placement && placement !== 'normal') classes.push(`is-${placement}`);
  if (displayAspectRatio) {
    classes.push('has-display-aspect');
    classes.push(styles.add(`aspect:${displayAspectRatio}`, `aspect-ratio: ${displayAspectRatio}`));
  }
  const width = Math.max(10, Math.min(100, widthPercent ?? 100));
  classes.push(styles.add(`width:${width}`, `width: ${width}%`));
  return classes.join(' ');
}

function captionHtml(nodeId: string, caption: string | undefined, context: RenderContext) {
  if (!caption) return '';
  const label = context.labels.get(nodeId);
  return `<figcaption>${label ? `${escapeHtml(label)}: ` : ''}${escapeHtml(caption)}</figcaption>`;
}

function renderNode(node: NotebookRichBlockNode, context: RenderContext): string {
  if (node.type === 'paragraph') {
    return `<p class="${paragraphClass(node.format, context.styles)}">${inlineHtml(node.content, context.styles)}</p>`;
  }
  if (node.type === 'heading') {
    return `<h${node.level} class="${paragraphClass(node.format, context.styles)}">${inlineHtml(node.content, context.styles)}</h${node.level}>`;
  }
  if (node.type === 'displayMath') {
    return `<figure class="equation">${mathHtml(node.latex, true)}${node.label ? `<figcaption>${escapeHtml(node.label)}</figcaption>` : ''}</figure>`;
  }
  if (node.type === 'horizontalRule') return '<hr class="divider">';
  if (node.type === 'pageBreak') return '<hr class="page-break">';
  if (node.type === 'evidenceSnapshot') {
    const facts = node.facts.map((fact) => `<p>${escapeHtml(fact)}</p>`).join('');
    const warnings = node.warnings.map((warning) => `<p class="warning">Warning: ${escapeHtml(warning)}</p>`).join('');
    return `<aside class="evidence"><strong>${escapeHtml(node.title)}</strong>${node.inputLatex ? mathHtml(node.inputLatex, true) : ''}${node.resultLatex ? mathHtml(node.resultLatex, true) : ''}${facts}${warnings}</aside>`;
  }
  if (node.type === 'imageFigure') {
    const path = context.assetPaths.get(node.assetId);
    if (!path) throw new Error(`Web image asset ${node.assetId} is unavailable.`);
    const rotation = node.rotation ? context.styles.add(
      `rotation:${node.rotation}`,
      `transform: rotate(${node.rotation}deg)`,
    ) : '';
    const crop = node.crop ? context.styles.add(
      `crop:${node.crop.x}:${node.crop.y}:${node.crop.width}:${node.crop.height}`,
      `clip-path: inset(${node.crop.y * 100}% ${(1 - node.crop.x - node.crop.width) * 100}% ${(1 - node.crop.y - node.crop.height) * 100}% ${node.crop.x * 100}%)`,
    ) : '';
    return `<figure class="${mediaClasses(node.widthPercent, node.alignment, node.placement, node.displayAspectRatio, context.styles)}"><img class="${[crop, rotation].filter(Boolean).join(' ')}" src="${path}" alt="${node.decorative ? '' : escapeHtml(node.altText ?? '')}" loading="lazy">${captionHtml(node.id, node.caption, context)}</figure>`;
  }
  if (node.type === 'videoFigure') {
    const source = context.assetPaths.get(node.assetId);
    if (!source) throw new Error(`Web video asset ${node.assetId} is unavailable.`);
    const poster = node.posterAssetId ? context.assetPaths.get(node.posterAssetId) : undefined;
    const sourceAssetType = source.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
    const tracks = node.tracks?.map((track) => {
      const trackPath = context.assetPaths.get(track.assetId);
      if (!trackPath) throw new Error(`Web caption asset ${track.assetId} is unavailable.`);
      return `<track src="${trackPath}" kind="${track.kind}" srclang="${escapeHtml(track.language)}" label="${escapeHtml(track.label)}"${track.default ? ' default' : ''}>`;
    }).join('') ?? '';
    return `<figure class="${mediaClasses(node.widthPercent, node.alignment, node.placement, node.displayAspectRatio, context.styles)}"><video controls preload="metadata"${node.loop ? ' loop' : ''}${poster ? ` poster="${poster}"` : ''}><source src="${source}" type="${sourceAssetType}">${tracks}<p>Your browser cannot play this local video.</p></video><div class="media-description"><strong>${escapeHtml(node.title)}</strong>${node.description ? `<p>${escapeHtml(node.description)}</p>` : ''}</div>${captionHtml(node.id, node.caption, context)}<p class="video-note">Interactive local playback is included in this Web package.</p></figure>`;
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const tag = node.type === 'bulletList' ? 'ul' : 'ol';
    const style = node.style && node.style !== 'disc' && node.style !== 'decimal'
      ? ` class="list-${node.style}"`
      : '';
    return `<${tag}${style}>${node.content.map((item) => `<li>${item.content.map((child) => renderNode(child, context)).join('')}</li>`).join('')}</${tag}>`;
  }
  if (node.type === 'semanticBlock') {
    const accent = node.accentColor ?? '#6f8e55';
    const accentClass = context.styles.add(`accent:${accent}`, `--accent: ${accent}`);
    return `<aside class="semantic ${accentClass}"><header>${escapeHtml(notebookSemanticTitle(node.variant, node.number, node.label))}</header><div>${node.content.map((child) => renderNode(child, context)).join('')}</div></aside>`;
  }
  const accent = node.accentColor ?? '#6f8e55';
  const accentClass = context.styles.add(`accent:${accent}`, `--accent: ${accent}`);
  return `<section class="notebook-section ${accentClass}"><h2>${escapeHtml(node.title || 'Untitled section')}</h2>${node.content.map((child) => renderNode(child, context)).join('')}</section>`;
}

function safeFileName(title: string) {
  const base = title.trim().replace(/[\\/:*?"<>|]+/gu, '-').replace(/\s+/gu, ' ').slice(0, 120);
  return `${base || 'Untitled Notebook'} - Web.zip`;
}

export type NotebookWebOutput = {
  readonly bytes: Uint8Array;
  readonly fileName: string;
};

export async function buildNotebookWebPackage(
  projection: NotebookPublicationProjectionV1,
): Promise<NotebookWebOutput> {
  if (projection.request.format !== 'web') throw new TypeError('Web export requires a Web publication projection.');
  if (projection.request.scope.kind === 'page-range') throw new TypeError('Web export does not accept physical page ranges.');
  const zip = new JSZip();
  const assetPaths = new Map<string, string>();
  for (const asset of projection.assets) {
    const mimeType = asset.metadata.mimeType;
    const path = assetFileName(asset.metadata.id, mimeType);
    assetPaths.set(asset.metadata.id, path);
    zip.file(path, new Uint8Array(await asset.blob.arrayBuffer()), {
      binary: true,
      compression: mimeType.startsWith('video/') ? 'STORE' : 'DEFLATE',
    });
  }
  const styles = new StyleRegistry();
  const context: RenderContext = {
    assetPaths,
    labels: collectLabels(projection.content),
    styles,
  };
  const body = projection.content.map((node) => renderNode(node, context)).join('');
  const header = projection.headerFooter.headerText
    ? `<p>${escapeHtml(projection.headerFooter.headerText)}</p>`
    : '';
  const footer = projection.headerFooter.footerText
    ? `<p>${escapeHtml(projection.headerFooter.footerText)}</p>`
    : '';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; media-src 'self'; style-src 'self'; script-src 'none'; object-src 'none'; frame-src 'none'; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(projection.title)}</title><link rel="stylesheet" href="styles.css"></head>
<body><main class="cwiz-notebook"><header><h1>${escapeHtml(projection.title)}</h1>${header}</header>${body}<footer>${footer}<p>Published from Calcwiz Notebook.</p></footer></main></body></html>`;
  const pageSize = projection.pageSetup.paperSize === 'a4' ? 'A4'
    : projection.pageSetup.paperSize === 'letter' ? 'Letter' : 'Legal';
  const margin = projection.pageSetup.marginsPt;
  const pageRule = `@page { size: ${pageSize} ${projection.pageSetup.orientation}; margin: ${margin.top}pt ${margin.right}pt ${margin.bottom}pt ${margin.left}pt; }`;
  zip.file('index.html', html, { compression: 'DEFLATE' });
  zip.file('styles.css', styles.css(pageRule), { compression: 'DEFLATE' });
  return {
    bytes: await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      platform: 'UNIX',
    }),
    fileName: safeFileName(projection.title),
  };
}

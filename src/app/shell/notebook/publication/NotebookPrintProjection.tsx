import { convertLatexToMarkup } from 'mathlive';
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import {
  notebookPageGeometry,
  notebookSemanticTitle,
  paginateNotebookBlocks,
  type NotebookInlineNode,
  type NotebookParagraphFormat,
  type NotebookPublicationProjectionV1,
  type NotebookRichBlockNode,
  type NotebookRichMark,
} from '../../../../lib/notebook';

type PageFragment = {
  fragment: number;
  heightPt: number;
  id: string;
  offsetPt: number;
  page: number;
  scale: number;
};

function mathMarkup(latex: string, inline: boolean) {
  try {
    const markup = convertLatexToMarkup(latex, {
      defaultMode: inline ? 'inline-math' : 'math',
    });
    if (markup && !/ML__error|\\error|blacksquare/u.test(markup)) return markup;
  } catch {
    // The source fallback below is deliberately printable and selectable.
  }
  return null;
}

function PublicationMath({ inline, latex }: { inline: boolean; latex: string }) {
  const markup = useMemo(() => mathMarkup(latex, inline), [inline, latex]);
  const Component = inline ? 'span' : 'div';
  return markup ? (
    <Component
      className={inline ? 'notebook-print-inline-math' : 'notebook-print-display-math'}
      data-raw-latex={latex}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  ) : (
    <Component className="notebook-print-math-fallback" data-raw-latex={latex}>
      {latex}
    </Component>
  );
}

function markStyle(marks: readonly NotebookRichMark[] = []): CSSProperties {
  const decorations = new Set<string>();
  const style: CSSProperties = {};
  marks.forEach((mark) => {
    if (mark.type === 'bold') style.fontWeight = 700;
    if (mark.type === 'italic') style.fontStyle = 'italic';
    if (mark.type === 'strike') decorations.add('line-through');
    if (mark.type === 'underline') decorations.add('underline');
    if (mark.type === 'highlight') style.backgroundColor = mark.color ?? '#fff2a8';
    if (mark.type === 'textStyle') {
      if (mark.color) style.color = mark.color;
      if (mark.fontSize) style.fontSize = `${mark.fontSize}%`;
    }
  });
  if (decorations.size) style.textDecoration = [...decorations].join(' ');
  return style;
}

function InlineContent({ content }: { content?: readonly NotebookInlineNode[] }) {
  return content?.map((inline, index) => inline.type === 'text' ? (
    <span key={`${index}.${inline.text}`} style={markStyle(inline.marks)}>{inline.text}</span>
  ) : (
    <PublicationMath key={inline.id} inline latex={inline.latex} />
  )) ?? null;
}

function PublicationImage({
  alt,
  crop,
  rotation = 0,
  src,
}: {
  alt: string;
  crop?: { height: number; width: number; x: number; y: number };
  rotation?: number;
  src?: string;
}) {
  const [naturalSize, setNaturalSize] = useState<{ height: number; width: number } | null>(null);
  if (!crop) {
    return <img alt={alt} src={src} style={{ transform: `rotate(${rotation}deg)` }} />;
  }
  const viewportStyle: CSSProperties | undefined = naturalSize ? {
    aspectRatio: `${naturalSize.width * crop.width} / ${naturalSize.height * crop.height}`,
  } : undefined;
  return (
    <span className="notebook-print-crop" style={viewportStyle}>
      <img
        alt={alt}
        src={src}
        onLoad={(event) => setNaturalSize({
          height: event.currentTarget.naturalHeight,
          width: event.currentTarget.naturalWidth,
        })}
        style={{
          height: `${100 / crop.height}%`,
          left: `${-(crop.x / crop.width) * 100}%`,
          top: `${-(crop.y / crop.height) * 100}%`,
          transform: `rotate(${rotation}deg)`,
          width: `${100 / crop.width}%`,
        }}
      />
    </span>
  );
}

function paragraphStyle(format?: NotebookParagraphFormat): CSSProperties {
  return {
    lineHeight: format?.lineSpacing ?? 1.15,
    marginBlockStart: `${format?.spaceBeforePt ?? 0}pt`,
    marginBlockEnd: `${format?.spaceAfterPt ?? 6}pt`,
    textAlign: format?.alignment ?? 'left',
  };
}

function collectNumberedLabels(nodes: readonly NotebookRichBlockNode[]) {
  const labels = new Map<string, string>();
  let figures = 0;
  let videos = 0;
  const visit = (children: readonly NotebookRichBlockNode[]) => children.forEach((node) => {
    if (node.type === 'imageFigure' && node.numbered) {
      figures += 1;
      labels.set(node.id, `Figure ${figures}`);
    } else if (node.type === 'videoFigure' && node.numbered) {
      videos += 1;
      labels.set(node.id, `Video ${videos}`);
    }
    if (node.type === 'section' || node.type === 'semanticBlock') visit(node.content);
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      node.content.forEach((item) => visit(item.content));
    }
  });
  visit(nodes);
  return labels;
}

function listStyle(node: Extract<NotebookRichBlockNode, { type: 'bulletList' | 'orderedList' }>) {
  if (node.type === 'orderedList') return node.style ?? 'decimal';
  if (node.style === 'dash') return '"–  "';
  return node.style ?? 'disc';
}

function PublicationNode({
  assetUrls,
  labels,
  node,
}: {
  assetUrls: ReadonlyMap<string, string>;
  labels: ReadonlyMap<string, string>;
  node: NotebookRichBlockNode;
}): ReactNode {
  if (node.type === 'paragraph') {
    return <p style={paragraphStyle(node.format)}><InlineContent content={node.content} /></p>;
  }
  if (node.type === 'heading') {
    const Heading = `h${node.level}` as 'h1' | 'h2' | 'h3';
    return <Heading style={paragraphStyle(node.format)}><InlineContent content={node.content} /></Heading>;
  }
  if (node.type === 'displayMath') {
    return (
      <figure className="notebook-print-equation">
        <PublicationMath inline={false} latex={node.latex} />
        {node.label ? <figcaption>{node.label}</figcaption> : null}
      </figure>
    );
  }
  if (node.type === 'evidenceSnapshot') {
    return (
      <aside className="notebook-print-evidence">
        <strong>{node.title}</strong>
        {node.inputLatex ? <PublicationMath inline={false} latex={node.inputLatex} /> : null}
        {node.resultLatex ? <PublicationMath inline={false} latex={node.resultLatex} /> : null}
        {node.facts.map((fact) => <p key={fact}>{fact}</p>)}
        {node.warnings.map((warning) => <p key={warning}>Warning: {warning}</p>)}
      </aside>
    );
  }
  if (node.type === 'horizontalRule') return <hr />;
  if (node.type === 'pageBreak') return null;
  if (node.type === 'imageFigure') {
    return (
      <figure className={`notebook-print-media is-${node.alignment ?? 'center'} is-${node.placement ?? 'normal'}`} style={{ width: `${node.widthPercent ?? 100}%` }}>
        <PublicationImage
          alt={node.decorative ? '' : node.altText ?? ''}
          crop={node.crop}
          rotation={node.rotation}
          src={assetUrls.get(node.assetId)}
        />
        {node.caption ? <figcaption>{labels.get(node.id)}{labels.has(node.id) ? ': ' : ''}{node.caption}</figcaption> : null}
      </figure>
    );
  }
  if (node.type === 'videoFigure') {
    return (
      <figure className={`notebook-print-media notebook-print-video is-${node.alignment ?? 'center'}`} style={{ width: `${node.widthPercent ?? 100}%` }}>
        {node.posterAssetId ? <img alt="" src={assetUrls.get(node.posterAssetId)} /> : null}
        <strong>{node.title}</strong>
        {node.description ? <p>{node.description}</p> : null}
        {node.caption ? <figcaption>{labels.get(node.id)}{labels.has(node.id) ? ': ' : ''}{node.caption}</figcaption> : null}
        <small>Interactive playback is available in the Web package.</small>
      </figure>
    );
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const List = node.type === 'bulletList' ? 'ul' : 'ol';
    return (
      <List style={{ listStyleType: listStyle(node) }}>
        {node.content.map((item) => (
          <li key={item.id}>{item.content.map((child) => (
            <PublicationNode key={child.id} assetUrls={assetUrls} labels={labels} node={child} />
          ))}</li>
        ))}
      </List>
    );
  }
  if (node.type === 'semanticBlock') {
    const accent = node.accentColor ?? '#6f8e55';
    return (
      <aside className="notebook-print-structured" style={{ '--notebook-print-accent': accent } as CSSProperties}>
        <header>{notebookSemanticTitle(node.variant, node.number, node.label)}</header>
        <div>{node.content.map((child) => (
          <PublicationNode key={child.id} assetUrls={assetUrls} labels={labels} node={child} />
        ))}</div>
      </aside>
    );
  }
  const accent = node.accentColor ?? '#6f8e55';
  return (
    <section className="notebook-print-section" style={{ '--notebook-print-accent': accent } as CSSProperties}>
      <h2>{node.title || 'Untitled section'}</h2>
      {node.content.map((child) => (
        <PublicationNode key={child.id} assetUrls={assetUrls} labels={labels} node={child} />
      ))}
    </section>
  );
}

function printFragments(projection: NotebookPublicationProjectionV1): PageFragment[] {
  if (projection.request.scope.kind !== 'sections') {
    return projection.sourceLayout.fragments.map((fragment) => ({ ...fragment }));
  }
  const geometry = notebookPageGeometry(projection.pageSetup);
  const sourceHeights = new Map<string, number>();
  projection.sourceLayout.fragments.forEach((fragment) => {
    sourceHeights.set(fragment.id, (sourceHeights.get(fragment.id) ?? 0) + fragment.heightPt);
  });
  return paginateNotebookBlocks(projection.content.map((node) => ({
    id: node.id,
    kind: node.type === 'section' ? 'section' : 'prose',
    heightPt: Math.max(24, sourceHeights.get(node.id) ?? 72),
  })), geometry.usableHeight).fragments;
}

function visiblePages(projection: NotebookPublicationProjectionV1, fragments: readonly PageFragment[]) {
  if (projection.request.scope.kind === 'page-range') {
    const { fromPage, toPage } = projection.request.scope;
    return Array.from(
      { length: toPage - fromPage + 1 },
      (_, index) => fromPage + index,
    );
  }
  const lastPage = fragments.reduce((maximum, fragment) => Math.max(maximum, fragment.page), 1);
  return Array.from({ length: lastPage }, (_, index) => index + 1);
}

export function NotebookPrintProjection({
  projection,
}: {
  projection: NotebookPublicationProjectionV1;
}) {
  const assetUrls = useMemo(() => new Map(projection.assets.map((asset) => [
    asset.metadata.id,
    URL.createObjectURL(asset.blob),
  ])), [projection]);
  useEffect(() => () => assetUrls.forEach((url) => URL.revokeObjectURL(url)), [assetUrls]);
  const labels = useMemo(() => collectNumberedLabels(projection.content), [projection.content]);
  const fragments = useMemo(() => printFragments(projection), [projection]);
  const pages = useMemo(() => visiblePages(projection, fragments), [fragments, projection]);
  const nodes = useMemo(() => new Map(projection.content.map((node) => [node.id, node])), [projection.content]);
  const geometry = notebookPageGeometry(projection.pageSetup);
  const isRepaginated = projection.request.scope.kind === 'sections';

  return (
    <div className="notebook-print-preview" data-testid="notebook-print-projection">
      {pages.map((page) => {
        const firstPage = page === 1;
        const blankRunningContent = firstPage && projection.headerFooter.differentFirstPage;
        const pageNumber = projection.headerFooter.pageNumbering.startAt + page - 1;
        const pageFragments = fragments.filter((fragment) => fragment.page === page);
        return (
          <article
            className="notebook-print-page"
            data-page={page}
            key={page}
            style={{
              '--notebook-print-height': `${geometry.height}pt`,
              '--notebook-print-margin-bottom': `${projection.pageSetup.marginsPt.bottom}pt`,
              '--notebook-print-margin-left': `${projection.pageSetup.marginsPt.left}pt`,
              '--notebook-print-margin-right': `${projection.pageSetup.marginsPt.right}pt`,
              '--notebook-print-margin-top': `${projection.pageSetup.marginsPt.top}pt`,
              '--notebook-print-width': `${geometry.width}pt`,
            } as CSSProperties}
          >
            <header>{blankRunningContent ? '' : projection.headerFooter.headerText}</header>
            <div className="notebook-print-page-body">
              {pageFragments.map((fragment) => {
                const node = nodes.get(fragment.id);
                if (!node) return null;
                const priorHeight = fragments
                  .filter((candidate) => candidate.id === fragment.id && candidate.fragment < fragment.fragment)
                  .reduce((sum, candidate) => sum + candidate.heightPt, 0);
                return (
                  <div
                    className="notebook-print-fragment"
                    data-node-id={node.id}
                    key={`${fragment.id}.${fragment.fragment}`}
                    style={{
                      height: `${fragment.heightPt}pt`,
                      top: `${fragment.offsetPt}pt`,
                    }}
                  >
                    {fragment.fragment > 0 && (node.type === 'section' || node.type === 'semanticBlock') ? (
                      <span className="notebook-print-continuation">
                        {node.type === 'section' ? node.title : notebookSemanticTitle(node.variant, node.number, node.label)} · continued
                      </span>
                    ) : null}
                    <div style={{
                      transform: `translateY(-${priorHeight}pt) scale(${fragment.scale})`,
                      transformOrigin: 'top left',
                    }}>
                      <PublicationNode assetUrls={assetUrls} labels={labels} node={node} />
                    </div>
                  </div>
                );
              })}
            </div>
            <footer>
              <span>{blankRunningContent ? '' : projection.headerFooter.footerText}</span>
              {!blankRunningContent && projection.headerFooter.pageNumbering.enabled ? (
                <b className={`is-${projection.headerFooter.pageNumbering.position}`}>
                  {isRepaginated ? projection.headerFooter.pageNumbering.startAt + pages.indexOf(page) : pageNumber}
                </b>
              ) : null}
            </footer>
          </article>
        );
      })}
    </div>
  );
}

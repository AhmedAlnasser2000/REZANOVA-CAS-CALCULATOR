import { useCallback, useEffect, useRef, useState } from 'react';
import type { SymbolicDisplayPrefs } from '../lib/display/symbolic-display';
import { latexToVisibleText } from '../lib/display/math-notation';
import { renderCachedMathStaticMarkup } from '../lib/display/math-static-markup-cache';
import { useMathNotation } from '../lib/display/math-notation-context';
import { useEditorAnalysis } from '../lib/editor/use-editor-analysis';
import {
  hasInternalSymbolicErrorLatex,
  INTERNAL_SYMBOLIC_ERROR_LATEX,
} from '../lib/display/symbolic-output-hygiene';
import {
  getDisplayRenderProfileStart,
  profileDisplayRenderConversion,
  scheduleDisplayRenderVisibleProfile,
} from '../lib/display/scheduling/render-profiling';

type MathStaticProps = {
  latex?: string;
  className?: string;
  block?: boolean;
  emptyLabel?: string;
  displayPrefs?: SymbolicDisplayPrefs;
  deferRender?: boolean;
  normalizeDisplay?: boolean;
};

type MathStaticRender =
  | {
      notationMode: 'latex';
      ariaLabel: string;
      rawLatex: string;
      text: string;
    }
  | {
      notationMode: 'plainText';
      ariaLabel: string;
      rawLatex: string;
      text: string;
    }
  | {
      notationMode: 'rendered';
      ariaLabel: string;
      rawLatex: string;
      markup: string;
    };

let symbolicDisplayImport: Promise<typeof import('../lib/display/symbolic-display')> | null = null;
const symbolicDisplayCache = new Map<string, string>();

function safeMathStaticLatex(latex: string) {
  return hasInternalSymbolicErrorLatex(latex) ? INTERNAL_SYMBOLIC_ERROR_LATEX : latex;
}

function shouldNormalizeSymbolicDisplay(latex: string, displayPrefs: SymbolicDisplayPrefs | undefined) {
  if (!displayPrefs) {
    return false;
  }

  return /\\(?:sqrt|ln|log|le|leq|ge|geq|ne|neq)|\^|[≤≥≠]/u.test(latex);
}

function getSymbolicDisplayCacheKey(latex: string, displayPrefs: SymbolicDisplayPrefs) {
  return [
    latex,
    displayPrefs.symbolicDisplayMode,
    displayPrefs.flattenNestedRootsWhenSafe ? 'flatten' : 'nested',
  ].join('\u0000');
}

function loadSymbolicDisplay() {
  symbolicDisplayImport ??= import('../lib/display/symbolic-display');
  return symbolicDisplayImport;
}

function displayPrefsKey(displayPrefs: SymbolicDisplayPrefs | undefined) {
  if (!displayPrefs) {
    return 'default';
  }

  return [
    displayPrefs.symbolicDisplayMode,
    displayPrefs.flattenNestedRootsWhenSafe ? 'flatten-roots' : 'nested-roots',
  ].join(':');
}

function buildMathStaticRender(
  latex: string,
  notationMode: ReturnType<typeof useMathNotation>['notationMode'],
  displayLatex: string,
  block: boolean,
): MathStaticRender {
  const renderableDisplayLatex = displayLatex.replace(/\\+imaginaryI/gu, 'i');

  if (notationMode === 'latex') {
    return {
      notationMode,
      ariaLabel: renderableDisplayLatex,
      rawLatex: latex,
      text: renderableDisplayLatex,
    };
  }

  if (notationMode === 'plainText') {
    return {
      notationMode,
      ariaLabel: renderableDisplayLatex,
      rawLatex: latex,
      text: latexToVisibleText(renderableDisplayLatex, 'plainText'),
    };
  }

  return {
    notationMode: 'rendered',
    ariaLabel: renderableDisplayLatex,
    rawLatex: latex,
    markup: renderCachedMathStaticMarkup(renderableDisplayLatex, block),
  };
}

function useSymbolicDisplayLatex(latex: string, displayPrefs: SymbolicDisplayPrefs | undefined) {
  const cacheKey =
    latex && displayPrefs && shouldNormalizeSymbolicDisplay(latex, displayPrefs)
      ? getSymbolicDisplayCacheKey(latex, displayPrefs)
      : '';
  const [normalizedDisplay, setNormalizedDisplay] = useState<{
    key: string;
    latex: string;
  } | null>(() => (
    cacheKey && symbolicDisplayCache.has(cacheKey)
      ? { key: cacheKey, latex: symbolicDisplayCache.get(cacheKey) ?? latex }
      : null
  ));
  const cachedDisplay = cacheKey ? symbolicDisplayCache.get(cacheKey) : undefined;

  useEffect(() => {
    if (!cacheKey || !displayPrefs || cachedDisplay) {
      return undefined;
    }

    let active = true;
    loadSymbolicDisplay()
      .then(({ normalizeSymbolicDisplayLatex }) => {
        if (!active) {
          return;
        }

        const normalized = normalizeSymbolicDisplayLatex(latex, displayPrefs) ?? latex;
        symbolicDisplayCache.set(cacheKey, normalized);
        setNormalizedDisplay({ key: cacheKey, latex: normalized });
      })
      .catch(() => {
        active = false;
      });

    return () => {
      active = false;
    };
  }, [cacheKey, cachedDisplay, displayPrefs, latex]);

  return cachedDisplay ?? (normalizedDisplay?.key === cacheKey ? normalizedDisplay.latex : latex);
}

function renderMathStatic(render: MathStaticRender, className: string | undefined, block = true) {
  const Component = block ? 'div' : 'span';

  if (render.notationMode === 'latex') {
    return (
      <Component
        aria-label={render.ariaLabel}
        data-raw-latex={render.rawLatex}
        data-notation-mode="latex"
        className={className}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {render.text}
      </Component>
    );
  }

  if (render.notationMode === 'plainText') {
    return (
      <Component
        aria-label={render.ariaLabel}
        data-raw-latex={render.rawLatex}
        data-notation-mode="plainText"
        className={className}
      >
        {render.text}
      </Component>
    );
  }

  return (
    <Component
      aria-label={render.ariaLabel}
      data-raw-latex={render.rawLatex}
      data-notation-mode="rendered"
      className={className}
      dangerouslySetInnerHTML={{ __html: render.markup }}
    />
  );
}

function MathStaticProfileProbe({
  block,
  className,
  deferred,
  latexLength,
  notationMode,
}: {
  block: boolean;
  className?: string;
  deferred: boolean;
  latexLength: number;
  notationMode: string;
}) {
  const renderStartedAt = useRef(getDisplayRenderProfileStart());

  useEffect(() => scheduleDisplayRenderVisibleProfile(
    {
      block,
      className,
      deferred,
      latexLength,
      notationMode,
    },
    renderStartedAt.current,
  ), [
    block,
    className,
    deferred,
    latexLength,
    notationMode,
  ]);

  return null;
}

function renderMathStaticWithProfile(
  render: MathStaticRender,
  className: string | undefined,
  block: boolean,
  metadata: {
    deferred: boolean;
    latexLength: number;
    notationMode: string;
  },
) {
  return (
    <>
      {renderMathStatic(render, className, block)}
      <MathStaticProfileProbe
        block={block}
        className={className}
        deferred={metadata.deferred}
        latexLength={metadata.latexLength}
        notationMode={metadata.notationMode}
      />
    </>
  );
}

function DeferredMathStatic({
  latex,
  className,
  block,
  emptyLabel,
  displayPrefs,
  normalizeDisplay = true,
}: Required<Pick<MathStaticProps, 'block'>> & Omit<MathStaticProps, 'deferRender' | 'block'>) {
  const notation = useMathNotation();
  const effectiveDisplayPrefs = normalizeDisplay ? displayPrefs ?? notation.displayPrefs : undefined;
  const effectiveDisplayPrefsKey = displayPrefsKey(effectiveDisplayPrefs);
  const analyzeRender = useCallback(
    (currentLatex: string) =>
      currentLatex
        ? profileDisplayRenderConversion(
            {
              block,
              className,
              deferred: true,
              latexLength: currentLatex.length,
              notationMode: notation.notationMode,
            },
            () => buildMathStaticRender(
              currentLatex,
              notation.notationMode,
              currentLatex,
              block,
            ),
          )
        : null,
    [
      block,
      className,
      notation.notationMode,
    ],
  );
  const analysis = useEditorAnalysis<MathStaticRender | null>({
    source: latex ?? '',
    initialValue: null,
    analysisKey: [
      notation.notationMode,
      effectiveDisplayPrefsKey,
      block ? 'block' : 'inline',
    ].join('::'),
    analyze: analyzeRender,
  });

  if (!analysis.value) {
    return emptyLabel ? (
      <div
        className={className}
        data-editor-analysis-status={analysis.status}
        data-editor-analysis-stale={analysis.stale ? 'true' : 'false'}
      >
        {emptyLabel}
      </div>
    ) : null;
  }

  const rendered = renderMathStaticWithProfile(
    analysis.value,
    className,
    block,
    {
      deferred: true,
      latexLength: analysis.value.rawLatex.length,
      notationMode: analysis.value.notationMode,
    },
  );
  return (
    <div
      data-editor-analysis-status={analysis.status}
      data-editor-analysis-stale={analysis.stale ? 'true' : 'false'}
    >
      {rendered}
    </div>
  );
}

function ImmediateMathStatic({
  latex,
  className,
  block,
  emptyLabel,
  displayPrefs,
  normalizeDisplay = true,
}: Required<Pick<MathStaticProps, 'block'>> & Omit<MathStaticProps, 'deferRender' | 'block'>) {
  const notation = useMathNotation();
  const effectiveDisplayPrefs = normalizeDisplay ? displayPrefs ?? notation.displayPrefs : undefined;
  const safeLatex = safeMathStaticLatex(latex ?? '');
  const displayLatex = useSymbolicDisplayLatex(safeLatex, effectiveDisplayPrefs);

  if (!latex) {
    return emptyLabel ? <div className={className}>{emptyLabel}</div> : null;
  }

  const render = profileDisplayRenderConversion(
    {
      block,
      className,
      deferred: false,
      latexLength: displayLatex.length,
      notationMode: notation.notationMode,
    },
    () => buildMathStaticRender(
      safeLatex,
      notation.notationMode,
      displayLatex,
      block,
    ),
  );

  return renderMathStaticWithProfile(
    render,
    className,
    block,
    {
      deferred: false,
      latexLength: displayLatex.length,
      notationMode: notation.notationMode,
    },
  );
}

export function MathStatic({
  latex,
  className,
  block = true,
  emptyLabel,
  displayPrefs,
  deferRender = false,
  normalizeDisplay = true,
}: MathStaticProps) {
  const safeLatex = safeMathStaticLatex(latex ?? '');

  if (deferRender) {
    return (
      <DeferredMathStatic
        latex={safeLatex}
        className={className}
        block={block}
        emptyLabel={emptyLabel}
        displayPrefs={displayPrefs}
        normalizeDisplay={normalizeDisplay}
      />
    );
  }

  return (
    <ImmediateMathStatic
      latex={safeLatex}
      className={className}
      block={block}
      emptyLabel={emptyLabel}
      displayPrefs={displayPrefs}
      normalizeDisplay={normalizeDisplay}
    />
  );
}

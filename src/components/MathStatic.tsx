import { convertLatexToMarkup } from 'mathlive';
import { useCallback, useEffect, useState } from 'react';
import type { SymbolicDisplayPrefs } from '../lib/display/symbolic-display';
import { latexToVisibleText } from '../lib/display/math-notation';
import { useMathNotation } from '../lib/display/math-notation-context';
import { useEditorAnalysis } from '../lib/editor/use-editor-analysis';
import {
  hasInternalSymbolicErrorLatex,
  INTERNAL_SYMBOLIC_ERROR_LATEX,
} from '../lib/display/symbolic-output-hygiene';

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
  if (notationMode === 'latex') {
    return {
      notationMode,
      ariaLabel: displayLatex,
      rawLatex: latex,
      text: displayLatex,
    };
  }

  if (notationMode === 'plainText') {
    return {
      notationMode,
      ariaLabel: displayLatex,
      rawLatex: latex,
      text: latexToVisibleText(displayLatex, 'plainText'),
    };
  }

  return {
    notationMode: 'rendered',
    ariaLabel: displayLatex,
    rawLatex: latex,
    markup: convertLatexToMarkup(displayLatex, {
      defaultMode: block ? 'math' : 'inline-math',
    }),
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
        ? buildMathStaticRender(
            currentLatex,
            notation.notationMode,
            currentLatex,
            block,
          )
        : null,
    [
      block,
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

  const rendered = renderMathStatic(analysis.value, className, block);
  return (
    <div
      data-editor-analysis-status={analysis.status}
      data-editor-analysis-stale={analysis.stale ? 'true' : 'false'}
    >
      {rendered}
    </div>
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
  const notation = useMathNotation();
  const effectiveDisplayPrefs = normalizeDisplay ? displayPrefs ?? notation.displayPrefs : undefined;
  const safeLatex = safeMathStaticLatex(latex ?? '');
  const displayLatex = useSymbolicDisplayLatex(safeLatex, effectiveDisplayPrefs);

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

  if (!latex) {
    return emptyLabel ? <div className={className}>{emptyLabel}</div> : null;
  }

  return renderMathStatic(
    buildMathStaticRender(
      safeLatex,
      notation.notationMode,
      displayLatex,
      block,
    ),
    className,
    block,
  );
}

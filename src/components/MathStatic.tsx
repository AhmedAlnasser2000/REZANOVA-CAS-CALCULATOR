import { convertLatexToMarkup } from 'mathlive';
import { useCallback } from 'react';
import type { SymbolicDisplayPrefs } from '../lib/display/symbolic-display';
import { latexToVisibleText, getDisplayLatex } from '../lib/display/math-notation';
import { useMathNotation } from '../lib/display/math-notation-context';
import { useEditorAnalysis } from '../lib/editor/use-editor-analysis';

type MathStaticProps = {
  latex?: string;
  className?: string;
  block?: boolean;
  emptyLabel?: string;
  displayPrefs?: SymbolicDisplayPrefs;
  deferRender?: boolean;
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
  displayPrefs: SymbolicDisplayPrefs | undefined,
  block: boolean,
): MathStaticRender {
  const displayLatex = getDisplayLatex(latex, displayPrefs);

  if (notationMode === 'latex') {
    return {
      notationMode,
      ariaLabel: latex,
      rawLatex: latex,
      text: latex,
    };
  }

  if (notationMode === 'plainText') {
    return {
      notationMode,
      ariaLabel: displayLatex,
      rawLatex: latex,
      text: latexToVisibleText(latex, 'plainText', displayPrefs),
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

function renderMathStatic(render: MathStaticRender, className: string | undefined) {
  if (render.notationMode === 'latex') {
    return (
      <div
        aria-label={render.ariaLabel}
        data-raw-latex={render.rawLatex}
        data-notation-mode="latex"
        className={className}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {render.text}
      </div>
    );
  }

  if (render.notationMode === 'plainText') {
    return (
      <div
        aria-label={render.ariaLabel}
        data-raw-latex={render.rawLatex}
        data-notation-mode="plainText"
        className={className}
      >
        {render.text}
      </div>
    );
  }

  return (
    <div
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
}: Required<Pick<MathStaticProps, 'block'>> & Omit<MathStaticProps, 'deferRender' | 'block'>) {
  const notation = useMathNotation();
  const effectiveDisplayPrefs = displayPrefs ?? notation.displayPrefs;
  const effectiveDisplayPrefsKey = displayPrefsKey(effectiveDisplayPrefs);
  const analyzeRender = useCallback(
    (currentLatex: string) =>
      currentLatex
        ? buildMathStaticRender(
            currentLatex,
            notation.notationMode,
            effectiveDisplayPrefs,
            block,
          )
        : null,
    [
      block,
      effectiveDisplayPrefs,
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

  const rendered = renderMathStatic(analysis.value, className);
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
}: MathStaticProps) {
  const notation = useMathNotation();

  if (deferRender) {
    return (
      <DeferredMathStatic
        latex={latex}
        className={className}
        block={block}
        emptyLabel={emptyLabel}
        displayPrefs={displayPrefs}
      />
    );
  }

  if (!latex) {
    return emptyLabel ? <div className={className}>{emptyLabel}</div> : null;
  }

  const effectiveDisplayPrefs = displayPrefs ?? notation.displayPrefs;
  return renderMathStatic(
    buildMathStaticRender(
      latex,
      notation.notationMode,
      effectiveDisplayPrefs,
      block,
    ),
    className,
  );
}

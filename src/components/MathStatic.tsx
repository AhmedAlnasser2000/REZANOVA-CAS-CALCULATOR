import { convertLatexToMarkup } from 'mathlive';
import type { SymbolicDisplayPrefs } from '../lib/symbolic-display';
import { latexToVisibleText, getDisplayLatex } from '../lib/math-notation';
import { useMathNotation } from '../lib/math-notation-context';

type MathStaticProps = {
  latex?: string;
  className?: string;
  block?: boolean;
  emptyLabel?: string;
  displayPrefs?: SymbolicDisplayPrefs;
};

export function MathStatic({
  latex,
  className,
  block = true,
  emptyLabel,
  displayPrefs,
}: MathStaticProps) {
  const notation = useMathNotation();

  if (!latex) {
    return emptyLabel ? <div className={className}>{emptyLabel}</div> : null;
  }

  const effectiveDisplayPrefs = displayPrefs ?? notation.displayPrefs;
  const displayLatex = getDisplayLatex(latex, effectiveDisplayPrefs);

  if (notation.notationMode === 'latex') {
    return (
      <div
        aria-label={latex}
        data-raw-latex={latex}
        data-notation-mode="latex"
        className={className}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {latex}
      </div>
    );
  }

  if (notation.notationMode === 'plainText') {
    return (
      <div
        aria-label={displayLatex}
        data-raw-latex={latex}
        data-notation-mode="plainText"
        className={className}
      >
        {latexToVisibleText(latex, 'plainText', effectiveDisplayPrefs)}
      </div>
    );
  }

  const markup = convertLatexToMarkup(displayLatex, {
    defaultMode: block ? 'math' : 'inline-math',
  });

  return (
    <div
      aria-label={displayLatex}
      data-raw-latex={latex}
      data-notation-mode="rendered"
      className={className}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

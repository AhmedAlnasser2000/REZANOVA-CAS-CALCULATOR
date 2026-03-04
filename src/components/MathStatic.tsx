import { convertLatexToMarkup } from 'mathlive';

type MathStaticProps = {
  latex?: string;
  className?: string;
  block?: boolean;
  emptyLabel?: string;
};

export function MathStatic({
  latex,
  className,
  block = true,
  emptyLabel,
}: MathStaticProps) {
  if (!latex) {
    return emptyLabel ? <div className={className}>{emptyLabel}</div> : null;
  }

  const markup = convertLatexToMarkup(latex, {
    defaultMode: block ? 'math' : 'inline-math',
  });

  return (
    <div
      aria-label={latex}
      className={className}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

import type { HTMLAttributes } from 'react';
import { useMathNotation } from '../lib/math-notation-context';
import { formatMathTextForDisplay } from '../lib/math-notation';

type NotationTextProps = HTMLAttributes<HTMLDivElement> & {
  text?: string;
  emptyLabel?: string;
};

export function NotationText({
  text,
  className,
  emptyLabel,
  ...rest
}: NotationTextProps) {
  const { notationMode } = useMathNotation();

  if (!text) {
    return emptyLabel ? <div className={className}>{emptyLabel}</div> : null;
  }

  const visibleText = formatMathTextForDisplay(text, notationMode);

  return (
    <div
      aria-label={text}
      data-raw-text={text}
      data-notation-mode={notationMode}
      className={className}
      {...rest}
    >
      {visibleText}
    </div>
  );
}

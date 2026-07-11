import type { ReactNode } from 'react';
import { MathStatic } from '../../../components/MathStatic';
import { NotationText } from '../../../components/NotationText';
import { resolveDetailLinePresentation } from '../../../lib/display/result-detail-lines';
import type { SymbolicDisplayPrefs } from '../../../lib/display/symbolic-display';
import type {
  DisplayDetailLineKind,
  DisplayDetailLinePart,
} from '../../../types/calculator';

type DetailLineContentProps = {
  line: string;
  lineKind?: DisplayDetailLineKind;
  parts?: readonly DisplayDetailLinePart[];
  symbolicDisplayPrefs: SymbolicDisplayPrefs | undefined;
  allowLegacyInference?: boolean;
  renderMath?: (latex: string) => ReactNode;
};

export function DetailLineContent({
  line,
  lineKind,
  parts,
  symbolicDisplayPrefs,
  allowLegacyInference = true,
  renderMath,
}: DetailLineContentProps) {
  const presentation = resolveDetailLinePresentation({
    line,
    lineKind,
    parts,
    allowLegacyInference,
  });

  if (presentation.kind === 'math') {
    return renderMath?.(line) ?? (
      <MathStatic latex={line} displayPrefs={symbolicDisplayPrefs} normalizeDisplay={false} />
    );
  }

  if (presentation.kind !== 'parts' || presentation.parts.length === 0) {
    return <NotationText className="result-detail-line-content" text={line} />;
  }

  return (
    <span className="result-detail-line-content result-detail-line-mixed">
      {presentation.parts.map((part, partIndex) => (
        part.kind === 'math'
          ? (
            <MathStatic
              key={`${part.latex}-${partIndex}`}
              className="result-math result-math-inline"
              latex={part.latex}
              block={false}
              displayPrefs={symbolicDisplayPrefs}
            />
          )
          : <span key={`${part.text}-${partIndex}`}>{part.text}</span>
      ))}
    </span>
  );
}

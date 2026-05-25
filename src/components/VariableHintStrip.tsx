import { buildVariableHints, type VariableHintContext } from '../lib/algebra/variable-hints';

type VariableHintStripProps = VariableHintContext & {
  latex: string;
  compact?: boolean;
};

export function VariableHintStrip({
  latex,
  compact = false,
  ...context
}: VariableHintStripProps) {
  const hints = buildVariableHints(latex, context);

  if (hints.length === 0) {
    return null;
  }

  return (
    <div
      className={`variable-hint-strip ${compact ? 'variable-hint-strip--compact' : ''}`}
      data-testid="variable-hint-strip"
      aria-label="Variable hints"
    >
      {hints.map((hint) => (
        <span
          key={`${hint.kind}-${hint.label}`}
          className={`variable-hint variable-hint--${hint.kind}`}
          title={hint.detail}
          aria-label={hint.detail}
        >
          <span className="variable-hint-label">{hint.label}</span>
          <span className="variable-hint-kind">{hintKindLabel(hint.kind)}</span>
        </span>
      ))}
    </div>
  );
}

function hintKindLabel(kind: string) {
  switch (kind) {
    case 'stored-value':
      return 'stored';
    case 'stored-ignored':
      return 'stored ignored';
    case 'solve-target':
      return 'target';
    case 'symbolic-parameter':
      return 'parameter';
    case 'active-variable':
      return 'active';
    case 'bound-variable':
      return 'bound';
    case 'reserved-function':
      return 'function';
    case 'reserved-constant':
      return 'constant';
    case 'ambiguous-adjacent':
      return 'ambiguous';
    case 'unsupported-name':
      return 'unsupported';
    default:
      return 'hint';
  }
}

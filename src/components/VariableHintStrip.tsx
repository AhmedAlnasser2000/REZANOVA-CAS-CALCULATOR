import { useCallback } from 'react';
import { buildVariableHints, type VariableHintContext } from '../lib/algebra/variable-hints';
import { useEditorAnalysis } from '../lib/editor/use-editor-analysis';

type VariableHintStripProps = VariableHintContext & {
  latex: string;
  compact?: boolean;
};

function variableHintAnalysisKey(context: VariableHintContext) {
  const storedKey = context.storedVariables
    ?.map((entry) => `${entry.name}=${entry.valueLatex}`)
    .join('|') ?? '';
  return [
    context.mode,
    context.screenHint ?? '',
    context.solveTarget ?? '',
    context.activeVariable ?? '',
    context.boundVariables?.join(',') ?? '',
    storedKey,
  ].join('::');
}

export function VariableHintStrip({
  latex,
  compact = false,
  ...context
}: VariableHintStripProps) {
  const {
    mode,
    screenHint,
    solveTarget,
    activeVariable,
    boundVariables,
    storedVariables,
  } = context;
  const boundVariablesKey = boundVariables?.join(',') ?? '';
  const analysisKey = variableHintAnalysisKey(context);
  const analyzeHints = useCallback(
    (currentLatex: string) =>
      buildVariableHints(currentLatex, {
        mode,
        screenHint,
        solveTarget,
        activeVariable,
        boundVariables: boundVariablesKey ? boundVariablesKey.split(',') : undefined,
        storedVariables,
      }),
    [
      activeVariable,
      boundVariablesKey,
      mode,
      screenHint,
      solveTarget,
      storedVariables,
    ],
  );
  const hintAnalysis = useEditorAnalysis({
    source: latex,
    initialValue: [],
    analysisKey,
    analyze: analyzeHints,
  });
  const hints = hintAnalysis.value;

  if (hints.length === 0) {
    return null;
  }

  return (
    <div
      className={`variable-hint-strip ${compact ? 'variable-hint-strip--compact' : ''}`}
      data-testid="variable-hint-strip"
      data-editor-analysis-status={hintAnalysis.status}
      data-editor-analysis-stale={hintAnalysis.stale ? 'true' : 'false'}
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

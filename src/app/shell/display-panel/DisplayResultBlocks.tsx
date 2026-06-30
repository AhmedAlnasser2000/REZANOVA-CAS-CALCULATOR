import { Fragment, useState, type ReactNode } from 'react';
import { MathStatic } from '../../../components/MathStatic';
import { NotationText } from '../../../components/NotationText';
import {
  displayBlockCountSummary,
  type DisplayBlock,
  type DisplayBlockLine,
} from '../../../lib/display/result/display-blocks';
import { inferDetailLinePartsFromText } from '../../../lib/display/result-detail-lines';
import {
  classifyCaseMathResultSize,
  classifyLatexCollectionResultSize,
  classifyLatexResultSize,
  RESULT_BRANCH_VISIBLE_LIMIT,
  type ResultSizePolicy,
} from '../../../lib/display/scheduling/result-size-policy';
import {
  caseMathRowRenderCost,
  shouldPauseCaseMathRowRender,
  shouldLazyMountDisplayBlock,
  shouldProgressivelyRenderCaseMath,
} from '../../../lib/display/scheduling/display-render-scheduler';
import type { SymbolicDisplayPrefs } from '../../../lib/display/symbolic-display';
import type { DisplayDetailLinePart } from '../../../types/calculator';
import {
  CaseMathCompactPreview,
  CaseMathRowPlaceholder,
} from './CaseMathRenderControls';
import { useProgressiveCaseRowCount } from './useProgressiveCaseRowCount';

function LargeResultPreview({
  label,
  onShowFull,
  policy,
}: {
  label: string;
  onShowFull: () => void;
  policy: Extract<ResultSizePolicy, { kind: 'compact' }>;
}) {
  return (
    <div className="result-large-preview" data-testid={`${label}-compact-preview`}>
      <NotationText
        className="result-large-preview-note"
        text={`Large ${label.replace('display-outcome-', '').replaceAll('-', ' ')} paused for responsiveness.`}
      />
      <NotationText
        className="result-large-preview-meta"
        text={`${policy.latexLength.toLocaleString()} characters${policy.lineCount > 1 ? ` across ${policy.lineCount} lines` : ''}.`}
      />
      <code className="result-large-preview-snippet">{policy.previewText}</code>
      <button
        type="button"
        className="prompt-action result-large-preview-action"
        onClick={onShowFull}
      >
        Show full result
      </button>
    </div>
  );
}

function ResultLatexBlock({
  className,
  deferRender = false,
  displayPrefs,
  emptyLabel,
  label,
  latex,
  normalizeDisplay = true,
}: {
  className: string;
  deferRender?: boolean;
  displayPrefs?: SymbolicDisplayPrefs;
  emptyLabel?: string;
  label: string;
  latex: string;
  normalizeDisplay?: boolean;
}) {
  const policy = classifyLatexResultSize(latex);
  const [expandedSignature, setExpandedSignature] = useState<string | null>(null);
  const showFull = expandedSignature === policy.signature;

  if (policy.kind === 'compact' && !showFull) {
    return (
      <LargeResultPreview
        label={label}
        policy={policy}
        onShowFull={() => setExpandedSignature(policy.signature)}
      />
    );
  }

  return (
    <MathStatic
      className={className}
      latex={latex}
      displayPrefs={displayPrefs}
      deferRender={deferRender}
      normalizeDisplay={normalizeDisplay}
      emptyLabel={emptyLabel}
    />
  );
}

function ResultLatexListBlock({
  className,
  displayPrefs,
  lines,
  normalizeDisplay = false,
  testIdPrefix,
}: {
  className: string;
  displayPrefs?: SymbolicDisplayPrefs;
  lines: readonly string[];
  normalizeDisplay?: boolean;
  testIdPrefix: string;
}) {
  const policy = classifyLatexCollectionResultSize(lines);
  const [expandedSignature, setExpandedSignature] = useState<string | null>(null);
  const showFull = expandedSignature === policy.signature;

  if (policy.kind === 'compact' && !showFull) {
    return (
      <LargeResultPreview
        label={testIdPrefix}
        policy={policy}
        onShowFull={() => setExpandedSignature(policy.signature)}
      />
    );
  }

  return (
    <>
      {lines.map((line: string, index: number) => (
        <div key={`${line}-${index}`} data-testid={`${testIdPrefix}-${index}`}>
          <ResultLatexBlock
            className={className}
            displayPrefs={displayPrefs}
            latex={line}
            normalizeDisplay={normalizeDisplay}
            label={`${testIdPrefix}-${index}`}
            emptyLabel="Rendering full fact..."
          />
        </div>
      ))}
    </>
  );
}

function ResultBranchListBlock({
  className,
  displayPrefs,
  lines,
  testIdPrefix,
}: {
  className: string;
  displayPrefs?: SymbolicDisplayPrefs;
  lines: readonly DisplayBlockLine[];
  testIdPrefix: string;
}) {
  const [showAllBranches, setShowAllBranches] = useState(false);
  const visibleLines = showAllBranches
    ? lines
    : lines.slice(0, RESULT_BRANCH_VISIBLE_LIMIT);
  const hiddenCount = Math.max(0, lines.length - visibleLines.length);

  return (
    <div className="result-branch-list" data-testid={`${testIdPrefix}-branch-list`}>
      {visibleLines.map((line, index) => {
        const rowLatex = line.latex
          ?? [line.branchPrefixLatex, line.branchLatex].filter(Boolean).join('');
        return (
          <div
            key={`${line.id}-${index}`}
            aria-label={rowLatex}
            className="result-branch-row"
            data-raw-latex={rowLatex}
            data-testid={`${testIdPrefix}-branch-${index}`}
            role="group"
          >
            {line.branchPrefixLatex && line.branchLatex ? (
              <>
                <MathStatic
                  className={`${className} result-branch-prefix`}
                  latex={line.branchPrefixLatex}
                  block={false}
                  displayPrefs={displayPrefs}
                  normalizeDisplay={false}
                />
                <ResultLatexBlock
                  className={`${className} result-branch-value`}
                  displayPrefs={displayPrefs}
                  latex={line.branchLatex}
                  normalizeDisplay
                  label={`${testIdPrefix}-branch-${index}`}
                  emptyLabel="Rendering branch..."
                />
              </>
            ) : (
              <ResultLatexBlock
                className={`${className} result-branch-value`}
                displayPrefs={displayPrefs}
                latex={rowLatex}
                normalizeDisplay
                label={`${testIdPrefix}-branch-${index}`}
                emptyLabel="Rendering branch..."
              />
            )}
          </div>
        );
      })}
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="prompt-action result-branch-tail-action"
          onClick={() => setShowAllBranches(true)}
        >
          Show remaining branches
        </button>
      ) : null}
    </div>
  );
}

function ResultCaseMathBlock({
  displayPrefs,
  lines,
  onOpenFormulaViewer,
  originalBlock,
  prefixLatex,
  testIdPrefix,
}: {
  displayPrefs?: SymbolicDisplayPrefs;
  lines: readonly DisplayBlockLine[];
  onOpenFormulaViewer?: (block: DisplayBlock) => void;
  originalBlock: DisplayBlock;
  prefixLatex: string;
  testIdPrefix: string;
}) {
  const policy = classifyCaseMathResultSize(lines);
  const [expandedSignature, setExpandedSignature] = useState<string | null>(null);
  const [expandedRowState, setExpandedRowState] = useState<{
    signature: string;
    keys: ReadonlySet<string>;
  }>(() => ({
    keys: new Set(),
    signature: policy.signature,
  }));
  const expandedRowKeys = expandedRowState.signature === policy.signature
    ? expandedRowState.keys
    : new Set<string>();
  const hasPrefixLatex = prefixLatex.trim().length > 0;
  const showFull = expandedSignature === policy.signature;
  const progressiveRows = showFull && shouldProgressivelyRenderCaseMath(policy);
  const visibleRowCount = useProgressiveCaseRowCount({
    enabled: progressiveRows,
    signature: policy.signature,
    totalRows: lines.length,
  });
  const visibleLines = progressiveRows ? lines.slice(0, visibleRowCount) : lines;
  const pendingRowCount = progressiveRows ? Math.max(0, lines.length - visibleRowCount) : 0;

  if (policy.kind === 'compact' && !showFull) {
    return (
      <CaseMathCompactPreview
        label={testIdPrefix}
        policy={policy}
        onOpenViewer={onOpenFormulaViewer
          ? () => onOpenFormulaViewer(originalBlock)
          : undefined}
        onShowFull={() => setExpandedSignature(policy.signature)}
      />
    );
  }

  return (
    <div className="result-case-math" data-testid={`${testIdPrefix}-case-list`}>
      {progressiveRows && pendingRowCount > 0 ? (
        <div
          className="result-case-render-progress"
          data-testid={`${testIdPrefix}-case-render-progress`}
        >
          <NotationText
            className="result-large-preview-meta"
            text={`Rendering formula cases ${visibleRowCount.toLocaleString()}/${lines.length.toLocaleString()}`}
          />
        </div>
      ) : null}
      {visibleLines.map((line, index) => {
        const previousGroup = index > 0 ? lines[index - 1]?.groupLatex : undefined;
        const showGroup = Boolean(line.groupLatex && line.groupLatex !== previousGroup);
        const rowKey = `${policy.signature}:${line.id}:${index}`;
        const rowRenderCost = caseMathRowRenderCost(line);
        const rowPaused =
          shouldPauseCaseMathRowRender(line, progressiveRows)
          && !expandedRowKeys.has(rowKey);
        return (
          <Fragment key={`${line.id}-${index}`}>
            {showGroup && !rowPaused ? (
              <div
                className="result-case-group-row"
                data-testid={`${testIdPrefix}-case-group-${index}`}
              >
                <ResultLatexBlock
                  className="result-math result-case-group"
                  displayPrefs={displayPrefs}
                  deferRender={progressiveRows}
                  latex={line.groupLatex ?? ''}
                  normalizeDisplay={false}
                  label={`${testIdPrefix}-case-group-${index}`}
                  emptyLabel="Rendering case group..."
                />
              </div>
            ) : null}
            {showGroup && rowPaused ? (
              <div
                className="result-case-group-row result-case-group-row-paused"
                data-testid={`${testIdPrefix}-case-group-${index}`}
              >
                <NotationText
                  className="result-large-preview-meta"
                  text="Generated formula branch preserved; branch math renders when this row is shown."
                />
              </div>
            ) : null}
            {rowPaused ? (
              <CaseMathRowPlaceholder
                renderCost={rowRenderCost}
                testId={`${testIdPrefix}-case-${index}-paused`}
                onShowRow={() => {
                  setExpandedRowState((previous) => {
                    const previousKeys = previous.signature === policy.signature
                      ? previous.keys
                      : new Set<string>();
                    const next = new Set(previousKeys);
                    next.add(rowKey);
                    return {
                      keys: next,
                      signature: policy.signature,
                    };
                  });
                }}
              />
            ) : (
              <div
                className="result-case-row"
                data-testid={line.testId ?? `${testIdPrefix}-case-${index}`}
              >
                {index === 0 && hasPrefixLatex ? (
                  <MathStatic
                    className="result-math result-case-prefix"
                    latex={prefixLatex}
                    block={false}
                    displayPrefs={displayPrefs}
                    normalizeDisplay={false}
                  />
                ) : (
                  <span className="result-case-prefix result-case-prefix-spacer" aria-hidden="true" />
                )}
                <ResultLatexBlock
                  className="result-math result-case-value"
                  displayPrefs={displayPrefs}
                  deferRender={progressiveRows}
                  latex={line.latex ?? ''}
                  normalizeDisplay
                  label={`${testIdPrefix}-case-${index}-value`}
                  emptyLabel="Rendering case..."
                />
                <div
                  className="result-case-condition-wrap"
                  data-testid={`${testIdPrefix}-case-${index}-condition-wrap`}
                >
                  <NotationText className="result-case-when" text="when" />
                  <ResultLatexBlock
                    className="result-math result-case-condition"
                    displayPrefs={displayPrefs}
                    deferRender={progressiveRows}
                    latex={line.conditionLatex ?? line.label ?? ''}
                    normalizeDisplay={false}
                    label={`${testIdPrefix}-case-${index}-condition`}
                    emptyLabel="Rendering case condition..."
                  />
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
      {pendingRowCount > 0 ? (
        <div className="result-case-pending-row" data-testid={`${testIdPrefix}-case-pending`}>
          <NotationText
            className="result-large-preview-meta"
            text={`${pendingRowCount.toLocaleString()} formula case row${pendingRowCount === 1 ? '' : 's'} pending`}
          />
        </div>
      ) : null}
    </div>
  );
}

function latexLinesFromBlock(block: DisplayBlock) {
  if (block.latex) {
    return [block.latex];
  }
  return block.lines?.map((line) => line.latex ?? '').filter((line) => line.length > 0) ?? [];
}

function renderTextBlock(block: DisplayBlock) {
  const lines = block.lines?.map((line) => line.text ?? line.label ?? line.latex ?? '')
    .filter((line) => line.length > 0);
  const textLines = lines?.length ? lines : block.text ? [block.text] : [];

  return (
    <div className="result-detail-lines">
      {textLines.map((line, index) => (
        <NotationText
          key={`${block.id}-${line}-${index}`}
          className={block.kind === 'errorText'
            ? 'result-error'
            : block.kind === 'warning'
              ? 'result-warning'
              : 'result-detail-line result-summary-text'}
          data-testid={block.kind === 'errorText' || block.kind === 'warning'
            ? index === 0 ? block.testId : undefined
            : undefined}
          text={line}
        />
      ))}
    </div>
  );
}

function renderMixedBlockLine(
  block: DisplayBlock,
  line: DisplayBlockLine,
  index: number,
  symbolicDisplayPrefs: SymbolicDisplayPrefs | undefined,
) {
  if (block.kind === 'periodicFamily' && (line.label || line.latex || line.approxText)) {
    return (
      <div key={`${line.id}-${index}`} className="result-detail-line">
        {line.label ? <NotationText className="result-approx" text={line.label} /> : null}
        {line.latex ? (
          <ResultLatexBlock
            className="result-math result-math-supplement"
            displayPrefs={symbolicDisplayPrefs}
            latex={line.latex}
            label={`${block.testId ?? block.id}-${index}`}
            normalizeDisplay={false}
          />
        ) : null}
        {line.approxText ? (
          <NotationText
            className="result-detail-line result-summary-text"
            text={line.approxText}
          />
        ) : null}
      </div>
    );
  }

  if (line.parts?.length) {
    return (
      <div
        key={`${line.id}-${index}`}
        className="result-detail-line result-summary-text"
        data-testid={line.testId}
      >
        <DetailLineContent
          line={line.text ?? ''}
          parts={line.parts}
          symbolicDisplayPrefs={symbolicDisplayPrefs}
        />
      </div>
    );
  }

  if (line.lineKind === 'math' || line.latex) {
    return (
      <div
        key={`${line.id}-${index}`}
        className="result-detail-line result-summary-text"
        data-testid={line.testId}
      >
        <ResultLatexBlock
          className="result-math result-math-supplement"
          displayPrefs={symbolicDisplayPrefs}
          latex={line.latex ?? line.text ?? ''}
          label={line.testId ?? `${block.id}-${index}`}
          normalizeDisplay={false}
        />
      </div>
    );
  }

  return (
    <div
      key={`${line.id}-${index}`}
      className="result-detail-line result-summary-text"
      data-testid={line.testId}
    >
      <DetailLineContent
        line={line.text ?? ''}
        symbolicDisplayPrefs={symbolicDisplayPrefs}
      />
    </div>
  );
}

function renderDisplayBlockContent(
  block: DisplayBlock,
  symbolicDisplayPrefs: SymbolicDisplayPrefs | undefined,
  onOpenFormulaViewer?: (block: DisplayBlock) => void,
) {
  if (block.renderKind === 'branchList') {
    return (
      <ResultBranchListBlock
        className="result-math"
        displayPrefs={symbolicDisplayPrefs}
        lines={block.lines ?? []}
        testIdPrefix={block.testId ?? block.id}
      />
    );
  }

  if (block.renderKind === 'caseMath') {
    return (
      <ResultCaseMathBlock
        displayPrefs={symbolicDisplayPrefs}
        lines={block.lines ?? []}
        onOpenFormulaViewer={onOpenFormulaViewer}
        originalBlock={block}
        prefixLatex={block.text ?? ''}
        testIdPrefix={block.testId ?? block.id}
      />
    );
  }

  if (block.renderKind === 'math') {
    return (
      <ResultLatexBlock
        className={block.kind === 'answer' ? 'result-math' : 'result-math result-math-supplement'}
        displayPrefs={symbolicDisplayPrefs}
        latex={block.latex ?? block.rawContent[0] ?? ''}
        label={block.testId ?? block.id}
        normalizeDisplay={block.kind === 'answer'}
      />
    );
  }

  if (block.renderKind === 'mathList') {
    return (
      <div className="result-detail-lines">
        <ResultLatexListBlock
          className="result-math result-math-supplement"
          displayPrefs={symbolicDisplayPrefs}
          lines={latexLinesFromBlock(block)}
          normalizeDisplay={false}
          testIdPrefix={block.kind === 'validWhen' ? 'display-outcome-supplement' : `${block.testId ?? block.id}-line`}
        />
      </div>
    );
  }

  if (block.renderKind === 'mixed') {
    return (
      <div className="result-detail-lines">
        {block.lines?.map((line, index) => renderMixedBlockLine(
          block,
          line,
          index,
          symbolicDisplayPrefs,
        ))}
      </div>
    );
  }

  return renderTextBlock(block);
}

function RenderDisplayBlock({
  block,
  onOpenFormulaViewer,
  symbolicDisplayPrefs,
}: {
  block: DisplayBlock;
  onOpenFormulaViewer?: (block: DisplayBlock) => void;
  symbolicDisplayPrefs: SymbolicDisplayPrefs | undefined;
}) {
  if (block.kind === 'warning') {
    return renderTextBlock(block);
  }

  return (
    <ResultSummaryBlock
      className={block.className ?? ''}
      collapsible={block.collapsible}
      defaultCollapsed={block.defaultCollapsed}
      label={block.label}
      lazyMountCollapsed={shouldLazyMountDisplayBlock(block)}
      testId={block.kind === 'errorText' ? undefined : block.testId}
    >
      {renderDisplayBlockContent(block, symbolicDisplayPrefs, onOpenFormulaViewer)}
    </ResultSummaryBlock>
  );
}

function RenderDisplayBlockPlaceholder({ block }: { block: DisplayBlock }) {
  return (
    <ResultSummaryBlock
      className={block.className ?? ''}
      collapsible={block.collapsible}
      defaultCollapsed={block.defaultCollapsed}
      label={block.label}
      lazyMountCollapsed={shouldLazyMountDisplayBlock(block)}
      testId={block.kind === 'errorText' ? undefined : block.testId}
    >
      <NotationText className="result-detail-line result-summary-text" text="Rendering..." />
    </ResultSummaryBlock>
  );
}

function ResultSummaryBlock({
  children,
  className = '',
  collapsible = false,
  defaultCollapsed = false,
  label,
  lazyMountCollapsed = false,
  summaryText,
  testId,
}: {
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  label: string;
  lazyMountCollapsed?: boolean;
  summaryText?: string;
  testId?: string;
}) {
  const openedStateKey = `${testId ?? label}:${defaultCollapsed ? 'collapsed' : 'expanded'}`;
  const [openedState, setOpenedState] = useState(() => ({
    key: openedStateKey,
    hasOpened: !defaultCollapsed,
  }));
  const hasOpened = openedState.key === openedStateKey
    ? openedState.hasOpened
    : !defaultCollapsed;
  const shouldRenderChildren = !lazyMountCollapsed || !defaultCollapsed || hasOpened;
  const markOpened = () => setOpenedState({
    key: openedStateKey,
    hasOpened: true,
  });

  if (!collapsible) {
    return (
      <div className={`result-summary-block ${className}`.trim()} data-testid={testId}>
        <div className="result-summary-heading">
          <div className="result-summary-label">{label}</div>
          {summaryText ? (
            <div className="result-summary-count">{summaryText}</div>
          ) : null}
        </div>
        {children}
      </div>
    );
  }

  return (
    <details
      className={`result-summary-block result-collapsible-block ${className}`.trim()}
      data-testid={testId}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          markOpened();
        }
      }}
      open={defaultCollapsed ? undefined : true}
    >
      <summary
        className="result-collapsible-summary"
        onClick={() => {
          if (lazyMountCollapsed && defaultCollapsed) {
            markOpened();
          }
        }}
      >
        <span className="result-summary-heading">
          <span className="result-summary-label">{label}</span>
          {summaryText ? (
            <span className="result-summary-count">{summaryText}</span>
          ) : null}
        </span>
        <span className="result-collapsible-state" aria-hidden="true" />
      </summary>
      {shouldRenderChildren ? (
        <div className="result-collapsible-body">
          {children}
        </div>
      ) : null}
    </details>
  );
}

function answerBlockClassName(block: DisplayBlock) {
  return block.renderKind === 'caseMath'
    ? 'result-answer-block result-case-answer-block'
    : 'result-answer-block';
}

function renderScheduledBlock(
  block: DisplayBlock,
  onOpenFormulaViewer: ((block: DisplayBlock) => void) | undefined,
  visibleDisplayBlockIds: Set<string>,
  symbolicDisplayPrefs: SymbolicDisplayPrefs | undefined,
) {
  const isVisible = visibleDisplayBlockIds.has(block.id);
  const scheduledBlock = block.kind === 'answer'
    ? {
      ...block,
      className: answerBlockClassName(block),
      testId: 'display-outcome-exact',
    }
    : block.kind === 'validWhen'
      ? {
        ...block,
        className: 'result-validity-block',
      }
      : block;

  if (!isVisible) {
    return <RenderDisplayBlockPlaceholder key={block.id} block={scheduledBlock} />;
  }

  if (block.kind === 'answer') {
    return (
      <ResultSummaryBlock
        key={block.id}
        className={answerBlockClassName(block)}
        collapsible={block.collapsible}
        defaultCollapsed={block.defaultCollapsed}
        label={block.label}
        summaryText={displayBlockCountSummary(block)?.text}
        testId="display-outcome-answer-block"
      >
        <div data-testid="display-outcome-exact">
          {renderDisplayBlockContent({
            ...block,
            testId: 'display-outcome-exact',
          }, symbolicDisplayPrefs, onOpenFormulaViewer)}
        </div>
      </ResultSummaryBlock>
    );
  }

  return (
    <RenderDisplayBlock
      key={block.id}
      block={scheduledBlock}
      onOpenFormulaViewer={onOpenFormulaViewer}
      symbolicDisplayPrefs={symbolicDisplayPrefs}
    />
  );
}

export function DetailLineContent({
  line,
  parts,
  symbolicDisplayPrefs,
}: {
  line: string;
  parts?: readonly DisplayDetailLinePart[];
  symbolicDisplayPrefs: SymbolicDisplayPrefs | undefined;
}) {
  const resolvedParts = parts ?? inferDetailLinePartsFromText(line);

  if (!resolvedParts?.length) {
    return <NotationText className="result-detail-line-content" text={line} />;
  }

  return (
    <span className="result-detail-line-content result-detail-line-mixed">
      {resolvedParts.map((part, partIndex) => (
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
          : (
            <span key={`${part.text}-${partIndex}`}>{part.text}</span>
          )
      ))}
    </span>
  );
}

export function ScheduledOutcomeBlocks({
  onOpenFormulaViewer,
  scheduledDisplayBlocks,
  symbolicDisplayPrefs,
  visibleDisplayBlockIds,
}: {
  onOpenFormulaViewer?: (block: DisplayBlock) => void;
  scheduledDisplayBlocks: readonly DisplayBlock[];
  symbolicDisplayPrefs: SymbolicDisplayPrefs | undefined;
  visibleDisplayBlockIds: Set<string>;
}) {
  const primaryBlocks = scheduledDisplayBlocks.filter((block) => (
    block.kind !== 'periodicFamily' && block.kind !== 'detail'
  ));
  const periodicBlocks = scheduledDisplayBlocks.filter((block) => block.kind === 'periodicFamily');
  const detailBlocks = scheduledDisplayBlocks.filter((block) => block.kind === 'detail');

  return (
    <>
      {primaryBlocks.length ? (
        <div className="result-readback" data-testid="display-outcome-readback">
          {primaryBlocks.map((block) => renderScheduledBlock(
            block,
            onOpenFormulaViewer,
            visibleDisplayBlockIds,
            symbolicDisplayPrefs,
          ))}
        </div>
      ) : null}
      {periodicBlocks.length ? (
        <div className="result-detail-sections" data-testid="display-outcome-periodic-family">
          {periodicBlocks.map((block) => renderScheduledBlock(
            block,
            onOpenFormulaViewer,
            visibleDisplayBlockIds,
            symbolicDisplayPrefs,
          ))}
        </div>
      ) : null}
      {detailBlocks.length ? (
        <div className="result-detail-sections" data-testid="display-outcome-detail-sections">
          {detailBlocks.map((block) => renderScheduledBlock(
            block,
            onOpenFormulaViewer,
            visibleDisplayBlockIds,
            symbolicDisplayPrefs,
          ))}
        </div>
      ) : null}
    </>
  );
}

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { SignedNumberDraftInput } from '../../../components/SignedNumberDraftInput';
import type {
  BinomialState,
  NormalState,
  PoissonState,
  StatisticsProbabilityEvent,
  StatisticsProbabilityEventState,
  StatisticsScreen,
} from '../../../types/calculator';

type ProbabilityScreen = 'binomial' | 'normal' | 'poisson';

type StatisticsProbabilityPanelProps = {
  screen: ProbabilityScreen;
  onOpenScreen: (screen: StatisticsScreen) => void;
  binomialState: BinomialState;
  setBinomialState: Dispatch<SetStateAction<BinomialState>>;
  normalState: NormalState;
  setNormalState: Dispatch<SetStateAction<NormalState>>;
  poissonState: PoissonState;
  setPoissonState: Dispatch<SetStateAction<PoissonState>>;
  binomialNRef: RefObject<HTMLInputElement | null>;
  normalMeanRef: RefObject<HTMLInputElement | null>;
  poissonLambdaRef: RefObject<HTMLInputElement | null>;
  onEditExpression: () => void;
  onCopyExpression: () => void;
  expression: string;
};

const BASE_EVENTS: Array<{ value: StatisticsProbabilityEvent; label: string }> = [
  { value: 'exactly', label: 'Exactly' },
  { value: 'lessThan', label: 'Less than (<)' },
  { value: 'atMost', label: 'At most (\u2264)' },
  { value: 'moreThan', label: 'More than (>)' },
  { value: 'atLeast', label: 'At least (\u2265)' },
  { value: 'between', label: 'Between' },
];

function eventOptions(screen: ProbabilityScreen) {
  return screen === 'normal'
    ? [BASE_EVENTS[0], { value: 'density' as const, label: 'Density at x' }, ...BASE_EVENTS.slice(1)]
    : BASE_EVENTS;
}

export function StatisticsProbabilityPanel({
  screen,
  onOpenScreen,
  binomialState,
  setBinomialState,
  normalState,
  setNormalState,
  poissonState,
  setPoissonState,
  binomialNRef,
  normalMeanRef,
  poissonLambdaRef,
  onEditExpression,
  onCopyExpression,
  expression,
}: StatisticsProbabilityPanelProps) {
  const eventState = screen === 'binomial'
    ? binomialState
    : screen === 'normal'
      ? normalState
      : poissonState;

  function updateEventState(patch: Partial<StatisticsProbabilityEventState>) {
    if (screen === 'binomial') {
      setBinomialState((current) => ({ ...current, ...patch }));
    } else if (screen === 'normal') {
      setNormalState((current) => ({ ...current, ...patch }));
    } else {
      setPoissonState((current) => ({ ...current, ...patch }));
    }
  }

  return (
    <div className="statistics-probability-layout">
      <div className="editor-card statistics-probability-form">
        <div className="card-title-row">
          <strong>Probability request</strong>
          <span className="equation-badge">{screen === 'binomial' ? 'Discrete' : screen === 'normal' ? 'Continuous' : 'Discrete'}</span>
        </div>
        <div className="statistics-select-grid">
          <label>
            <span>Distribution</span>
            <select
              aria-label="Probability distribution"
              value={screen}
              onChange={(event) => onOpenScreen(event.target.value as ProbabilityScreen)}
            >
              <option value="binomial">Binomial</option>
              <option value="normal">Normal</option>
              <option value="poisson">Poisson</option>
            </select>
          </label>
          <label>
            <span>Event</span>
            <select
              aria-label="Probability event"
              value={eventState.event}
              onChange={(event) => updateEventState({ event: event.target.value as StatisticsProbabilityEvent })}
            >
              {eventOptions(screen).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {screen === 'binomial' ? (
          <div className="statistics-input-grid">
            <label>
              <span>Trials (n)</span>
              <SignedNumberDraftInput ref={binomialNRef} value={binomialState.n} onValueChange={(n) => setBinomialState((current) => ({ ...current, n }))} className="statistics-cell-input" />
            </label>
            <label>
              <span>Success probability (p)</span>
              <SignedNumberDraftInput value={binomialState.p} onValueChange={(p) => setBinomialState((current) => ({ ...current, p }))} className="statistics-cell-input" />
            </label>
          </div>
        ) : screen === 'normal' ? (
          <div className="statistics-input-grid">
            <label>
              <span>Mean</span>
              <SignedNumberDraftInput ref={normalMeanRef} value={normalState.mean} onValueChange={(mean) => setNormalState((current) => ({ ...current, mean }))} className="statistics-cell-input" />
            </label>
            <label>
              <span>Standard deviation</span>
              <SignedNumberDraftInput value={normalState.standardDeviation} onValueChange={(standardDeviation) => setNormalState((current) => ({ ...current, standardDeviation }))} className="statistics-cell-input" />
            </label>
          </div>
        ) : (
          <div className="statistics-input-grid">
            <label>
              <span>Rate (lambda)</span>
              <SignedNumberDraftInput ref={poissonLambdaRef} value={poissonState.lambda} onValueChange={(lambda) => setPoissonState((current) => ({ ...current, lambda }))} className="statistics-cell-input" />
            </label>
          </div>
        )}

        {eventState.event === 'between' ? (
          <div className="statistics-bound-grid">
            <label>
              <span>Lower endpoint</span>
              <SignedNumberDraftInput value={eventState.lower} onValueChange={(lower) => updateEventState({ lower })} className="statistics-cell-input" />
            </label>
            <label>
              <span>Lower bound</span>
              <select value={eventState.lowerBound} onChange={(event) => updateEventState({ lowerBound: event.target.value as 'inclusive' | 'exclusive' })}>
                <option value="inclusive">Inclusive</option>
                <option value="exclusive">Exclusive</option>
              </select>
            </label>
            <label>
              <span>Upper endpoint</span>
              <SignedNumberDraftInput value={eventState.upper} onValueChange={(upper) => updateEventState({ upper })} className="statistics-cell-input" />
            </label>
            <label>
              <span>Upper bound</span>
              <select value={eventState.upperBound} onChange={(event) => updateEventState({ upperBound: event.target.value as 'inclusive' | 'exclusive' })}>
                <option value="inclusive">Inclusive</option>
                <option value="exclusive">Exclusive</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="statistics-event-value">
            <label>
              <span>{eventState.event === 'density' ? 'Density point (x)' : 'Event value (x)'}</span>
              <SignedNumberDraftInput value={eventState.x} onValueChange={(x) => updateEventState({ x })} className="statistics-cell-input" />
            </label>
          </div>
        )}

        <div className="display-card-actions">
          <button onClick={onEditExpression}>Edit expression</button>
          <button onClick={onCopyExpression}>Copy expression</button>
        </div>
      </div>

      <div className="editor-card statistics-request-card">
        <div className="card-title-row">
          <strong>Generated request</strong>
          <span className="equation-subtitle">Ready to evaluate</span>
        </div>
        <code className="statistics-request-preview">{expression}</code>
      </div>
    </div>
  );
}

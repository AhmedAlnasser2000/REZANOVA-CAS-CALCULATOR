import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { LabsPanel } from './LabsPanel';
import type { LabExperimentSummary } from '../lib/labs/catalog';
import type { LabRunResult, LabRunnerSummary } from '../lib/labs/runner-types';

const experiments: LabExperimentSummary[] = [
  {
    experimentId: 'active-lab',
    title: 'Active Lab',
    laneTopic: 'symbolic-search',
    currentLevel: 'level-0-research',
    status: 'active',
    owner: 'unassigned',
    recordPath: 'playground/records/active-lab.md',
    manifestPath: 'playground/manifests/active-lab.yaml',
    lastReviewed: '2026-04-30',
    nextReview: '2026-05-07',
    candidateStableHome: 'future stable core',
    nextStep: 'Continue observing the active lab.',
  },
  {
    experimentId: 'promoted-lab',
    title: 'Promoted Lab',
    laneTopic: 'external-compute',
    currentLevel: 'level-2-bounded-prototypes',
    status: 'promoted',
    owner: 'unassigned',
    recordPath: 'playground/records/promoted-lab.md',
    manifestPath: 'playground/manifests/promoted-lab.yaml',
    lastReviewed: '2026-04-30',
    nextReview: 'closed',
    candidateStableHome: 'future adapter',
    nextStep: 'Keep the promotion record.',
  },
  {
    experimentId: 'paused-lab',
    title: 'Paused Lab',
    laneTopic: 'external-compute',
    currentLevel: 'level-3-integration-candidates',
    status: 'paused',
    owner: 'unassigned',
    recordPath: 'playground/records/paused-lab.md',
    manifestPath: 'playground/manifests/paused-lab.yaml',
    lastReviewed: '2026-04-30',
    nextReview: 'deferred',
    candidateStableHome: 'future adapter',
    nextStep: 'Wait for core stability.',
  },
];

const runners: LabRunnerSummary[] = [
  {
    runnerId: 'sym-search-planner-ordering',
    experimentId: 'active-lab',
    title: 'Symbolic Search Planner Ordering',
    description: 'Compare planner orders.',
    acceptedInputKinds: ['equation', 'corpus-case'],
    defaultInputKind: 'equation',
    defaultLatex: '\\sin\\left(x^2+x\\right)=\\frac{1}{2}',
    corpusCases: [
      {
        id: '__all__',
        label: 'Full fixed corpus',
        latex: '3 tracked equation cases',
      },
    ],
  },
  {
    runnerId: 'expression-baseline-probe',
    experimentId: 'active-lab',
    title: 'Expression Baseline Probe',
    description: 'Probe expression input.',
    acceptedInputKinds: ['expression'],
    defaultInputKind: 'expression',
    defaultLatex: '\\frac{1}{3}+\\frac{1}{6}',
  },
];

const runnerResult: LabRunResult = {
  runnerId: 'expression-baseline-probe',
  experimentId: 'active-lab',
  title: 'Expression Baseline Probe',
  inputKind: 'expression',
  status: 'success',
  summary: [
    { label: 'Stable outcome kind', value: 'success' },
  ],
  comparisonRows: [
    {
      label: 'Stable Calculate probe',
      inputLatex: '\\frac{1}{3}+\\frac{1}{6}',
      classification: 'success',
    },
  ],
  warnings: ['Experimental visual probe.'],
  logs: ['Ran expression probe.'],
  outputLatex: '\\frac{1}{2}',
  outputText: '\\frac{1}{2}',
  raw: { ok: true },
};

describe('LabsPanel', () => {
  it('renders active, promoted, and paused experiment states without execution controls', async () => {
    const user = userEvent.setup();
    render(<LabsPanel experiments={experiments} />);

    expect(screen.getByTestId('labs-panel')).toHaveTextContent('Developer only');
    expect(screen.getByTestId('labs-panel')).toHaveTextContent('Read-only catalog');
    expect(screen.getByTestId('labs-panel')).toHaveTextContent('do not make Playground product behavior');
    expect(screen.queryByRole('button', { name: /run experiment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remote/i })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /active lab/i })).toHaveTextContent('Active');
    expect(screen.getByRole('button', { name: /promoted lab/i })).toHaveTextContent('Promoted');
    expect(screen.getByRole('button', { name: /paused lab/i })).toHaveTextContent('Paused');
    expect(screen.getByRole('button', { name: /active lab/i }).querySelector('.launcher-entry-hotkey')).toBeNull();
    expect(screen.getByRole('button', { name: /active lab/i }).querySelector('.labs-status-chip')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /paused lab/i }));

    expect(screen.getByTestId('labs-detail')).toHaveTextContent('Paused Lab');
    expect(screen.getByTestId('labs-detail')).toHaveTextContent('Level 3 Integration Candidate');
    expect(screen.getByTestId('labs-detail')).toHaveTextContent('playground/records/paused-lab.md');
    expect(screen.getByTestId('labs-detail')).toHaveTextContent('Wait for core stability.');
  });

  it('renders dev-only runner controls and gates input kinds by selected runner', async () => {
    const user = userEvent.setup();
    const runExperiment = vi.fn().mockResolvedValue(runnerResult);
    render(
      <LabsPanel
        experiments={experiments}
        runnerUiEnabled
        runnerClient={{
          listRunners: () => Promise.resolve(runners),
          runExperiment,
        }}
      />,
    );

    expect(await screen.findByTestId('labs-runner-panel')).toHaveTextContent('Interactive Runner');
    expect(screen.getByTestId('labs-panel')).toHaveTextContent('Interactive console');
    expect(screen.getByRole('button', { name: 'Expression' })).toBeDisabled();

    await user.selectOptions(
      screen.getByLabelText('Runner'),
      'expression-baseline-probe',
    );

    expect(screen.getByRole('button', { name: 'Expression' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Equation' })).toBeDisabled();

    const field = screen.getByTestId('labs-runner-editor') as HTMLElement & {
      setValue: (value: string) => void;
    };
    field.setValue('\\frac{1}{3}+\\frac{1}{6}');
    fireEvent.input(field);

    await user.click(screen.getByRole('button', { name: /run experiment/i }));

    expect(runExperiment).toHaveBeenCalledWith({
      runnerId: 'expression-baseline-probe',
      inputKind: 'expression',
      latex: '\\frac{1}{3}+\\frac{1}{6}',
      corpusCaseId: undefined,
    });
    expect(await screen.findByTestId('labs-runner-result')).toHaveTextContent('Expression Baseline Probe');
    expect(screen.getByTestId('labs-runner-result')).toHaveTextContent('Experimental visual probe.');
    expect(screen.getByTestId('labs-runner-result')).toHaveTextContent('Stable Calculate probe');
  });
});

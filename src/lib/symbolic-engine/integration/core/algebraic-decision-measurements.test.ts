import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { algebraicDecisionMeasurements } from './__tests__/algebraic-decision-measurements';

it.skipIf(process.env.CALCWIZ_ALGEBRAIC_DECISION_GATE_B_MEASUREMENTS !== '1')('records serial constructive algebraic integration observations', () => {
  const result = algebraicDecisionMeasurements((name, observation) => writeFileSync('.task_tmp/2026-10-13__integration-algebraic-decision1/gate-b-measurement-progress.json', JSON.stringify({name, observation}, null, 2)));
  writeFileSync('.task_tmp/2026-10-13__integration-algebraic-decision1/gate-b-performance-samples.json', JSON.stringify(result, null, 2));
}, 2400000);

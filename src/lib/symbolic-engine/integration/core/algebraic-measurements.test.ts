import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { algebraicGateAMeasurements, algebraicGateBMeasurements } from './__tests__/algebraic-measurements';

it.skipIf(process.env.CALCWIZ_ALGEBRAIC_MEASURE !== '1')('records serial Gate A observations', () => {
  const observations = algebraicGateAMeasurements();
  writeFileSync('.task_tmp/2026-10-12__integration-algebraic-field1/gate-a-performance.json', JSON.stringify(observations, null, 2));
}, 120_000);
it.skipIf(process.env.CALCWIZ_ALGEBRAIC_MEASURE !== '1')('records serial Gate B observations', () => {
  const observations = algebraicGateBMeasurements();
  writeFileSync('.task_tmp/2026-10-12__integration-algebraic-field1/gate-b-performance.json', JSON.stringify(observations, null, 2));
}, 240_000);

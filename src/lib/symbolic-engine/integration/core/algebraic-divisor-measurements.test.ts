import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { algebraicDivisorGateAMeasurements } from './__tests__/algebraic-divisor-measurements';

it.skipIf(process.env.CALCWIZ_DIVISOR_MEASURE !== '1')('records serial divisor Gate A observations', () => {
  const observations = algebraicDivisorGateAMeasurements();
  writeFileSync('.task_tmp/2026-10-13__integration-algebraic-divisor1/gate-a-performance.json', JSON.stringify(observations, null, 2));
}, 240_000);

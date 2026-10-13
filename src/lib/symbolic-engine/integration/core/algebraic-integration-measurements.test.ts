import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { algebraicIntegrationGateAMeasurements, algebraicPrimitiveGateAMeasurements } from './__tests__/algebraic-integration-measurements';
it.skipIf(process.env.CALCWIZ_ALGEBRAIC_DECISION_GATE_A_MEASUREMENTS !== '1')('records serial algebraic integration Gate A observations', () => {
  const result = algebraicIntegrationGateAMeasurements((name, observation) => writeFileSync('.task_tmp/2026-10-13__integration-algebraic-decision1/gate-a-measurement-progress.json', JSON.stringify({name, observation}, null, 2)));
  writeFileSync('.task_tmp/2026-10-13__integration-algebraic-decision1/gate-a-performance-samples.json', JSON.stringify(result, null, 2));
}, 1800000);
it.skipIf(process.env.CALCWIZ_ALGEBRAIC_PRIMITIVE_MEASUREMENTS !== '1')('records serial normalized-trace primitive observations', () => {
  const result = algebraicPrimitiveGateAMeasurements(); writeFileSync('.task_tmp/2026-10-13__integration-algebraic-decision1/gate-a-primitive-performance-samples.json', JSON.stringify(result, null, 2));
}, 1800000);

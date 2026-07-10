import { validateRepoCiGateAlignment } from './ci-gate-alignment-core.mjs';

const result = validateRepoCiGateAlignment();

console.log(
  `CI gate alignment is valid (${result.staticGateCount} static gates plus workspace canaries).`,
);

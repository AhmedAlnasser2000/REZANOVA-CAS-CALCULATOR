import { validateSurfaceProtocolBoundaries } from './surface-protocol-boundaries-core.mjs';

const result = validateSurfaceProtocolBoundaries();

console.log(`Surface Protocol boundaries are valid (${result.files} production file(s)).`);

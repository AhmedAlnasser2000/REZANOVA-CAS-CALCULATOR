import { validateOoeBoundaries } from './ooe-boundaries-core.mjs';

const result = validateOoeBoundaries();
console.log(`OOE boundaries are valid (${result.tsFiles} TypeScript file(s), ${result.rustFiles} Rust file(s)).`);

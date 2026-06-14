import { validateCompartmentBoundaries } from './compartment-boundaries-core.mjs';

const result = validateCompartmentBoundaries();
console.log(
  `Compartment boundaries are valid (${result.sourceFiles} source file(s), OOE: ${result.ooe.tsFiles} TypeScript / ${result.ooe.rustFiles} Rust file(s)).`,
);

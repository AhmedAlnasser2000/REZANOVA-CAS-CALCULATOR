import { validateMathfieldPlaceholders } from './mathfield-placeholders-core.mjs';

const result = validateMathfieldPlaceholders();
console.log(`Math-field placeholders follow the policy (${result.files} source file(s)).`);

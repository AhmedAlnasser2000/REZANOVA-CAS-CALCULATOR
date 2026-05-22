import { validateAreaStudies } from './area-studies-core.mjs';

const validatedCount = validateAreaStudies();
console.log(`Area-study templates and committed studies are valid (${validatedCount} file(s)).`);

import { validateAreaStudies } from './area-studies-core.mjs';

const templateCount = validateAreaStudies();
console.log(`Area-study templates are valid (${templateCount} template file(s)).`);

import { loadEnv } from 'vite';
const env = { ...loadEnv('production', process.cwd(), 'PUBLIC_'), ...process.env };
if (env.PUBLIC_CALCULATOR_READY === 'false')
  throw new Error(
    'Confirm the calculator deployment and set PUBLIC_CALCULATOR_READY=true before publishing.',
  );
const url = new URL(env.PUBLIC_CALCULATOR_URL || 'https://rezanova-cas.com/');
if (url.protocol !== 'https:') throw new Error('Calculator URL must use HTTPS.');
if (!env.PUBLIC_WEBSITE_URL)
  throw new Error(
    'Set PUBLIC_WEBSITE_URL to the separate marketing website origin before publishing.',
  );
const website = new URL(env.PUBLIC_WEBSITE_URL);
if (website.protocol !== 'https:') throw new Error('Website URL must use HTTPS.');
if (url.origin === website.origin)
  throw new Error(
    'Calculator URL would point back to the marketing website. Use the separately deployed app URL.',
  );
console.log(
  'Launch configuration is valid; verify the destination in a browser before publishing.',
);

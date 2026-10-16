import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
const env = {
  ...loadEnv(process.env.NODE_ENV || 'development', process.cwd(), 'PUBLIC_'),
  ...process.env,
};
const websiteUrl = env.PUBLIC_WEBSITE_URL || undefined;

export default defineConfig({
  site: websiteUrl,
  output: 'static',
  trailingSlash: 'always',
  integrations: websiteUrl ? [sitemap()] : [],
  devToolbar: { enabled: false },
  server: { host: true, port: 4173 },
  vite: { server: { allowedHosts: ['terminal.local'], strictPort: true } },
});

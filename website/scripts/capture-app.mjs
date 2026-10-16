// Captures real screenshots of the current app for the website and the README.
// Run from the repository root after `npm run build`, with the app preview on port 4173:
//   npm run preview:test &   (in the repository root)
//   node website/scripts/capture-app.mjs
// CHROMIUM_PATH overrides the browser executable. Output: website/public/images/app-*.webp and
// docs/assets/screenshots/equation-*.png / integration-*.png for the README.
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Playwright comes from the app's dependencies, sharp from the website's.
const sharp = createRequire(resolve('website/package.json'))('sharp');

const APP = process.env.APP_URL || 'http://127.0.0.1:4173';
const SITE_IMAGES = resolve('website/public/images');
const README_IMAGES = resolve('docs/assets/screenshots');
mkdirSync(SITE_IMAGES, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function fresh(height = 900) {
  const page = await browser.newPage({ viewport: { width: 1440, height }, deviceScaleFactor: 1.5 });
  await page.goto(APP);
  await page.getByTestId('new-equation-page').waitFor({ timeout: 30_000 });
  return page;
}
async function setLatex(page, locator, latex) {
  await locator.evaluate((element, value) => {
    element.focus();
    element.setValue(value);
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }, latex);
}
async function save(page, name, readme) {
  const png = await page.screenshot();
  await sharp(png).resize({ width: 1800 }).webp({ quality: 82 }).toFile(`${SITE_IMAGES}/app-${name}.webp`);
  if (readme) await sharp(png).resize({ width: 1600 }).png({ compressionLevel: 9 }).toFile(`${README_IMAGES}/${readme}.png`);
  console.log('captured', name);
}

async function equation(name, rows, readme) {
  const page = await fresh(1180);
  const workspace = page.getByTestId('new-equation-page');
  for (const [index, latex] of rows.entries()) {
    if (index > 0) await workspace.getByRole('button', { name: '+ Add row' }).click();
    await setLatex(page, page.getByTestId(`new-equation-row-${index + 1}`), latex);
  }
  await workspace.getByRole('button', { name: 'Solve', exact: true }).click();
  const answer = page.getByTestId('new-equation-answer');
  await answer.waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="new-equation-answer"]')?.getAttribute('data-outdated') === 'false', null, { timeout: 60_000 });
  await workspace.getByRole('button', { name: 'Stop', exact: true }).waitFor({ state: 'attached' });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Stop' && b.disabled), null, { timeout: 60_000 });
  // Open the verification note (a <details>), as a reader would.
  await workspace.getByTestId('new-equation-verified').locator('summary').click({ timeout: 10_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await save(page, name, readme);
  await page.close();
}

async function integration(name, source, heading, readme) {
  const page = await fresh(1000);
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByTestId('workspace-tab-create-menu').getByRole('menuitem', { name: 'New Integration', exact: true }).click();
  const workspace = page.getByTestId('new-integration-page');
  await workspace.waitFor();
  await setLatex(page, page.getByTestId('new-integration-editor'), source);
  await workspace.getByRole('button', { name: 'Integrate', exact: true }).click();
  const result = workspace.getByRole('heading', { name: heading });
  await result.waitFor({ timeout: 60_000 });
  const full = workspace.getByRole('button', { name: 'Show full formula', exact: true });
  if (await full.count()) await full.click();
  await result.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -360));
  await page.waitForTimeout(400);
  await save(page, name, readme);
  await page.close();
}

async function graph(name, latex, threeD) {
  const page = await fresh();
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Graph' }).click();
  await page.getByTestId('graph-page').waitFor();
  await setLatex(page, page.locator('.graph-page math-field').first(), latex);
  if (threeD) await page.getByRole('group', { name: 'Graph dimension' }).getByRole('button', { name: '3D' }).click();
  // Wait for the status bar to leave "Drawing preview…".
  await page.getByText('Ready', { exact: true }).first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  await save(page, name);
  await page.close();
}

await equation('equation-forall', ['\\forall x:x^2+ax+1>0'], 'equation-forall-quantifier');
await equation('equation-cases', ['ax^2+x+1=0'], 'equation-parameter-cases');
await equation('equation-system', ['x^2+y^2=1', 'y=x']);
await equation('equation-region', ['x^2+y^2<1', 'y>x'], 'equation-region');
await integration('integration-quartic', '\\int \\frac{1}{x^4+1}\\,dx', 'Verified antiderivative', 'integration-rational-quartic');
await integration('integration-gaussian', '\\int e^{x^2}\\,dx', 'Verified non-elementary', 'integration-non-elementary');
await graph('graphing-curve', 'y^2=x^3-x');
await graph('graphing-complex', 'f(z)=\\frac{z^3-1}{z^2+1}');
await graph('graphing-surface', 'z=\\sin(x)\\cos(y)', true);
await browser.close();

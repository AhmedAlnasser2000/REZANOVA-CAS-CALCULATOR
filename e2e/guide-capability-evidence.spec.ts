import { expect, test, type Page } from '@playwright/test';
import { GUIDE_ARTICLES } from '../src/lib/guide/content/selectors';
import type { GuideArticle, GuideExample } from '../src/types/calculator';

type GuideExampleRef = {
  articleId: string;
  exampleId: string;
};

function guideExample({ articleId, exampleId }: GuideExampleRef): {
  article: GuideArticle;
  example: GuideExample;
} {
  const article = GUIDE_ARTICLES.find((candidate) => candidate.id === articleId);
  const example = article?.examples.find((candidate) => candidate.id === exampleId);

  if (!article || !example) {
    throw new Error(`Missing Guide example ${articleId}/${exampleId}`);
  }

  return { article, example };
}

function exactText(text: string) {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

async function focusGuidePage(page: Page) {
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'Open Guide Page' }).click();
  await expect(page.getByTestId('guide-page')).toBeVisible();
}

async function openGuideArticle(page: Page, article: GuideArticle) {
  await page.getByTestId('guide-route-search').click();
  await page.locator('.guide-search-input').fill(article.title);
  const articleEntry = page.locator('button.guide-entry')
    .filter({ has: page.locator('strong', { hasText: exactText(article.title) }) })
    .first();
  await expect(articleEntry).toBeVisible();
  await articleEntry.click();
  await expect(page.getByTestId('guide-page-main')).toContainText(article.title);
  await expect(page.getByRole('heading', { name: 'Worked Examples' })).toBeVisible();
}

async function openGuideExampleInTool(page: Page, ref: GuideExampleRef) {
  const { article, example } = guideExample(ref);

  await focusGuidePage(page);
  await openGuideArticle(page, article);

  const exampleCard = page.locator('.guide-example').filter({ hasText: example.title }).first();
  await expect(exampleCard).toBeVisible();
  await exampleCard.getByRole('button', { name: 'Open in Tool' }).click();

  return { article, example };
}

/**
 * Every Guide worked example opens a workspace being rebuilt (EQUATION-RECONSTRUCTION-CLOSEOUT1 PR B). The examples
 * stay listed; Open in Tool is refused with the sign and Guide stays open. They are marked for removal or rewriting
 * when their workspace is rebuilt.
 */
async function expectRefusedWithSign(page: Page, ref: GuideExampleRef, workspaceLabel: string) {
  await openGuideExampleInTool(page, ref);
  await expect(page.getByTestId('app-notice')).toContainText(`${workspaceLabel}: Unavailable: being rebuilt`);
  await expect(page.getByTestId('guide-page')).toBeVisible();
  await page.getByTestId('app-notice').getByRole('button', { name: 'Dismiss' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('new-equation-page')).toBeVisible();
});

test('Guide examples of math-output workspaces being rebuilt are refused with the sign', async ({ page }) => {
  await expectRefusedWithSign(page, { articleId: 'basics-keyboard', exampleId: 'basics-fraction' }, 'Calculate');
  await expectRefusedWithSign(page, { articleId: 'calculus-derivatives', exampleId: 'calc-derivative-function-power' }, 'Calculus');
  await expectRefusedWithSign(page, { articleId: 'trig-period-phase', exampleId: 'trig-period-phase-sine' }, 'Trigonometry');
});

test('Guide examples of data and management workspaces being rebuilt are refused with the sign', async ({ page }) => {
  await expectRefusedWithSign(page, { articleId: 'statistics-inference', exampleId: 'statistics-inference-mean' }, 'Statistics');
  await expectRefusedWithSign(page, { articleId: 'geometry-coordinate', exampleId: 'geometry-distance' }, 'Geometry');
  await expectRefusedWithSign(page, { articleId: 'linear-algebra-matrix-vector', exampleId: 'linear-open-matrix' }, 'Matrix');
  await expectRefusedWithSign(page, { articleId: 'linear-algebra-matrix-vector', exampleId: 'linear-open-vector' }, 'Vector');
});

import { expect, test, type Page } from '@playwright/test';
import { GUIDE_ARTICLES } from '../src/lib/guide/content/selectors';
import type { GuideArticle, GuideExample } from '../src/types/calculator';
import type { WorkspaceKind } from '../src/app/runtime/workspace-instances';

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

async function expectActiveWorkspace(page: Page, workspaceKind: WorkspaceKind) {
  await expect(page.locator('.workspace-tab.is-active')).toHaveAttribute('data-workspace-kind', workspaceKind);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
});

test('Guide examples route and run representative math-output workspaces', async ({ page }) => {
  await openGuideExampleInTool(page, {
    articleId: 'basics-keyboard',
    exampleId: 'basics-fraction',
  });
  await expectActiveWorkspace(page, 'calculate');
  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact')).toBeVisible();

  await openGuideExampleInTool(page, {
    articleId: 'algebra-equations',
    exampleId: 'algebra-equation-symbolic',
  });
  await expectActiveWorkspace(page, 'equation');
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact')).toContainText('x');

  await openGuideExampleInTool(page, {
    articleId: 'calculus-derivatives',
    exampleId: 'calc-derivative-function-power',
  });
  await expectActiveWorkspace(page, 'calculus');
  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.locator('.result-title')).toContainText('Derivative');

  await openGuideExampleInTool(page, {
    articleId: 'trig-period-phase',
    exampleId: 'trig-period-phase-sine',
  });
  await expectActiveWorkspace(page, 'trigonometry');
  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText(/Period|Phase|Amplitude/);
});

test('Guide examples route representative management and data workspaces', async ({ page }) => {
  await openGuideExampleInTool(page, {
    articleId: 'statistics-inference',
    exampleId: 'statistics-inference-mean',
  });
  await expectActiveWorkspace(page, 'statistics');
  await expect(page.locator('.statistics-panel')).toContainText(/Mean|Inference/);

  await openGuideExampleInTool(page, {
    articleId: 'geometry-coordinate',
    exampleId: 'geometry-distance',
  });
  await expectActiveWorkspace(page, 'geometry');
  await expect(page.locator('.geometry-panel')).toContainText('Distance');

  await openGuideExampleInTool(page, {
    articleId: 'linear-algebra-matrix-vector',
    exampleId: 'linear-open-matrix',
  });
  await expectActiveWorkspace(page, 'matrix');
  await expect(page.getByText('Matrix Workspace')).toBeVisible();

  await openGuideExampleInTool(page, {
    articleId: 'linear-algebra-matrix-vector',
    exampleId: 'linear-open-vector',
  });
  await expectActiveWorkspace(page, 'vector');
  await expect(page.getByText('Vector Workspace')).toBeVisible();
});

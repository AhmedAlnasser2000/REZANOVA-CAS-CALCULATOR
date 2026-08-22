import { expect, type Locator, type Page } from '@playwright/test';

type ScalarValue = number | string;

const SCALAR_CELL_SELECTOR = 'math-field[data-linear-algebra-cell="true"][role="textbox"]';

function matrixCard(page: Page, name: string) {
  return page.locator('.linear-algebra-value-card')
    .filter({ has: page.getByLabel(`Matrix ${name} name`) })
    .first();
}

function vectorCard(page: Page, name: string) {
  return page.locator('.linear-algebra-value-card')
    .filter({ has: page.getByLabel(`Vector ${name} name`) })
    .first();
}

async function commitScalarCell(cell: Locator, value: ScalarValue) {
  const latex = String(value);
  await expect(cell).toBeVisible();
  const nextCellLabel = await cell.evaluate((element, options) => {
    const field = element as HTMLElement & {
      getValue: (format: string) => string;
      setValue: (value: string) => void;
    };
    const groupId = field.dataset.linearAlgebraCellGroup;
    const cells = [...document.querySelectorAll<HTMLElement>(options.selector)]
      .filter((candidate) => candidate.dataset.linearAlgebraCellGroup === groupId)
      .sort((left, right) =>
        Number(left.dataset.linearAlgebraCellIndex) - Number(right.dataset.linearAlgebraCellIndex));
    const currentIndex = cells.indexOf(field);
    const nextCell = cells[(currentIndex + 1) % cells.length];
    field.focus();
    field.setValue(options.nextLatex);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      composed: true,
    }));
    return nextCell?.getAttribute('aria-label') ?? null;
  }, { nextLatex: latex, selector: SCALAR_CELL_SELECTOR });
  if (nextCellLabel) {
    await expect.poll(() => cell.page().evaluate(() =>
      document.activeElement?.getAttribute('aria-label') ?? null)).toBe(nextCellLabel);
  }
  await expect.poll(() => cell.evaluate((element) =>
    (element as HTMLElement & { getValue: (format: string) => string }).getValue('latex')))
    .toBe(latex);
}

export async function expectMatrixScalarCellCount(
  page: Page,
  name: string,
  count: number,
) {
  await expect(
    matrixCard(page, name).locator('.linear-algebra-matrix-grid').locator(SCALAR_CELL_SELECTOR),
  ).toHaveCount(count);
}

export async function expectVectorScalarCellCount(
  page: Page,
  name: string,
  count: number,
) {
  await expect(
    vectorCard(page, name).locator('.linear-algebra-vector-grid').locator(SCALAR_CELL_SELECTOR),
  ).toHaveCount(count);
}

export async function setMatrixScalarValues(
  page: Page,
  name: string,
  rows: number,
  columns: number,
  values: readonly ScalarValue[],
) {
  expect(values).toHaveLength(rows * columns);
  const rowsInput = page.getByLabel(`Matrix ${name} rows`);
  const columnsInput = page.getByLabel(`Matrix ${name} columns`);
  await rowsInput.fill(String(rows));
  await columnsInput.fill(String(columns));
  await expect(rowsInput).toHaveValue(String(rows));
  await expect(columnsInput).toHaveValue(String(columns));
  await expectMatrixScalarCellCount(page, name, rows * columns);

  const grid = matrixCard(page, name).locator('.linear-algebra-matrix-grid');
  for (let index = 0; index < values.length; index += 1) {
    const row = Math.floor(index / columns) + 1;
    const column = (index % columns) + 1;
    await commitScalarCell(grid.locator(
      `${SCALAR_CELL_SELECTOR}[aria-label="Matrix ${name} row ${row} column ${column}"]`,
    ), values[index]);
  }
}

export async function setVectorScalarValues(
  page: Page,
  name: string,
  values: readonly ScalarValue[],
) {
  const lengthInput = page.getByLabel(`Vector ${name} length`);
  await lengthInput.fill(String(values.length));
  await expect(lengthInput).toHaveValue(String(values.length));
  await expectVectorScalarCellCount(page, name, values.length);

  const grid = vectorCard(page, name).locator('.linear-algebra-vector-grid');
  for (let index = 0; index < values.length; index += 1) {
    await commitScalarCell(grid.locator(
      `${SCALAR_CELL_SELECTOR}[aria-label="Vector ${name} component ${index + 1}"]`,
    ), values[index]);
  }
}

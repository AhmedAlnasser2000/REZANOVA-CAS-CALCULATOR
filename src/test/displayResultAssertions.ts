import { fireEvent, screen, within } from '@testing-library/react';

export async function revealValidWhenIfCollapsed() {
  const validWhen = await screen.findByTestId('display-outcome-valid-when');
  if (validWhen instanceof HTMLDetailsElement && !validWhen.open) {
    fireEvent.click(within(validWhen).getByText(/Valid when/i));
  }
}

export function displayedSupplementLatex() {
  return Array.from(
    document.querySelectorAll('[data-testid^="display-outcome-supplement-"] [data-raw-latex]'),
  )
    .map((node) => node.getAttribute('data-raw-latex') ?? '')
    .join(' ');
}

export function displayedDetailLatex() {
  return Array.from(
    screen.getByTestId('display-outcome-detail-sections').querySelectorAll('[data-raw-latex]'),
  )
    .map((node) => node.getAttribute('data-raw-latex') ?? '')
    .filter((latex) => latex.length > 0);
}

export function revealDetailSection(testId: string, title: string) {
  const detail = screen.getByTestId(testId) as HTMLDetailsElement;
  const wasCollapsed = !detail.open;
  if (wasCollapsed) fireEvent.click(within(detail).getByText(title));
  return wasCollapsed;
}

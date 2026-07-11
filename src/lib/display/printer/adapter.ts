import type { PrintedMath, PrinterRequest } from './printer';

export type CanonicalPrinterAdapter<TInput, TContext = undefined> = {
  id: string;
  print: (
    input: TInput,
    request: PrinterRequest,
    context: TContext,
  ) => PrintedMath;
};

export function defineCanonicalPrinterAdapter<TInput, TContext = undefined>(
  adapter: CanonicalPrinterAdapter<TInput, TContext>,
) {
  return adapter;
}

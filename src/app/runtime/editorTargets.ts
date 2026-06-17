export function isLatexInsertTarget(field: unknown): field is {
  focus?: () => void;
  insert: (latex: string) => void;
} {
  return Boolean(field && typeof (field as { insert?: unknown }).insert === 'function');
}

export function isLatexValueTarget(field: unknown): field is {
  focus?: () => void;
  getValue?: (format?: string) => string;
  setValue: (latex: string) => void;
  dispatchEvent?: (event: Event) => boolean;
} {
  return Boolean(field && typeof (field as { setValue?: unknown }).setValue === 'function');
}

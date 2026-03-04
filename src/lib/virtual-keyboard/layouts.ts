import type {
  KeyboardContext,
  KeyboardKeySpec,
  KeyboardPageSpec,
} from '../../types/calculator';
import type {
  VirtualKeyboardKeycap,
  VirtualKeyboardLayout,
} from 'mathlive';
import { KEYBOARD_PAGE_SPECS } from './catalog';
import { isCapabilityEnabled } from './capabilities';
import { assertNoKeyboardDuplicates } from './dedup';

function pageVisibleInContext(page: KeyboardPageSpec, context: KeyboardContext) {
  if (!isCapabilityEnabled(context.enabledCapabilities, page.capability)) {
    return false;
  }

  if (page.modeVisibility && !page.modeVisibility.includes(context.mode)) {
    return false;
  }

  if (
    page.equationVisibility &&
    context.mode === 'equation' &&
    context.equationScreen &&
    !page.equationVisibility.includes(context.equationScreen)
  ) {
    return false;
  }

  return true;
}

function keyVisibleInContext(key: KeyboardKeySpec, context: KeyboardContext) {
  if (!isCapabilityEnabled(context.enabledCapabilities, key.capability)) {
    return false;
  }

  if (key.supportLevel === 'hidden') {
    return false;
  }

  if (key.modeVisibility && !key.modeVisibility.includes(context.mode)) {
    return false;
  }

  if (
    key.equationVisibility &&
    context.mode === 'equation' &&
    context.equationScreen &&
    !key.equationVisibility.includes(context.equationScreen)
  ) {
    return false;
  }

  return true;
}

function commandKeycap(
  label: string,
  command: string,
): string | Partial<VirtualKeyboardKeycap> {
  if (command.startsWith('[') && command.endsWith(']')) {
    return command;
  }

  return {
    label,
    command,
    class: 'action small',
  };
}

function toVariantKeycap(variant: KeyboardKeySpec): string | Partial<VirtualKeyboardKeycap> {
  if (variant.action.kind === 'insert-latex') {
    return {
      label: variant.label,
      insert: variant.action.latex,
      class: variant.label.length > 2 ? 'small' : undefined,
    };
  }

  if (variant.action.kind === 'insert-template') {
    return {
      label: variant.label,
      insert: variant.action.latex,
      class: variant.label.length > 2 ? 'small' : undefined,
    };
  }

  if (variant.action.kind === 'execute-command') {
    return commandKeycap(variant.label, variant.action.command);
  }

  throw new Error(`Unsupported variant action: ${variant.action.kind}`);
}

function toKeycap(key: KeyboardKeySpec): string | Partial<VirtualKeyboardKeycap> {
  const variants = key.variants?.map(toVariantKeycap);

  if (key.action.kind === 'insert-latex' || key.action.kind === 'insert-template') {
    return {
      label: key.label,
      insert: key.action.latex,
      class: key.label.length > 2 ? 'small' : undefined,
      variants,
    };
  }

  if (key.action.kind === 'execute-command') {
    const keycap = commandKeycap(key.label, key.action.command);
    if (typeof keycap === 'string') {
      return keycap;
    }

    return {
      ...keycap,
      variants,
    };
  }

  throw new Error(`Unsupported keyboard action: ${key.action.kind}`);
}

export function resolveKeyboardPages(context: KeyboardContext) {
  const pages = KEYBOARD_PAGE_SPECS
    .filter((page) => pageVisibleInContext(page, context))
    .map((page) => ({
      ...page,
      rows: page.rows
        .map((row) => row.filter((key) => keyVisibleInContext(key, context)))
        .filter((row) => row.length > 0),
    }))
    .filter((page) => page.rows.length > 0);

  assertNoKeyboardDuplicates(pages);
  return pages;
}

export function buildVirtualKeyboardLayouts(
  context: KeyboardContext,
): VirtualKeyboardLayout[] {
  return resolveKeyboardPages(context).map((page) => ({
    id: page.id,
    label: page.label,
    tooltip: `${page.label} keyboard`,
    displayEditToolbar: true,
    rows: page.rows.map((row) => row.map(toKeycap)),
  }));
}

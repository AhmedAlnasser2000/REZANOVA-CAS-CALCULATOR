import { Extension } from '@tiptap/core';

import { isNotebookFontSize } from '../../../../lib/notebook';

export const NotebookFontSize = Extension.create({
  name: 'notebookFontSize',

  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element) => {
            const match = element.style.fontSize.match(/^(\d+)%$/u);
            const value = match ? Number.parseInt(match[1]!, 10) : null;
            return isNotebookFontSize(value) ? value : null;
          },
          renderHTML: (attributes) => isNotebookFontSize(attributes.fontSize)
            ? { style: `font-size: ${attributes.fontSize}%` }
            : {},
        },
      },
    }];
  },
});

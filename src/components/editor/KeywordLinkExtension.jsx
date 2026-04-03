import { Mark, mergeAttributes } from '@tiptap/core';

export const KeywordLink = Mark.create({
  name: 'keywordLink',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      keywordId: {
        default: null,
      },
      keywordTitle: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-keyword-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-keyword-id': HTMLAttributes.keywordId,
        'data-keyword-title': HTMLAttributes.keywordTitle,
        class: 'keyword-link',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setKeywordLink: (attributes) => ({ commands }) => {
        return commands.setMark(this.name, attributes);
      },
      unsetKeywordLink: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});
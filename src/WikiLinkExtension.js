import { Node, mergeAttributes } from '@tiptap/core';

// Inline atom node for [[wiki links]]. Serializes back to [[name]] markdown.
export const WikiLink = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      name: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-wiki-link'),
        renderHTML: (attrs) => ({ 'data-wiki-link': attrs.name }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wiki-link]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'wiki-link' }), `[[${HTMLAttributes['data-wiki-link']}]]`];
  },

  parseMarkdown() {
    return {
      node: 'wikiLink',
      getAttrs: (token) => ({ name: token.content }),
    };
  },

  renderMarkdown({ node }) {
    return {
      content: `[[${node.attrs.name}]]`,
    };
  },
});

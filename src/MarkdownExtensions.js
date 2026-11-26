import Highlight from '@tiptap/extension-highlight';

// Highlight has no native markdown representation. Serialize it as inline
// HTML that its own parseHTML rule understands, so a WYSIWYG edit survives
// the Markdown round-trip.
export const MarkdownHighlight = Highlight.extend({
  renderMarkdown: (node, h) => {
    const color = node.attrs?.color;
    const content = h.renderChildren(node.content || []);
    const style = color ? ` style="background-color: ${color}"` : '';
    return `<mark${style}>${content}</mark>`;
  },
});

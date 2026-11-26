import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';

// Color/Highlight have no native markdown representation. Serialize them as
// inline HTML that their own parseHTML rules understand, so a WYSIWYG edit
// round-trips through the .md file without losing the color.

export const MarkdownColor = Color.extend({
  renderMarkdown: (node, h) => {
    const color = node.attrs?.color;
    const content = h.renderChildren(node.content || []);
    return color ? `<span style="color: ${color}">${content}</span>` : content;
  },
});

export const MarkdownHighlight = Highlight.extend({
  renderMarkdown: (node, h) => {
    const color = node.attrs?.color;
    const content = h.renderChildren(node.content || []);
    // Highlight's parseHTML accepts <mark>; keep the color via style so the
    // default yellow is preserved when reloaded.
    const style = color ? ` style="background-color: ${color}"` : '';
    return `<mark${style}>${content}</mark>`;
  },
});

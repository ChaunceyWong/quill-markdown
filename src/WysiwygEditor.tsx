import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Markdown } from '@tiptap/markdown';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Underline } from '@tiptap/extension-underline';
// @ts-expect-error plain JS module without declarations
import { MarkdownHighlight } from './MarkdownExtensions';
// @ts-expect-error wiki link extension is plain JS with matching runtime shape
import { WikiLink } from './WikiLinkExtension';
import { ContextMenu } from './ContextMenu';
import { OutlinePanel } from './Outline';
import { parseOutline, type OutlineItem } from './outlineParser';

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSave: () => void;
  onPasteImage: (path: string) => void;
  onWikiClick: (name: string) => void;
  onInsertWiki: () => void;
  theme: 'light' | 'dark';
  initialPos?: { from: number; to: number; scrollTop: number };
  onPersistPos?: (pos: { from: number; to: number; scrollTop: number }) => void;
}

export function WysiwygEditor({ value, onChange, onSave, onPasteImage, onWikiClick, onInsertWiki, theme, initialPos, onPersistPos }: Props) {
  const cbRef = useRef({ onChange, onSave, onPasteImage, onWikiClick, onPersistPos });
  cbRef.current = { onChange, onSave, onPasteImage, onWikiClick, onPersistPos };
  const loadingRef = useRef(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const outline = parseOutline(value);

  function jumpToHeading(item: OutlineItem) {
    if (!editor) return;
    // Match the Nth heading in document order (same order as the outline parser).
    let idx = 0;
    let target = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        if (idx === item.headingIndex) { target = pos; return false; }
        idx += 1;
      }
      return true;
    });
    if (target < 0) return;
    editor.chain().focus().setTextSelection(target + 1).scrollIntoView().run();
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] }, underline: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      MarkdownHighlight,
      WikiLink,
      Markdown.configure({}),
    ],
    contentType: 'markdown',
    content: value,
    editorProps: {
      attributes: { class: 'wysiwyg-content' },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          cbRef.current.onSave();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const image = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
        if (!image) return false;
        const file = image.getAsFile();
        if (!file) return false;
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          window.__writeTempImage?.(String(reader.result)).then((p) => {
            if (p) cbRef.current.onPasteImage(p);
          });
        };
        reader.readAsDataURL(file);
        return true;
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        const wiki = target.closest('[data-wiki-link]');
        if (wiki) {
          event.preventDefault();
          cbRef.current.onWikiClick(wiki.getAttribute('data-wiki-link') || '');
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      if (loadingRef.current) return;
      cbRef.current.onChange(e.getMarkdown());
    },
    onSelectionUpdate: ({ editor: e }) => {
      const { from, to } = e.state.selection;
      cbRef.current.onPersistPos?.({ from, to, scrollTop: hostRef.current?.scrollTop ?? 0 });
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getMarkdown() === value) return;
    loadingRef.current = true;
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
    loadingRef.current = false;
  }, [editor, value]);

  // Restore cursor and scroll position when switching back to this document.
  useEffect(() => {
    if (!editor || !initialPos) return;
    const { from, to, scrollTop } = initialPos;
    const max = editor.state.doc.content.size;
    if (from <= max) {
      editor.commands.setTextSelection({ from: Math.max(1, from), to: Math.min(max, Math.max(from, to)) });
    }
    if (hostRef.current) hostRef.current.scrollTop = scrollTop;
  }, [editor]);

  return (
    <div className="wysiwyg-layout">
    <div
      className="wysiwyg-host"
      data-cm-theme={theme}
      ref={hostRef}
      onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
    >
      <EditorContent editor={editor} />
      {menu && (
        <ContextMenu
          key={`${menu.x}-${menu.y}`}
          editor={editor}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onWiki={() => { onInsertWiki(); setMenu(null); }}
        />
      )}
    </div>
    <OutlinePanel items={outline} onJump={jumpToHeading} />
    </div>
  );
}

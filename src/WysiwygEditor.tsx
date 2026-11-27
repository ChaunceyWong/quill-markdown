import { useEffect, useMemo, useRef, useState } from 'react';
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
import { toEditorMarkdown, fromEditorMarkdown } from './imageMd';

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
  docPath: string | null;
  pendingInsert?: { id: number; text: string } | null;
  onInserted?: () => void;
}

export function WysiwygEditor({ value, onChange, onSave, onPasteImage, onWikiClick, onInsertWiki, theme, initialPos, onPersistPos, docPath, pendingInsert, onInserted }: Props) {
  const insertRef = useRef({ pendingInsert, onInserted });
  insertRef.current = { pendingInsert, onInserted };
  const reverseImages = useRef<Map<string, string>>(new Map());
  const cbRef = useRef({ onChange, onSave, onPasteImage, onWikiClick, onPersistPos });
  cbRef.current = { onChange, onSave, onPasteImage, onWikiClick, onPersistPos };
  const loadingRef = useRef(false);
  const lastEmitted = useRef<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  // Parsing the whole document on every render is wasteful; only redo it
  // when the text actually changes.
  const outline = useMemo(() => parseOutline(value), [value]);

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
      Image.configure({ inline: false, allowBase64: true }),
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
      const md = fromEditorMarkdown(e.getMarkdown(), reverseImages.current);
      // Remember what we just emitted so the value-sync effect below can
      // recognise its own echo and skip an expensive re-load (which would
      // re-read and base64 every image on each keystroke).
      lastEmitted.current = md;
      cbRef.current.onChange(md);
    },
    onSelectionUpdate: ({ editor: e }) => {
      const { from, to } = e.state.selection;
      cbRef.current.onPersistPos?.({ from, to, scrollTop: hostRef.current?.scrollTop ?? 0 });
    },
  });

  // A document switch must always reload, even if the incoming text happens
  // to equal what the previous document last emitted.
  const lastDocPath = useRef(docPath);
  useEffect(() => {
    if (lastDocPath.current !== docPath) {
      lastDocPath.current = docPath;
      lastEmitted.current = null;
    }
  }, [docPath]);

  useEffect(() => {
    if (!editor) return;
    // Skip the round-trip when this value is simply the editor's own output.
    if (lastEmitted.current === value) {
      lastEmitted.current = null;
      return;
    }
    let cancelled = false;
    loadingRef.current = true;
    toEditorMarkdown(value, docPath).then(({ markdown, reverse }) => {
      if (cancelled) return;
      reverseImages.current = reverse;
      if (editor.getMarkdown() !== markdown) {
        editor.commands.setContent(markdown, { contentType: 'markdown', emitUpdate: false });
      }
      // Restore cursor/scroll after the content is in place.
      if (initialPos) {
        const max = editor.state.doc.content.size;
        if (initialPos.from <= max) {
          editor.commands.setTextSelection({
            from: Math.max(1, initialPos.from),
            to: Math.min(max, Math.max(initialPos.from, initialPos.to)),
          });
        }
        if (hostRef.current) hostRef.current.scrollTop = initialPos.scrollTop;
      }
      loadingRef.current = false;
    }).catch(() => { loadingRef.current = false; });
    return () => { cancelled = true; };
  }, [editor, value, docPath]);

  // Insert externally requested Markdown (pasted image / wiki link) at the
  // current cursor, avoiding a full setContent that would reset the cursor.
  useEffect(() => {
    if (!editor || !insertRef.current.pendingInsert) return;
    const md = insertRef.current.pendingInsert.text;
    insertRef.current.pendingInsert = null;
    loadingRef.current = true;
    editor.chain().focus().insertContent(md).run();
    loadingRef.current = false;
    insertRef.current.onInserted?.();
  }, [editor, pendingInsert]);

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

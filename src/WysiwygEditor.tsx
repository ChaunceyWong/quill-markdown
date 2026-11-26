import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Markdown } from '@tiptap/markdown';
// @ts-expect-error wiki link extension is plain JS with matching runtime shape
import { WikiLink } from './WikiLinkExtension';

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSave: () => void;
  onPasteImage: (path: string) => void;
  onWikiClick: (name: string) => void;
  theme: 'light' | 'dark';
}

export function WysiwygEditor({ value, onChange, onSave, onPasteImage, onWikiClick, theme }: Props) {
  const cbRef = useRef({ onChange, onSave, onPasteImage, onWikiClick });
  cbRef.current = { onChange, onSave, onPasteImage, onWikiClick };
  const loadingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
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
  });

  // Switching documents: replace content without firing onUpdate.
  useEffect(() => {
    if (!editor) return;
    if (editor.getMarkdown() === value) return;
    loadingRef.current = true;
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
    loadingRef.current = false;
  }, [editor, value]);

  return (
    <div className="wysiwyg-host" data-cm-theme={theme}>
      <EditorContent editor={editor} />
    </div>
  );
}

import { useState } from 'react';
import type { Editor } from '@tiptap/core';

interface Props {
  editor: Editor | null;
  x: number;
  y: number;
  onClose: () => void;
  onWiki: () => void;
}

interface TableGrid { rows: number; cols: number }

export function ContextMenu({ editor, x, y, onClose, onWiki }: Props) {
  // Keep the menu inside the viewport.
  const left = Math.min(x, window.innerWidth - 240);
  const top = Math.min(y, window.innerHeight - 400);
  // Local grid state lives in the parent via key reset on open; using a
  // module-level weakmap-free approach: state is kept in this component and
  // reset because the menu is remounted on every right-click.
  const [grid, setGrid] = useState<TableGrid | null>(null);

  if (!editor) return null;
  const run = (fn: () => void) => { fn(); onClose(); };
  const hasSelection = !editor.state.selection.empty;

  return (
    <div className="context-menu" style={{ left, top }} onMouseLeave={onClose}>
      <button onClick={() => run(() => editor.chain().focus().toggleBold().run())}>
        <b>加粗</b> <kbd>⌘B</kbd>
      </button>
      <button onClick={() => run(() => editor.chain().focus().toggleItalic().run())}>
        <i>斜体</i> <kbd>⌘I</kbd>
      </button>
      <button onClick={() => run(() => editor.chain().focus().toggleStrike().run())}>
        删除线 <kbd>⌘⇧X</kbd>
      </button>
      <button onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}>
        下划线 <kbd>⌘U</kbd>
      </button>
      <button onClick={() => run(() => editor.chain().focus().toggleCode().run())}>
        行内代码 <kbd>⌘E</kbd>
      </button>

      <div className="context-sep" />

      <button onClick={() => run(() => (editor.chain().focus() as any).toggleHighlight().run())}>
        高亮 <kbd>⌘⇧H</kbd>
      </button>
      <button onClick={() => run(() => editor.chain().focus().setHorizontalRule().run())}>
        插入横线
      </button>
      <button onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}>
        引用
      </button>
      <button onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}>
        无序列表
      </button>
      <button onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}>
        有序列表
      </button>

      <div className="context-sep" />

      {grid ? (
        <div className="table-grid">
          <div className="table-grid-label">{grid.cols} × {grid.rows}</div>
          {Array.from({ length: 6 }, (_, r) => (
            <div className="table-grid-row" key={r}>
              {Array.from({ length: 8 }, (_, c) => (
                <div
                  key={c}
                  className={`table-grid-cell ${r < grid.rows && c < grid.cols ? 'on' : ''}`}
                  onMouseEnter={() => setGrid({ rows: r + 1, cols: c + 1 })}
                  onClick={() => run(() => editor.chain().focus().insertTable({ rows: grid.rows, cols: grid.cols, withHeaderRow: true }).run())}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <button onClick={() => setGrid({ rows: 1, cols: 1 })}>插入表格 ▸</button>
      )}

      {hasSelection && (
        <>
          <div className="context-sep" />
          <button onClick={() => run(() => editor.chain().focus().setLink({ href: window.prompt('链接地址') || '' }).run())}>
            设为链接
          </button>
          <button onClick={onWiki}>插入双向链接</button>
        </>
      )}
    </div>
  );
}

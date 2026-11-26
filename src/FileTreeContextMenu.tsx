import { useEffect, useRef, useState } from 'react';
import type { Entry } from './types';

interface Props {
  entry: Entry | null;
  parentDir: string;
  x: number;
  y: number;
  clipboard: { path: string; cut: boolean } | null;
  onClose: () => void;
  onCreate: (parentDir: string, isDir: boolean, name: string) => void;
  onRename: (entry: Entry, name: string) => void;
  onCopy: (entry: Entry, cut: boolean) => void;
  onPaste: (targetDir: string) => void;
  onTrash: (entry: Entry) => void;
  onReveal: (entry: Entry) => void;
  onOpenWithDefault: (entry: Entry) => void;
  onCopyToAssets: (entry: Entry) => void;
}

const isImage = (name: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(name);

export function FileTreeContextMenu({ entry, parentDir, x, y, clipboard, onClose, onCreate, onRename, onCopy, onPaste, onTrash, onReveal, onOpenWithDefault, onCopyToAssets }: Props) {
  const [mode, setMode] = useState<'idle' | 'create-file' | 'create-dir' | 'rename'>('idle');
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const left = Math.min(x, window.innerWidth - 220);
  const top = Math.min(y, window.innerHeight - 320);

  useEffect(() => { if (mode !== 'idle') inputRef.current?.focus(); }, [mode]);

  const commit = () => {
    const name = value.trim();
    if (!name) { setMode('idle'); return; }
    if (mode === 'rename' && entry) onRename(entry, name);
    else if (mode === 'create-file') onCreate(parentDir, false, name);
    else if (mode === 'create-dir') onCreate(parentDir, true, name);
    onClose();
  };

  if (mode !== 'idle') {
    return (
      <div className="context-menu inline-input-menu" style={{ left, top }} onMouseLeave={onClose}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') onClose();
          }}
          placeholder={mode === 'rename' ? '新名称' : '名称'}
        />
        <button onClick={commit}>确定</button>
      </div>
    );
  }

  return (
    <div className="context-menu" style={{ left, top }} onMouseLeave={onClose}>
      {!entry ? (
        <>
          <button onClick={() => { setMode('create-file'); setValue(''); }}>新建文件</button>
          <button onClick={() => { setMode('create-dir'); setValue(''); }}>新建文件夹</button>
          {clipboard && <button onClick={() => { onPaste(parentDir); onClose(); }}>粘贴</button>}
        </>
      ) : (
        <>
          {entry.isDir && (
            <>
              <button onClick={() => { onPaste(entry.path); onClose(); }} disabled={!clipboard}>粘贴到此处</button>
              <button onClick={() => { setMode('create-file'); setValue(''); }}>在此新建文件</button>
              <div className="context-sep" />
            </>
          )}
          {!entry.isDir && (
            <>
              <button onClick={() => { onCopy(entry, false); onClose(); }}>复制</button>
              <button onClick={() => { onCopy(entry, true); onClose(); }}>剪切</button>
              <button onClick={() => { onReveal(entry); onClose(); }}>在 Finder 中显示</button>
              <button onClick={() => { onOpenWithDefault(entry); onClose(); }}>用系统默认应用打开</button>
              {isImage(entry.name) && (
                <button onClick={() => { onCopyToAssets(entry); onClose(); }}>复制到文档资源目录</button>
              )}
              <div className="context-sep" />
            </>
          )}
          <button onClick={() => { setMode('rename'); setValue(entry.name); }}>重命名</button>
          <button onClick={() => { onTrash(entry); onClose(); }}>移到废纸篓</button>
        </>
      )}
    </div>
  );
}

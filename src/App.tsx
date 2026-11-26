import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from './Editor';
import { Preview } from './Preview';
import { WysiwygEditor } from './WysiwygEditor';
import * as api from './api';
import type { AppState, Buffer, Entry } from './types';
import { buildWikiIndex, findBacklinks, resolveWikiLink } from './wiki';
import './styles.css';

const DEFAULT_STATE: AppState = { recent: [], theme: 'light', folder: null };

// Old versions stored theme:'system'. Migrate once to a concrete theme so the
// "follow system" mode can be removed without leaving existing users stuck.
function normalizeTheme(theme: string | undefined): 'light' | 'dark' {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tabs, setTabs] = useState<Buffer[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [themeDark, setThemeDark] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [backlinks, setBacklinks] = useState<string[]>([]);
  const [backlinksOpen, setBacklinksOpen] = useState(false);
  const [wysiwyg, setWysiwyg] = useState(true);
  const saveTimer = useRef<Record<string, number>>({});
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  useEffect(() => {
    window.__writeTempImage = api.writeTempImage;
    api.loadState().then((s) => {
      const theme = normalizeTheme(s.theme);
      setState({ ...DEFAULT_STATE, ...s, theme });
      setThemeDark(theme === 'dark');
      if (s.folder) {
        api.readFolder(s.folder).then(setEntries).catch(() => setEntries([]));
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    setThemeDark(state.theme === 'dark');
  }, [state.theme]);

  useEffect(() => {
    if (loaded) api.saveState(state).catch(() => {});
  }, [state, loaded]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeDark ? 'dark' : 'light';
    api.setWindowTheme(themeDark).catch(() => {});
  }, [themeDark]);

  const active = tabs.find((t) => t.path === activePath) ?? null;

  // Recompute backlinks when the active document or its content changes.
  useEffect(() => {
    if (!active || !state.folder) { setBacklinks([]); return; }
    let cancelled = false;
    api.listMarkdownFiles(state.folder).then(async (paths) => {
      const docs = await Promise.all(paths.map(async (p) => ({
        path: p,
        content: p === active.path
          ? active.content
          : await api.readFile(p).catch(() => ''),
      })));
      if (!cancelled) setBacklinks(findBacklinks(active.name, docs).filter((p) => p !== active.path));
    }).catch(() => { if (!cancelled) setBacklinks([]); });
    return () => { cancelled = true; };
  }, [active?.path, active?.content, state.folder]);

  const persistBuffer = useCallback((path: string, content: string) => {
    api.writeFile(path, content)
      .then(() => {
        setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, savedContent: content } : t)));
        setStatus('已保存');
      })
      .catch((e) => setStatus(`保存失败: ${String(e)}`));
  }, []);

  const changeContent = useCallback((content: string) => {
    if (!activePath) return;
    setTabs((prev) => prev.map((t) => (t.path === activePath ? { ...t, content } : t)));
    window.clearTimeout(saveTimer.current[activePath]);
    saveTimer.current[activePath] = window.setTimeout(() => {
      const tab = tabsRef.current.find((t) => t.path === activePath);
      if (tab && tab.content !== tab.savedContent) persistBuffer(activePath, tab.content);
    }, 1000);
  }, [activePath, persistBuffer]);

  const forceSave = useCallback(() => {
    if (!activePath) return;
    const tab = tabsRef.current.find((t) => t.path === activePath);
    if (tab && tab.content !== tab.savedContent) {
      window.clearTimeout(saveTimer.current[activePath]);
      persistBuffer(activePath, tab.content);
    }
  }, [activePath, persistBuffer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        forceSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [forceSave]);

  async function openFolder() {
    const folder = await api.pickFolder();
    if (!folder) return;
    const tree = await api.readFolder(folder);
    setEntries(tree);
    setState((s) => ({ ...s, folder }));
  }

  async function openFile(path: string) {
    const existing = tabsRef.current.find((t) => t.path === path);
    if (existing) {
      setActivePath(path);
      return;
    }
    try {
      const content = await api.readFile(path);
      setTabs((prev) => [...prev, { path, name: path.split('/').pop() ?? path, content, savedContent: content }]);
      setActivePath(path);
      setState((s) => {
        const recent = [path, ...s.recent.filter((p) => p !== path)].slice(0, 10);
        return { ...s, recent };
      });
    } catch (e) {
      setStatus(`打开失败: ${String(e)}`);
    }
  }

  function closeTab(path: string) {
    const tab = tabsRef.current.find((t) => t.path === path);
    if (tab && tab.content !== tab.savedContent) {
      if (!window.confirm(`${tab.name} 有未保存的更改，仍要关闭吗？`)) return;
    }
    window.clearTimeout(saveTimer.current[path]);
    setTabs((prev) => prev.filter((t) => t.path !== path));
    if (activePath === path) {
      const remaining = tabsRef.current.filter((t) => t.path !== path);
      setActivePath(remaining.length ? remaining[remaining.length - 1].path : null);
    }
  }

  async function handlePasteImage(tempPath: string) {
    if (!activePath) return;
    const rel = await api.saveImage(tempPath, activePath);
    const imageMd = `![](${rel})`;
    const tab = tabsRef.current.find((t) => t.path === activePath);
    if (tab) changeContent(tab.content + '\n' + imageMd + '\n');
  }

  async function handleWikiClick(href: string) {
    const name = decodeURIComponent(href.replace(/^wiki:\/\//, ''));
    const index = buildWikiIndex(entries);
    const target = resolveWikiLink(name, index);
    if (target) {
      openFile(target);
    } else {
      const count = index.get(name.replace(/\.md$/, ''))?.length ?? 0;
      setStatus(count > 1 ? `「${name}」有多个同名文件，请勿重复命名` : `找不到文档「${name}」`);
    }
  }

  function removeRecent(path: string) {
    setState((s) => ({ ...s, recent: s.recent.filter((p) => p !== path) }));
  }

  function clearRecent() {
    if (window.confirm('确定清空全部访问记录吗？')) {
      setState((s) => ({ ...s, recent: [] }));
    }
  }

  function toggleTheme() {
    setState((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }));
  }

  function renderTree(nodes: Entry[], depth = 0): React.ReactNode {
    return nodes.map((e) => {
      const collapsed = collapsedDirs.has(e.path);
      return (
        <div key={e.path}>
          <button
            className={`tree-item ${activePath === e.path ? 'active' : ''}`}
            style={{ paddingLeft: 12 + depth * 14 }}
            onClick={() => {
              if (e.isDir) {
                setCollapsedDirs((prev) => {
                  const next = new Set(prev);
                  if (next.has(e.path)) next.delete(e.path);
                  else next.add(e.path);
                  return next;
                });
              } else {
                openFile(e.path);
              }
            }}
            title={e.path}
          >
            <span className="tree-icon">{e.isDir ? (collapsed ? '▸' : '▾') : '·'}</span>
            {e.name}
          </button>
          {e.isDir && !collapsed && e.children && renderTree(e.children, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="app">
      <header className="titlebar">
        <button className="icon-btn" onClick={openFolder} title="打开文件夹">📁</button>
        <div className="tabs">
          {tabs.map((t) => (
            <div key={t.path} className={`tab ${activePath === t.path ? 'active' : ''}`}>
              <button className="tab-label" onClick={() => setActivePath(t.path)}>
                {t.name}
                {t.content !== t.savedContent ? ' ●' : ''}
              </button>
              <button className="tab-close" onClick={() => closeTab(t.path)}>×</button>
            </div>
          ))}
        </div>
        {active && (
          <button
            className="icon-btn mode-btn"
            onClick={() => setWysiwyg((v) => !v)}
            title={wysiwyg ? '切换到源码 + 预览（双栏）' : '切换到所见即所得（单栏）'}
          >
            {wysiwyg ? '双栏' : '单栏'}
          </button>
        )}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={`主题：${state.theme === 'light' ? '亮色' : '暗色'}（点击切换）`}
        >
          {themeDark ? '☀' : '☾'}
        </button>
      </header>

      <div className="body">
        {state.folder && (
          <aside className="sidebar">
            <div className="sidebar-title">{state.folder.split('/').pop()}</div>
            <div className="tree">{renderTree(entries)}</div>
            <div className="backlinks">
              <button className="backlinks-toggle" onClick={() => setBacklinksOpen((v) => !v)}>
                {backlinksOpen ? '▾' : '▸'} 反向链接 ({backlinks.length})
              </button>
              {backlinksOpen && (
                <div className="backlinks-list">
                  {backlinks.length === 0 ? (
                    <div className="backlinks-empty">暂无反向链接</div>
                  ) : backlinks.map((p) => (
                    <button key={p} className="backlink-item" onClick={() => openFile(p)} title={p}>
                      {p.split('/').pop()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        <main className="workspace">
          {active ? (
            wysiwyg ? (
              <WysiwygEditor
                key={active.path}
                value={active.content}
                onChange={changeContent}
                onSave={forceSave}
                onPasteImage={handlePasteImage}
                onWikiClick={(name) => handleWikiClick(`wiki://${encodeURIComponent(name)}`)}
                onInsertWiki={() => {
                  const name = window.prompt('要链接的文档名（不含 .md）');
                  if (name && activePath) {
                    const tab = tabsRef.current.find((t) => t.path === activePath);
                    if (tab) changeContent(tab.content + `\n[[${name}]]\n`);
                  }
                }}
                theme={themeDark ? 'dark' : 'light'}
              />
            ) : (
              <div className="split">
                <Editor
                  key={active.path}
                  value={active.content}
                  onChange={changeContent}
                  onSave={forceSave}
                  onPasteImage={handlePasteImage}
                  theme={themeDark ? 'dark' : 'light'}
                />
                <div onClick={(e) => {
                  const a = (e.target as HTMLElement).closest('a');
                  if (a?.getAttribute('href')?.startsWith('wiki://')) {
                    e.preventDefault();
                    handleWikiClick(a.getAttribute('href')!);
                  }
                }} className="preview-click-host">
                  <Preview source={active.content} docPath={active.path} />
                </div>
              </div>
            )
          ) : (
            <div className="welcome">
              <h1>Quill Markdown</h1>
              <p className="subtitle">小巧、本地优先的 Markdown 写作工具</p>
              <button className="primary" onClick={openFolder}>打开文件夹</button>
              {state.recent.length > 0 && (
                <>
                  <div className="recent-header">
                    <h2>最近打开</h2>
                    <button className="recent-clear" onClick={clearRecent}>清空</button>
                  </div>
                  <ul className="recent">
                    {state.recent.map((p) => (
                      <li key={p}>
                        <button className="recent-open" onClick={() => openFile(p)}>{p.split('/').pop()}</button>
                        <button className="recent-remove" onClick={() => removeRecent(p)} title="移除此记录">×</button>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {status && <div className="statusbar" onAnimationEnd={() => setStatus('')}>{status}</div>}
    </div>
  );
}

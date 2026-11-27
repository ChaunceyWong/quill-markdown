import MarkdownIt from 'markdown-it';
import { resolveAsset } from './api';

// Images are immutable once written (names carry a nanosecond timestamp), so
// caching their data URLs avoids re-reading and re-encoding them on every
// preview render.
const assetCache = new Map<string, Promise<string>>();

export function resolveAssetCached(path: string): Promise<string> {
  const cached = assetCache.get(path);
  if (cached) return cached;
  const p = resolveAsset(path);
  assetCache.set(path, p);
  p.catch(() => assetCache.delete(path));
  return p;
}

export const md: MarkdownIt = new MarkdownIt({
  // Needed for <span style="color:..."> emitted by the WYSIWYG color/highlight
  // marks. Content is strictly local user-authored files.
  html: true,
  linkify: true,
  typographer: false,
  breaks: false,
});

/**
 * Render Markdown to HTML. Relative images inside `_assets/` are resolved
 * to data URLs via the Rust backend, so preview works without depending on
 * Tauri's asset protocol. Absolute http(s)/data URLs are left untouched.
 * [[wiki links]] become clickable anchors handled by the app shell.
 */
export async function render(source: string, docPath: string | null): Promise<string> {
  const wikiExpanded = source.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, name: string, label?: string) => {
    const target = name.trim();
    const text = (label ?? name).trim();
    return `[${text}](wiki://${encodeURIComponent(target)})`;
  });
  const tokens = md.parse(wikiExpanded, {});
  let html = md.renderer.render(tokens, md.options, {});
  if (!docPath) return html;

  const dir = docPath.replace(/\/[^/]+$/, '');
  const refs: { index: number; abs: string }[] = [];
  let counter = 0;

  html = html.replace(/<img([^>]+)src="([^"]+)"([^>]*)>/g, (m, a, src: string, b) => {
    if (/^(https?:|data:|file:)/i.test(src)) return m;
    const marker = `__QUILL_IMG_${counter++}__`;
    refs.push({ index: counter - 1, abs: `${dir}/${src.replace(/^\.\//, '')}` });
    return `<img${a}src="${marker}"${b}>`;
  });
  if (refs.length === 0) return html;

  const dataUrls = await Promise.all(
    refs.map(async ({ abs }) => {
      try { return await resolveAssetCached(abs); } catch { return abs; }
    })
  );
  refs.forEach(({ index }) => {
    html = html.replace(`__QUILL_IMG_${index}__`, dataUrls[index]);
  });
  return html;
}

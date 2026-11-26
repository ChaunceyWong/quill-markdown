import MarkdownIt from 'markdown-it';
import { resolveAsset } from './api';

export const md: MarkdownIt = new MarkdownIt({
  html: false,
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
      try { return await resolveAsset(abs); } catch { return abs; }
    })
  );
  refs.forEach(({ index }) => {
    html = html.replace(`__QUILL_IMG_${index}__`, dataUrls[index]);
  });
  return html;
}

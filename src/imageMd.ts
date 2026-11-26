import { resolveAsset } from './api';

/**
 * WYSIWYG (TipTap) loads Markdown directly, but a WKWebView cannot resolve
 * relative image paths such as `_assets/x.png`. Convert them to data URLs for
 * display, and keep a reverse map so saving writes the original relative
 * paths back instead of embedding huge data URLs into the .md file.
 */
export async function toEditorMarkdown(
  source: string,
  docPath: string | null
): Promise<{ markdown: string; reverse: Map<string, string> }> {
  const reverse = new Map<string, string>();
  if (!docPath) return { markdown: source, reverse };

  const dir = docPath.replace(/\/[^/]+$/, '');
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const out: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(source))) {
    out.push(source.slice(last, m.index));
    const src = m[2];
    if (/^(https?:|data:|file:)/i.test(src)) {
      out.push(m[0]);
    } else {
      try {
        const abs = `${dir}/${src.replace(/^\.\//, '')}`;
        const dataUrl = await resolveAsset(abs);
        reverse.set(dataUrl, src);
        out.push(`![${m[1]}](${dataUrl})`);
      } catch {
        out.push(m[0]);
      }
    }
    last = m.index + m[0].length;
  }
  out.push(source.slice(last));
  return { markdown: out.join(''), reverse };
}

/** Restore relative paths from data URLs before writing back to the .md file. */
export function fromEditorMarkdown(source: string, reverse: Map<string, string>): string {
  let result = source;
  for (const [dataUrl, rel] of reverse) {
    result = result.split(dataUrl).join(rel);
  }
  return result;
}

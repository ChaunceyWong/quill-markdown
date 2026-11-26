export interface OutlineItem {
  level: number;   // 1-6
  text: string;
  line: number;    // 0-based line index in the markdown source
  slug: string;    // stable identifier derived from text + occurrence
  headingIndex: number; // occurrence index among headings with the same text
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/** Parse ATX headings (# ... ######) from Markdown source. */
export function parseOutline(source: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const seen = new Map<string, number>();
  let headingIndex = 0;
  source.split('\n').forEach((lineText, line) => {
    const m = lineText.match(HEADING);
    if (!m) return;
    const level = m[1].length;
    const text = m[2].trim();
    const base = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/^-|-$/g, '') || 'heading';
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    items.push({ level, text, line, slug: count === 0 ? base : `${base}-${count}`, headingIndex: headingIndex++ });
  });
  return items;
}

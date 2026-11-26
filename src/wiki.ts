import type { Entry } from './types';

const WIKI_LINK = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/** Return all file names referenced by [[wiki links]] in a Markdown source. */
export function extractWikiLinks(source: string): string[] {
  const names: string[] = [];
  for (const m of source.matchAll(WIKI_LINK)) {
    const name = m[1].trim();
    if (name) names.push(name);
  }
  return names;
}

export interface WikiTarget {
  name: string;
  paths: string[];
}

/** Flatten an Entry tree into a name -> paths index of all .md files. */
export function buildWikiIndex(entries: Entry[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const walk = (nodes: Entry[]) => {
    for (const e of nodes) {
      if (e.isDir) {
        if (e.children) walk(e.children);
      } else if (e.name.endsWith('.md')) {
        const stem = e.name.replace(/\.md$/, '');
        const list = index.get(stem) ?? [];
        list.push(e.path);
        index.set(stem, list);
      }
    }
  };
  walk(entries);
  return index;
}

/** Resolve a wiki link name to a path. Returns null when not found or ambiguous. */
export function resolveWikiLink(name: string, index: Map<string, string[]>): string | null {
  const paths = index.get(name.replace(/\.md$/, ''));
  return paths && paths.length === 1 ? paths[0] : null;
}

/** Find every .md file whose source references the given file name. */
export function findBacklinks(
  targetName: string,
  docs: { path: string; content: string }[]
): string[] {
  const stem = targetName.replace(/\.md$/, '');
  return docs
    .filter((d) => extractWikiLinks(d.content).some((n) => n.replace(/\.md$/, '') === stem))
    .map((d) => d.path);
}

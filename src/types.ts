export interface Entry {
  path: string;
  name: string;
  isDir: boolean;
  children: Entry[] | null;
}

export interface Buffer {
  path: string;
  name: string;
  content: string;
  savedContent: string;
  kind?: 'markdown' | 'image';
}

export interface PendingInsert {
  id: number;
  text: string;
}

export interface AppState {
  recent: string[];
  theme: 'light' | 'dark';
  folder: string | null;
}

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
  kind?: 'markdown' | 'image' | 'text';
}

export interface PendingInsert {
  id: number;
  text: string;
}

export interface AppState {
  recent: string[];
  theme: 'light' | 'dark' | 'care';
  /** Warm-yellow depth for eye-care mode, 0-100. */
  careTint: number;
  folder: string | null;
}

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { AppState, Entry } from './types';

export async function pickFolder(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  return typeof result === 'string' ? result : null;
}

export function readFolder(path: string): Promise<Entry[]> {
  return invoke<Entry[]>('read_folder', { path });
}

export function readFile(path: string): Promise<string> {
  return invoke<string>('read_file', { path });
}

export function listMarkdownFiles(root: string): Promise<string[]> {
  return invoke<string[]>('list_markdown_files', { root });
}

export function writeFile(path: string, content: string): Promise<void> {
  return invoke('write_file', { path, content });
}

export function resolveAsset(path: string): Promise<string> {
  return invoke<string>('read_asset', { path });
}

export function writeTempImage(dataUrl: string): Promise<string> {
  return invoke<string>('write_temp_image', { dataUrl });
}

export function saveImage(sourcePath: string, docPath: string): Promise<string> {
  return invoke<string>('save_image', { sourcePath, docPath });
}

export function loadState(): Promise<AppState> {
  return invoke<AppState>('load_state');
}

export function saveState(state: AppState): Promise<void> {
  return invoke('save_state', { state });
}

export function setWindowTheme(dark: boolean): Promise<void> {
  return invoke('set_window_theme', { dark });
}

export function createEntry(path: string, isDir: boolean): Promise<void> {
  return invoke('create_entry', { path, isDir });
}

export function renameEntry(from: string, to: string): Promise<void> {
  return invoke('rename_entry', { from, to });
}

export function copyEntry(from: string, to: string, cut: boolean): Promise<void> {
  return invoke('copy_entry', { from, to, cut });
}

export function trashEntry(path: string): Promise<void> {
  return invoke('trash_entry', { path });
}

export function revealInFinder(path: string): Promise<void> {
  return invoke('reveal_in_finder', { path });
}

export function openWithDefaultApp(path: string): Promise<void> {
  return invoke('open_with_default_app', { path });
}

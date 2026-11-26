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

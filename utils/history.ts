import type { FrameworkName } from './readers/types';

export interface HistoryEntry {
  path: string;
  framework: FrameworkName;
  timestamp: number;
}

const STORAGE_KEY = 'rctHistory';
const MAX_ENTRIES = 20;

export async function getHistory(): Promise<HistoryEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
}

export async function addHistoryEntry(
  path: string,
  framework: FrameworkName,
): Promise<HistoryEntry[]> {
  const history = await getHistory();
  const entry: HistoryEntry = { path, framework, timestamp: Date.now() };
  const updated = [entry, ...history].slice(0, MAX_ENTRIES);
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  return updated;
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

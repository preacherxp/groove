import type { FrameworkReader } from './types';

function getSvelteMeta(el: Element): any {
  return (el as any).__svelte_meta;
}

function findSvelteElement(el: Element): Element | null {
  let current: Element | null = el;
  while (current) {
    if (getSvelteMeta(current)) return current;
    current = current.parentElement;
  }
  return null;
}

function parseComponentName(file: string): string | null {
  // "src/lib/Header.svelte" → "Header"
  const match = file.match(/([^/\\]+)\.svelte$/);
  return match ? match[1] : null;
}

function collectAncestors(startEl: Element): string[] {
  const components: string[] = [];
  const seenFiles = new Set<string>();
  let current: Element | null = startEl;

  while (current) {
    const meta = getSvelteMeta(current);
    if (meta?.loc?.file && !seenFiles.has(meta.loc.file)) {
      seenFiles.add(meta.loc.file);
      const name = parseComponentName(meta.loc.file);
      if (name) {
        components.unshift(name);
      }
    }
    current = current.parentElement;
  }

  return components;
}

export const svelteReader: FrameworkReader = {
  name: 'svelte',
  read(el: Element) {
    const hit = findSvelteElement(el);
    if (!hit) return null;

    const components = collectAncestors(el);
    return { framework: 'svelte', components };
  },
};

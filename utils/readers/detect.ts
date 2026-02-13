import type { FrameworkReader, ComponentReadResult, FrameworkName } from './types';
import { reactReader } from './react-reader';
import { vueReader } from './vue-reader';
import { angularReader } from './angular-reader';
import { svelteReader } from './svelte-reader';

const readers: FrameworkReader[] = [
  reactReader,
  vueReader,
  angularReader,
  svelteReader,
];

export function detectAndRead(el: Element): ComponentReadResult | null {
  for (const reader of readers) {
    const result = reader.read(el);
    if (result) return result;
  }
  return null;
}

/** Check if a DOM element has React fiber or container keys */
function hasReactKeys(el: Element): boolean {
  return Object.keys(el).some(
    (k) =>
      k.startsWith('__reactFiber$') ||
      k.startsWith('__reactInternalInstance$') ||
      k.startsWith('__reactContainer$'),
  );
}

/** Proactive page-level detection: is any supported framework present? */
export function detectFramework(): { available: boolean; framework?: FrameworkName } {
  // Angular: fast global check
  if ((window as any).ng?.getComponent) {
    return { available: true, framework: 'angular' };
  }

  // Vue 3 dev mode sets window.__VUE__
  if ((window as any).__VUE__) {
    return { available: true, framework: 'vue' };
  }

  // React: check common mount containers for __reactContainer$
  const containers = document.querySelectorAll('#root, #app, #__next, #__nuxt, [data-reactroot]');
  for (const el of containers) {
    if (hasReactKeys(el)) {
      return { available: true, framework: 'react' };
    }
  }

  // Also check body's direct children as potential React containers
  for (const child of document.body.children) {
    if (hasReactKeys(child)) {
      return { available: true, framework: 'react' };
    }
  }

  // TreeWalker scan for React fiber, Vue instance, or Svelte meta on elements
  const roots = document.querySelectorAll('#root, #app, #__next, #__nuxt, [data-reactroot], main, body');
  const checked = new Set<Element>();
  const MAX = 200;

  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node: Element | null = walker.currentNode as Element;
    while (node && checked.size < MAX) {
      if (!checked.has(node)) {
        checked.add(node);

        // React
        if (hasReactKeys(node)) {
          return { available: true, framework: 'react' };
        }

        // Vue
        if ((node as any).__vueParentComponent) {
          return { available: true, framework: 'vue' };
        }

        // Svelte
        if ((node as any).__svelte_meta) {
          return { available: true, framework: 'svelte' };
        }
      }
      node = walker.nextNode() as Element | null;
    }
    if (checked.size >= MAX) break;
  }

  return { available: false };
}

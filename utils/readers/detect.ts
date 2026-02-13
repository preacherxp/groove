import type { FrameworkReader, ComponentReadResult } from './types';
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

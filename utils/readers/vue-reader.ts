import type { FrameworkReader } from './types';

function getVueInstance(el: Element): any {
  let current: Element | null = el;
  while (current) {
    const instance = (current as any).__vueParentComponent;
    if (instance) return instance;
    current = current.parentElement;
  }
  return null;
}

function getComponentName(instance: any): string | null {
  const type = instance.type;
  if (!type) return null;

  if (type.name) return type.name;
  if (type.__name) return type.__name;

  // Parse from __file: "src/components/Header.vue" → "Header"
  if (type.__file) {
    const match = type.__file.match(/([^/\\]+)\.vue$/);
    if (match) return match[1];
  }

  return null;
}

function collectAncestors(instance: any): string[] {
  const components: string[] = [];
  let current = instance;

  while (current) {
    const name = getComponentName(current);
    if (name) {
      components.unshift(name);
    }
    current = current.parent;
  }

  return components;
}

export const vueReader: FrameworkReader = {
  name: 'vue',
  read(el: Element) {
    const instance = getVueInstance(el);
    if (!instance) return null;

    const components = collectAncestors(instance);
    return { framework: 'vue', components };
  },
};

import type { FrameworkReader } from './types';

function getNg(): any {
  return (window as any).ng;
}

function findComponentElement(el: Element): { component: any; element: Element } | null {
  const ng = getNg();
  if (!ng?.getComponent) return null;

  let current: Element | null = el;
  while (current) {
    const component = ng.getComponent(current);
    if (component) return { component, element: current };
    current = current.parentElement;
  }
  return null;
}

function collectAncestors(startEl: Element): string[] {
  const ng = getNg();
  if (!ng?.getComponent) return [];

  const components: string[] = [];
  const seen = new Set<any>();
  let current: Element | null = startEl;

  while (current) {
    const component = ng.getComponent(current);
    if (component && !seen.has(component)) {
      seen.add(component);
      const name = component.constructor.name;
      if (name && name !== 'Object') {
        components.unshift(name);
      }
    }
    current = current.parentElement;
  }

  return components;
}

export const angularReader: FrameworkReader = {
  name: 'angular',
  read(el: Element) {
    const hit = findComponentElement(el);
    if (!hit) return null;

    const components = collectAncestors(el);
    return { framework: 'angular', components };
  },
};

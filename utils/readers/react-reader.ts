import type { FrameworkReader } from './types';

function getFiber(el: Element): any {
  const keys = Object.keys(el);
  const fiberKey = keys.find(
    (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
  );
  return fiberKey ? (el as any)[fiberKey] : null;
}

function getComponentName(fiber: any): string | null {
  const { type, elementType } = fiber;
  if (!type) return null;
  if (typeof type === 'string') return null; // host element (div, span, etc.)

  // React.memo — check elementType first since React optimizes
  // SimpleMemoComponent (tag 15) by setting fiber.type to the inner
  // function while preserving the memo wrapper on fiber.elementType
  const memoSource = elementType?.$$typeof === Symbol.for('react.memo') ? elementType : type;
  if (memoSource.$$typeof === Symbol.for('react.memo')) {
    if (memoSource.displayName) return memoSource.displayName;
    const inner = memoSource.type;
    if (inner?.displayName) return inner.displayName;
    if (inner?.name && !isMinifiedName(inner.name)) return inner.name;
    return null;
  }

  // Direct function/class component
  if (type.displayName) return type.displayName;
  if (type.name && !isMinifiedName(type.name)) return type.name;

  // React.forwardRef
  if (type.$$typeof === Symbol.for('react.forward_ref')) {
    const render = type.render;
    if (render?.displayName) return render.displayName;
    if (render?.name && !isMinifiedName(render.name)) return render.name;
    return null;
  }

  // React.lazy
  if (type.$$typeof === Symbol.for('react.lazy')) {
    const resolved = type._payload?.value;
    if (resolved?.displayName) return resolved.displayName;
    if (resolved?.name && !isMinifiedName(resolved.name)) return resolved.name;
    return null;
  }

  // Context provider/consumer — skip
  if (
    type.$$typeof === Symbol.for('react.provider') ||
    type.$$typeof === Symbol.for('react.context')
  ) {
    return null;
  }

  return null;
}

function isMinifiedName(name: string): boolean {
  return name.length <= 2;
}

function collectAncestors(fiber: any): string[] {
  const components: string[] = [];
  let current = fiber;

  while (current) {
    const name = getComponentName(current);
    if (name) {
      components.unshift(name);
    }
    current = current.return;
  }

  return components;
}

export const reactReader: FrameworkReader = {
  name: 'react',
  read(el: Element) {
    const fiber = getFiber(el);
    if (!fiber) return null;

    const components = collectAncestors(fiber);
    return { framework: 'react', components };
  },
};

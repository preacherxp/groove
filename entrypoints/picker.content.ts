import type { RuntimeMessage, FiberPathResponse, HoverTreeResponse, DetectFrameworkResponse } from '~/utils/messaging';
import type { FrameworkName } from '~/utils/readers/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  async main() {
    let picking = false;
    let currentDepth = 0;
    let overlay: HTMLDivElement | null = null;
    let scriptEl: HTMLScriptElement | null = null;

    // Hover tooltip state
    let tooltipEl: HTMLDivElement | null = null;
    let hoverCache = new WeakMap<Element, { components: string[]; framework: FrameworkName }>();
    let lastHoveredElement: Element | null = null;
    let hoverDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingHoverId: string | null = null;

    // Inject the MAIN world component-reader script
    const injected = await injectScript('/component-reader.js', { keepInDom: true });
    scriptEl = injected.script;

    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((msg: RuntimeMessage, _sender, sendResponse) => {
      if (msg.type === 'START_PICK') {
        currentDepth = msg.depth;
        startPicking();
        sendResponse({ ok: true });
      }

      if (msg.type === 'DETECT_FRAMEWORK') {
        const detectId = crypto.randomUUID();

        const onResult = ((evt: CustomEvent<DetectFrameworkResponse>) => {
          if (evt.detail.detectId !== detectId) return;
          scriptEl?.removeEventListener('rct-detect-framework-result', onResult as EventListener);
          sendToBackground({
            type: 'DETECT_RESULT',
            available: evt.detail.available,
            framework: evt.detail.framework,
          });
        }) as EventListener;

        scriptEl?.addEventListener('rct-detect-framework-result', onResult);
        scriptEl?.dispatchEvent(
          new CustomEvent('rct-detect-framework', { detail: { detectId } }),
        );

        sendResponse({ ok: true });
      }

      return false;
    });

    function startPicking() {
      if (picking) return;
      picking = true;
      createOverlay();
      createTooltip();
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
    }

    function stopPicking() {
      if (!picking) return;
      picking = false;
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      removeOverlay();
      removeTooltip();
      if (hoverDebounceTimer !== null) {
        clearTimeout(hoverDebounceTimer);
        hoverDebounceTimer = null;
      }
      lastHoveredElement = null;
      pendingHoverId = null;
      hoverCache = new WeakMap();
    }

    function createOverlay() {
      if (overlay) return;
      overlay = document.createElement('div');
      overlay.id = 'rct-picker-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        border: '2px solid #F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        pointerEvents: 'none',
        zIndex: '2147483647',
        transition: 'all 50ms ease-out',
        display: 'none',
      } satisfies Partial<CSSStyleDeclaration>);
      document.body.appendChild(overlay);
    }

    function removeOverlay() {
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
    }

    const FRAMEWORK_COLORS: Record<FrameworkName, string> = {
      react: '#0ea5e9',
      vue: '#42b883',
      angular: '#dd0031',
      svelte: '#ff3e00',
    };

    function createTooltip() {
      if (tooltipEl) return;
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'rct-hover-tooltip';
      Object.assign(tooltipEl.style, {
        position: 'fixed',
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '6px',
        padding: '8px 12px',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
        fontSize: '12px',
        lineHeight: '1.5',
        color: '#e6edf3',
        overflow: 'visible',
        zIndex: '2147483646',
        pointerEvents: 'none',
        display: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        whiteSpace: 'pre',
      } satisfies Partial<CSSStyleDeclaration>);
      document.body.appendChild(tooltipEl);
    }

    function removeTooltip() {
      if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = null;
      }
    }

    function positionTooltip(rect: DOMRect) {
      if (!tooltipEl) return;

      const gap = 8;
      const tooltipRect = tooltipEl.getBoundingClientRect();

      // Try above the element first
      let top = rect.top - tooltipRect.height - gap;
      if (top < 4) {
        // Fallback: below the element
        top = rect.bottom + gap;
      }

      // Clamp horizontal position to viewport
      let left = rect.left;
      const maxLeft = window.innerWidth - tooltipRect.width - 4;
      if (left > maxLeft) left = maxLeft;
      if (left < 4) left = 4;

      Object.assign(tooltipEl.style, {
        top: top + 'px',
        left: left + 'px',
      });
    }

    function displayHoverTree(components: string[], framework: FrameworkName, rect: DOMRect) {
      if (!tooltipEl) return;

      const color = FRAMEWORK_COLORS[framework];
      const badge = `<span style="display:inline-block;background:${color};color:#000;font-weight:600;padding:1px 6px;border-radius:3px;font-size:11px;margin-bottom:4px;">${framework}</span>`;

      const tree = components
        .map((name, i) => {
          const indent = '&nbsp;'.repeat(i);
          const prefix = i === components.length - 1 ? '└ ' : '├ ';
          const isTarget = i === components.length - 1;
          const label = isTarget
            ? `<span style="color:#F97316;font-weight:700;background:rgba(249,115,22,0.15);padding:0 4px;border-radius:3px;">${name}</span>`
            : name;
          return `${indent}${prefix}${label}`;
        })
        .join('\n');

      tooltipEl.innerHTML = badge + '\n' + tree;
      tooltipEl.style.display = 'block';

      // Position after content is rendered so we get accurate dimensions
      positionTooltip(rect);
    }

    function requestHoverTree(target: Element, rect: DOMRect) {
      // Check cache first
      const cached = hoverCache.get(target);
      if (cached) {
        displayHoverTree(cached.components, cached.framework, rect);
        return;
      }

      // Clean previous hover markers
      document.querySelectorAll('[data-rct-hover]').forEach((el) => {
        el.removeAttribute('data-rct-hover');
      });

      // Mark element for the page script
      target.setAttribute('data-rct-hover', 'true');
      const hoverId = crypto.randomUUID();
      pendingHoverId = hoverId;

      const onResult = ((evt: CustomEvent<HoverTreeResponse>) => {
        if (evt.detail.hoverId !== hoverId) return;
        scriptEl?.removeEventListener('rct-hover-tree-result', onResult as EventListener);

        target.removeAttribute('data-rct-hover');

        if (pendingHoverId !== hoverId) return; // stale response

        if (evt.detail.components && evt.detail.framework) {
          const result = { components: evt.detail.components, framework: evt.detail.framework };
          hoverCache.set(target, result);
          // Only display if still hovering this element
          if (lastHoveredElement === target) {
            displayHoverTree(result.components, result.framework, rect);
          }
        } else {
          // No result — hide tooltip
          if (tooltipEl) tooltipEl.style.display = 'none';
        }
      }) as EventListener;

      scriptEl?.addEventListener('rct-hover-tree-result', onResult);

      scriptEl?.dispatchEvent(
        new CustomEvent('rct-get-hover-tree', { detail: { hoverId, depth: currentDepth } }),
      );
    }

    function onMouseMove(e: MouseEvent) {
      const target = e.target as Element;
      if (!target || !overlay) return;

      // Don't highlight our own overlay or tooltip
      if (
        target === overlay ||
        target.id === 'rct-picker-overlay' ||
        target === tooltipEl ||
        target.id === 'rct-hover-tooltip'
      ) return;

      const rect = target.getBoundingClientRect();
      Object.assign(overlay.style, {
        top: rect.top + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        display: 'block',
      });

      // Hover tooltip logic
      if (target === lastHoveredElement) {
        // Same element — just reposition tooltip
        if (tooltipEl && tooltipEl.style.display !== 'none') {
          positionTooltip(rect);
        }
        return;
      }

      lastHoveredElement = target;

      // Clear previous debounce
      if (hoverDebounceTimer !== null) {
        clearTimeout(hoverDebounceTimer);
      }

      // Hide tooltip while waiting for new result
      if (tooltipEl) tooltipEl.style.display = 'none';

      hoverDebounceTimer = setTimeout(() => {
        hoverDebounceTimer = null;
        requestHoverTree(target, rect);
      }, 150);
    }

    function onClick(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const target = e.target as Element;
      if (!target || target === overlay) return;

      // Clean up any previous pick marker
      document.querySelectorAll('[data-rct-pick]').forEach((el) => {
        el.removeAttribute('data-rct-pick');
      });

      // Mark the clicked element for the page script to find
      target.setAttribute('data-rct-pick', 'true');
      const pickId = crypto.randomUUID();

      // Listen for the response from the page script
      const onResult = ((evt: CustomEvent<FiberPathResponse>) => {
        if (evt.detail.pickId !== pickId) return;
        scriptEl?.removeEventListener('rct-fiber-path-result', onResult as EventListener);

        // Clean up marker
        target.removeAttribute('data-rct-pick');
        stopPicking();

        if (evt.detail.error) {
          sendToBackground({ type: 'PICK_ERROR', error: evt.detail.error, framework: evt.detail.framework });
        } else if (evt.detail.path) {
          const framework = evt.detail.framework!;
          navigator.clipboard.writeText(evt.detail.path).then(
            () => {
              showCopiedToast(evt.detail.path!);
              sendToBackground({ type: 'PICK_RESULT', path: evt.detail.path!, framework });
            },
            (err) => sendToBackground({ type: 'PICK_ERROR', error: `Clipboard write failed: ${err}`, framework }),
          );
        }
      }) as EventListener;

      scriptEl?.addEventListener('rct-fiber-path-result', onResult);

      // Ask the page script to read the fiber tree
      scriptEl?.dispatchEvent(
        new CustomEvent('rct-get-fiber-path', { detail: { pickId, depth: currentDepth } }),
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        stopPicking();
      }
    }

    function showCopiedToast(path: string) {
      const bar = document.createElement('div');
      Object.assign(bar.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: 'linear-gradient(135deg, #161b22 0%, #1c2333 100%)',
        borderBottom: '2px solid #F97316',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        pointerEvents: 'none',
        zIndex: '2147483647',
        opacity: '1',
        transform: 'translateY(0)',
        transition: 'opacity 300ms ease, transform 300ms ease',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      } satisfies Partial<CSSStyleDeclaration>);

      const check = document.createElement('span');
      check.textContent = '\u2713';
      Object.assign(check.style, {
        color: '#2ea043',
        fontSize: '16px',
        fontWeight: '700',
      });

      const label = document.createElement('span');
      label.textContent = 'Copied';
      Object.assign(label.style, {
        color: '#e6edf3',
        fontSize: '13px',
        fontWeight: '600',
      });

      const pathEl = document.createElement('span');
      pathEl.textContent = path;
      Object.assign(pathEl.style, {
        color: '#F97316',
        fontSize: '12px',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
        maxWidth: '50vw',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });

      bar.appendChild(check);
      bar.appendChild(label);
      bar.appendChild(pathEl);
      document.body.appendChild(bar);

      // Slide out and remove
      setTimeout(() => {
        bar.style.opacity = '0';
        bar.style.transform = 'translateY(-100%)';
        setTimeout(() => bar.remove(), 350);
      }, 1500);
    }

    function sendToBackground(msg: RuntimeMessage) {
      chrome.runtime.sendMessage(msg);
    }
  },
});

import type { RuntimeMessage, FiberPathResponse } from '~/utils/messaging';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  async main() {
    let picking = false;
    let currentDepth = 0;
    let overlay: HTMLDivElement | null = null;
    let scriptEl: HTMLScriptElement | null = null;

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
      return false;
    });

    function startPicking() {
      if (picking) return;
      picking = true;
      createOverlay();
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
    }

    function createOverlay() {
      if (overlay) return;
      overlay = document.createElement('div');
      overlay.id = 'rct-picker-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        border: '2px solid #61dafb',
        backgroundColor: 'rgba(97, 218, 251, 0.1)',
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

    function onMouseMove(e: MouseEvent) {
      const target = e.target as Element;
      if (!target || !overlay) return;

      // Don't highlight our own overlay
      if (target === overlay || target.id === 'rct-picker-overlay') return;

      const rect = target.getBoundingClientRect();
      Object.assign(overlay.style, {
        top: rect.top + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        display: 'block',
      });
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
            () => sendToBackground({ type: 'PICK_RESULT', path: evt.detail.path!, framework }),
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

    function sendToBackground(msg: RuntimeMessage) {
      chrome.runtime.sendMessage(msg);
    }
  },
});

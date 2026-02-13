import type { FiberPathRequest, FiberPathResponse } from '~/utils/messaging';
import { detectAndRead } from '~/utils/readers/detect';

export default defineUnlistedScript({
  main() {
    const scriptEl = document.currentScript;
    if (!scriptEl) return;

    scriptEl.addEventListener('rct-get-fiber-path', ((e: CustomEvent<FiberPathRequest>) => {
      const { pickId, depth } = e.detail;
      const response: FiberPathResponse = { pickId };

      try {
        const el = document.querySelector('[data-rct-pick]');
        if (!el) {
          response.error = 'No element marked for picking';
          dispatch(response);
          return;
        }

        const result = detectAndRead(el);
        if (!result) {
          response.error = 'No framework detected — is React, Vue, Angular, or Svelte running on this page?';
          dispatch(response);
          return;
        }

        response.framework = result.framework;

        if (result.components.length === 0) {
          response.error = 'No components found in ancestor tree';
          dispatch(response);
          return;
        }

        const trimmed = depth > 0 ? result.components.slice(-depth) : result.components;
        response.path = trimmed.join(' > ');
      } catch (err) {
        response.error = String(err);
      }

      dispatch(response);
    }) as EventListener);

    function dispatch(detail: FiberPathResponse) {
      scriptEl!.dispatchEvent(
        new CustomEvent('rct-fiber-path-result', { detail }),
      );
    }
  },
});

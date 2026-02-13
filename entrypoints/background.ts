import type { RuntimeMessage } from '~/utils/messaging';
import { addHistoryEntry } from '~/utils/history';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((msg: RuntimeMessage, sender, sendResponse) => {
    if (msg.type === 'START_PICK') {
      // Forward from popup to the active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, msg);
        }
      });
      sendResponse({ ok: true });
      return false;
    }

    if (msg.type === 'DETECT_FRAMEWORK') {
      // Forward from popup to the active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, msg);
        }
      });
      sendResponse({ ok: true });
      return false;
    }

    if (msg.type === 'DETECT_RESULT') {
      chrome.runtime.sendMessage(msg).catch(() => {});
      return false;
    }

    if (msg.type === 'PICK_RESULT') {
      // Save to history (works even if popup is closed)
      addHistoryEntry(msg.path, msg.framework);
      // Forward to popup if still open
      chrome.runtime.sendMessage(msg).catch(() => {});
      return false;
    }

    if (msg.type === 'PICK_ERROR') {
      chrome.runtime.sendMessage(msg).catch(() => {});
      return false;
    }
  });
});

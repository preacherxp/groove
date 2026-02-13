import { useState, useEffect } from 'react';
import type { RuntimeMessage } from '~/utils/messaging';
import type { FrameworkName } from '~/utils/readers/types';
import {
  getHistory,
  clearHistory,
  type HistoryEntry,
} from '~/utils/history';

type Status =
  | { kind: 'idle' }
  | { kind: 'picking' }
  | { kind: 'copied'; path: string; framework: FrameworkName }
  | { kind: 'error'; message: string };

function Logo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="64" y1="28" x2="36" y2="60" stroke="#61dafb" strokeWidth="3" strokeLinecap="round" />
      <line x1="64" y1="28" x2="92" y2="60" stroke="#61dafb" strokeWidth="3" strokeLinecap="round" />
      <line x1="36" y1="68" x2="20" y2="96" stroke="#61dafb" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="68" x2="52" y2="96" stroke="#61dafb" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="68" x2="92" y2="96" stroke="#61dafb" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="64" cy="22" r="12" fill="#61dafb" />
      <circle cx="36" cy="64" r="9" fill="#61dafb" opacity="0.85" />
      <circle cx="92" cy="64" r="9" fill="#61dafb" opacity="0.85" />
      <circle cx="20" cy="100" r="7" fill="#61dafb" opacity="0.65" />
      <circle cx="52" cy="100" r="7" fill="#61dafb" opacity="0.65" />
      <circle cx="92" cy="100" r="7" fill="#61dafb" opacity="0.65" />
    </svg>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function App() {
  const [depth, setDepth] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<number | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Load saved depth and history on mount
  useEffect(() => {
    chrome.storage.local.get('rctDepth', (result) => {
      if (typeof result.rctDepth === 'number') {
        setDepth(result.rctDepth);
      }
    });
    getHistory().then(setHistory);
  }, []);

  // Listen for results from background
  useEffect(() => {
    const handler = (msg: RuntimeMessage) => {
      if (msg.type === 'PICK_RESULT') {
        setStatus({ kind: 'copied', path: msg.path, framework: msg.framework });
        // History is saved by the background script; reload it
        getHistory().then(setHistory);
      } else if (msg.type === 'PICK_ERROR') {
        setStatus({ kind: 'error', message: msg.error });
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  function handleDepthChange(value: number) {
    const clamped = Math.max(0, Math.floor(value));
    setDepth(clamped);
    chrome.storage.local.set({ rctDepth: clamped });
  }

  function handlePick() {
    setStatus({ kind: 'picking' });
    chrome.runtime.sendMessage({ type: 'START_PICK', depth } satisfies RuntimeMessage);
  }

  function handleHistoryCopy(entry: HistoryEntry, index: number) {
    navigator.clipboard.writeText(entry.path);
    setCopyFeedback(index);
    setTimeout(() => setCopyFeedback(null), 1500);
  }

  function handleClearHistory() {
    clearHistory().then(() => setHistory([]));
  }

  return (
    <div className="popup">
      <h1><Logo /> Copytree</h1>

      <div className="field">
        <label htmlFor="depth">Depth</label>
        <input
          id="depth"
          type="number"
          min={0}
          value={depth}
          onChange={(e) => handleDepthChange(Number(e.target.value))}
        />
        <span className="hint">0 = full path</span>
      </div>

      <button
        className="pick-btn"
        onClick={handlePick}
        disabled={status.kind === 'picking'}
      >
        {status.kind === 'picking' ? 'Click an element...' : 'Pick Element'}
      </button>

      {status.kind === 'copied' && (
        <div className="result success">
          <span className={`framework-badge framework-${status.framework}`}>
            {status.framework}
          </span>
          {' '}Copied: <code>{status.path}</code>
        </div>
      )}

      {status.kind === 'error' && (
        <div className="result error">{status.message}</div>
      )}

      <p className="note">Best results on dev builds (React, Vue, Angular, Svelte)</p>

      {history.length > 0 && (
        <div className="history-section">
          <div className="history-header">
            <span>History</span>
            <button className="history-clear-btn" onClick={handleClearHistory}>
              Clear
            </button>
          </div>
          <div className="history-list">
            {history.map((entry, i) => (
              <div
                key={entry.timestamp}
                className={`history-item${copyFeedback === i ? ' copied' : ''}`}
                onClick={() => handleHistoryCopy(entry, i)}
                onMouseEnter={() => setHoveredPath(entry.path)}
                onMouseLeave={() => setHoveredPath(null)}
              >
                <span className={`framework-badge framework-${entry.framework}`}>
                  {entry.framework}
                </span>
                <span className="history-item-path">{entry.path}</span>
                <span className="history-item-time">
                  {formatRelativeTime(entry.timestamp)}
                </span>
              </div>
            ))}
          </div>
          {hoveredPath && (
            <div className="history-preview">{hoveredPath}</div>
          )}
        </div>
      )}
    </div>
  );
}

# groove

A browser extension that lets you click any element to copy its component ancestor path. Supports React, Vue, Angular, and Svelte.

## Prerequisites

- Node.js (v18+)
- pnpm
- A Chromium-based browser (Chrome, Edge, Brave, etc.)

## Install Dependencies

```bash
pnpm install
```

## Development Build

Start the WXT dev server with hot reload:

```bash
pnpm dev
```

This opens a new Chromium window with the extension pre-loaded. Changes to source files are hot-reloaded automatically.

## Production Build

```bash
pnpm build
```

Output is written to the `build/` directory.

## Loading the Extension Manually

If you need to load the extension into an existing browser instead of using `pnpm dev`:

1. Run `pnpm build`
2. Open `chrome://extensions` in your browser
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked**
5. Select the `build/chrome-mv3` directory

## Testing the Extension

There are no automated tests. The extension is tested manually against real websites.

### Quick Smoke Test

1. Start the dev server (`pnpm dev`) or load the built extension manually
2. Navigate to any website built with a supported framework:
   - **React** — e.g. `https://react.dev`
   - **Vue** — e.g. `https://vuejs.org`
   - **Angular** — e.g. `https://angular.dev`
   - **Svelte** — e.g. `https://svelte.dev`
3. Click the extension icon in the toolbar to open the popup
4. Click **Pick Element**
5. Hover over elements on the page — you should see:
   - An orange overlay highlighting the hovered element
   - A dark tooltip showing the component tree with a framework badge
6. Click an element — the component path is copied to your clipboard
7. The popup should show a success message with the copied path and framework name

### What to Verify

| Feature                 | How to test                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Pick mode**           | Click "Pick Element" in the popup. The button should change to "Click an element..."                                              |
| **Overlay**             | Move the mouse over page elements. An orange-bordered overlay should follow the cursor.                                           |
| **Hover tooltip**       | After a short delay (~150ms), a tooltip should appear showing the component tree.                                                 |
| **Click to copy**       | Click an element. The component path should be copied to clipboard and shown in the popup.                                        |
| **Depth setting**       | Set depth to e.g. `2` in the popup, then pick an element. Only the last 2 components should appear. Set to `0` for the full path. |
| **History**             | After copying a few paths, they should appear in the History section of the popup.                                                |
| **History copy**        | Click a history entry to re-copy its path. A brief "Copied" feedback should appear.                                               |
| **Clear history**       | Click "Clear" in the history header. All entries should be removed.                                                               |
| **ESC to cancel**       | While in pick mode, press Escape. Pick mode should stop and the overlay should disappear.                                         |
| **Framework detection** | Test on sites using different frameworks. The correct framework badge (react/vue/angular/svelte) should appear.                   |
| **No framework**        | Pick an element on a plain HTML page (no framework). An error message should appear: "No framework detected".                     |

### Tips

- The extension works best on **development builds** of frameworks, since production builds often strip the metadata used to read component trees.
- If the tooltip doesn't appear, check the browser console for errors in the content script.
- After making changes during development, the WXT dev server auto-reloads the extension. If something looks stale, click the reload button on `chrome://extensions`.

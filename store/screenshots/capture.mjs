import puppeteer from 'puppeteer';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pages = [
  'hero',
  'popup-copied',
  'frameworks',
  'history',
  'how-it-works',
];

const WIDTH = 1280;
const HEIGHT = 800;

async function capture() {
  const browser = await puppeteer.launch({ headless: true });

  for (const name of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

    const htmlPath = resolve(__dirname, `${name}.html`);
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    const outPath = resolve(__dirname, `${name}.png`);
    await page.screenshot({ path: outPath, type: 'png', omitBackground: false });

    console.log(`Captured: ${outPath}`);
    await page.close();
  }

  await browser.close();
  console.log('Done! All screenshots captured.');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});

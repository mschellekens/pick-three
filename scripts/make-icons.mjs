// Renders the original app icon to PNG with a local Chrome. Run: npm run icons
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'public', 'icons');
const tpl = 'file://' + path.join(here, 'icon-template.html');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage();
const jobs = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['maskable-512.png', 512, 0.78],
  ['apple-touch-icon.png', 180, 0.92],
];
for (const [name, size, scale] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  await page.goto(`${tpl}?size=${size}&scale=${scale}`);
  await page.locator('#icon').screenshot({ path: path.join(out, name), omitBackground: false });
  console.log('wrote', name);
}
await browser.close();

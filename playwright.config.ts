import { defineConfig, devices } from '@playwright/test';

// E2E runs against the production build served under a non-root project path,
// exactly like GitHub Pages (https://OWNER.github.io/pick-three/).
const BASE = '/pick-three/';
const PORT = 4173;
const chromePath = process.env.CHROME_PATH; // optional: use a system Chrome when browsers can't be downloaded
const withWebkit = process.env.PW_WEBKIT === '1';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
  webServer: {
    command: `npx cross-env BASE_PATH=${BASE} vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'iphone-chromium',
      use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions: chromePath ? { executablePath: chromePath } : {} },
    },
    ...(withWebkit ? [{ name: 'iphone-webkit', use: { ...devices['iPhone 13'] } }] : []),
  ],
});

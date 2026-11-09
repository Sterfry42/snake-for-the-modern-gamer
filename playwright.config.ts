import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/snake-for-the-modern-gamer/',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-touch',
      // Emulates a phone (Playwright reports maxTouchPoints > 0), which is
      // what the mobile controls deck auto-detection looks for. Only the
      // mobile-dedicated specs run here; the other suites are
      // browser-independent and already covered by desktop chromium.
      use: { ...devices['Pixel 7'] },
      testMatch: /mobileControls\.smoke\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/snake-for-the-modern-gamer/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

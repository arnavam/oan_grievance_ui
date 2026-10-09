import { defineConfig } from '@playwright/test';

// Points at the dev server already running on :3001 for this session — does
// NOT start its own server, since one is already up and we don't want a
// second instance fighting over the port.
export default defineConfig({
  testDir: './e2e-qa',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  reporter: [['json', { outputFile: 'e2e-qa/results.json' }], ['list']],
});

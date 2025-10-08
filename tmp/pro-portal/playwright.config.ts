import { defineConfig } from '@playwright/test';

const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://${host}:${port}`;
const mode = process.env.PLAYWRIGHT_MODE === 'dev' ? 'dev' : 'preview';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer:
    mode === 'dev'
      ? {
          command: `pnpm run dev -- --host ${host} --port ${port}`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          stdout: 'pipe',
          stderr: 'pipe',
          timeout: Number(process.env.PLAYWRIGHT_SERVER_TIMEOUT ?? 180000),
        }
      : {
          command: `pnpm run preview --host ${host} --port ${port} --strictPort`,
          url: baseURL,
          reuseExistingServer: false,
          stdout: 'pipe',
          stderr: 'pipe',
          timeout: Number(process.env.PLAYWRIGHT_SERVER_TIMEOUT ?? 180000),
        },
});

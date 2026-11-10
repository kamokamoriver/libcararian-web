import { defineConfig } from '@playwright/test';

// 本番ビルド（CSP 入り）を相手に、インストール済みの Chrome で動かす
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4180',
    channel: 'chrome',
    viewport: { width: 1400, height: 900 },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4180 --strictPort',
    url: 'http://localhost:4180',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

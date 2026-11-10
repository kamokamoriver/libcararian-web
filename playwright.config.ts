import { defineConfig } from '@playwright/test';

// 本番ビルド（CSP 入り）を相手に、インストール済みの Chrome で動かす。
// E2E_BASE_URL を指定すると、公開中のサイトを相手にする（例: https://kamokamoriver.github.io/libcararian-web/）
const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: remote ?? 'http://localhost:4180',
    channel: 'chrome',
    viewport: { width: 1400, height: 900 },
  },
  webServer: remote
    ? undefined
    : {
    command: 'npm run build && npx vite preview --port 4180 --strictPort',
    url: 'http://localhost:4180',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

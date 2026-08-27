import { defineConfig } from "@playwright/test";

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: BASE,
    channel: "chrome",
    trace: "on-first-retry",
  },
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT}`,
    url: BASE,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      ACCESS_SECRET: "e2e-access-secret",
      ADMIN_STORE_PATH: "/tmp/mv-e2e-admin-store.json",
      BOOK_PATH: "/tmp/mv-e2e-book.epub",
      NODE_ENV: "development",
      PORT: String(PORT),
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_PUBLISHABLE_KEY: "",
    },
  },
  projects: [
    { name: "desktop-chrome", use: { channel: "chrome", viewport: { width: 1280, height: 800 } } },
    {
      name: "mobile-chrome",
      use: {
        channel: "chrome",
        viewport: { width: 390, height: 844 },
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1 Instagram 192.168.2.2.111",
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});

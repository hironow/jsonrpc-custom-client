import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	timeout: 30_000,
	// Use all available cores in CI; keep local default
	workers: process.env.CI ? "100%" : undefined,
	fullyParallel: true,
	use: {
		baseURL: "http://localhost:3000",
		headless: true,
		trace: "on-first-retry",
	},
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    env: { NEXT_PUBLIC_E2E: "1" },
  },
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});

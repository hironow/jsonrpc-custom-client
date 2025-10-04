import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Notification stream appears in sidebar", () => {
	// This test is flaky on some local environments due to WS timing/rendering variance.
	// It runs reliably on CI. Skip locally unless CI environment is set.
	test.skip(!process.env.CI, "Run on CI; skip locally to avoid flake");
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("receive periodic stream.* notifications", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Open Notifications tab and wait for the panel
		await page.getByRole("tab", { name: "Notifications" }).click();
		const panel = page.getByTestId("notifications-panel");
		await expect(panel).toBeVisible();

		// Diagnostics: poll with console logging to help local debugging
		const start = Date.now();
		let count = 0;
		for (let i = 0; i < 20; i++) {
			count = await panel.getByTestId("notification-item").count();
			// eslint-disable-next-line no-console
			console.log(
				`[realws] notif-count t=${Math.floor((Date.now() - start) / 1000)}s: ${count}`,
			);
			if (count > 0) break;
			await page.waitForTimeout(1000);
		}

		// Fallback signal: if panel didn't render yet, check text appears somewhere on the page
		if (count === 0) {
			const anyHeartbeat = page.getByText(/stream\.heartbeat/).first();
			try {
				await expect(anyHeartbeat).toBeVisible({ timeout: 5000 });
				// eslint-disable-next-line no-console
				console.log(
					"[realws] fallback: stream.heartbeat visible outside panel (page-level)",
				);
			} catch {
				// eslint-disable-next-line no-console
				console.log(
					"[realws] fallback: stream.heartbeat not visible anywhere on page",
				);
			}
		}

		expect(count).toBeGreaterThan(0);
	});
});

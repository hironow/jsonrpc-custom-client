import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Notification stream appears in sidebar", () => {
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

		// Open Notifications tab
		await page.getByRole("tab", { name: "Notifications" }).click();
		const notifPanel = page.getByRole("tabpanel", { name: "Notifications" });
		// Wait for at least one notification card to appear in the panel
		await expect(
			notifPanel.locator('[data-slot="card"].cursor-pointer').first(),
		).toBeVisible({ timeout: 20000 });
	});
});

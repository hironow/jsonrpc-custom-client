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

		// Open Notifications tab and wait for the panel
		await page.getByRole("tab", { name: "Notifications" }).click();
		const panel = page.getByTestId("notifications-panel");
		await expect(panel).toBeVisible();
		// Wait until at least one notification item exists (not relying on visibility)
		await expect
			.poll(async () => await panel.getByTestId("notification-item").count())
			.toBeGreaterThan(0);
	});
});

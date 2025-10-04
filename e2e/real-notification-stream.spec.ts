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

		// Switch to the Notifications tab in the right sidebar and wait for a heartbeat notification
		await page.getByRole("tab", { name: "Notifications" }).click();
		const notifPanel = page.getByRole("tabpanel", { name: "Notifications" });
		await expect(notifPanel.getByText(/stream\.heartbeat/).first()).toBeVisible(
			{
				timeout: 20000,
			},
		);
	});
});

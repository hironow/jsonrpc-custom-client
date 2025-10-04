import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Manual disconnect and reconnect", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("disconnect then connect again shows stable UI", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Disconnect -> expect Connect to appear again
		await page.getByRole("button", { name: "Disconnect" }).click();
		await expect(page.getByRole("button", { name: /^Connect$/ })).toBeVisible({
			timeout: 10000,
		});

		// Connect again -> expect Disconnect
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});
	});
});

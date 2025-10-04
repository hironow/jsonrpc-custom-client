import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Export after real ping", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("export produces a JSON file after ping", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		await page.getByRole("button", { name: "Expand Connection Panel" }).click();
		await page.getByRole("button", { name: "Ping" }).click();

		const [download] = await Promise.all([
			page.waitForEvent("download"),
			page.getByRole("button", { name: "Export" }).click(),
		]);
		const name = download.suggestedFilename();
		expect(name.endsWith(".json")).toBe(true);
	});
});

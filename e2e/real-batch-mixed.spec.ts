import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Batch mixed result (ping ok + unknown error)", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("batch returns ✓1 and ✗1 badges", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Connect to real WS
		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Enable batch mode
		await page.getByLabel("Batch Mode").click();
		await page.getByRole("button", { name: "Add Request" }).click();

		const methods = page.getByPlaceholder("Method");
		await methods.nth(0).fill("ping");
		await methods.nth(1).fill("unknown.method");

		await page.getByRole("button", { name: /Send Batch/ }).click();

		// Expect batch response preview badges: ✓ 1 and ✗ 1
		await expect(page.getByText(/✓\s*1/)).toBeVisible();
		await expect(page.getByText(/✗\s*1/)).toBeVisible();
	});
});

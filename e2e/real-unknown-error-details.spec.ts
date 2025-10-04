import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Unknown method shows error details", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("send unknown method and verify error preview + details", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Connect to real WS
		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Send unknown method
		await page.getByRole("tab", { name: "Connection" }).click();
		const methodInput = page
			.getByPlaceholder("e.g., getUser, sendMessage")
			.first();
		await methodInput.fill("unknown.method");
		const paramsArea = page.getByPlaceholder('{"key": "value"}').first();
		await paramsArea.fill("{}");
		await page.getByRole("button", { name: /^Send Request$/ }).click();

		// Expect error preview to appear
		await expect(page.getByText(/✗\s*Method not found/)).toBeVisible({
			timeout: 10000,
		});

		// Open details and assert error code/message
		await page
			.getByText(/✗\s*Method not found/)
			.first()
			.click();
		await expect(
			page.locator("pre", { hasText: /"code"\s*:\s*-32601/ }).first(),
		).toBeVisible({ timeout: 10000 });
		await expect(
			page
				.locator("pre", { hasText: /"message"\s*:\s*"Method not found"/ })
				.first(),
		).toBeVisible({ timeout: 10000 });
	});
});

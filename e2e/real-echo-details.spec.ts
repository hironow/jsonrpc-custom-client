import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Echo details in sidebar shows params", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("select echo request and verify details panel shows echoed params", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Send echo
		await page.getByRole("tab", { name: "Connection" }).click();
		const methodInput = page
			.getByPlaceholder("e.g., getUser, sendMessage")
			.first();
		await methodInput.fill("echo");
		const paramsArea = page.getByPlaceholder('{"key": "value"}').first();
		await paramsArea.fill('{"hello":"detail"}');
		await page.getByRole("button", { name: /^Send Request$/ }).click();

		// Select the 'echo' request message to open Details panel
		await page.getByText("echo").first().click();

		// Expect echoed params to appear in Details JSON (restrict to <pre> blocks)
		await expect(
			page.locator("pre", { hasText: /"hello"\s*:\s*"detail"/ }).first(),
		).toBeVisible({ timeout: 10000 });
	});
});

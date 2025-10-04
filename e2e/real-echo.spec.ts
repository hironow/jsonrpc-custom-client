import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] echo returns params as result", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("send echo with params and see them in response", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Send single echo request
		await page.getByRole("tab", { name: "Connection" }).click();
		const methodInput = page
			.getByPlaceholder("e.g., getUser, sendMessage")
			.first();
		await methodInput.fill("echo");
		const paramsArea = page.getByPlaceholder('{"key": "value"}').first();
		await paramsArea.fill('{"hello":"world"}');
		await page.getByRole("button", { name: /^Send Request$/ }).click();

		// Expect the response JSON to include the echoed params
		await expect(page.getByText(/"hello"\s*:\s*"world"/)).toBeVisible();
	});
});

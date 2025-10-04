import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Batch error details", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("batch shows ✓/✗ preview and error/result details", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Connect to real WS
		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Enable batch mode and craft [ping, unknown.method]
		await page.getByLabel("Batch Mode").click();
		await page.getByRole("button", { name: "Add Request" }).click();
		const methods = page.getByPlaceholder("Method");
		await methods.nth(0).fill("ping");
		await methods.nth(1).fill("unknown.method");
		await page.getByRole("button", { name: /Send Batch/ }).click();

		// Expect ✓ 1 and ✗ 1 preview badges
		await expect(page.getByText(/✓\s*1/)).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/✗\s*1/)).toBeVisible({ timeout: 10000 });

		// Open the batch response details (click the preview badge text)
		await page.getByText(/✗\s*1/).first().click();

		// Details should include Error heading and JSON having code -32601 and message
		await expect(page.getByRole("heading", { name: /^Error$/ })).toBeVisible();
		await expect(page.getByText(/-32601/)).toBeVisible();
		await expect(page.getByText(/Method not found/)).toBeVisible();

		// And also include a Result section for the successful ping (pong: true)
		await expect(page.getByText(/Result/)).toBeVisible();
		await expect(page.getByText(/"pong"\s*:\s*true/)).toBeVisible();

		// Response Time indicator should be present somewhere in details
		await expect(page.locator("text=Response Time").first()).toBeVisible();
		await expect(page.getByText(/ms/).first()).toBeVisible();
	});
});

import { test, expect } from "@playwright/test";

test.describe("Visual Regression", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("initial state - disconnected", async ({ page }) => {
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();
		await page.screenshot({
			path: "assets/snapshots/01-initial.png",
			fullPage: true,
		});
	});

	test("connected state with messages", async ({ page }) => {
		// Connect in Dummy Mode
		await page.getByLabel("Dummy Mode").click();
		await page.getByRole("button", { name: /Connect/ }).click();
		await expect(
			page.getByRole("button", { name: "Disconnect" }),
		).toBeVisible();

		// Fill in method and params
		const methodInput = page
			.getByPlaceholder("e.g., getUser, sendMessage")
			.first();
		await methodInput.fill("user.get");
		const paramsArea = page.getByPlaceholder('{"key": "value"}').first();
		await paramsArea.fill('{"id": 123}');

		// Send request
		await page.getByRole("button", { name: /^Send Request$/ }).click();

		// Wait for request to appear in message list
		await expect(page.getByText("user.get")).toBeVisible();

		// Wait for linking marker (response received)
		await expect(page.getByText(/→\s*Response/)).toBeVisible();

		await page.screenshot({
			path: "assets/snapshots/02-connected.png",
			fullPage: true,
		});
	});

	test("message detail view", async ({ page }) => {
		// Connect in Dummy Mode
		await page.getByLabel("Dummy Mode").click();
		await page.getByRole("button", { name: /Connect/ }).click();
		await expect(
			page.getByRole("button", { name: "Disconnect" }),
		).toBeVisible();

		// Fill in method and params
		const methodInput = page
			.getByPlaceholder("e.g., getUser, sendMessage")
			.first();
		await methodInput.fill("demo.detail");
		const paramsArea = page.getByPlaceholder('{"key": "value"}').first();
		await paramsArea.fill('{"name": "test"}');

		// Send request
		await page.getByRole("button", { name: /^Send Request$/ }).click();

		// Wait for request to appear
		await expect(page.getByText("demo.detail")).toBeVisible();

		// Wait for response to be linked
		await expect(page.getByText(/→\s*Response/)).toBeVisible();

		// Click on the message to show details
		await page.getByText("demo.detail").first().click();

		// Wait for detail panel content to be fully loaded (JSON in pre tag)
		await expect(
			page.locator("pre", { hasText: /"name"\s*:\s*"test"/ }).first(),
		).toBeVisible({ timeout: 10000 });

		await page.screenshot({
			path: "assets/snapshots/03-message-detail.png",
			fullPage: true,
		});
	});
});

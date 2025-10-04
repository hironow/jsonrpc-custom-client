import { test, expect } from "@playwright/test";

test.describe("Quick filters + export and linking", () => {
	test("quick filter preset affects export filename", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Connect in Dummy Mode
		await page.getByLabel("Dummy Mode").click();
		await page.getByRole("button", { name: /Connect/ }).click();
		await expect(
			page.getByRole("button", { name: "Disconnect" }),
		).toBeVisible();

		// Send a request with method 'user.get' so Method:user preset is non-empty
		const methodInput = page
			.getByPlaceholder("e.g., getUser, sendMessage")
			.first();
		await methodInput.fill("user.get");
		const paramsArea = page.getByPlaceholder('{"key": "value"}').first();
		await paramsArea.fill("{}");
		await page.getByRole("button", { name: /^Send Request$/ }).click();

		// Wait for the request to be rendered
		await expect(page.getByText("user.get")).toBeVisible();

		// Apply quick filter preset (Method:user)
		await page.getByRole("button", { name: "Method:user" }).click();

		// Export should include method segment in filename
		const [download] = await Promise.all([
			page.waitForEvent("download"),
			page.getByRole("button", { name: "Export" }).click(),
		]);
		const name = download.suggestedFilename();
		expect(name).toMatch(/method-user/i);
		expect(name.endsWith(".json")).toBe(true);
	});

	test("linking shows arrow after response", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Connect in Dummy Mode
		await page.getByLabel("Dummy Mode").click();
		await page.getByRole("button", { name: /Connect/ }).click();
		await expect(
			page.getByRole("button", { name: "Disconnect" }),
		).toBeVisible();

		// Send a request and wait for response to link
		const methodInput = page
			.getByPlaceholder("e.g., getUser, sendMessage")
			.first();
		await methodInput.fill("demo.linktest");
		const paramsArea = page.getByPlaceholder('{"key": "value"}').first();
		await paramsArea.fill("{}");
		await page.getByRole("button", { name: /^Send Request$/ }).click();

		// Wait for the request to appear
		await expect(page.getByText("demo.linktest")).toBeVisible();

		// Wait for linking marker to appear (→ Response)
		await expect(page.getByText(/→\s*Response/)).toBeVisible();
	});
});

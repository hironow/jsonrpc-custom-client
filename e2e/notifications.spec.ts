import { test, expect } from "@playwright/test";

test.describe("Notifications sidebar interactions", () => {
	test("open notifications and select one to view details", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Connect in Dummy Mode
		await page.getByLabel("Dummy Mode").click();
		await page.getByRole("button", { name: /Connect/ }).click();
		await expect(
			page.getByRole("button", { name: "Disconnect" }),
		).toBeVisible();

		// Open the notifications sidebar from the header button and wait for items
		await page.getByRole("button", { name: "Notifications" }).click();
		await expect(page.getByText("No notifications yet")).toBeHidden({
			timeout: 20000,
		});

		// Select the first notification card
		await page
			.locator("div", { hasText: /Notification|stream\./i })
			.first()
			.click();

		// Placeholder should disappear in Details panel
		await expect(
			page.getByText("Select a message to view details"),
		).toBeHidden();
	});
});

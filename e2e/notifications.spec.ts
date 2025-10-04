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

		// Open the notifications sidebar from the header button
		await page.getByRole("button", { name: "Notifications" }).click();

		// Wait for at least one dummy notification to arrive (stream.* methods)
		const streamLabel = page.getByText(/stream\./i).first();
		await expect(streamLabel).toBeVisible({ timeout: 10000 });

		// Select the notification
		await streamLabel.click();

		// Placeholder should disappear in Details panel
		await expect(
			page.getByText("Select a message to view details"),
		).toBeHidden();
	});
});

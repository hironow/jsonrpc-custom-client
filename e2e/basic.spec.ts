import { test, expect } from "@playwright/test";

test("loads home and connects in Dummy Mode", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

	await page.getByLabel("Dummy Mode").click();
	await page.getByRole("button", { name: /Connect/ }).click();
	await expect(page.getByText(/Connecting/)).toBeVisible();
	await expect(page.getByText(/Connected/)).toBeVisible();
});

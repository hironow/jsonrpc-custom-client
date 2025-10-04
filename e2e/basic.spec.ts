import { test, expect } from "@playwright/test";

test("loads home and connects in Dummy Mode", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

	await page.getByLabel("Dummy Mode").click();
	await page.getByRole("button", { name: /Connect/ }).click();
	// Disambiguate: the text "Connecting" appears in a badge and on the disabled button.
	// Assert the button state to avoid strict-mode ambiguity.
	await expect(page.getByRole("button", { name: /Connecting/ })).toBeVisible();
	await expect(page.getByText(/Connected/)).toBeVisible();
});

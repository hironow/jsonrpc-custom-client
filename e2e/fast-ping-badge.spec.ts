import { test, expect } from "@playwright/test";

test.describe("Collapsed header shows Fast Ping badge when enabled", () => {
	test("toggle fast ping and verify collapsed badge", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Connect in Dummy Mode for deterministic run
		await page.getByLabel("Dummy Mode").click();
		await page.getByRole("button", { name: /Connect/ }).click();
		await expect(
			page.getByRole("button", { name: "Disconnect" }),
		).toBeVisible();

		// Expand connection panel and enable Fast Ping
		await page.getByRole("button", { name: "Expand Connection Panel" }).click();
		await page.getByLabel("Fast JSON-RPC Ping (100ms)").click();

		// Collapse and assert badge is visible
		await page
			.getByRole("button", { name: "Collapse Connection Panel" })
			.click();
		await expect(page.getByTestId("badge-fast-ping")).toBeVisible();
	});
});

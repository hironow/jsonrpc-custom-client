import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] One-shot ping shows latency inline", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("ping displays an inline latency indicator (ms)", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Expand to access Ping button
		await page.getByRole("button", { name: "Expand Connection Panel" }).click();
		await page.getByRole("button", { name: "Ping" }).click();

		// Expect some inline "NNNms" latency text to appear
		await expect(page.getByText(/\d+ms/)).toBeVisible();
	});
});

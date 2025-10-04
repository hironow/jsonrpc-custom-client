import { test, expect } from "@playwright/test";

// Optional real-WS test. Skipped unless E2E_REAL_WS_URL is set.
const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Fast ping ON/OFF against real WS", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("enabling fast ping increases ping total; disabling stops growth", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Set WS URL and connect (non-dummy)
		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByText(/Connected/)).toBeVisible();

		// Expand controls
		await page.getByRole("button", { name: "Expand Connection Panel" }).click();

		// Turn ON fast ping
		await page.getByLabel("Fast JSON-RPC Ping (100ms)").click();

		// Wait until at least one ping has been sent
		await expect(page.getByTestId("ping-inline-total")).not.toHaveText("0", {
			timeout: 7000,
		});

		const before = parseInt(
			await page.getByTestId("ping-inline-total").innerText(),
			10,
		);

		// Turn OFF fast ping
		await page.getByLabel("Fast JSON-RPC Ping (100ms)").click();

		// Give some time to observe no further growth
		await page.waitForTimeout(800);
		const after = parseInt(
			await page.getByTestId("ping-inline-total").innerText(),
			10,
		);
		expect(after).toBe(before);
	});
});

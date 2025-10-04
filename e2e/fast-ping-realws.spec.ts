import { test, expect, Page } from "@playwright/test";

async function waitForCounterToStabilize(
	page: Page,
	testId: string,
	options?: { stableMs?: number; timeoutMs?: number; intervalMs?: number },
): Promise<number> {
	const stableMs = options?.stableMs ?? 600;
	const timeoutMs = options?.timeoutMs ?? 5000;
	const intervalMs = options?.intervalMs ?? 120;

	const start = Date.now();
	let last = NaN;
	let lastChangeAt = Date.now();

	// sample until the value does not change for `stableMs` or timeout
	// returns the stabilized value (best-effort)
	// avoids flakes due to in-flight ticks after toggling OFF
	for (;;) {
		const raw = await page.getByTestId(testId).innerText();
		const current = parseInt(raw, 10);
		if (current !== last) {
			last = current;
			lastChangeAt = Date.now();
		}
		if (Date.now() - lastChangeAt >= stableMs) return last;
		if (Date.now() - start >= timeoutMs) return last;
		await page.waitForTimeout(intervalMs);
	}
}

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
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Expand controls
		await page.getByRole("button", { name: "Expand Connection Panel" }).click();

		// Turn ON fast ping
		await page.getByLabel("Fast JSONRPC Ping (100ms)").click();

		// Wait until at least one ping has been sent
		await expect(page.getByTestId("ping-inline-total")).not.toHaveText("0", {
			timeout: 10000,
		});

		// Also expect matched to become > 0
		await expect(page.getByTestId("ping-inline-matched")).not.toHaveText("0", {
			timeout: 10000,
		});

		const before = parseInt(
			await page.getByTestId("ping-inline-total").innerText(),
			10,
		);

		// Turn OFF fast ping
		await page.getByLabel("Fast JSONRPC Ping (100ms)").click();

		// Wait until total counter stabilizes (no changes for a short window)
		const stabilizedTotal = await waitForCounterToStabilize(
			page,
			"ping-inline-total",
			{ stableMs: 600, timeoutMs: 5000 },
		);
		// It should eventually stop increasing; allow one in-flight tick after toggling off
		expect(stabilizedTotal).toBeGreaterThanOrEqual(before);
		// Once stabilized, verify it stays the same for another short window
		await page.waitForTimeout(600);
		const finalTotal = parseInt(
			await page.getByTestId("ping-inline-total").innerText(),
			10,
		);
		expect(finalTotal).toBe(stabilizedTotal);

		// Apply the same stabilization check for matched counter
		const matchedStabilized = await waitForCounterToStabilize(
			page,
			"ping-inline-matched",
			{ stableMs: 600, timeoutMs: 5000 },
		);
		await page.waitForTimeout(600);
		const matchedFinal = parseInt(
			await page.getByTestId("ping-inline-matched").innerText(),
			10,
		);
		expect(matchedFinal).toBe(matchedStabilized);
	});
});

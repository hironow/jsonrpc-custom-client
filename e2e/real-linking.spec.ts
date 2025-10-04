import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Linking arrows for single and batch", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("single echo shows → Response; batch shows arrow on batch.request", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Single echo
		await page.getByRole("tab", { name: "Connection" }).click();
		const methodInput = page
			.getByPlaceholder("e.g., getUser, sendMessage")
			.first();
		await methodInput.fill("echo");
		const paramsArea = page.getByPlaceholder('{"key": "value"}').first();
		await paramsArea.fill('{"a":1}');
		await page.getByRole("button", { name: /^Send Request$/ }).click();
		await expect(page.getByText(/→\s*Response/)).toBeVisible({
			timeout: 10000,
		});

		// Batch: [ping, ping]
		await page.getByLabel("Batch Mode").click();
		await page.getByRole("button", { name: "Add Request" }).click();
		const methods = page.getByPlaceholder("Method");
		await methods.nth(0).fill("ping");
		await methods.nth(1).fill("ping");
		await page.getByRole("button", { name: /Send Batch/ }).click();

		// For batch, expect an arrow link to appear on the request row (no explicit method label)
		await expect(page.getByText(/\d+\s+requests/)).toBeVisible();
		await expect(page.getByText(/→\s*Response/)).toBeVisible({
			timeout: 10000,
		});
	});
});

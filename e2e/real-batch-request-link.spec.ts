import { test, expect } from "@playwright/test";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Batch request links to response in Details", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("open batch.request and verify linked response details + copy actions", async ({
		page,
	}) => {
		// Stub clipboard to make copy buttons succeed in headless
		await page.addInitScript({
			content:
				"if (!window.navigator.clipboard) { window.navigator.clipboard = { writeText: async () => {} }; } else { window.navigator.clipboard.writeText = async () => {}; }",
		});
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Connect to real WS
		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Send a successful batch [ping, ping]
		await page.getByLabel("Batch Mode").click();
		await page.getByRole("button", { name: "Add Request" }).click();
		const methods = page.getByPlaceholder("Method");
		await methods.nth(0).fill("ping");
		await methods.nth(1).fill("ping");
		await page.getByRole("button", { name: /Send Batch/ }).click();

		// Ensure link marker appears and open batch.request row
		await expect(page.getByText(/→\s*Response/)).toBeVisible({
			timeout: 10000,
		});
		await page
			.getByText(/\d+\s+requests/)
			.first()
			.click();

		// Details should render Batch Message Details and show response time
		await expect(page.getByText(/Batch\s*Message\s*Details/)).toBeVisible();
		await expect(page.getByText(/Response\s*Time/)).toBeVisible();

		// One of the results should include { "pong": true }
		await expect(page.getByText(/"pong"\s*:\s*true/)).toBeVisible({
			timeout: 10000,
		});

		// Pair sections should include Request and Response badges
		await expect(page.getByText(/^Request$/)).toBeVisible();
		await expect(page.getByText(/^(Response|Error)$/)).toBeVisible();

		// Copy buttons flip to Copied! when clicked
		await page.getByRole("button", { name: "Copy Request" }).first().click();
		await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
		await page.getByRole("button", { name: "Copy Response" }).first().click();
		await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
	});
});

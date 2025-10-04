import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REAL_URL = process.env.E2E_REAL_WS_URL;

test.describe("[realws] Export includes error entries", () => {
	test.skip(!REAL_URL, "Set E2E_REAL_WS_URL to run this test.");

	test("export after mixed batch contains -32601 error", async ({
		page,
	}, testInfo) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Connect to real WS
		const urlBox = page.getByPlaceholder("ws://localhost:8080");
		await urlBox.fill(REAL_URL!);
		await page.getByRole("button", { name: /^Connect$/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// Prepare a mixed batch: [ping, unknown.method]
		await page.getByLabel("Batch Mode").click();
		await page.getByRole("button", { name: "Add Request" }).click();
		const methods = page.getByPlaceholder("Method");
		await methods.nth(0).fill("ping");
		await methods.nth(1).fill("unknown.method");
		await page.getByRole("button", { name: /Send Batch/ }).click();

		// Wait for batch response summary badges to appear
		await expect(page.getByText(/✓\s*1/)).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/✗\s*1/)).toBeVisible({ timeout: 10000 });

		// Trigger export and save to test output path
		const [download] = await Promise.all([
			page.waitForEvent("download"),
			page.getByRole("button", { name: "Export" }).click(),
		]);

		const out = testInfo.outputPath("export-with-errors.json");
		await download.saveAs(out);

		// Read and inspect exported JSON
		const text = readFileSync(out, "utf-8");
		const arr = JSON.parse(text);
		// Look for an error -32601 either in a single response or any batch item
		const hasMethodNotFound =
			Array.isArray(arr) &&
			arr.some((m) => {
				const d = m?.data;
				if (m?.type !== "received" || !d) return false;
				if (Array.isArray(d)) {
					return d.some((it) => it?.error?.code === -32601);
				}
				return typeof d === "object" && d.error?.code === -32601;
			});
		expect(hasMethodNotFound).toBe(true);

		// Light structural assertions for linkage and timing
		const batchReq = arr.find(
			(m: any) => m?.isBatch === true && m?.method === "batch.request",
		);
		expect(batchReq).toBeTruthy();
		expect(typeof batchReq.linkedMessageId).toBe("string");
		const batchRes = arr.find((m: any) => m?.id === batchReq.linkedMessageId);
		expect(batchRes).toBeTruthy();
		expect(batchRes.type).toBe("received");
		expect(batchRes.isBatch).toBe(true);
		expect(batchRes.method).toBe("batch.response");
		expect(typeof batchRes.responseTime).toBe("number");
		expect(batchRes.responseTime).toBeGreaterThanOrEqual(0);
	});
});

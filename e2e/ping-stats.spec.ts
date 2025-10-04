import { test, expect } from "@playwright/test";

test.describe("Ping counters in Connection panel and collapsed header", () => {
	test("one-shot Ping updates matched/missing counters", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// Connect in Dummy Mode for offline determinism
		await page.getByLabel("Dummy Mode").click();
		await page.getByRole("button", { name: /Connect/ }).click();
		await expect(
			page.getByRole("button", { name: "Disconnect" }),
		).toBeVisible();

		// Expand Connection panel
		await page.getByRole("button", { name: "Expand Connection Panel" }).click();

		// Hover inline counters trigger to see tooltip
		await page.getByTestId("ping-inline-trigger").hover();
		await expect(
			page.getByText("Ping matched/total. Missing = unanswered pings."),
		).toBeVisible();

		// Initial counters should be 0/0, missing 0
		await expect(page.getByTestId("ping-inline-matched")).toHaveText("0");
		await expect(page.getByTestId("ping-inline-total")).toHaveText("0");
		await expect(page.getByTestId("ping-inline-missing")).toHaveText(/0$/);

		// Send one ping
		await page.getByRole("button", { name: "Ping" }).click();

		// Wait for dummy response to arrive and counters to update (<= ~1s)
		await expect(page.getByTestId("ping-inline-matched")).toHaveText("1", {
			timeout: 5000,
		});
		await expect(page.getByTestId("ping-inline-total")).toHaveText("1");
		await expect(page.getByTestId("ping-inline-missing")).toHaveText(/0$/);

		// Collapse and verify collapsed badge shows Ping 1/1
		await page
			.getByRole("button", { name: "Collapse Connection Panel" })
			.click();
		await expect(page.getByTestId("badge-ping-collapsed")).toHaveText(
			/Ping\s+1\/1/,
		);

		// Performance tab tooltip
		await page.getByRole("tab", { name: "Performance" }).click();
		await page.getByText("Ping / Pong").hover();
		await expect(
			page.getByText("Ping matched/total. Missing = unanswered pings."),
		).toBeVisible();
	});
});

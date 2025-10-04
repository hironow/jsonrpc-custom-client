import { test, expect } from "@playwright/test";

test.describe("[dummy] Notification stream appears in sidebar", () => {
	test("receive periodic stream.* notifications in Dummy Mode", async ({
		page,
	}) => {
		// given: app loaded
		await page.goto("/");
		await expect(page.getByText("JSONRPC WebSocket")).toBeVisible();

		// when: connect in Dummy Mode
		await page.getByLabel("Dummy Mode").click();
		await page.getByRole("button", { name: /Connect/ }).click();
		await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
			timeout: 15000,
		});

		// and: open Notifications tab
		await page.getByRole("tab", { name: "Notifications" }).click();
		const panel = page.getByTestId("notifications-panel");
		await expect(panel).toBeVisible();

		// then: at least one notification item arrives (dummy emits periodically)
		await expect
			.poll(async () => await panel.getByTestId("notification-item").count(), {
				timeout: 20000,
			})
			.toBeGreaterThan(0);

		// and: one of them should be a stream.* notification
		await expect(
			panel
				.getByTestId("notification-item")
				.filter({ hasText: /stream\./i })
				.first(),
		).toBeVisible({
			timeout: 20000,
		});
	});
});

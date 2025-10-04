import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { useWebSocketClient } from "@/hooks/use-websocket-client";
import { withFakeTimers } from "./utils/timers";

function DummyDI({ timer, rng, dummy }: any) {
	const { status, messages, setDummyMode, connect } = useWebSocketClient({
		timer,
		rng,
		dummy,
	});
	return (
		<div>
			<div data-testid="status">{status}</div>
			<div data-testid="count">{messages.length}</div>
			<div data-testid="notif-count">
				{messages.filter((m: any) => m.isNotification).length}
			</div>
			<button onClick={() => setDummyMode(true)}>dummy</button>
			<button onClick={() => connect()}>connect</button>
		</div>
	);
}

describe("useWebSocketClient dummy DI", () => {
	it("uses injected rng to produce notifications deterministically", async () => {
		if (!global.crypto) {
			// @ts-ignore
			global.crypto = {} as any;
		}
		// @ts-ignore
		global.crypto.randomUUID = () => "uuid-test";

		await withFakeTimers(async (timer) => {
			// rng that always yields 0.55 (< 0.6) → notification branch
			const rng = () => 0.55;
			render(
				<DummyDI
					timer={timer}
					rng={rng}
					dummy={{ notificationIntervalMs: 100, autoRequestIntervalMs: 10_000 }}
				/>,
			);

			// enable and connect
			await act(async () => {
				screen.getByText("dummy").click();
			});

			await act(async () => {
				screen.getByText("connect").click();
				vi.advanceTimersByTime(900);
				vi.runOnlyPendingTimers();
			});

			// ensure connected
			expect(screen.getByTestId("status").textContent).toBe("connected");

			// advance through several notification intervals in steps
			await act(async () => {
				vi.advanceTimersByTime(2000);
			});

			const notifCount = parseInt(
				screen.getByTestId("notif-count").textContent || "0",
				10,
			);
			expect(notifCount).toBeGreaterThan(0);
		});
	});

	it("uses autoRequestIntervalMs to trigger batch/single on schedule", async () => {
		if (!global.crypto) {
			// @ts-ignore
			global.crypto = {} as any;
		}
		// @ts-ignore
		global.crypto.randomUUID = () => "uuid-test";

		await withFakeTimers(async (timer) => {
			// rng = 0.2 (< 0.4) picks batch branch in autoRequestInterval
			const rng = () => 0.2;
			render(
				<DummyDI
					timer={timer}
					rng={rng}
					dummy={{ autoRequestIntervalMs: 100, notificationIntervalMs: 10_000 }}
				/>,
			);

			await act(async () => {
				screen.getByText("dummy").click();
				screen.getByText("connect").click();
				vi.advanceTimersByTime(1000);
			});

			const count = parseInt(
				screen.getByTestId("count").textContent || "0",
				10,
			);
			expect(count).toBeGreaterThan(0);
		});
	});
});

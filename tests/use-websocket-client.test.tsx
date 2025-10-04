import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { useWebSocketClient } from "@/hooks/use-websocket-client";
import { withFakeTimers } from "./utils/timers";

// Simple component to exercise the hook in dummy mode
function DummyComponent({ timer }: { timer: any }) {
	const { status, messages, setDummyMode, connect, clearMessages } =
		useWebSocketClient({ timer });
	return (
		<div>
			<div data-testid="status">{status}</div>
			<div data-testid="count">{messages.length}</div>
			<button onClick={() => setDummyMode(true)}>dummy</button>
			<button onClick={() => connect()}>connect</button>
			<button onClick={() => clearMessages()}>clear</button>
		</div>
	);
}

// NOTE: Hook timing in jsdom + fake timers can be environment-sensitive.
// Marking as skipped until we introduce a stable timer strategy.
describe("useWebSocketClient (dummy mode)", () => {
	it("connects in dummy mode and starts streaming", async () => {
		// Provide crypto.randomUUID for the environment
		if (!global.crypto) {
			// @ts-ignore
			global.crypto = {} as any;
		}
		// @ts-ignore
		global.crypto.randomUUID = () => "uuid-test";

		await withFakeTimers(async (timer) => {
			render(<DummyComponent timer={timer} />);

			// Enable dummy mode
			await act(async () => {
				screen.getByText("dummy").click();
			});

			// Connect in dummy mode
			await act(async () => {
				screen.getByText("connect").click();
				// initial connecting + activate after 800ms
				vi.advanceTimersByTime(1200);
				vi.runOnlyPendingTimers();
			});

			// Allow state updates to flush
			await act(async () => {});
			expect(screen.getByTestId("status").textContent).toBe("connected");

			// Advance time to allow auto streaming to add messages
			await act(async () => {
				vi.advanceTimersByTime(3000);
			});

			const count = parseInt(
				screen.getByTestId("count").textContent || "0",
				10,
			);
			expect(count).toBeGreaterThan(0);

			// Clear messages
			await act(async () => {
				screen.getByText("clear").click();
			});
			expect(screen.getByTestId("count").textContent).toBe("0");
		});
	});
});

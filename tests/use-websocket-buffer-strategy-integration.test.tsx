import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { useWebSocketClient } from "@/hooks/use-websocket-client";
import { withFakeTimers } from "./utils/timers";

function StrategyHarness({ timer }: { timer: any }) {
	const {
		messages,
		setDummyMode,
		sendMessage,
		sendBatchMessage,
		clearMessages,
		messageBufferLimit,
		setMessageBufferLimit,
		bufferPreferPending,
		setBufferPreferPending,
		bufferPreferBatches,
		setBufferPreferBatches,
		bufferDropChunkSize,
		setBufferDropChunkSize,
	} = useWebSocketClient({ timer });

	return (
		<div>
			<div data-testid="count">{messages.length}</div>
			<div data-testid="ids">{messages.map((m) => m.id).join(",")}</div>
			<div data-testid="limit">{messageBufferLimit}</div>
			<div data-testid="prefPending">{String(bufferPreferPending)}</div>
			<div data-testid="prefBatches">{String(bufferPreferBatches)}</div>
			<div data-testid="chunk">{String(bufferDropChunkSize)}</div>
			<button onClick={() => setDummyMode(true)}>dummy</button>
			<button onClick={() => sendMessage("x", {})}>send</button>
			<button onClick={() => sendBatchMessage([{ method: "x", params: {} }])}>
				sendBatch1
			</button>
			<button onClick={() => clearMessages()}>clear</button>
			<button onClick={() => setMessageBufferLimit(2)}>setLimit2</button>
			<button onClick={() => setBufferPreferPending(true)}>
				prefPendingOn
			</button>
			<button onClick={() => setBufferPreferPending(false)}>
				prefPendingOff
			</button>
			<button onClick={() => setBufferPreferBatches(true)}>
				prefBatchesOn
			</button>
			<button onClick={() => setBufferPreferBatches(false)}>
				prefBatchesOff
			</button>
			<button onClick={() => setBufferDropChunkSize(2)}>chunk2</button>
		</div>
	);
}

describe("useWebSocketClient buffer strategy integration", () => {
	it("respects preferPending toggle when trimming on add", async () => {
		// stub crypto ids sequentially for deterministic order
		let counter = 0;
		const g: any = globalThis as any;
		if (g.crypto && typeof g.crypto.randomUUID === "function") {
			vi.spyOn(g.crypto, "randomUUID").mockImplementation(
				() => `id-${++counter}`,
			);
		} else {
			Object.defineProperty(g, "crypto", {
				value: { randomUUID: () => `id-${++counter}` },
				configurable: true,
			});
		}

		await withFakeTimers(async (timer) => {
			render(<StrategyHarness timer={timer} />);
		await act(async () => {
			screen.getByText("dummy").click();
			screen.getByText("setLimit2").click();
			screen.getByText("prefPendingOn").click(); // default true, explicit
			// push three pending messages quickly (no timer advance so all remain pending)
			screen.getByText("send").click(); // id-1
			screen.getByText("send").click(); // id-2
			screen.getByText("send").click(); // id-3 -> triggers trim
		});
		expect(screen.getAllByTestId("count")[0].textContent).toBe("2");
		// preferPending=true keeps preferred during first pass; forced drop removes from front → [id-2,id-3]
		expect(screen.getByTestId("ids").textContent).toBe("id-2,id-3");

		// now try preferPending=false
		await act(async () => {
			screen.getByText("clear").click();
			screen.getByText("prefPendingOff").click();
			// push three pending again
			screen.getByText("send").click(); // id-4
			screen.getByText("send").click(); // id-5
			screen.getByText("send").click(); // id-6
		});
		expect(screen.getAllByTestId("count")[0].textContent).toBe("2");
		// preferPending=false drops id-4, keeps [id-5, id-6]
		expect(screen.getByTestId("ids").textContent).toBe("id-5,id-6");

		});
	});

	it("respects preferBatches=true to keep batch over older normal", async () => {
		let counter = 100;
		const g: any = globalThis as any;
		if (g.crypto && typeof g.crypto.randomUUID === "function") {
			vi.spyOn(g.crypto, "randomUUID").mockImplementation(
				() => `id-${++counter}`,
			);
		} else {
			Object.defineProperty(g, "crypto", {
				value: { randomUUID: () => `id-${++counter}` },
				configurable: true,
			});
		}

		await withFakeTimers(async (timer) => {
			render(<StrategyHarness timer={timer} />);

		await act(async () => {
			// Avoid duplicate button ambiguity across environments
			const btn = screen.getAllByText("dummy")[0];
			btn && (btn as HTMLButtonElement).click();
			const limitBtn = screen.getAllByText("setLimit2")[0];
			(limitBtn as HTMLButtonElement).click();
			const pbOn = screen.getAllByText("prefBatchesOn")[0];
			(pbOn as HTMLButtonElement).click();
			const ppOff = screen.getAllByText("prefPendingOff")[0];
			(ppOff as HTMLButtonElement).click();
		});

		// let state update and re-render commit
		await act(async () => {});

		await act(async () => {
			screen.getAllByText("sendBatch1")[0].click(); // id-101 (batch)
			screen.getAllByText("send")[0].click(); // id-102
			screen.getAllByText("send")[0].click(); // id-103 -> trim
		});
		expect(screen.getAllByTestId("count")[0].textContent).toBe("2");
		// keep batch and newest
		expect(screen.getAllByTestId("ids")[0].textContent).toBe("id-101,id-103");

		});
	});
});

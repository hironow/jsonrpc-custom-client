import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RequestForm } from "@/components/request-form";

describe("RequestForm validation (zod-backed)", () => {
	beforeEach(() => {
		const g: any = globalThis as any;
		if (!g.crypto || typeof g.crypto.randomUUID !== "function") {
			Object.defineProperty(g, "crypto", {
				value: { randomUUID: () => "uuid-test" },
				configurable: true,
			});
		}
	});

	it("single: shows invalid JSON error and blocks send", () => {
		const onSend = vi.fn();
		render(<RequestForm disabled={false} onSend={onSend} />);

		fireEvent.change(
			screen.getAllByPlaceholderText("e.g., getUser, sendMessage")[0],
			{ target: { value: "doit" } },
		);
		fireEvent.change(screen.getByPlaceholderText('{"key": "value"}'), {
			target: { value: "{not json" },
		});
		fireEvent.click(screen.getByText("Send Request"));

		expect(screen.getByText("Invalid JSON format")).toBeTruthy();
		expect(onSend).not.toHaveBeenCalled();
	});

	it("single: shows non-object/array error and blocks send", () => {
		const onSend = vi.fn();
		render(<RequestForm disabled={false} onSend={onSend} />);

		fireEvent.change(
			screen.getAllByPlaceholderText("e.g., getUser, sendMessage")[0],
			{ target: { value: "doit" } },
		);
		fireEvent.change(screen.getAllByPlaceholderText('{"key": "value"}')[0], {
			target: { value: '"hello"' },
		});
		fireEvent.click(screen.getByText("Send Request"));

		expect(screen.getByText("Params must be object or array")).toBeTruthy();
		expect(onSend).not.toHaveBeenCalled();
	});

	it("batch: flags missing method and blocks batch send", () => {
		const onSend = vi.fn();
		const onSendBatch = vi.fn();
		render(
			<RequestForm
				disabled={false}
				onSend={onSend}
				onSendBatch={onSendBatch}
			/>,
		);

		// Enable batch mode
		fireEvent.click(screen.getAllByRole("switch")[0]);

		// There is one row initially; add another
		{
			const addBtn = screen
				.getAllByRole("button")
				.find((b) =>
					(b as HTMLButtonElement).textContent?.includes("Add Request"),
				);
			if (!addBtn) throw new Error("Add Request button not found");
			fireEvent.click(addBtn);
		}

		const methodInputs = screen.getAllByPlaceholderText("Method");
		// First is valid
		fireEvent.change(methodInputs[0], { target: { value: "m1" } });
		// Second left empty to trigger missing method

		fireEvent.click(screen.getByText(/Send Batch/));
		expect(screen.getAllByText("Method is required").length).toBeGreaterThan(0);
		expect(onSendBatch).not.toHaveBeenCalled();
	});

	it("batch: sends when all items valid", () => {
		const onSend = vi.fn();
		const onSendBatch = vi.fn();
		render(
			<RequestForm
				disabled={false}
				onSend={onSend}
				onSendBatch={onSendBatch}
			/>,
		);

		fireEvent.click(screen.getAllByRole("switch")[0]);
		{
			const addBtn = screen
				.getAllByRole("button")
				.find((b) =>
					(b as HTMLButtonElement).textContent?.includes("Add Request"),
				);
			if (!addBtn) throw new Error("Add Request button not found");
			fireEvent.click(addBtn);
		}
		const methodInputs = screen.getAllByPlaceholderText("Method");
		fireEvent.change(methodInputs[0], { target: { value: "m1" } });
		fireEvent.change(methodInputs[1], { target: { value: "m2" } });
		fireEvent.click(screen.getByText(/Send Batch/));

		expect(onSendBatch).toHaveBeenCalledTimes(1);
		const arg = onSendBatch.mock.calls[0][0];
		expect(Array.isArray(arg)).toBe(true);
		expect(arg.length).toBe(2);
		expect(arg[0]).toEqual({ method: "m1", params: {} });
		expect(arg[1]).toEqual({ method: "m2", params: {} });
	});
});

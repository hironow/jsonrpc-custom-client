import type { Message } from "@/types/message";

const HEADER_HEIGHT = 28;
const BASE_MESSAGE_HEIGHT = 88;

function approxLength(data: any): number {
	try {
		const s = typeof data === "string" ? data : JSON.stringify(data);
		return s?.length ?? 0;
	} catch {
		return 0;
	}
}

export function estimateMessageHeight(message: Message): number {
	let h = BASE_MESSAGE_HEIGHT;

	// Payload size heuristic: +16px per ~400 chars, capped at +160px
	const len = approxLength(message.data);
	if (len > 400) {
		const extra = Math.min(10, Math.floor(len / 400)) * 16;
		h += extra;
	}

	// Batch size heuristic: +12px per 5 items beyond 5
	if (
		message.isBatch &&
		typeof message.batchSize === "number" &&
		message.batchSize > 5
	) {
		const extraGroups = Math.floor((message.batchSize - 5) / 5) + 1;
		h += extraGroups * 12;
	}

	// Validation issues add some space
	if (message.validationErrors?.length) h += 12;
	if (message.validationWarnings?.length) h += 8;

	return h;
}

export type HeaderRow = { type: "header"; range: string; elapsedMs: number };
export type MessageRow = { type: "message"; message: Message };
export type Row = HeaderRow | MessageRow;

export function estimateRowSize(row: Row): number {
	if (row.type === "header") return HEADER_HEIGHT;
	return estimateMessageHeight(row.message);
}

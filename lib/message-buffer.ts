import type { Message } from "@/types/message";

export type BufferTrimOptions = {
	preferPending?: boolean;
	preferBatches?: boolean;
	dropChunkSize?: number;
};

const defaultOptions: Required<BufferTrimOptions> = {
	preferPending: true,
	preferBatches: false,
	dropChunkSize: 1,
};

// Push a message into the ring buffer with a maximum limit.
// Drops oldest messages first, but preserves pending messages (isPending=true) when possible.
export function pushWithLimit(
	prev: Message[],
	nextMessage: Message,
	limit: number,
): Message[] {
	return pushWithLimitWithOptions(prev, nextMessage, limit);
}

// Trim an existing array of messages down to the provided limit.
// Behavior mirrors pushWithLimit: drop oldest first while preferring to keep pending messages.
export function trimToLimit(messages: Message[], limit: number): Message[] {
	return trimToLimitWithOptions(messages, limit);
}

function shouldPrefer(
	candidate: Message,
	opts: Required<BufferTrimOptions>,
): boolean {
	if (opts.preferPending && candidate.isPending) return true;
	if (opts.preferBatches && candidate.isBatch) return true;
	return false;
}

function dropForcedFront(
	next: Message[],
	limit: number,
	dropChunkSize: number,
) {
	while (next.length > limit) {
		const chunk = Math.min(dropChunkSize, next.length - limit);
		next.splice(0, chunk);
	}
}

export function pushWithLimitWithOptions(
	prev: Message[],
	nextMessage: Message,
	limit: number,
	options?: BufferTrimOptions,
): Message[] {
	const next = [...prev, nextMessage];
	if (next.length <= limit) return next;
	return trimArrayToLimitInPlace(next, limit, options);
}

export function trimToLimitWithOptions(
	messages: Message[],
	limit: number,
	options?: BufferTrimOptions,
): Message[] {
	if (messages.length <= limit) return messages;
	const next = [...messages];
	return trimArrayToLimitInPlace(next, limit, options);
}

function trimArrayToLimitInPlace(
	next: Message[],
	limit: number,
	options?: BufferTrimOptions,
): Message[] {
	const opts = { ...defaultOptions, ...(options ?? {}) };
	if (next.length <= limit) return next;

	// Compute how many to drop
	let toDrop = next.length - limit;

	// Drop from the front, skipping preferred messages when we can.
	let start = 0;
	while (toDrop > 0 && start < next.length) {
		const candidate = next[start];
		if (shouldPrefer(candidate, opts)) {
			start += 1;
			continue;
		}
		next.splice(start, 1);
		toDrop -= 1;
	}

	// If we still exceeded limit (e.g., too many preferred at the front), force drop from the front in chunks
	if (next.length > limit) {
		dropForcedFront(next, limit, Math.max(1, opts.dropChunkSize));
	}
	return next;
}

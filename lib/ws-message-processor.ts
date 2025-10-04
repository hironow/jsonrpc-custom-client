import type { Message } from "@/types/message";
import { matchBatchResponse } from "@/lib/batch-match";

export type PendingRequest = { timestamp: number; messageId: string };

export type ProcessIncomingDeps = {
	now: number;
	uuid: () => string;
	addMessage: (message: Omit<Message, "id" | "timestamp">, id?: string) => void;
	setMessages: (updater: (prev: Message[]) => Message[]) => void;
	pendingRequests: Map<number, PendingRequest>;
	pendingBatches: Map<string, { timestamp: number; requestIds: number[] }>;
};

/**
 * Pure handler for incoming parsed WebSocket data.
 * Structural extraction from useWebSocketClient.onmessage without behavior change.
 */
export function processIncomingMessage(
	data: any,
	deps: ProcessIncomingDeps,
): void {
	const {
		now,
		uuid,
		addMessage,
		setMessages,
		pendingRequests,
		pendingBatches,
	} = deps;

	// Batch branch
	if (Array.isArray(data)) {
		const allNotifications = data.every(
			(item: any) =>
				item &&
				typeof item === "object" &&
				!Object.prototype.hasOwnProperty.call(item, "id") &&
				typeof (item as any).method === "string",
		);
		if (allNotifications) {
			addMessage({
				type: "received",
				data,
				method: "batch.notification",
				isBatch: true,
				batchSize: data.length,
				isNotification: true,
			});
			return;
		}

		const responseIds = data
			.map((item: any) =>
				item && typeof item === "object" ? item.id : undefined,
			)
			.filter((id: any) => typeof id === "number") as number[];

		const { linkedBatchId, responseTime } = matchBatchResponse(
			pendingBatches,
			responseIds,
			now,
			{ mode: "all" },
		);

		if (linkedBatchId) {
			// Mark the pending batch request as not pending
			setMessages((prev) =>
				prev.map((m) =>
					m.id === linkedBatchId ? { ...m, isPending: false } : m,
				),
			);
			pendingBatches.delete(linkedBatchId);
		}

		const responseMsgId = uuid();
		if (linkedBatchId) {
			// Link the batch request to this batch response
			setMessages((prev) =>
				prev.map((m) =>
					m.id === linkedBatchId ? { ...m, linkedMessageId: responseMsgId } : m,
				),
			);
		}
		addMessage(
			{
				type: "received",
				data,
				method: "batch.response",
				isBatch: true,
				batchSize: data.length,
				responseTime,
				linkedMessageId: linkedBatchId,
			},
			responseMsgId,
		);
		return;
	}

	// Single message
	const hasId =
		typeof data === "object" &&
		data !== null &&
		Object.prototype.hasOwnProperty.call(data, "id");
	const requestId = hasId ? (data as any).id : undefined;
	const isNotification = !hasId && typeof (data as any)?.method === "string";

	if (requestId !== undefined && pendingRequests.has(requestId)) {
		const pending = pendingRequests.get(requestId)!;
		const responseTime = now - pending.timestamp;
		// Mark the pending request as completed
		setMessages((prev) =>
			prev.map((msg) =>
				msg.id === pending.messageId ? { ...msg, isPending: false } : msg,
			),
		);
		addMessage({
			type: "received",
			data,
			method: (data as any).method || "response",
			requestId,
			responseTime,
		});
		pendingRequests.delete(requestId);
	} else {
		const methodLabel =
			typeof (data as any)?.method === "string"
				? (data as any).method
				: (data as any).result !== undefined ||
						(data as any).error !== undefined
					? "response"
					: "notification";
		addMessage({ type: "received", data, method: methodLabel, isNotification });
	}
}

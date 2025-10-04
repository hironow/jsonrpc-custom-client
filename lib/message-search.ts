import type { Message } from "@/types/message";

export type QuickFilter = {
	method?: string;
	id?: string | number;
	text?: string;
};

function toLower(s: string | undefined): string {
	return (s ?? "").toLowerCase();
}

function getMessageMethod(msg: Message): string | undefined {
	if (typeof msg.method === "string") return msg.method;
	const d = msg.data;
	if (d && typeof d === "object" && typeof (d as any).method === "string")
		return (d as any).method;
	return undefined;
}

function getJsonRpcIds(msg: Message): Array<string> {
	const ids: Array<string> = [];
	const d = msg.data;
	if (Array.isArray(d)) {
		for (const item of d) {
			if (item && typeof item === "object" && (item as any).id !== undefined) {
				ids.push(String((item as any).id));
			}
		}
	} else if (d && typeof d === "object" && (d as any).id !== undefined) {
		ids.push(String((d as any).id));
	}
	// Also consider requestId on Message for convenience
	if (msg.requestId !== undefined) ids.push(String(msg.requestId));
	return ids;
}

export function matchesQuickFilter(
	msg: Message,
	filter?: QuickFilter,
): boolean {
	if (!filter) return true;

	// method contains (case-insensitive)
	if (filter.method && filter.method.trim() !== "") {
		const m = getMessageMethod(msg);
		if (!m || !toLower(m).includes(toLower(filter.method))) return false;
	}

	// id exact match against any JSON-RPC id/requestId
	if (filter.id !== undefined && String(filter.id).trim() !== "") {
		const ids = getJsonRpcIds(msg);
		if (!ids.includes(String(filter.id))) return false;
	}

	// text substring search within data JSON (case-insensitive)
	if (filter.text && filter.text.trim() !== "") {
		let payload = "";
		try {
			payload =
				typeof msg.data === "string" ? msg.data : JSON.stringify(msg.data);
		} catch {
			payload = "";
		}
		if (!toLower(payload).includes(toLower(filter.text))) return false;
	}

	return true;
}

export function filterMessagesByQuickFilter(
	messages: Message[],
	filter?: QuickFilter,
): Message[] {
	if (!filter || (filter.method ?? filter.id ?? filter.text) === undefined)
		return messages;
	return messages.filter((m) => matchesQuickFilter(m, filter));
}

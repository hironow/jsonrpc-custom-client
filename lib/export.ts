import type { Message } from "@/types/message";

type SerializableMessage = Omit<Message, "timestamp"> & { timestamp: string };

export function serializeMessages(messages: Message[]): string {
	const serializable: SerializableMessage[] = messages.map((m) => ({
		...m,
		timestamp: m.timestamp.toISOString(),
	}));
	return JSON.stringify(serializable, null, 2);
}

export function deserializeMessages(json: string): Message[] {
	const arr = JSON.parse(json) as SerializableMessage[];
	return arr.map((m) => ({
		...m,
		timestamp: new Date(m.timestamp),
	}));
}

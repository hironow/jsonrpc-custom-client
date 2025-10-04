export const MESSAGE_BUFFER_LIMIT = Number(
	process.env.NEXT_PUBLIC_MESSAGE_BUFFER_LIMIT ?? 2000,
);

export function getDefaultWsUrl(): string {
	return process.env.NEXT_PUBLIC_WS_URL_DEFAULT || "ws://localhost:8080";
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/types/message";
import type { ConnectionStatus } from "@/types/connection";
import { validateJsonRpcMessage } from "@/lib/jsonrpc-validator";
import { MESSAGE_BUFFER_LIMIT, getDefaultWsUrl } from "@/lib/config";
import {
	pushWithLimitWithOptions,
	trimToLimitWithOptions,
} from "@/lib/message-buffer";
import { matchBatchResponse } from "@/lib/batch-match";

type TimerLike = {
	setTimeout: (fn: (...args: any[]) => void, ms?: number) => any;
	clearTimeout: (id: any) => void;
	setInterval: (fn: (...args: any[]) => void, ms?: number) => any;
	clearInterval: (id: any) => void;
	now?: () => number;
};

type WebSocketFactory = (url: string) => WebSocket;

const defaultTimer: TimerLike = {
	setTimeout: (fn, ms) => setTimeout(fn as any, ms),
	clearTimeout: (id) => clearTimeout(id),
	setInterval: (fn, ms) => setInterval(fn as any, ms),
	clearInterval: (id) => clearInterval(id),
	now: () => Date.now(),
};

type ReconnectOptions = {
	baseMs?: number;
	maxMs?: number;
	jitter?: (delayMs: number, attempt: number) => number;
};

export function useWebSocketClient(options?: {
	timer?: TimerLike;
	wsFactory?: WebSocketFactory;
	reconnect?: ReconnectOptions;
	rng?: () => number;
	dummy?: { autoRequestIntervalMs?: number; notificationIntervalMs?: number };
}) {
	const timer = options?.timer ?? defaultTimer;
	const wsFactory = options?.wsFactory ?? ((u: string) => new WebSocket(u));
	const rng = options?.rng ?? Math.random;
	const [url, setUrl] = useState(getDefaultWsUrl());
	const [status, setStatus] = useState<ConnectionStatus>("disconnected");
	const [messages, setMessages] = useState<Message[]>([]);
	const [messageBufferLimit, setMessageBufferLimit] =
		useState<number>(MESSAGE_BUFFER_LIMIT);
	const [dummyMode, setDummyMode] = useState(false);
	const [bufferPreferPending, setBufferPreferPending] = useState<boolean>(true);
	const [bufferPreferBatches, setBufferPreferBatches] =
		useState<boolean>(false);
	const [bufferDropChunkSize, setBufferDropChunkSize] = useState<number>(1);

	// Fast ping toggle (disabled by default)
	const [fastPingEnabled, setFastPingEnabled] = useState<boolean>(false);

	const wsRef = useRef<WebSocket | null>(null);
	const messageIdCounter = useRef(1);
	const dummyIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const autoRequestIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const fastPingIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const pendingRequestsRef = useRef<
		Map<number, { timestamp: number; messageId: string }>
	>(new Map());
	const pendingBatchesRef = useRef<
		Map<string, { timestamp: number; requestIds: number[] }>
	>(new Map());
	const shouldReconnectRef = useRef<boolean>(false);
	const reconnectAttemptsRef = useRef<number>(0);
	const reconnectTimeoutRef = useRef<any>(null);

	const addMessage = (
		message: Omit<Message, "id" | "timestamp">,
		id?: string,
	) => {
		let validationErrors: string[] | undefined;
		let validationWarnings: string[] | undefined;

		if (message.type === "sent" || message.type === "received") {
			const isIncomingNotification =
				message.type === "received" && (message as any).isNotification === true;
			const messageType =
				message.type === "sent" || isIncomingNotification
					? "request"
					: "response";
			const validation = validateJsonRpcMessage(message.data, messageType);

			if (!validation.isValid || validation.warnings.length > 0) {
				validationErrors =
					validation.errors.length > 0 ? validation.errors : undefined;
				validationWarnings =
					validation.warnings.length > 0 ? validation.warnings : undefined;
			}
		}

		const newEntry: Message = {
			...message,
			id: id || crypto.randomUUID(),
			timestamp: new Date(),
			validationErrors,
			validationWarnings,
		};
		setMessages((prev) =>
			pushWithLimitWithOptions(prev, newEntry, messageBufferLimit, {
				preferPending: bufferPreferPending,
				preferBatches: bufferPreferBatches,
				dropChunkSize: bufferDropChunkSize,
			}),
		);
	};

	const addSystemMessage = (text: string) => {
		addMessage({
			type: "system",
			data: { message: text },
		});
	};

	const connectDummy = () => {
		setStatus("connecting");
		addSystemMessage("Starting dummy mode...");

		timer.setTimeout(() => {
			setStatus("connected");
			addSystemMessage("Dummy mode activated - Simulating JSONRPC stream");

			autoRequestIntervalRef.current = timer.setInterval(() => {
				const rand = rng();
				if (rand < 0.4) {
					const size = 2 + Math.floor(rng() * 3);
					const batchMessages = Array.from({ length: size }).map(() => ({
						jsonrpc: "2.0",
						method: "dummy.method",
						params: { n: rng() },
						id: messageIdCounter.current++,
					}));
					sendBatchMessage(
						batchMessages.map((m) => ({ method: m.method, params: m.params })),
					);
				} else {
					const id = messageIdCounter.current++;
					sendMessage("dummy.method", { n: id });
				}
			}, options?.dummy?.autoRequestIntervalMs ?? 2500);

			dummyIntervalRef.current = timer.setInterval(() => {
				const rand = rng();
				if (rand < 0.6) {
					const now = timer.now ? timer.now() : Date.now();
					addMessage({
						type: "received",
						data: { jsonrpc: "2.0", method: "stream.data", params: { t: now } },
						isNotification: true,
					});
				} else if (rand < 0.85) {
					addMessage({
						type: "received",
						data: {
							jsonrpc: "2.0",
							method: "notification",
							params: { n: rng() },
						},
						isNotification: true,
					});
				}
			}, options?.dummy?.notificationIntervalMs ?? 1500);
		}, 800);
	};

	const connect = () => {
		if (dummyMode) {
			connectDummy();
			return;
		}
		if (wsRef.current?.readyState === WebSocket.OPEN) return;

		setStatus("connecting");
		addSystemMessage("Connecting to " + url);
		shouldReconnectRef.current = true;
		// clear any scheduled reconnect attempts before fresh connect
		if (reconnectTimeoutRef.current)
			timer.clearTimeout(reconnectTimeoutRef.current);
		reconnectTimeoutRef.current = null;

		try {
			const ws = wsFactory(url);

			ws.onopen = () => {
				setStatus("connected");
				addSystemMessage("Connected successfully");
				reconnectAttemptsRef.current = 0;
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (Array.isArray(data)) {
						const responseIds = data
							.map((item: any) =>
								item && typeof item === "object" ? item.id : undefined,
							)
							.filter((id: any) => typeof id === "number") as number[];

						const now = timer.now ? timer.now() : Date.now();
						const { linkedBatchId, responseTime } = matchBatchResponse(
							pendingBatchesRef.current,
							responseIds,
							now,
							{ mode: "all" },
						);
						if (linkedBatchId) {
							setMessages((prev) =>
								prev.map((m) =>
									m.id === linkedBatchId ? { ...m, isPending: false } : m,
								),
							);
							pendingBatchesRef.current.delete(linkedBatchId);
						}

						const responseMsgId = crypto.randomUUID();
						if (linkedBatchId) {
							setMessages((prev) =>
								prev.map((m) =>
									m.id === linkedBatchId
										? { ...m, linkedMessageId: responseMsgId }
										: m,
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

					const hasId =
						typeof data === "object" &&
						data !== null &&
						Object.prototype.hasOwnProperty.call(data, "id");
					const requestId = hasId ? (data as any).id : undefined;
					const isNotification =
						!hasId && typeof (data as any)?.method === "string";

					if (
						requestId !== undefined &&
						pendingRequestsRef.current.has(requestId)
					) {
						const pending = pendingRequestsRef.current.get(requestId)!;
						const now = timer.now ? timer.now() : Date.now();
						const responseTime = now - pending.timestamp;
						setMessages((prev) =>
							prev.map((msg) =>
								msg.id === pending.messageId
									? { ...msg, isPending: false }
									: msg,
							),
						);
						addMessage({
							type: "received",
							data,
							method: data.method || "response",
							requestId,
							responseTime,
						});
						pendingRequestsRef.current.delete(requestId);
					} else {
						const methodLabel =
							typeof (data as any)?.method === "string"
								? (data as any).method
								: (data as any).result !== undefined ||
										(data as any).error !== undefined
									? "response"
									: "notification";
						addMessage({
							type: "received",
							data,
							method: methodLabel,
							isNotification,
						});
					}
				} catch (error) {
					addMessage({ type: "received", data: event.data });
				}
			};

			ws.onerror = () => {
				setStatus("error");
				addMessage({
					type: "error",
					data: { message: "WebSocket error occurred" },
				});
			};

			ws.onclose = () => {
				setStatus("disconnected");
				addSystemMessage("Connection closed");
				pendingRequestsRef.current.clear();
				pendingBatchesRef.current.clear();
				wsRef.current = null;
				// schedule reconnect if enabled and not in dummy mode
				if (shouldReconnectRef.current && !dummyMode) {
					const attempt = reconnectAttemptsRef.current;
					const base = options?.reconnect?.baseMs ?? 500;
					const max = options?.reconnect?.maxMs ?? 4000;
					let delay = base * Math.pow(2, attempt);
					if (typeof options?.reconnect?.jitter === "function") {
						delay = options!.reconnect!.jitter!(delay, attempt);
					}
					delay = Math.min(max, Math.max(0, delay));
					reconnectAttemptsRef.current = attempt + 1;
					reconnectTimeoutRef.current = timer.setTimeout(() => {
						// only attempt if still allowed to reconnect
						if (shouldReconnectRef.current) {
							connect();
						}
					}, delay);
				}
			};

			wsRef.current = ws;
		} catch (error) {
			setStatus("error");
			addMessage({
				type: "error",
				data: { message: "Failed to connect: " + (error as Error).message },
			});
		}
	};

	const disconnect = () => {
		if (dummyMode) {
			if (autoRequestIntervalRef.current)
				clearInterval(autoRequestIntervalRef.current);
			if (dummyIntervalRef.current) clearInterval(dummyIntervalRef.current);
			if (fastPingIntervalRef.current)
				timer.clearInterval(fastPingIntervalRef.current);
			setStatus("disconnected");
			addSystemMessage("Dummy mode deactivated");
			return;
		}
		shouldReconnectRef.current = false;
		if (reconnectTimeoutRef.current)
			timer.clearTimeout(reconnectTimeoutRef.current);
		reconnectTimeoutRef.current = null;
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
	};

	const sendMessage = (method: string, params: any) => {
		if (dummyMode) {
			const id = messageIdCounter.current++;
			const message = { jsonrpc: "2.0", method, params, id };
			const messageId = crypto.randomUUID();
			const now = timer.now ? timer.now() : Date.now();
			pendingRequestsRef.current.set(id, { timestamp: now, messageId });
			addMessage(
				{ type: "sent", data: message, method, requestId: id, isPending: true },
				messageId,
			);
			const delay = 300 + Math.random() * 700;
			timer.setTimeout(() => {
				const isError = Math.random() < 0.15;
				const response = isError
					? {
							jsonrpc: "2.0",
							error: { code: -32603, message: "Internal error" },
							id,
						}
					: { jsonrpc: "2.0", result: { ok: true }, id };
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === messageId ? { ...msg, isPending: false } : msg,
					),
				);
				addMessage({
					type: "received",
					data: response,
					method: "response",
					requestId: id,
					responseTime: delay,
				});
				pendingRequestsRef.current.delete(id);
			}, delay);
			return;
		}
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
			addMessage({
				type: "error",
				data: { message: "Not connected to WebSocket" },
			});
			return;
		}
		const id = messageIdCounter.current++;
		const message = { jsonrpc: "2.0", method, params, id };
		try {
			const messageId = crypto.randomUUID();
			const now = timer.now ? timer.now() : Date.now();
			pendingRequestsRef.current.set(id, { timestamp: now, messageId });
			wsRef.current.send(JSON.stringify(message));
			addMessage(
				{ type: "sent", data: message, method, requestId: id, isPending: true },
				messageId,
			);
		} catch (error) {
			addMessage({
				type: "error",
				data: { message: "Failed to send: " + (error as Error).message },
			});
		}
	};

	const sendPing = () => {
		// Convenience method for JSON-RPC ping
		sendMessage("ping", {});
	};

	const sendBatchMessage = (
		requests: Array<{ method: string; params: any }>,
	) => {
		if (dummyMode) {
			const batchMessages = requests.map((req) => ({
				jsonrpc: "2.0",
				method: req.method,
				params: req.params,
				id: messageIdCounter.current++,
			}));
			const batchId = crypto.randomUUID();
			addMessage(
				{
					type: "sent",
					data: batchMessages,
					method: "batch.request",
					isBatch: true,
					batchSize: batchMessages.length,
					isPending: true,
				},
				batchId,
			);
			const delay = 400 + Math.random() * 800;
			timer.setTimeout(() => {
				const batchResponses = batchMessages.map((msg) => {
					const isError = Math.random() < 0.15;
					return isError
						? {
								jsonrpc: "2.0",
								error: { code: -32603, message: "Internal error" },
								id: msg.id,
							}
						: { jsonrpc: "2.0", result: { ok: true }, id: msg.id };
				});
				setMessages((prev) =>
					prev.map((m) =>
						m.id === batchId
							? { ...m, isPending: false, linkedMessageId: crypto.randomUUID() }
							: m,
					),
				);
				const responseId = crypto.randomUUID();
				setMessages((prev) =>
					prev.map((m) =>
						m.id === batchId ? { ...m, linkedMessageId: responseId } : m,
					),
				);
				addMessage(
					{
						type: "received",
						data: batchResponses,
						method: "batch.response",
						isBatch: true,
						batchSize: batchResponses.length,
						responseTime: delay,
						linkedMessageId: batchId,
					},
					responseId,
				);
			}, delay);
			return;
		}
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
			addMessage({
				type: "error",
				data: { message: "Not connected to WebSocket" },
			});
			return;
		}
		const batchMessages = requests.map((req) => ({
			jsonrpc: "2.0",
			method: req.method,
			params: req.params,
			id: messageIdCounter.current++,
		}));
		try {
			const batchId = crypto.randomUUID();
			const requestIds = batchMessages.map((msg) => msg.id);
			const now = timer.now ? timer.now() : Date.now();
			pendingBatchesRef.current.set(batchId, { timestamp: now, requestIds });
			wsRef.current.send(JSON.stringify(batchMessages));
			addMessage(
				{
					type: "sent",
					data: batchMessages,
					method: "batch.request",
					isBatch: true,
					batchSize: batchMessages.length,
					isPending: true,
				},
				batchId,
			);
		} catch (error) {
			addMessage({
				type: "error",
				data: { message: "Failed to send batch: " + (error as Error).message },
			});
		}
	};

	const clearMessages = () => {
		setMessages([]);
		pendingRequestsRef.current.clear();
		pendingBatchesRef.current.clear();
	};

	useEffect(() => {
		return () => {
			if (wsRef.current) wsRef.current.close();
			if (autoRequestIntervalRef.current)
				timer.clearInterval(autoRequestIntervalRef.current);
			if (dummyIntervalRef.current)
				timer.clearInterval(dummyIntervalRef.current);
			if (fastPingIntervalRef.current)
				timer.clearInterval(fastPingIntervalRef.current);
			if (reconnectTimeoutRef.current)
				timer.clearTimeout(reconnectTimeoutRef.current);
		};
	}, []);

	// Apply trimming when the limit or strategy changes
	useEffect(() => {
		setMessages((prev) =>
			trimToLimitWithOptions(prev, messageBufferLimit, {
				preferPending: bufferPreferPending,
				preferBatches: bufferPreferBatches,
				dropChunkSize: bufferDropChunkSize,
			}),
		);
	}, [
		messageBufferLimit,
		bufferPreferPending,
		bufferPreferBatches,
		bufferDropChunkSize,
	]);

	// Start/stop 100ms ping when enabled and connected (non-dummy)
	useEffect(() => {
		// clear any existing interval first
		if (fastPingIntervalRef.current) {
			timer.clearInterval(fastPingIntervalRef.current);
			fastPingIntervalRef.current = null;
		}

		if (
			fastPingEnabled &&
			!dummyMode &&
			status === "connected" &&
			wsRef.current &&
			wsRef.current.readyState === WebSocket.OPEN
		) {
			fastPingIntervalRef.current = timer.setInterval(() => {
				// Use existing send flow to record messages/latency
				sendPing();
			}, 100);
		}

		return () => {
			if (fastPingIntervalRef.current) {
				timer.clearInterval(fastPingIntervalRef.current);
				fastPingIntervalRef.current = null;
			}
		};
	}, [fastPingEnabled, status, dummyMode]);

	return {
		url,
		setUrl,
		status,
		messages,
		messageBufferLimit,
		setMessageBufferLimit,
		bufferPreferPending,
		setBufferPreferPending,
		bufferPreferBatches,
		setBufferPreferBatches,
		bufferDropChunkSize,
		setBufferDropChunkSize,
		dummyMode,
		setDummyMode,
		fastPingEnabled,
		setFastPingEnabled,
		sendPing,
		connect,
		disconnect,
		sendMessage,
		sendBatchMessage,
		clearMessages,
	};
}

export type LinkableMessage = {
  id: string
  type: "sent" | "received" | "error" | "system"
  data: any
  linkedMessageId?: string
}

export function findLinkedMessage<T extends LinkableMessage>(
  messages: T[],
  message: T,
): T | null {
  if (message.linkedMessageId) {
    return messages.find((m) => m.id === message.linkedMessageId) || null
  }

  if (typeof message.data !== "object" || message.data?.id === undefined) return null

  const id = message.data.id
  const linkedMsg = messages.find(
    (m) => typeof m.data === "object" && (m as any).data?.id === id && m.id !== message.id,
  )

  if (!linkedMsg) return null

  if (message.type === "sent" && linkedMsg.type === "received") return linkedMsg as T
  if (message.type === "received" && linkedMsg.type === "sent") return linkedMsg as T

  return null
}


"use client"

import { useState } from "react"

import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageItem } from "@/components/message-item"
import { Trash2, ArrowDown, ArrowUp, Filter, Clock } from "lucide-react"
import type { Message } from "@/types/message"
import { findLinkedMessage } from "@/lib/message-link"

type MessageListProps = {
  messages: Message[]
  autoScroll: boolean
  selectedMessageId: string | null
  onAutoScrollChange: (value: boolean) => void
  onClear: () => void
  onSelectMessage: (id: string | null) => void
}

function getTimeRange(elapsedMs: number): string {
  if (elapsedMs < 1000) return "0-1s"
  if (elapsedMs < 2000) return "1-2s"
  if (elapsedMs < 5000) return "2-5s"
  if (elapsedMs < 10000) return "5-10s"
  if (elapsedMs < 30000) return "10-30s"
  if (elapsedMs < 60000) return "30-60s"
  return "60s+"
}

function formatElapsedTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

export function MessageList({
  messages,
  autoScroll,
  selectedMessageId,
  onAutoScrollChange,
  onClear,
  onSelectMessage,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<"all" | "sent" | "received" | "error" | "notification">("all")
  const [scrollIndicator, setScrollIndicator] = useState<string | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, autoScroll])

  const handleScroll = () => {
    if (!scrollRef.current || messages.length === 0) return

    const scrollTop = scrollRef.current.scrollTop
    const scrollHeight = scrollRef.current.scrollHeight
    const clientHeight = scrollRef.current.clientHeight

    // Calculate which message is currently in view
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight)
    const messageIndex = Math.floor(scrollPercentage * filteredMessages.length)
    const currentMessage = filteredMessages[messageIndex]

    if (currentMessage && messages.length > 0) {
      const firstMessageTime = messages[0].timestamp.getTime()
      const elapsedMs = currentMessage.timestamp.getTime() - firstMessageTime
      setScrollIndicator(formatElapsedTime(elapsedMs))
    }

    // Clear indicator after scrolling stops
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setScrollIndicator(null)
    }, 1000)
  }

  const filteredMessages = messages.filter((msg) => {
    if (filter === "all") return true
    if (filter === "notification") return msg.isNotification === true
    return msg.type === filter
  })

  const groupedMessages: { range: string; messages: Message[]; elapsedMs: number }[] = []
  if (filteredMessages.length > 0) {
    const firstMessageTime = messages[0].timestamp.getTime()
    let currentRange = ""
    let currentGroup: Message[] = []
    let currentElapsedMs = 0

    filteredMessages.forEach((msg) => {
      const elapsedMs = msg.timestamp.getTime() - firstMessageTime
      const range = getTimeRange(elapsedMs)

      if (range !== currentRange) {
        if (currentGroup.length > 0) {
          groupedMessages.push({ range: currentRange, messages: currentGroup, elapsedMs: currentElapsedMs })
        }
        currentRange = range
        currentGroup = [msg]
        currentElapsedMs = elapsedMs
      } else {
        currentGroup.push(msg)
      }
    })

    if (currentGroup.length > 0) {
      groupedMessages.push({ range: currentRange, messages: currentGroup, elapsedMs: currentElapsedMs })
    }
  }

  const messageMap = new Map<string | number, Message>()
  messages.forEach((msg) => {
    if (typeof msg.data === "object" && msg.data?.id !== undefined) {
      messageMap.set(msg.data.id, msg)
    }
  })

  // Linking logic centralized in lib/message-link
  const getLinkedMessage = (message: Message): Message | null =>
    findLinkedMessage(messages, message as any) as Message | null

  const stats = {
    total: messages.length,
    sent: messages.filter((m) => m.type === "sent").length,
    received: messages.filter((m) => m.type === "received").length,
    errors: messages.filter((m) => m.type === "error").length,
    notifications: messages.filter((m) => m.isNotification === true).length,
  }

  const selectedMessage = messages.find((m) => m.id === selectedMessageId)
  const linkedToSelected = selectedMessage ? getLinkedMessage(selectedMessage) : null

  return (
    <Card className="flex flex-col h-full bg-card border-border overflow-hidden">
      <div className="p-2 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-sm font-semibold text-foreground">Messages</h2>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAutoScrollChange(!autoScroll)}
              className="h-6 text-xs text-muted-foreground hover:text-foreground px-1.5"
            >
              {autoScroll ? <ArrowDown className="w-3 h-3 mr-1" /> : <ArrowUp className="w-3 h-3 mr-1" />}
              Auto
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={messages.length === 0}
              className="h-6 text-xs text-muted-foreground hover:text-destructive px-1.5"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-muted h-7">
            <TabsTrigger value="all" className="data-[state=active]:bg-background text-[11px] px-1">
              All{" "}
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="sent" className="data-[state=active]:bg-background text-[11px] px-1">
              Sent{" "}
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">
                {stats.sent}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="received" className="data-[state=active]:bg-background text-[11px] px-1">
              Recv{" "}
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">
                {stats.received}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="notification" className="data-[state=active]:bg-background text-[11px] px-1">
              Notif{" "}
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">
                {stats.notifications}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="error" className="data-[state=active]:bg-background text-[11px] px-1">
              Err{" "}
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">
                {stats.errors}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {scrollIndicator && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-background/95 backdrop-blur-sm border-2 border-primary rounded-lg px-6 py-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              <div className="text-3xl font-bold text-foreground">{scrollIndicator}</div>
            </div>
            <div className="text-xs text-muted-foreground text-center mt-1">from start</div>
          </div>
        </div>
      )}

      <div
        className="flex-1 min-h-0 overflow-y-auto p-2 relative custom-scrollbar"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {messages.length === 0 ? "No messages yet" : "No messages match the filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm px-2 py-1 mb-0.5 flex items-center gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">{group.range}</span>
                  <span className="text-[9px] text-muted-foreground/70">
                    ({formatElapsedTime(group.elapsedMs)} from start)
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.messages.map((message) => {
                    const linkedMessage = getLinkedMessage(message)
                    const isLinkedSelected = linkedToSelected?.id === message.id

                    return (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isSelected={message.id === selectedMessageId}
                        onClick={() => onSelectMessage(message.id)}
                        linkedMessage={linkedMessage}
                        isLinkedSelected={isLinkedSelected}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

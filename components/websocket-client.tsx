"use client"

import { useState, useRef, useEffect } from "react"
import { MessageList } from "@/components/message-list"
import { RequestForm } from "@/components/request-form"
import { ConnectionPanel } from "@/components/connection-panel"
import { MethodStatistics } from "@/components/method-statistics"
import { NotificationSidebar } from "@/components/notification-sidebar"
import { ErrorAnalysisDashboard } from "@/components/error-analysis-dashboard"
import { Activity, Zap, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponseTimeHeatmap } from "@/components/response-time-heatmap"
import { ConnectionQualityMonitor } from "@/components/connection-quality-monitor"
import {
  generateDummyResponse,
  generateDummyNotification,
  generateDummyStreamData,
  generateDummyRequest,
  generateDummyBatchRequest,
} from "@/lib/dummy-data-generator"
import { MessageDetailSidebar } from "./message-detail-sidebar"
import { validateJsonRpcMessage } from "@/lib/jsonrpc-validator"

export type Message = {
  id: string
  type: "sent" | "received" | "error" | "system"
  timestamp: Date
  data: any
  method?: string
  requestId?: number
  responseTime?: number
  isPending?: boolean
  isNotification?: boolean
  isBatch?: boolean
  batchSize?: number
  linkedMessageId?: string
  validationErrors?: string[]
  validationWarnings?: string[]
}

export function WebSocketClient() {
  const [url, setUrl] = useState("ws://localhost:8080")
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected")
  const [messages, setMessages] = useState<Message[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [dummyMode, setDummyMode] = useState(false)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [rightSidebarTab, setRightSidebarTab] = useState<"details" | "notifications">("details")
  const wsRef = useRef<WebSocket | null>(null)
  const messageIdCounter = useRef(1)
  const dummyIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoRequestIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pendingRequestsRef = useRef<Map<number, { timestamp: number; messageId: string }>>(new Map())
  const pendingBatchesRef = useRef<Map<string, { timestamp: number; requestIds: number[] }>>(new Map())

  const connectDummy = () => {
    setStatus("connecting")
    addSystemMessage("Starting dummy mode...")

    setTimeout(() => {
      setStatus("connected")
      addSystemMessage("Dummy mode activated - Simulating JSONRPC stream")

      autoRequestIntervalRef.current = setInterval(() => {
        const rand = Math.random()

        if (rand < 0.4) {
          // Send batch request (40% chance)
          const batchRequests = generateDummyBatchRequest()
          const requests = batchRequests.map((req: any) => ({
            method: req.method,
            params: req.params,
          }))
          sendBatchMessage(requests)
        } else {
          // Send single request (60% chance)
          const requestData = generateDummyRequest(messageIdCounter.current++)
          sendMessage(requestData.method, requestData.params)
        }
      }, 2500)

      dummyIntervalRef.current = setInterval(() => {
        const rand = Math.random()
        if (rand < 0.6) {
          const streamData = generateDummyStreamData()
          addMessage({
            type: "received",
            data: streamData,
            method: "stream.data",
            isNotification: true,
          })
        } else if (rand < 0.85) {
          const notification = generateDummyNotification()
          addMessage({
            type: "received",
            data: notification,
            method: "notification",
            isNotification: true,
          })
        }
      }, 1500)
    }, 800)
  }

  const disconnectDummy = () => {
    if (autoRequestIntervalRef.current) {
      clearInterval(autoRequestIntervalRef.current)
      autoRequestIntervalRef.current = null
    }
    if (dummyIntervalRef.current) {
      clearInterval(dummyIntervalRef.current)
      dummyIntervalRef.current = null
    }
    setStatus("disconnected")
    addSystemMessage("Dummy mode deactivated")
  }

  const connect = () => {
    if (dummyMode) {
      connectDummy()
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setStatus("connecting")
    addSystemMessage("Connecting to " + url)

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        setStatus("connected")
        addSystemMessage("Connected successfully")
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (Array.isArray(data)) {
            addMessage({
              type: "received",
              data,
              method: "batch.response",
              isBatch: true,
              batchSize: data.length,
            })
            return
          }

          const requestId = data.id

          const isNotification = requestId === undefined && data.method !== undefined

          if (requestId !== undefined && pendingRequestsRef.current.has(requestId)) {
            const pending = pendingRequestsRef.current.get(requestId)!
            const responseTime = Date.now() - pending.timestamp

            // Update the pending request message
            setMessages((prev) =>
              prev.map((msg) => (msg.id === pending.messageId ? { ...msg, isPending: false } : msg)),
            )

            addMessage({
              type: "received",
              data,
              method: data.method || "response",
              requestId,
              responseTime,
            })

            pendingRequestsRef.current.delete(requestId)
          } else {
            addMessage({
              type: "received",
              data,
              method: data.method || (data.result !== undefined ? "response" : "notification"),
              isNotification,
            })
          }
        } catch (error) {
          addMessage({
            type: "received",
            data: event.data,
          })
        }
      }

      ws.onerror = (error) => {
        setStatus("error")
        addMessage({
          type: "error",
          data: { message: "WebSocket error occurred" },
        })
      }

      ws.onclose = () => {
        setStatus("disconnected")
        addSystemMessage("Connection closed")
        pendingRequestsRef.current.clear()
        pendingBatchesRef.current.clear()
      }

      wsRef.current = ws
    } catch (error) {
      setStatus("error")
      addMessage({
        type: "error",
        data: { message: "Failed to connect: " + (error as Error).message },
      })
    }
  }

  const disconnect = () => {
    if (dummyMode) {
      disconnectDummy()
      return
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  const sendMessage = (method: string, params: any) => {
    if (dummyMode) {
      const id = messageIdCounter.current++
      const message = {
        jsonrpc: "2.0",
        method,
        params,
        id,
      }

      const messageId = crypto.randomUUID()
      pendingRequestsRef.current.set(id, { timestamp: Date.now(), messageId })

      addMessage(
        {
          type: "sent",
          data: message,
          method,
          requestId: id,
          isPending: true,
        },
        messageId,
      )

      const delay = 300 + Math.random() * 700
      setTimeout(() => {
        const isError = Math.random() < 0.15
        const response = generateDummyResponse(id, isError)
        const responseTime = delay

        // Update pending status
        setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, isPending: false } : msg)))

        addMessage({
          type: "received",
          data: response,
          method: "response",
          requestId: id,
          responseTime,
        })

        pendingRequestsRef.current.delete(id)
      }, delay)
      return
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addMessage({
        type: "error",
        data: { message: "Not connected to WebSocket" },
      })
      return
    }

    const id = messageIdCounter.current++
    const message = {
      jsonrpc: "2.0",
      method,
      params,
      id,
    }

    try {
      const messageId = crypto.randomUUID()
      pendingRequestsRef.current.set(id, { timestamp: Date.now(), messageId })

      wsRef.current.send(JSON.stringify(message))
      addMessage(
        {
          type: "sent",
          data: message,
          method,
          requestId: id,
          isPending: true,
        },
        messageId,
      )
    } catch (error) {
      addMessage({
        type: "error",
        data: { message: "Failed to send: " + (error as Error).message },
      })
    }
  }

  const sendBatchMessage = (requests: Array<{ method: string; params: any }>) => {
    if (dummyMode) {
      const batchMessages = requests.map((req) => ({
        jsonrpc: "2.0",
        method: req.method,
        params: req.params,
        id: messageIdCounter.current++,
      }))

      const batchId = crypto.randomUUID()
      const timestamp = Date.now()

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
      )

      const delay = 400 + Math.random() * 800
      setTimeout(() => {
        const batchResponses = batchMessages.map((msg) => {
          const isError = Math.random() < 0.15
          return generateDummyResponse(msg.id, isError)
        })

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === batchId ? { ...msg, isPending: false, linkedMessageId: crypto.randomUUID() } : msg,
          ),
        )

        const responseId = crypto.randomUUID()
        setMessages((prev) => prev.map((msg) => (msg.id === batchId ? { ...msg, linkedMessageId: responseId } : msg)))

        addMessage(
          {
            type: "received",
            data: batchResponses,
            method: "batch.response",
            isBatch: true,
            batchSize: batchResponses.length,
            responseTime: delay,
            linkedMessageId: batchId, // Link back to request
          },
          responseId,
        )
      }, delay)
      return
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addMessage({
        type: "error",
        data: { message: "Not connected to WebSocket" },
      })
      return
    }

    const batchMessages = requests.map((req) => ({
      jsonrpc: "2.0",
      method: req.method,
      params: req.params,
      id: messageIdCounter.current++,
    }))

    try {
      const batchId = crypto.randomUUID()
      const requestIds = batchMessages.map((msg) => msg.id)
      pendingBatchesRef.current.set(batchId, { timestamp: Date.now(), requestIds })

      wsRef.current.send(JSON.stringify(batchMessages))
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
      )
    } catch (error) {
      addMessage({
        type: "error",
        data: { message: "Failed to send batch: " + (error as Error).message },
      })
    }
  }

  const addMessage = (message: Omit<Message, "id" | "timestamp">, id?: string) => {
    let validationErrors: string[] | undefined
    let validationWarnings: string[] | undefined

    if (message.type === "sent" || message.type === "received") {
      const messageType = message.type === "sent" ? "request" : "response"
      const validation = validateJsonRpcMessage(message.data, messageType)

      if (!validation.isValid || validation.warnings.length > 0) {
        validationErrors = validation.errors.length > 0 ? validation.errors : undefined
        validationWarnings = validation.warnings.length > 0 ? validation.warnings : undefined
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        ...message,
        id: id || crypto.randomUUID(),
        timestamp: new Date(),
        validationErrors,
        validationWarnings,
      },
    ])
  }

  const addSystemMessage = (text: string) => {
    addMessage({
      type: "system",
      data: { message: text },
    })
  }

  const clearMessages = () => {
    setMessages([])
    setSelectedMessageId(null)
    pendingRequestsRef.current.clear()
    pendingBatchesRef.current.clear()
  }

  const handleDummyModeToggle = (enabled: boolean) => {
    const wasConnected = status === "connected"

    if (wasConnected) {
      disconnect()
    }

    setDummyMode(enabled)
    addSystemMessage(enabled ? "Dummy mode enabled" : "Dummy mode disabled")

    if (wasConnected) {
      setTimeout(() => {
        connect()
      }, 500)
    }
  }

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (autoRequestIntervalRef.current) {
        clearInterval(autoRequestIntervalRef.current)
      }
      if (dummyIntervalRef.current) {
        clearInterval(dummyIntervalRef.current)
      }
    }
  }, [])

  const selectedMessage = selectedMessageId ? messages.find((m) => m.id === selectedMessageId) : null

  const getLinkedMessage = (message: Message): Message | null => {
    if (message.linkedMessageId) {
      return messages.find((m) => m.id === message.linkedMessageId) || null
    }

    if (typeof message.data !== "object" || message.data?.id === undefined) return null

    const id = message.data.id
    const linkedMsg = messages.find((m) => typeof m.data === "object" && m.data?.id === id && m.id !== message.id)

    if (!linkedMsg) return null

    if (message.type === "sent" && linkedMsg.type === "received") return linkedMsg
    if (message.type === "received" && linkedMsg.type === "sent") return linkedMsg

    return null
  }

  const linkedMessage = selectedMessage ? getLinkedMessage(selectedMessage) : null

  const notifications = messages.filter((m) => m.isNotification)

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10">
                <Zap className="w-3 h-3 text-primary" />
              </div>
              <h1 className="text-sm font-bold text-foreground">JSONRPC WebSocket</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={rightSidebarTab === "notifications" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setRightSidebarTab("notifications")}
              >
                <Bell className="w-3 h-3 mr-1" />
                <span className="text-xs">Notifications</span>
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-3.5">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{messages.length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="container mx-auto px-3 py-2 h-full">
          <div className="grid gap-2 h-full grid-cols-[420px_1fr_400px]">
            <div className="flex flex-col min-h-0">
              <Tabs defaultValue="connection" className="flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-3 mb-2">
                  <TabsTrigger value="connection" className="text-xs">
                    Connection
                  </TabsTrigger>
                  <TabsTrigger value="statistics" className="text-xs">
                    Statistics
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="text-xs">
                    Performance
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="connection" className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-0">
                  <ConnectionPanel
                    url={url}
                    status={status}
                    dummyMode={dummyMode}
                    onUrlChange={setUrl}
                    onConnect={connect}
                    onDisconnect={disconnect}
                    onDummyModeChange={handleDummyModeToggle}
                  />
                  <RequestForm disabled={status !== "connected"} onSend={sendMessage} onSendBatch={sendBatchMessage} />
                </TabsContent>

                <TabsContent value="statistics" className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-0">
                  <MethodStatistics messages={messages} />
                  <ErrorAnalysisDashboard messages={messages} />
                </TabsContent>

                <TabsContent value="performance" className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-0">
                  <ResponseTimeHeatmap messages={messages} />
                  <ConnectionQualityMonitor messages={messages} status={status} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="min-h-0">
              <MessageList
                messages={messages}
                autoScroll={autoScroll}
                selectedMessageId={selectedMessageId}
                onAutoScrollChange={setAutoScroll}
                onClear={clearMessages}
                onSelectMessage={setSelectedMessageId}
              />
            </div>

            <div className="flex flex-col min-h-0">
              <Tabs
                value={rightSidebarTab}
                onValueChange={(v) => setRightSidebarTab(v as "details" | "notifications")}
                className="flex flex-col h-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-2">
                  <TabsTrigger value="details" className="text-xs">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="text-xs">
                    Notifications
                    {notifications.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-3.5">
                        {notifications.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="flex-1 min-h-0 mt-0">
                  {selectedMessage ? (
                    <MessageDetailSidebar
                      message={selectedMessage}
                      onClose={() => setSelectedMessageId(null)}
                      linkedMessage={linkedMessage}
                      onSelectLinked={() => linkedMessage && setSelectedMessageId(linkedMessage.id)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full border border-border rounded-lg bg-card">
                      <p className="text-sm text-muted-foreground">Select a message to view details</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notifications" className="flex-1 min-h-0 mt-0">
                  <NotificationSidebar
                    notifications={notifications}
                    selectedNotificationId={selectedMessageId}
                    onSelectNotification={(id) => {
                      setSelectedMessageId(id)
                      setRightSidebarTab("details")
                    }}
                    onClose={() => {}}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

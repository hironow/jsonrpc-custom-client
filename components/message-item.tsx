"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Info,
  Clock,
  Link2,
  Bell,
  Layers,
  SendHorizontal,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import type { Message } from "@/types/message"

type MessageItemProps = {
  message: Message
  isSelected: boolean
  onClick: () => void
  linkedMessage?: Message | null
  isLinkedSelected?: boolean
}

const getMethodColor = (method: string): string => {
  let hash = 0
  for (let i = 0; i < method.length; i++) {
    hash = method.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 70%, 50%)`
}

export function MessageItem({ message, isSelected, onClick, linkedMessage, isLinkedSelected }: MessageItemProps) {
  const getMessageConfig = () => {
    if (message.isBatch) {
      if (message.type === "sent") {
        return {
          icon: (
            <div className="relative">
              <SendHorizontal className="w-3 h-3" />
              <Layers className="w-2 h-2 absolute -bottom-0.5 -right-0.5" />
            </div>
          ),
          badge: (
            <Badge
              variant="secondary"
              className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1 py-0 h-3.5"
            >
              Batch Request
            </Badge>
          ),
          borderColor: "border-l-blue-500",
          bgColor: "bg-blue-500/5",
        }
      } else {
        // Batch response
        const hasError = Array.isArray(message.data) && message.data.some((item: any) => item.error)
        return {
          icon: (
            <div className="relative">
              <CheckCircle className="w-3 h-3" />
              <Layers className="w-2 h-2 absolute -bottom-0.5 -right-0.5" />
            </div>
          ),
          badge: (
            <Badge
              variant="secondary"
              className={`${
                hasError
                  ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                  : "bg-green-500/20 text-green-400 border-green-500/30"
              } text-[10px] px-1 py-0 h-3.5`}
            >
              Batch Response
            </Badge>
          ),
          borderColor: hasError ? "border-l-orange-500" : "border-l-green-500",
          bgColor: hasError ? "bg-orange-500/5" : "bg-green-500/5",
        }
      }
    }

    if (message.isNotification) {
      return {
        icon: <Bell className="w-3 h-3" />,
        badge: (
          <Badge
            variant="secondary"
            className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1 py-0 h-3.5"
          >
            Notification
          </Badge>
        ),
        borderColor: "border-l-blue-500",
        bgColor: "bg-blue-500/5",
      }
    }

    switch (message.type) {
      case "sent":
        return {
          icon: <ArrowUp className="w-3 h-3" />,
          badge: (
            <Badge
              variant="secondary"
              className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1 py-0 h-3.5"
            >
              Sent
            </Badge>
          ),
          borderColor: "border-l-primary",
          bgColor: "",
        }
      case "received":
        return {
          icon: <ArrowDown className="w-3 h-3" />,
          badge: (
            <Badge
              variant="secondary"
              className="bg-success/20 text-success border-success/30 text-[10px] px-1 py-0 h-3.5"
            >
              Received
            </Badge>
          ),
          borderColor: "border-l-success",
          bgColor: "",
        }
      case "error":
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          badge: (
            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-3.5">
              Error
            </Badge>
          ),
          borderColor: "border-l-destructive",
          bgColor: "",
        }
      case "system":
        return {
          icon: <Info className="w-3 h-3" />,
          badge: (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-3.5">
              System
            </Badge>
          ),
          borderColor: "border-l-muted-foreground",
          bgColor: "",
        }
    }
  }

  const config = getMessageConfig()

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
  }

  const getResponseTimeDisplay = () => {
    if (!message.responseTime) return null

    const time = message.responseTime
    let colorClass = "text-green-400"
    if (time > 1000) colorClass = "text-red-400"
    else if (time > 500) colorClass = "text-yellow-400"

    return (
      <span className={`text-[9px] font-mono ${colorClass} flex items-center gap-0.5`}>
        <Clock className="w-2.5 h-2.5" />
        {time}ms
      </span>
    )
  }

  const getInlinePreview = () => {
    if (message.type === "system" || typeof message.data !== "object") return null

    if (message.isBatch && Array.isArray(message.data)) {
      const elements = []

      const successCount = message.data.filter((item: any) => item.result !== undefined).length
      const errorCount = message.data.filter((item: any) => item.error !== undefined).length
      const totalCount = message.batchSize || message.data.length

      if (message.type === "sent") {
        elements.push(
          <Badge
            key="batch-size"
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-400 border-blue-500/30"
          >
            {totalCount} requests
          </Badge>,
        )
      } else {
        // Response
        if (successCount > 0) {
          elements.push(
            <Badge
              key="success"
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-green-500/20 text-green-400 border-green-500/30"
            >
              ✓ {successCount}
            </Badge>,
          )
        }
        if (errorCount > 0) {
          elements.push(
            <Badge
              key="error"
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-red-500/20 text-red-400 border-red-500/30"
            >
              ✗ {errorCount}
            </Badge>,
          )
        }
      }

      if (message.isPending) {
        elements.push(
          <Badge key="pending" variant="secondary" className="text-[9px] px-1 py-0 h-3.5 animate-pulse">
            Pending...
          </Badge>,
        )
      }

      if (message.responseTime) {
        elements.push(getResponseTimeDisplay())
      }

      if (message.validationErrors && message.validationErrors.length > 0) {
        elements.push(
          <Badge
            key="validation-error"
            variant="secondary"
            className="text-[9px] px-1 py-0 h-3.5 bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-0.5"
          >
            <AlertCircle className="w-2.5 h-2.5" />
            {message.validationErrors.length} error{message.validationErrors.length > 1 ? "s" : ""}
          </Badge>,
        )
      }
      if (message.validationWarnings && message.validationWarnings.length > 0) {
        elements.push(
          <Badge
            key="validation-warning"
            variant="secondary"
            className="text-[9px] px-1 py-0 h-3.5 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-0.5"
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            {message.validationWarnings.length} warning{message.validationWarnings.length > 1 ? "s" : ""}
          </Badge>,
        )
      }

      const methods = message.data
        .map((item: any) => item.method)
        .filter(Boolean)
        .slice(0, 3)
      if (methods.length > 0) {
        elements.push(
          <span key="methods" className="text-[9px] text-muted-foreground">
            {methods.join(", ")}
            {message.data.length > 3 ? ` +${message.data.length - 3}` : ""}
          </span>,
        )
      }

      return <div className="flex items-center gap-1 flex-wrap mt-0">{elements}</div>
    }

    const data = message.data
    const elements = []

    if (data.method) {
      const methodColor = getMethodColor(data.method)
      elements.push(
        <span key="method" className="text-[11px] font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: methodColor }} />
          <span style={{ color: methodColor }}>{data.method}</span>
        </span>,
      )
    }

    if (data.id !== undefined) {
      elements.push(
        <span key="id" className="text-muted-foreground text-[9px]">
          id:{data.id}
        </span>,
      )
    }

    if (linkedMessage) {
      const methodColor = data.method ? getMethodColor(data.method) : "#888"
      elements.push(
        <span key="link" className="flex items-center gap-0.5" style={{ color: methodColor }}>
          <Link2 className="w-2.5 h-2.5" />
          <span className="text-[9px]">{message.type === "sent" ? "→ Response" : "← Request"}</span>
        </span>,
      )
    } else if (message.type === "sent" && !message.isNotification) {
      // Request without response - show waiting indicator
      elements.push(
        <Badge
          key="waiting"
          variant="secondary"
          className="text-[9px] px-1 py-0 h-3.5 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse"
        >
          Waiting...
        </Badge>,
      )
    }

    if (message.isPending) {
      elements.push(
        <Badge key="pending" variant="secondary" className="text-[9px] px-1 py-0 h-3.5 animate-pulse">
          Pending...
        </Badge>,
      )
    }

    if (message.validationErrors && message.validationErrors.length > 0) {
      elements.push(
        <Badge
          key="validation-error"
          variant="secondary"
          className="text-[9px] px-1 py-0 h-3.5 bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-0.5"
        >
          <AlertCircle className="w-2.5 h-2.5" />
          Spec Error
        </Badge>,
      )
    }
    if (message.validationWarnings && message.validationWarnings.length > 0) {
      elements.push(
        <Badge
          key="validation-warning"
          variant="secondary"
          className="text-[9px] px-1 py-0 h-3.5 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-0.5"
        >
          <AlertTriangle className="w-2.5 h-2.5" />
          Warning
        </Badge>,
      )
    }

    if (data.params) {
      if (Array.isArray(data.params)) {
        const preview = data.params.slice(0, 3).map((p) => {
          if (typeof p === "string") return `"${p.length > 20 ? p.slice(0, 20) + "..." : p}"`
          if (typeof p === "number") return p
          if (typeof p === "boolean") return p.toString()
          if (typeof p === "object") return "{...}"
          return String(p)
        })
        elements.push(
          <span key="params" className="text-yellow-400 text-[9px] font-mono">
            [{preview.join(", ")}
            {data.params.length > 3 ? `, +${data.params.length - 3}` : ""}]
          </span>,
        )
      } else if (typeof data.params === "object") {
        const entries = Object.entries(data.params).slice(0, 2)
        const preview = entries.map(([k, v]) => {
          let val = v
          if (typeof v === "string") val = `"${v.length > 15 ? v.slice(0, 15) + "..." : v}"`
          else if (typeof v === "object") val = "{...}"
          return `${k}:${val}`
        })
        elements.push(
          <span key="params" className="text-yellow-400 text-[9px] font-mono">
            {"{"}
            {preview.join(", ")}
            {Object.keys(data.params).length > 2 ? `, +${Object.keys(data.params).length - 2}` : ""}
            {"}"}
          </span>,
        )
      }
    }

    if (data.result !== undefined) {
      let resultPreview = ""
      if (typeof data.result === "string") {
        resultPreview = `"${data.result.length > 30 ? data.result.slice(0, 30) + "..." : data.result}"`
      } else if (typeof data.result === "number" || typeof data.result === "boolean") {
        resultPreview = String(data.result)
      } else if (Array.isArray(data.result)) {
        resultPreview = `[${data.result.length} items]`
      } else if (typeof data.result === "object" && data.result !== null) {
        const keys = Object.keys(data.result)
        if (keys.length <= 2) {
          resultPreview = JSON.stringify(data.result)
        } else {
          resultPreview = `{${keys.slice(0, 2).join(", ")}, +${keys.length - 2}}`
        }
      }
      elements.push(
        <span key="result" className="text-green-400 text-[9px] font-mono">
          → {resultPreview}
        </span>,
      )
    }

    if (data.error) {
      elements.push(
        <span key="error" className="text-destructive text-[9px] font-mono">
          ✗ {data.error.message || `code:${data.error.code}`}
        </span>,
      )
    }

    return elements.length > 0 ? <div className="flex items-center gap-1 flex-wrap mt-0">{elements}</div> : null
  }

  const hasLink = !!linkedMessage
  const linkColor = message.data?.method ? getMethodColor(message.data.method) : "#888"
  const isRequest = message.type === "sent"

  return (
    <div className="relative">
      {hasLink && (
        <div
          className={`absolute ${isRequest ? "left-full" : "right-full"} top-1/2 w-8 h-0.5 -translate-y-1/2 ${
            isLinkedSelected ? "opacity-100" : "opacity-40"
          } transition-opacity`}
          style={{ backgroundColor: linkColor }}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: linkColor,
              [isRequest ? "right" : "left"]: "-2px",
            }}
          />
        </div>
      )}

      <Card
        className={`border-l-2 ${config.borderColor} ${config.bgColor} ${
          isSelected || isLinkedSelected
            ? "bg-card border-border ring-2 ring-primary/50"
            : "bg-card/50 border-border hover:bg-card"
        } mx-8 transition-all cursor-pointer relative`}
        onClick={onClick}
        style={
          hasLink && (isSelected || isLinkedSelected)
            ? {
                boxShadow: `0 0 0 2px ${linkColor}40`,
              }
            : undefined
        }
      >
        <div className="p-1">
          <div className="flex items-start gap-1">
            <div className="mt-0.5 text-muted-foreground">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                {config.badge}
                <span className="text-[9px] text-muted-foreground font-mono">{formatTime(message.timestamp)}</span>
              </div>

              {message.type === "system" ? (
                <p className="text-[11px] text-muted-foreground mt-0">{message.data.message}</p>
              ) : (
                getInlinePreview()
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

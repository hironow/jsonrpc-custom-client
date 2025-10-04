"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { Message } from "./websocket-client"

type ErrorAnalysisDashboardProps = {
  messages: Message[]
}

type MethodErrorStats = {
  method: string
  totalCalls: number
  errorCount: number
  errorRate: number
  errorCodes: Map<number, number>
  errorMessages: string[]
}

export function ErrorAnalysisDashboard({ messages }: ErrorAnalysisDashboardProps) {
  const getErrorStats = (): Map<string, MethodErrorStats> => {
    const stats = new Map<string, MethodErrorStats>()

    // Process all messages
    messages.forEach((msg) => {
      if (msg.type === "sent" && msg.method && !msg.isNotification) {
        // Count request
        const method = msg.method
        if (!stats.has(method)) {
          stats.set(method, {
            method,
            totalCalls: 0,
            errorCount: 0,
            errorRate: 0,
            errorCodes: new Map(),
            errorMessages: [],
          })
        }
        const stat = stats.get(method)!
        stat.totalCalls++
      } else if (msg.type === "received" && msg.data?.error) {
        // Count error response
        const error = msg.data.error
        const method = msg.method || "unknown"

        if (!stats.has(method)) {
          stats.set(method, {
            method,
            totalCalls: 0,
            errorCount: 0,
            errorRate: 0,
            errorCodes: new Map(),
            errorMessages: [],
          })
        }

        const stat = stats.get(method)!
        stat.errorCount++

        // Track error code
        if (typeof error.code === "number") {
          const count = stat.errorCodes.get(error.code) || 0
          stat.errorCodes.set(error.code, count + 1)
        }

        // Track error message
        if (error.message && !stat.errorMessages.includes(error.message)) {
          stat.errorMessages.push(error.message)
        }
      }
    })

    // Calculate error rates
    stats.forEach((stat) => {
      if (stat.totalCalls > 0) {
        stat.errorRate = (stat.errorCount / stat.totalCalls) * 100
      }
    })

    return stats
  }

  const getValidationErrorStats = () => {
    const totalMessages = messages.filter((m) => m.type === "sent" || m.type === "received").length
    const messagesWithErrors = messages.filter((m) => m.validationErrors && m.validationErrors.length > 0).length
    const messagesWithWarnings = messages.filter((m) => m.validationWarnings && m.validationWarnings.length > 0).length

    return {
      totalMessages,
      messagesWithErrors,
      messagesWithWarnings,
      errorRate: totalMessages > 0 ? (messagesWithErrors / totalMessages) * 100 : 0,
      warningRate: totalMessages > 0 ? (messagesWithWarnings / totalMessages) * 100 : 0,
    }
  }

  const errorStats = getErrorStats()
  const validationStats = getValidationErrorStats()
  const sortedStats = Array.from(errorStats.values()).sort((a, b) => b.errorRate - a.errorRate)

  const totalErrors = Array.from(errorStats.values()).reduce((sum, stat) => sum + stat.errorCount, 0)
  const totalCalls = Array.from(errorStats.values()).reduce((sum, stat) => sum + stat.totalCalls, 0)
  const overallErrorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0

  const getErrorRateColor = (rate: number) => {
    if (rate === 0) return "text-green-400"
    if (rate < 10) return "text-yellow-400"
    if (rate < 30) return "text-orange-400"
    return "text-red-400"
  }

  const getErrorRateBgColor = (rate: number) => {
    if (rate === 0) return "bg-green-500/20"
    if (rate < 10) return "bg-yellow-500/20"
    if (rate < 30) return "bg-orange-500/20"
    return "bg-red-500/20"
  }

  if (messages.length === 0) {
    return (
      <Card className="p-4 bg-card">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Error Analysis</h3>
        </div>
        <p className="text-xs text-muted-foreground">No messages to analyze yet</p>
      </Card>
    )
  }

  return (
    <Card className="p-4 bg-card">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Error Analysis</h3>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-muted/30 rounded p-2">
          <div className="text-[10px] text-muted-foreground font-medium mb-1">Overall Error Rate</div>
          <div className={`text-lg font-bold font-mono ${getErrorRateColor(overallErrorRate)}`}>
            {overallErrorRate.toFixed(1)}%
          </div>
          <div className="text-[9px] text-muted-foreground">
            {totalErrors} / {totalCalls} calls
          </div>
        </div>
        <div className="bg-muted/30 rounded p-2">
          <div className="text-[10px] text-muted-foreground font-medium mb-1">Spec Compliance</div>
          <div className={`text-lg font-bold font-mono ${getErrorRateColor(validationStats.errorRate)}`}>
            {(100 - validationStats.errorRate).toFixed(1)}%
          </div>
          <div className="text-[9px] text-muted-foreground">
            {validationStats.messagesWithErrors} errors, {validationStats.messagesWithWarnings} warnings
          </div>
        </div>
      </div>

      {/* Method Error Rates */}
      {sortedStats.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground mb-2">Method Error Rates</h4>
          {sortedStats.slice(0, 5).map((stat) => (
            <div key={stat.method} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-blue-400 truncate flex-1">{stat.method}</span>
                <span className={`font-mono font-semibold ml-2 ${getErrorRateColor(stat.errorRate)}`}>
                  {stat.errorRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getErrorRateBgColor(stat.errorRate)} transition-all`}
                    style={{ width: `${Math.min(stat.errorRate, 100)}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                  {stat.errorCount}/{stat.totalCalls}
                </span>
              </div>
              {stat.errorCodes.size > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {Array.from(stat.errorCodes.entries())
                    .slice(0, 3)
                    .map(([code, count]) => (
                      <Badge
                        key={code}
                        variant="secondary"
                        className="text-[9px] px-1 py-0 h-3.5 bg-red-500/20 text-red-400 border-red-500/30"
                      >
                        {code} ({count}x)
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          ))}
          {sortedStats.length > 5 && (
            <p className="text-[9px] text-muted-foreground text-center pt-1">+{sortedStats.length - 5} more methods</p>
          )}
        </div>
      )}

      {/* Recent Error Messages */}
      {totalErrors > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Recent Error Messages
          </h4>
          <div className="space-y-1">
            {sortedStats
              .filter((stat) => stat.errorMessages.length > 0)
              .slice(0, 3)
              .map((stat) => (
                <div key={stat.method} className="text-[10px]">
                  <span className="font-mono text-blue-400">{stat.method}:</span>
                  <span className="text-red-400 ml-1">{stat.errorMessages[0]}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Validation Issues */}
      {(validationStats.messagesWithErrors > 0 || validationStats.messagesWithWarnings > 0) && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Spec Validation Issues
          </h4>
          <div className="space-y-2">
            {validationStats.messagesWithErrors > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Spec Errors
                </span>
                <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                  {validationStats.messagesWithErrors}
                </Badge>
              </div>
            )}
            {validationStats.messagesWithWarnings > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Spec Warnings
                </span>
                <Badge
                  variant="secondary"
                  className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]"
                >
                  {validationStats.messagesWithWarnings}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {totalErrors === 0 && validationStats.messagesWithErrors === 0 && (
        <div className="mt-4 pt-4 border-t border-border flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="w-6 h-6 text-green-400 mb-2" />
          <p className="text-xs text-green-400 font-medium">No Errors Detected</p>
          <p className="text-[10px] text-muted-foreground">All requests completed successfully</p>
        </div>
      )}
    </Card>
  )
}

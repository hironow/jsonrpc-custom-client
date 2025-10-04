"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BarChart3, CheckCircle2, XCircle, TrendingUp } from "lucide-react"
import type { Message } from "./websocket-client"

type MethodStatisticsProps = {
  messages: Message[]
}

type MethodStats = {
  method: string
  count: number
  successCount: number
  errorCount: number
  responseTimes: number[]
  color: string
}

const getMethodColor = (method: string): string => {
  let hash = 0
  for (let i = 0; i < method.length; i++) {
    hash = method.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 70%, 50%)`
}

const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

const calculateP95 = (values: number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * 0.95) - 1
  return sorted[Math.max(0, index)]
}

export function MethodStatistics({ messages }: MethodStatisticsProps) {
  const methodStatsMap = new Map<string, MethodStats>()

  messages.forEach((msg) => {
    if (msg.type === "system" || !msg.method) return

    const method = msg.method
    if (!methodStatsMap.has(method)) {
      methodStatsMap.set(method, {
        method,
        count: 0,
        successCount: 0,
        errorCount: 0,
        responseTimes: [],
        color: getMethodColor(method),
      })
    }

    const stats = methodStatsMap.get(method)!
    stats.count++

    if (msg.type === "received") {
      if (msg.data.error) {
        stats.errorCount++
      } else if (msg.data.result !== undefined) {
        stats.successCount++
      }

      if (msg.responseTime) {
        stats.responseTimes.push(msg.responseTime)
      }
    }
  })

  const methodStats = Array.from(methodStatsMap.values()).sort((a, b) => b.count - a.count)

  if (methodStats.length === 0) {
    return null
  }

  return (
    <Card className="bg-card border-border">
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground">Method Statistics</h3>
        </div>
      </div>

      <ScrollArea className="max-h-[200px]">
        <div className="p-2 space-y-1.5">
          {methodStats.map((stats) => {
            const successRate =
              stats.successCount + stats.errorCount > 0
                ? Math.round((stats.successCount / (stats.successCount + stats.errorCount)) * 100)
                : 0

            const avgResponseTime = calculateAverage(stats.responseTimes)
            const medianResponseTime = calculateMedian(stats.responseTimes)
            const p95ResponseTime = calculateP95(stats.responseTimes)

            return (
              <div key={stats.method} className="bg-muted/50 rounded p-1.5 space-y-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stats.color }} />
                  <span
                    className="text-[11px] font-mono font-semibold flex-1 truncate min-w-0"
                    style={{ color: stats.color }}
                  >
                    {stats.method}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                    {stats.count}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground ml-3.5">
                  {stats.successCount + stats.errorCount > 0 && (
                    <div className="flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5 text-green-400" />
                      <span>{successRate}%</span>
                    </div>
                  )}

                  {stats.errorCount > 0 && (
                    <div className="flex items-center gap-0.5">
                      <XCircle className="w-2.5 h-2.5 text-red-400" />
                      <span>{stats.errorCount}</span>
                    </div>
                  )}
                </div>

                {stats.responseTimes.length > 0 && (
                  <div className="ml-3.5 pt-0.5 border-t border-border/50 min-w-0">
                    <div className="flex flex-col gap-0.5 text-[9px] text-muted-foreground pt-0.5">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-2 h-2 flex-shrink-0" />
                        <span className="font-medium">Avg:</span>
                        <span className="truncate">{avgResponseTime.toFixed(1)}ms</span>
                        <span className="font-medium ml-1">Med:</span>
                        <span className="truncate">{medianResponseTime.toFixed(1)}ms</span>
                        <span className="font-medium ml-1">P95:</span>
                        <span className="truncate">{p95ResponseTime.toFixed(1)}ms</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </Card>
  )
}

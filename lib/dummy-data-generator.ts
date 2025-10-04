export type DummyMessageType = "request" | "response" | "notification" | "error" | "stream"

const methods = [
  "user.login",
  "user.logout",
  "data.fetch",
  "stream.subscribe",
  "stream.unsubscribe",
  "system.status",
  "analytics.track",
  "notification.send",
]

const streamMethods = ["stream.data", "stream.update", "stream.heartbeat"]

const sampleParams = [
  { username: "demo_user", password: "********" },
  { userId: 12345 },
  { query: "SELECT * FROM users", limit: 100 },
  { channel: "updates", filter: { type: "important" } },
  { timestamp: Date.now(), data: [1, 2, 3, 4, 5] },
  { status: "active", metrics: { cpu: 45, memory: 62, disk: 78 } },
  { event: "page_view", properties: { page: "/dashboard", duration: 3500 } },
]

const sampleResults = [
  { success: true, token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
  { status: "ok", message: "Operation completed successfully" },
  {
    data: [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
    ],
    total: 2,
  },
  { subscribed: true, channelId: "ch_" + Math.random().toString(36).substr(2, 9) },
  { count: Math.floor(Math.random() * 1000), timestamp: Date.now() },
]

const sampleErrors = [
  { code: -32600, message: "Invalid Request" },
  { code: -32601, message: "Method not found" },
  { code: -32602, message: "Invalid params" },
  { code: -32603, message: "Internal error" },
  { code: 1001, message: "Authentication failed" },
  { code: 1002, message: "Permission denied" },
]

export function generateDummyRequest(id: number) {
  const method = methods[Math.floor(Math.random() * methods.length)]
  const params = sampleParams[Math.floor(Math.random() * sampleParams.length)]

  return {
    jsonrpc: "2.0",
    method,
    params,
    id,
  }
}

export function generateDummyResponse(id: number, isError = false) {
  if (isError) {
    const error = sampleErrors[Math.floor(Math.random() * sampleErrors.length)]
    return {
      jsonrpc: "2.0",
      error,
      id,
    }
  }

  const result = sampleResults[Math.floor(Math.random() * sampleResults.length)]
  return {
    jsonrpc: "2.0",
    result,
    id,
  }
}

export function generateDummyNotification() {
  const method = streamMethods[Math.floor(Math.random() * streamMethods.length)]
  const params = {
    timestamp: Date.now(),
    data: {
      value: Math.floor(Math.random() * 100),
      status: Math.random() > 0.5 ? "active" : "idle",
      metrics: {
        latency: Math.floor(Math.random() * 50),
        throughput: Math.floor(Math.random() * 1000),
      },
    },
  }

  return {
    jsonrpc: "2.0",
    method,
    params,
  }
}

export function generateDummyStreamData() {
  return {
    jsonrpc: "2.0",
    method: "stream.data",
    params: {
      timestamp: Date.now(),
      sequence: Math.floor(Math.random() * 10000),
      payload: {
        temperature: (20 + Math.random() * 10).toFixed(2),
        humidity: (40 + Math.random() * 30).toFixed(2),
        pressure: (990 + Math.random() * 30).toFixed(2),
      },
    },
  }
}

export function generateDummyRequestResponsePair() {
  const id = Math.floor(Math.random() * 10000)
  const method = methods[Math.floor(Math.random() * methods.length)]
  const params = sampleParams[Math.floor(Math.random() * sampleParams.length)]

  const request = {
    jsonrpc: "2.0",
    method,
    params,
    id,
  }

  const isError = Math.random() < 0.15
  const response = generateDummyResponse(id, isError)

  // Simulate response time between 100ms and 1000ms
  const responseTime = 100 + Math.floor(Math.random() * 900)

  return {
    request,
    response,
    responseTime,
    method,
    id,
  }
}

export function generateDummyBatchRequest() {
  const batchSize = 2 + Math.floor(Math.random() * 3) // 2-4 requests
  const requests = []

  for (let i = 0; i < batchSize; i++) {
    const id = Math.floor(Math.random() * 10000)
    const method = methods[Math.floor(Math.random() * methods.length)]
    const params = sampleParams[Math.floor(Math.random() * sampleParams.length)]

    // 20% chance of notification (no id)
    if (Math.random() < 0.2) {
      requests.push({
        jsonrpc: "2.0",
        method,
        params,
      })
    } else {
      requests.push({
        jsonrpc: "2.0",
        method,
        params,
        id,
      })
    }
  }

  return requests
}

export function generateDummyBatchResponse(batchRequest: any[]) {
  return batchRequest
    .filter((req) => req.id !== undefined) // Only respond to requests with id
    .map((req) => {
      const isError = Math.random() < 0.15
      return generateDummyResponse(req.id, isError)
    })
}

export function generateDummyBatchPair() {
  const batchRequest = generateDummyBatchRequest()
  const batchResponse = generateDummyBatchResponse(batchRequest)

  // Simulate response time between 150ms and 1500ms for batch
  const responseTime = 150 + Math.floor(Math.random() * 1350)

  // Extract methods for display
  const methods = batchRequest.map((req) => req.method)

  return {
    request: batchRequest,
    response: batchResponse,
    responseTime,
    methods,
    batchSize: batchRequest.length,
  }
}

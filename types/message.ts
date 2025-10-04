export type Message = {
  id: string
  type: 'sent' | 'received' | 'error' | 'system'
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


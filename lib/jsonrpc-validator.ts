// JSON-RPC 2.0 Specification Validator

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateJsonRpcMessage(data: any, type: "request" | "response"): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if it's a batch
  if (Array.isArray(data)) {
    return validateBatch(data, type)
  }

  // Common validation: jsonrpc field
  if (data.jsonrpc !== "2.0") {
    errors.push('Missing or invalid "jsonrpc" field (must be "2.0")')
  }

  if (type === "request") {
    validateRequest(data, errors, warnings)
  } else {
    validateResponse(data, errors, warnings)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

function validateRequest(data: any, errors: string[], warnings: string[]): void {
  // Method field is required
  if (!data.method) {
    errors.push('Missing required "method" field')
  } else if (typeof data.method !== "string") {
    errors.push('"method" field must be a string')
  }

  // Params is optional but must be array or object if present
  if (data.params !== undefined) {
    if (!Array.isArray(data.params) && typeof data.params !== "object") {
      errors.push('"params" must be an array or object')
    }
  }

  // ID validation (optional for notifications)
  if (data.id !== undefined) {
    const idType = typeof data.id
    if (idType !== "string" && idType !== "number" && data.id !== null) {
      errors.push('"id" must be a string, number, or null')
    }
  } else {
    warnings.push('No "id" field - this is a notification')
  }
}

function validateResponse(data: any, errors: string[], warnings: string[]): void {
  // Must have either result or error, but not both
  const hasResult = "result" in data
  const hasError = "error" in data

  if (!hasResult && !hasError) {
    errors.push('Response must have either "result" or "error" field')
  } else if (hasResult && hasError) {
    errors.push('Response cannot have both "result" and "error" fields')
  }

  // ID is required for responses
  if (!("id" in data)) {
    errors.push('Missing required "id" field in response')
  }

  // Error object validation
  if (hasError) {
    if (typeof data.error !== "object" || data.error === null) {
      errors.push('"error" must be an object')
    } else {
      if (typeof data.error.code !== "number") {
        errors.push('"error.code" must be a number')
      }
      if (typeof data.error.message !== "string") {
        errors.push('"error.message" must be a string')
      }
    }
  }
}

function validateBatch(data: any[], type: "request" | "response"): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (data.length === 0) {
    errors.push("Batch must not be empty")
  }

  data.forEach((item, index) => {
    const result = validateJsonRpcMessage(item, type)
    result.errors.forEach((err) => {
      errors.push(`[Item ${index}] ${err}`)
    })
    result.warnings.forEach((warn) => {
      warnings.push(`[Item ${index}] ${warn}`)
    })
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

export interface ApiErrorBody {
  detail: string | { msg: string; type: string }[]
}

export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: ApiErrorBody } }).response
    const detail = response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d) => d.msg).join(', ')
    }
  }
  if (error instanceof Error) return error.message
  return fallback
}

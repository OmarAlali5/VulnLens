import apiClient from '@/services/apiClient'
import type { HealthResponse } from '@/types/scan'

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>('/health')
  return data
}

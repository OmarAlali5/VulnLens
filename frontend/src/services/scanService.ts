import apiClient from '@/services/apiClient'
import type {
  ScanCreateRequest,
  ScanCreateResponse,
  ScanDetailResponse,
} from '@/types/scan'

export async function createScan(payload: ScanCreateRequest): Promise<ScanCreateResponse> {
  const { data } = await apiClient.post<ScanCreateResponse>('/api/v1/scans/', payload)
  return data
}

export async function getScan(scanId: string): Promise<ScanDetailResponse> {
  const { data } = await apiClient.get<ScanDetailResponse>(`/api/v1/scans/${scanId}`)
  return data
}

export async function downloadScanPdf(scanId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/api/v1/reports/${scanId}/pdf`, {
    responseType: 'blob',
  })
  return data
}

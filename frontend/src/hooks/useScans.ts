import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createScan, downloadScanPdf, getScan } from '@/services/scanService'
import type { ScanCreateRequest, ScanStatus } from '@/types/scan'
import { addRecentScan } from '@/utils/recentScans'

const ACTIVE_STATUSES: ScanStatus[] = ['PENDING', 'RUNNING']

export function useScan(scanId: string | undefined) {
  return useQuery({
    queryKey: ['scan', scanId],
    queryFn: () => getScan(scanId!),
    enabled: Boolean(scanId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status && ACTIVE_STATUSES.includes(status)) return 2_000
      return false
    },
  })
}

export function useCreateScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ScanCreateRequest) => createScan(payload),
    onSuccess: (data, variables) => {
      addRecentScan({
        scanId: data.scan_id,
        targetUrl: variables.target,
        createdAt: new Date().toISOString(),
      })
      queryClient.invalidateQueries({ queryKey: ['scan', data.scan_id] })
    },
  })
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: (scanId: string) => downloadScanPdf(scanId),
    onSuccess: (blob, scanId) => {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `vulnlens-report-${scanId}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    },
  })
}

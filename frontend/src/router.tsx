import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { NewScanPage } from '@/pages/NewScanPage'
import { ScanDetailPage } from '@/pages/ScanDetailPage'
import { ScanHistoryPage } from '@/pages/ScanHistoryPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'history', element: <ScanHistoryPage /> },
      { path: 'scans/new', element: <NewScanPage /> },
      { path: 'scans/:scanId', element: <ScanDetailPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

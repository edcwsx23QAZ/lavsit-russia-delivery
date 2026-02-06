import dynamic from 'next/dynamic'
import React from 'react'

// Lazy load ProductSearch
export const LazyProductSearch = dynamic(
  () => import('@/components/ProductSearch').then((mod) => mod.default || mod),
  {
    loading: () => <div className="flex items-center justify-center p-4">Загрузка...</div>,
    ssr: false,
  }
)

// Lazy load TruckVisualization
export const LazyTruckVisualization = dynamic(
  () => import('@/components/TruckVisualization'),
  {
    loading: () => <div className="flex items-center justify-center p-4">Загрузка визуализации...</div>,
    ssr: false,
  }
)


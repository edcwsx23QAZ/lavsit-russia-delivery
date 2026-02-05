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

// Lazy load TruckVisualization - создаем простой заглушку, если компонент не существует
export const LazyTruckVisualization = dynamic(
  () => import('@/components/TruckVisualization').catch(() => ({
    default: () => <div className="p-4 text-sm text-muted-foreground">Визуализация груза недоступна</div>,
  })),
  {
    loading: () => <div className="flex items-center justify-center p-4">Загрузка визуализации...</div>,
    ssr: false,
  }
)


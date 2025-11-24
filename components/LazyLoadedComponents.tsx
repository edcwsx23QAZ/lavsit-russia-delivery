'use client';

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Ленивая загрузка тяжелых компонентов
const TruckVisualization = lazy(() => import('./TruckVisualization').then(module => ({
  default: module.default
})));

const ProductSearch = lazy(() => import('./ProductSearch').then(module => ({
  default: module.default
})));

// Компонент-заглушка для загрузки
const LoadingFallback = ({ message = 'Загрузка...' }: { message?: string }) => (
  <Card className="w-full">
    <CardContent className="flex items-center justify-center p-8">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{message}</span>
      </div>
    </CardContent>
  </Card>
);

// Обертка для TruckVisualization с ленивой загрузкой
export const LazyTruckVisualization = (props: any) => (
  <Suspense fallback={<LoadingFallback message="Загрузка визуализации грузовика..." />}>
    <TruckVisualization {...props} />
  </Suspense>
);

// Обертка для ProductSearch с ленивой загрузкой
export const LazyProductSearch = (props: any) => (
  <Suspense fallback={<LoadingFallback message="Загрузка каталога товаров..." />}>
    <ProductSearch {...props} />
  </Suspense>
);

// Экспортируем ленивые компоненты
export default {
  TruckVisualization: LazyTruckVisualization,
  ProductSearch: LazyProductSearch
};
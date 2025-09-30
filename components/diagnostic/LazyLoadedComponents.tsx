'use client';

import React, { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components
const FullTestingResults = lazy(() => import('./FullTestingResults'));
const VehicleManagement = lazy(() => import('./VehicleManagement'));

// Loading fallback component
const ComponentLoader = React.memo(function ComponentLoader({ title }: { title: string }) {
  return (
    <Card className="border-gray-700 bg-gray-900 animate-pulse">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="text-white">Загрузка {title}...</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2"></div>
        </div>
      </CardContent>
    </Card>
  );
});

// Wrapper components with suspense
export const LazyFullTestingResults = React.memo(function LazyFullTestingResults(props: any) {
  return (
    <Suspense fallback={<ComponentLoader title="результатов тестирования" />}>
      <FullTestingResults {...props} />
    </Suspense>
  );
});

export const LazyVehicleManagement = React.memo(function LazyVehicleManagement(props: any) {
  return (
    <Suspense fallback={<ComponentLoader title="управления автомобилями" />}>
      <VehicleManagement {...props} />
    </Suspense>
  );
});
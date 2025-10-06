'use client';

import dynamic from 'next/dynamic';

// NUCLEAR SOLUTION: Используем Next.js dynamic с отключенным SSR
const LazyFullTestingResults = dynamic(
  () => import('./FullTestingResults'),
  { 
    ssr: false,
    loading: () => <div className="text-white p-4">Загрузка результатов тестирования...</div>
  }
);

const LazyVehicleManagement = dynamic(
  () => import('./VehicleManagement'),
  { 
    ssr: false,
    loading: () => <div className="text-white p-4">Загрузка управления автомобилями...</div>
  }
);

// Экспортируем оба компонента
export { LazyFullTestingResults, LazyVehicleManagement };
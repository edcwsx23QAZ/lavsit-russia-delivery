'use client';

import React from 'react';

// Импортируем реальные компоненты
import FullTestingResults from './FullTestingResults';
import VehicleManagement from './VehicleManagement';

// Создаем lazy-обертки с React.lazy
const LazyFullTestingResults = React.lazy(() => 
  Promise.resolve({ default: FullTestingResults })
);

const LazyVehicleManagement = React.lazy(() => 
  Promise.resolve({ default: VehicleManagement })
);

// Экспортируем оба lazy компонента
export { LazyFullTestingResults, LazyVehicleManagement };
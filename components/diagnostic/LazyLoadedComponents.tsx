'use client';

import React from 'react';
import FullTestingResults from './FullTestingResults';
import VehicleManagement from './VehicleManagement';

// Direct imports instead of lazy loading to avoid webpack issues
export const LazyFullTestingResults = React.memo(function LazyFullTestingResults(props: any) {
  return <FullTestingResults {...props} />;
});

export const LazyVehicleManagement = React.memo(function LazyVehicleManagement(props: any) {
  return <VehicleManagement {...props} />;
});
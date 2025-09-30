'use client';

import { useState, useEffect, useCallback } from 'react';

export interface VehicleType {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
}

const initialVehicleTypes: VehicleType[] = [
  { id: '1', name: 'Форд Транзит', length: 4200, width: 2025, height: 2025 },
  { id: '2', name: 'Фура 18м3', length: 4200, width: 2200, height: 2000 }
];

export const useVehicleManagement = () => {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(initialVehicleTypes);
  const [newVehicle, setNewVehicle] = useState({ name: '', length: '', width: '', height: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  // Load saved vehicle types on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vehicleTypes');
      if (saved) {
        const parsedVehicleTypes = JSON.parse(saved);
        setVehicleTypes(parsedVehicleTypes);
      }
      
      const lastUpdate = localStorage.getItem('lastProductDataUpdate');
      if (lastUpdate) {
        setLastUpdateTime(new Date(lastUpdate).toLocaleString('ru-RU'));
      }
    } catch (error) {
      console.error('Ошибка загрузки сохранённых данных:', error);
    }
  }, []);

  const addVehicleType = useCallback(() => {
    if (!newVehicle.name || !newVehicle.length || !newVehicle.width || !newVehicle.height) {
      alert('Пожалуйста, заполните все поля');
      return;
    }
    
    const newId = (vehicleTypes.length + 1).toString();
    const vehicleToAdd: VehicleType = {
      id: newId,
      name: newVehicle.name,
      length: parseInt(newVehicle.length),
      width: parseInt(newVehicle.width),
      height: parseInt(newVehicle.height)
    };
    
    setVehicleTypes(prev => [...prev, vehicleToAdd]);
    setNewVehicle({ name: '', length: '', width: '', height: '' });
    setHasUnsavedChanges(true);
  }, [newVehicle, vehicleTypes.length]);
  
  const removeVehicleType = useCallback((id: string) => {
    setVehicleTypes(prev => prev.filter(vehicle => vehicle.id !== id));
    setHasUnsavedChanges(true);
  }, []);
  
  const updateVehicleType = useCallback((id: string, field: string, value: string | number) => {
    setVehicleTypes(prev => prev.map(vehicle => 
      vehicle.id === id ? { ...vehicle, [field]: value } : vehicle
    ));
    setHasUnsavedChanges(true);
  }, []);
  
  const saveVehicleTypes = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      localStorage.setItem('vehicleTypes', JSON.stringify(vehicleTypes));
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasUnsavedChanges(false);
      setSaveStatus('success');
      
      // Auto-hide success message
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  }, [vehicleTypes]);

  return {
    vehicleTypes,
    newVehicle,
    isSaving,
    hasUnsavedChanges,
    saveStatus,
    lastUpdateTime,
    setNewVehicle,
    addVehicleType,
    removeVehicleType,
    updateVehicleType,
    saveVehicleTypes,
    setLastUpdateTime
  };
};
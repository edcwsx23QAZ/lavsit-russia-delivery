'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, AlertCircle, Plus, Trash2, Save } from 'lucide-react';

interface VehicleType {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
}

interface VehicleManagementProps {
  vehicleTypes: VehicleType[];
  newVehicle: { name: string; length: string; width: string; height: string };
  hasUnsavedChanges: boolean;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  isSaving: boolean;
  lastUpdateTime: string | null;
  onAddVehicleType: () => void;
  onRemoveVehicleType: (id: string) => void;
  onUpdateVehicleType: (id: string, field: string, value: string | number) => void;
  onSaveVehicleTypes: () => void;
  onSetNewVehicle: (vehicle: { name: string; length: string; width: string; height: string }) => void;
}

const VehicleManagement = React.memo(function VehicleManagement({
  vehicleTypes,
  newVehicle,
  hasUnsavedChanges,
  saveStatus,
  isSaving,
  lastUpdateTime,
  onAddVehicleType,
  onRemoveVehicleType,
  onUpdateVehicleType,
  onSaveVehicleTypes,
  onSetNewVehicle
}: VehicleManagementProps) {
  return (
    <Card className="border-blue-500 bg-blue-900/20 mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-400" />
            <span className="text-white">Типы автомобилей</span>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-orange-400 border-orange-400">
                Есть несохранённые изменения
              </Badge>
            )}
          </CardTitle>
          <Button 
            onClick={onSaveVehicleTypes}
            disabled={!hasUnsavedChanges || isSaving}
            className={
              saveStatus === 'success' 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : saveStatus === 'error'
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
            }
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveStatus === 'saving' && 'Сохранение...'}
            {saveStatus === 'success' && 'Сохранено!'}
            {saveStatus === 'error' && 'Ошибка'}
            {saveStatus === 'idle' && 'Сохранить'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Информационное сообщение */}
        <Alert className="border-blue-500 bg-blue-900/20 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="text-gray-300">
              Изменения в размерах и названиях типов автомобилей будут сохранены локально в браузере. Нажмите "Сохранить" для применения изменений.
              <br /><br />
              <strong>Обновление из Google Sheets:</strong> Данные также могут быть автоматически обновлены с помощью кнопки "Обновить данные" сверху. Это заменит все местные данные на актуальную информацию из таблицы.
              {lastUpdateTime && (
                <><br /><br /><strong>Последнее обновление:</strong> {lastUpdateTime}</>
              )}
            </span>
          </AlertDescription>
        </Alert>
        
        {/* Список существующих автомобилей */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-medium text-white">Существующие типы:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicleTypes.map((vehicle) => (
              <div key={vehicle.id} className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-300">Название</Label>
                    <Input
                      value={vehicle.name}
                      onChange={(e) => onUpdateVehicleType(vehicle.id, 'name', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-gray-400">Длина (мм)</Label>
                      <Input
                        type="number"
                        value={vehicle.length}
                        onChange={(e) => onUpdateVehicleType(vehicle.id, 'length', parseInt(e.target.value) || 0)}
                        className="bg-gray-700 border-gray-600 text-white text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Ширина (мм)</Label>
                      <Input
                        type="number"
                        value={vehicle.width}
                        onChange={(e) => onUpdateVehicleType(vehicle.id, 'width', parseInt(e.target.value) || 0)}
                        className="bg-gray-700 border-gray-600 text-white text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Высота (мм)</Label>
                      <Input
                        type="number"
                        value={vehicle.height}
                        onChange={(e) => onUpdateVehicleType(vehicle.id, 'height', parseInt(e.target.value) || 0)}
                        className="bg-gray-700 border-gray-600 text-white text-xs"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <div className="text-xs text-gray-400">
                      Объём: {((vehicle.length * vehicle.width * vehicle.height) / 1000000000).toFixed(1)} м³
                    </div>
                    <Button
                      onClick={() => onRemoveVehicleType(vehicle.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Добавление нового автомобиля */}
        <div className="bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-600">
          <h3 className="text-lg font-medium text-white mb-4">Добавить новый тип:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-sm text-gray-300">Название</Label>
              <Input
                placeholder="напр. Мерседес Спринтер"
                value={newVehicle.name}
                onChange={(e) => onSetNewVehicle({ ...newVehicle, name: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-300">Длина кузова (внутри), мм</Label>
              <Input
                type="number"
                placeholder="4200"
                value={newVehicle.length}
                onChange={(e) => onSetNewVehicle({ ...newVehicle, length: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-300">Ширина кузова (внутри), мм</Label>
              <Input
                type="number"
                placeholder="2025"
                value={newVehicle.width}
                onChange={(e) => onSetNewVehicle({ ...newVehicle, width: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-300">Высота кузова (внутри), мм</Label>
              <Input
                type="number"
                placeholder="2025"
                value={newVehicle.height}
                onChange={(e) => onSetNewVehicle({ ...newVehicle, height: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {newVehicle.length && newVehicle.width && newVehicle.height && (
                <span>
                  Прогнозируемый объём: {((parseInt(newVehicle.length) * parseInt(newVehicle.width) * parseInt(newVehicle.height)) / 1000000000).toFixed(1)} м³
                </span>
              )}
            </div>
            <Button 
              onClick={onAddVehicleType}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default VehicleManagement;
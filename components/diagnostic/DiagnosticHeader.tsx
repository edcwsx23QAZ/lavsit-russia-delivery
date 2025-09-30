'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Building2, Activity, TestTube, ExternalLink, Download, RefreshCw } from 'lucide-react';

interface DiagnosticHeaderProps {
  onTestAllAPIs: () => void;
  onRunFullTesting: () => void;
  onUpdateProductData: () => void;
  isFullTesting: boolean;
  isUpdatingData: boolean;
  updateStatus: 'idle' | 'updating' | 'success' | 'error';
}

const DiagnosticHeader = React.memo(function DiagnosticHeader({
  onTestAllAPIs,
  onRunFullTesting,
  onUpdateProductData,
  isFullTesting,
  isUpdatingData,
  updateStatus
}: DiagnosticHeaderProps) {
  return (
    <div className="mb-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-white">Диагностика транспортных компаний</h1>
        <p className="text-gray-400">Проверка работоспособности API всех подключенных ТК</p>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <Button onClick={onTestAllAPIs} className="bg-blue-600 hover:bg-blue-700">
          <Activity className="h-4 w-4 mr-2" />
          Тестировать все API
        </Button>
        <Button 
          onClick={onRunFullTesting} 
          disabled={isFullTesting}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <TestTube className="h-4 w-4 mr-2" />
          {isFullTesting ? 'Полное тестирование...' : 'Полное тестирование'}
        </Button>
        <Button 
          onClick={() => window.open('/env-check', '_blank')} 
          variant="outline" 
          className="text-white bg-gray-700 border-gray-500 hover:bg-gray-600"
        >
          <Building2 className="h-4 w-4 mr-2" />
          Проверить переменные окружения
        </Button>
        <Button 
          onClick={() => {
            window.open('https://docs.google.com/spreadsheets/d/1e0P91PfGKVIuSWDY0ceWkIE7jD-vzD_xrIesBeQno1Y/edit?gid=0#gid=0', '_blank');
          }} 
          variant="outline" 
          className="bg-green-600 hover:bg-green-700 text-white border-green-600"
          title="Открыть Google Sheets с базой товаров и размеров"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          База товаров
        </Button>
        <Button 
          onClick={onUpdateProductData}
          disabled={isUpdatingData}
          variant="outline"
          className={
            updateStatus === 'success' 
              ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
              : updateStatus === 'error'
              ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
              : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
          }
          title="Обновить данные о товарах из Google Sheets"
        >
          {updateStatus === 'updating' ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {updateStatus === 'updating' && 'Обновление...'}
          {updateStatus === 'success' && 'Обновлено!'}
          {updateStatus === 'error' && 'Ошибка'}
          {updateStatus === 'idle' && 'Обновить данные'}
        </Button>
        <Button onClick={() => window.close()} variant="outline" className="text-white bg-gray-700 border-gray-500 hover:bg-gray-600">
          Закрыть
        </Button>
      </div>
    </div>
  );
});

export default DiagnosticHeader;
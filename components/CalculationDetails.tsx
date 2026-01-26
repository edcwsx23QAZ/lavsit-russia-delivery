"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Calculator, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CalculationDetails {
  company: string;
  price: number;
  days: number;
  details?: any;
  requestData?: any;
  responseData?: any;
  apiUrl?: string;
  parseTime?: number;
  error?: string;
}

interface ServiceItem {
  name: string;
  price: number;
  basePrice?: number;
  discount?: number;
}

interface CalculationDetailsProps {
  details: CalculationDetails;
  isExpanded?: boolean;
}

export default function CalculationDetails({ details, isExpanded = false }: CalculationDetailsProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const formatPrice = (price: number) => {
    return price.toLocaleString('ru-RU') + ' ₽';
  };

  const formatDuration = (parseTime: number) => {
    return parseTime ? `${parseTime} сек` : 'Н/Д';
  };

  const getDiscountPercentage = (basePrice: number, price: number) => {
    if (!basePrice || basePrice === 0) return 0;
    return ((basePrice - price) / basePrice * 100).toFixed(1);
  };

  const getStatusColor = (company: string) => {
    switch (company) {
      case 'Возовоз': return 'text-blue-600';

      case 'API Vozovoz': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (company: string) => {
    switch (company) {
      case 'Возовоз': return <Calculator className="w-4 h-4" />;

      case 'API Vozovoz': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(details.company)}
            <span className={getStatusColor(details.company)}>
              {details.company}
            </span>
            {details.parseTime && (
              <Badge variant="secondary" className="text-xs">
                {formatDuration(details.parseTime)}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-200"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Основная информация */}
        <div className="flex justify-between items-center">
          <span className="text-gray-300">💰 Стоимость:</span>
          <span className="text-xl font-bold text-white">
            {formatPrice(details.price)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">⏰ Срок доставки:</span>
          <span className="text-white">
            {details.days} {details.days === 1 ? 'день' : 'дней'}
          </span>
        </div>

        {details.error && (
          <div className="bg-red-900 border border-red-700 rounded p-3">
            <div className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-4 h-4" />
              <span>Ошибка: {details.error}</span>
            </div>
          </div>
        )}

        {/* Детализация услуг */}
        {expanded && details.details?.services && (
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-white mb-3">📦 Детализация услуг</h4>
            
            <div className="space-y-2">
              {details.details.services.map((service: ServiceItem, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-white">
                      {service.name}
                    </div>
                    {service.discount && (
                      <div className="text-sm text-gray-400">
                        (скидка {service.discount} ₽)
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">
                      {formatPrice(service.price)}
                    </div>
                    {service.basePrice && service.basePrice !== service.price && (
                      <div className="text-sm text-gray-400 line-through">
                        {formatPrice(service.basePrice)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Итоги по скидкам */}
            {details.details.services.some(s => s.discount) && (
              <div className="bg-yellow-900 border border-yellow-700 rounded p-3">
                <div className="text-yellow-200">
                  <strong>💰 Итоговая экономия:</strong>
                  <div className="text-white mt-1">
                    {details.details.services
                      .filter(s => s.discount)
                      .reduce((total, s) => total + s.discount, 0)
                      .toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Техническая информация */}
        {expanded && (
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-white mb-3">🔧 Техническая информация</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">API URL:</span>
                <div className="text-white font-mono bg-gray-900 p-2 rounded">
                  {details.apiUrl || 'Н/Д'}
                </div>
              </div>
              
              <div>
                <span className="text-gray-400">Время выполнения:</span>
                <div className="text-white">
                  {formatDuration(details.parseTime || 0)}
                </div>
              </div>
            </div>

            {details.requestData && (
              <div>
                <span className="text-gray-400">Параметры запроса:</span>
                <div className="text-white font-mono bg-gray-900 p-2 rounded text-xs max-h-32 overflow-y-auto">
                  <pre>{JSON.stringify(details.requestData, null, 2)}</pre>
                </div>
              </div>
            )}

            {details.responseData && (
              <div>
                <span className="text-gray-400">Ответ API:</span>
                <div className="text-white font-mono bg-gray-900 p-2 rounded text-xs max-h-32 overflow-y-auto">
                  <pre>{JSON.stringify(details.responseData, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
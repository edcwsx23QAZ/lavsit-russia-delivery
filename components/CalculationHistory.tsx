'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { History, Eye, Calendar, MapPin, Package, Trash2, Download, Building2 } from 'lucide-react';

interface Calculation {
  id: string;
  orderNumber: string | null;
  formData: any;
  results: any;
  screenshot: string | null;
  status: string;
  createdAt: string;
  note?: string;
}

interface CalculationHistoryProps {
  onLoadCalculation?: (calculation: Calculation) => void;
}

export default function CalculationHistory({ onLoadCalculation }: CalculationHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalculation, setSelectedCalculation] = useState<Calculation | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Загрузка истории расчетов
  const loadCalculations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/calculations');
      const data = await response.json();
      
      if (data.success) {
        setCalculations(data.data || []);
      } else {
        setError(data.error || 'Ошибка загрузки истории');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
      console.error('Error loading calculations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при открытии диалога
  useEffect(() => {
    if (isOpen) {
      loadCalculations();
    }
  }, [isOpen]);

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Получение информации о маршруте
  const getRouteInfo = (formData: any) => {
    return `${formData.fromCity || 'Не указано'} → ${formData.toCity || 'Не указано'}`;
  };

  // Получение количества грузов
  const getCargoCount = (formData: any) => {
    return formData.cargos?.filter((cargo: any) => 
      cargo.length > 0 || cargo.width > 0 || cargo.height > 0 || cargo.weight > 0
    ).length || 0;
  };

  // Получение лучшей цены
  const getBestPrice = (results: any[]) => {
    if (!results || results.length === 0) return null;
    
    const validResults = results.filter((result: any) => !result.error && result.price > 0);
    if (validResults.length === 0) return null;
    
    return Math.min(...validResults.map((result: any) => result.price));
  };

  // Получение количества компаний с результатами
  const getResultsCount = (results: any[]) => {
    if (!results) return 0;
    return results.filter((result: any) => !result.error).length;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 text-black">
            <History className="w-4 h-4" />
            История расчетов
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              История расчетов
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : calculations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Сохраненных расчетов пока нет</p>
                <p className="text-sm">Сделайте расчет и сохраните его, чтобы увидеть здесь</p>
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-3">
                  {calculations.map((calc) => (
                    <Card key={calc.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {calc.orderNumber ? (
                                <Badge variant="default" className="text-xs">
                                  #{calc.orderNumber}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Без номера
                                </Badge>
                              )}
                              <span className="font-normal text-gray-600">
                                {formatDate(calc.createdAt)}
                              </span>
                            </CardTitle>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{getRouteInfo(calc.formData)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>{getCargoCount(calc.formData)} груз(ов)</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {getBestPrice(calc.results) && (
                              <div className="text-lg font-bold text-green-600">
                                {getBestPrice(calc.results)?.toLocaleString()} ₽
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {getResultsCount(calc.results)} из {calc.results?.length || 0} компаний
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCalculation(calc);
                              setShowDetails(true);
                            }}
                            className="h-8 text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Подробнее
                          </Button>
                          
                          {onLoadCalculation && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onLoadCalculation(calc);
                                setIsOpen(false);
                              }}
                              className="h-8 text-xs"
                            >
                              <Package className="w-3 h-3 mr-1" />
                              Загрузить
                            </Button>
                          )}
                          
                          {calc.screenshot && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = calc.screenshot!;
                                link.download = `calculation_${calc.orderNumber || calc.id}.jpg`;
                                link.click();
                              }}
                              className="h-8 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Скриншот
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}

            {calculations.length > 0 && (
              <div className="text-xs text-gray-500 text-center">
                {calculations.length} сохраненных расчетов
                {calculations.some(calc => calc.note) && ' (сохранено в памяти)'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог с деталями расчета */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Детали расчета
            </DialogTitle>
          </DialogHeader>
          
          {selectedCalculation && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4">
                {/* Информация о расчете */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Информация о расчете</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Номер заказа:</span>
                      <span>{selectedCalculation.orderNumber || 'Без номера'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Дата создания:</span>
                      <span>{formatDate(selectedCalculation.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Статус:</span>
                      <Badge variant="outline">{selectedCalculation.status}</Badge>
                    </div>
                    {selectedCalculation.note && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Примечание:</span>
                        <span className="text-xs">{selectedCalculation.note}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Маршрут */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Маршрут</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Откуда:</span>
                      <span>{selectedCalculation.formData.fromCity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Куда:</span>
                      <span>{selectedCalculation.formData.toCity}</span>
                    </div>
                    {selectedCalculation.formData.fromAddress && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Адрес отправления:</span>
                        <span>{selectedCalculation.formData.fromAddress}</span>
                      </div>
                    )}
                    {selectedCalculation.formData.toAddress && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Адрес доставки:</span>
                        <span>{selectedCalculation.formData.toAddress}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Грузы */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Грузы ({getCargoCount(selectedCalculation.formData)})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedCalculation.formData.cargos
                        .filter((cargo: any) => 
                          cargo.length > 0 || cargo.width > 0 || cargo.height > 0 || cargo.weight > 0
                        )
                        .map((cargo: any, index: number) => (
                          <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                            <span>Груз {index + 1}</span>
                            <span>
                              {cargo.length}×{cargo.width}×{cargo.height} см, {cargo.weight} кг
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Результаты расчета */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-white">Результаты расчета</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedCalculation.results
                        .sort((a: any, b: any) => a.price - b.price)
                        .map((result: any, index: number) => (
                        <div key={index} className="bg-gray-700 border border-gray-600 rounded p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-blue-400" />
                              <div>
                                <div className="font-medium text-white text-sm">{result.company}</div>
                                {result.error && (
                                  <div className="text-xs text-red-400 mt-1">{result.error}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {result.error ? (
                                result.price > 0 && (
                                  <>
                                    <div className="text-yellow-400 text-sm font-bold">
                                      {result.price.toLocaleString()} ₽
                                    </div>
                                    <div className="text-xs text-gray-400">~{result.days} дней</div>
                                  </>
                                )
                              ) : (
                                <>
                                  <div className="text-green-400 text-sm font-bold">
                                    {result.price.toLocaleString()} ₽
                                  </div>
                                  <div className="text-xs text-gray-400">{result.days} дней</div>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Дополнительная информация по ТК */}
                          {!result.error && (
                            <div className="mt-2 space-y-1">
                              {result.services && result.services.length > 0 && (
                                <div className="text-xs text-gray-400">
                                  🛠️ {result.services.join(', ')}
                                </div>
                              )}
                              {result.deliveryType && (
                                <div className="text-xs text-gray-400">
                                  🚚 {result.deliveryType}
                                </div>
                              )}
                              {result.fromTerminal && (
                                <div className="text-xs text-gray-400">
                                  📍 От: {result.fromTerminal}
                                </div>
                              )}
                              {result.toTerminal && (
                                <div className="text-xs text-gray-400">
                                  📍 До: {result.toTerminal}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Сводка по результатам */}
                    <div className="mt-4 pt-3 border-t border-gray-600">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="text-center">
                          <div className="text-gray-400">Всего ТК</div>
                          <div className="text-white font-bold">{selectedCalculation.results.length}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">Успешно</div>
                          <div className="text-green-400 font-bold">
                            {selectedCalculation.results.filter((r: any) => !r.error).length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Скриншот */}
                {selectedCalculation.screenshot && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Скриншот расчета</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img 
                        src={selectedCalculation.screenshot} 
                        alt="Скриншот расчета"
                        className="w-full rounded border"
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
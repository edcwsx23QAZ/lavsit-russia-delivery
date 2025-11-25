'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Save, Download, Camera, CheckCircle, AlertCircle } from 'lucide-react';

interface SaveCalculationProps {
  formData: any;
  calculations: any[];
  enabledCompanies: Record<string, boolean>;
  onSave?: (result: any) => void;
}

export default function SaveCalculation({ 
  formData, 
  calculations, 
  enabledCompanies, 
  onSave 
}: SaveCalculationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const handleSave = async () => {
    if (!orderNumber.trim()) {
      setSaveResult({
        success: false,
        message: 'Пожалуйста, введите номер заказа'
      });
      return;
    }

    setIsSaving(true);
    setSaveResult(null);

    try {
      console.log('💾 Сохранение расчета...', { orderNumber });

      // Создание скриншота на сервере
      const screenshotResponse = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formData,
          calculations,
          enabledCompanies
        })
      });

      let screenshot = null;
      if (screenshotResponse.ok) {
        const screenshotData = await screenshotResponse.json();
        screenshot = screenshotData.screenshot;
      } else {
        console.warn('⚠️ Не удалось создать скриншот, сохраняю без него');
      }

      // Сохранение расчета в базу данных
      const saveResponse = await fetch('/api/calculations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          formData,
          results: calculations,
          screenshot
        })
      });

      const result = await saveResponse.json();

      if (result.success) {
        setSaveResult({
          success: true,
          message: `Расчет успешно сохранен! ID: ${result.data.id}`,
          data: result.data
        });

        if (onSave) {
          onSave(result.data);
        }

        // Закрытие диалога через 2 секунды
        setTimeout(() => {
          setIsOpen(false);
          setOrderNumber('');
          setSaveResult(null);
        }, 2000);

      } else {
        setSaveResult({
          success: false,
          message: result.error || 'Ошибка при сохранении расчета'
        });
      }

    } catch (error: any) {
      console.error('❌ Ошибка сохранения:', error);
      setSaveResult({
        success: false,
        message: `Ошибка соединения: ${error.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      // Создание текстового файла с данными расчета
      const calculationText = generateCalculationText();
      
      const blob = new Blob([calculationText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `расчет-доставки-${orderNumber || 'без-номера'}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ Ошибка скачивания:', error);
    }
  };

  const generateCalculationText = () => {
    const currentDate = new Date().toLocaleString('ru-RU');
    const validCalculations = calculations.filter(calc => 
      calc.price > 0 && enabledCompanies[calc.company.toLowerCase().replace(/\s+/g, '')]
    );

    let text = `РАСЧЕТ СТОИМОСТИ ДОСТАВКИ\n`;
    text += `Дата расчета: ${currentDate}\n`;
    text += `Номер заказа: ${orderNumber || 'Не указан'}\n`;
    text += `${'='.repeat(50)}\n\n`;

    text += `МАРШРУТ:\n`;
    text += `Откуда: ${formData.fromCity}\n`;
    text += `Куда: ${formData.toCity}\n`;
    if (formData.fromAddress) text += `Адрес отправления: ${formData.fromAddress}\n`;
    if (formData.toAddress) text += `Адрес назначения: ${formData.toAddress}\n`;
    text += `\n`;

    text += `ГРУЗЫ (${formData.cargos.length} шт.):\n`;
    formData.cargos.forEach((cargo: any, index: number) => {
      text += `${index + 1}. ${cargo.length}×${cargo.width}×${cargo.height} см, ${cargo.weight} кг\n`;
    });
    text += `\n`;

    text += `УСЛУГИ:\n`;
    const services = [];
    if (formData.needPackaging) services.push('Упаковка');
    if (formData.needLoading) services.push('Погрузка');
    if (formData.needCarry) services.push('Переноска');
    if (formData.needInsurance) services.push(`Страхование (${formData.declaredValue}₽)`);
    text += services.length > 0 ? services.join(', ') : 'Нет дополнительных услуг';
    text += `\n\n`;

    text += `РЕЗУЛЬТАТЫ РАСЧЕТА:\n`;
    text += `${'='.repeat(50)}\n`;
    
    if (validCalculations.length === 0) {
      text += 'Нет доступных расчетов\n';
    } else {
      const sortedCalculations = [...validCalculations].sort((a, b) => a.price - b.price);
      sortedCalculations.forEach((calc, index) => {
        text += `${index + 1}. ${calc.company}\n`;
        text += `   Стоимость: ${calc.price.toLocaleString('ru-RU')} ₽\n`;
        text += `   Срок: ${calc.days} дней\n`;
        if (calc.error) text += `   Ошибка: ${calc.error}\n`;
        text += '\n';
      });
    }

    return text;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Сохранить расчет
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Сохранение расчета
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orderNumber">Номер заказа *</Label>
            <Input
              id="orderNumber"
              placeholder="Введите номер заказа"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              disabled={isSaving}
            />
            <p className="text-sm text-muted-foreground">
              Уникальный номер для идентификации расчета
            </p>
          </div>

          {saveResult && (
            <Alert className={saveResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {saveResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <AlertDescription className={saveResult.success ? 'text-green-800' : 'text-red-800'}>
                  {saveResult.message}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !orderNumber.trim()}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Camera className="w-4 h-4 mr-2 animate-pulse" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleDownload}
              disabled={!orderNumber.trim()}
            >
              <Download className="w-4 h-4 mr-2" />
              Скачать
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>• Расчет будет сохранен с текущими данными формы</p>
            <p>• Будет создан скриншот страницы с результатами</p>
            <p>• Дата сохранения: {new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Package, Minus, Plus } from 'lucide-react';
import { ProductInForm } from '@/lib/furniture-types';
import { formatPrice, getProductSummary } from '@/lib/furniture-utils';

interface Cargo {
  id: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  productId?: string;
  placeNumber?: number;
  isFromProduct?: boolean;
  addedAt?: number;
}

interface ProductManagerProps {
  products: ProductInForm[];
  cargos?: Cargo[]; // Все грузы (товары + ручные)
  onQuantityChange: (productId: string, addedAt: number, newQuantity: number) => void;
  onProductRemove: (productId: string, addedAt: number) => void;
  disabled?: boolean;
}

export default function ProductManager({ 
  products, 
  cargos = [],
  onQuantityChange, 
  onProductRemove, 
  disabled = false 
}: ProductManagerProps) {
  
  if (!products || products.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-3 text-center">
        Товары не добавлены. Используйте поиск выше для добавления мебели.
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {products && products.map((productInForm) => (
        <Card 
          key={`${productInForm.product.id}_${productInForm.addedAt}`}
          className="bg-gray-700 border-gray-600"
        >
          <CardContent className="p-3">
            <div className="space-y-3">
              {/* Заголовок товара */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium text-sm truncate">
                    {productInForm.product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs border-gray-500 text-white">
                      {productInForm.product.externalCode}
                    </Badge>
                    <div className="flex items-center text-gray-400 text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      {getProductSummary(productInForm.product)}
                    </div>
                  </div>
                </div>
                
                {/* Цена за единицу */}
                <div className="text-right ml-3">
                  <div className="text-green-400 font-medium text-sm">
                    {formatPrice(productInForm.product.retailPrice)}
                  </div>
                  <div className="text-gray-400 text-xs">
                    за единицу
                  </div>
                </div>
              </div>
              
              {/* Управление количеством и удаление */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm">Количество:</span>
                  
                  {/* Кнопки изменения количества */}
                  <div className="flex items-center bg-gray-800 rounded border border-gray-600">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newQuantity = Math.max(1, productInForm.quantity - 1);
                        onQuantityChange(productInForm.product.id, productInForm.addedAt, newQuantity);
                      }}
                      disabled={disabled || productInForm.quantity <= 1}
                      className="h-8 w-8 p-0 hover:bg-gray-700"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={productInForm.quantity}
                      onChange={(e) => {
                        const newQuantity = Math.max(1, Math.min(99, parseInt(e.target.value) || 1));
                        onQuantityChange(productInForm.product.id, productInForm.addedAt, newQuantity);
                      }}
                      className="w-16 h-8 text-center bg-transparent border-0 text-white focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      disabled={disabled}
                    />
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newQuantity = Math.min(99, productInForm.quantity + 1);
                        onQuantityChange(productInForm.product.id, productInForm.addedAt, newQuantity);
                      }}
                      disabled={disabled || productInForm.quantity >= 99}
                      className="h-8 w-8 p-0 hover:bg-gray-700"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <span className="text-gray-400 text-xs">шт.</span>
                </div>
                
                {/* Кнопка удаления */}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onProductRemove(productInForm.product.id, productInForm.addedAt)}
                  disabled={disabled}
                  className="h-8 px-3"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Удалить
                </Button>
              </div>
              
              {/* Итоговая стоимость товара */}
              {productInForm.quantity > 1 && (
                <div className="pt-2 border-t border-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Итого за товар:</span>
                    <span className="text-green-400 font-medium">
                      {formatPrice(productInForm.totalPrice)}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Детали грузовых мест */}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-300">
                  Грузовые места ({productInForm.product.cargoPlaces.length} на единицу, всего {productInForm.product.cargoPlaces.length * productInForm.quantity})
                </summary>
                <div className="mt-2 space-y-1">
                  {productInForm.product.cargoPlaces.map((place) => (
                    <div key={place.placeNumber} className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
                      <span className="font-medium">Место №{place.placeNumber}:</span>
                      {' '}
                      {place.length}×{place.depth}×{place.height} см, {place.weight} кг
                      {productInForm.quantity > 1 && (
                        <span className="ml-2 text-yellow-400">
                          (×{productInForm.quantity} = {productInForm.quantity * place.weight} кг)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Итоговая статистика */}
      {(products && products.length > 0) || (cargos && cargos.length > 0) ? (() => {
        // Расчет общего объема и веса для ВСЕХ грузов
        // 1. Грузовые места товаров (считаем отдельно по каждому месту)
        // 2. Ручные грузы из раздела "Грузы"
        let totalVolume = 0; // в м³
        let totalWeight = 0; // в кг
        let totalCargoPlaces = 0; // количество грузовых мест
        let totalCost = 0; // общая стоимость
        
        // Расчет для товаров - грузовые места товаров
        products.forEach(productInForm => {
          // Пересчитываем стоимость динамически на основе актуального количества
          const productCost = productInForm.product.retailPrice * productInForm.quantity;
          totalCost += productCost;
          
          // Считаем грузовые места
          const cargoPlacesCount = productInForm.product.cargoPlaces.length * productInForm.quantity;
          totalCargoPlaces += cargoPlacesCount;
          
          // Расчет объема и веса по каждому грузовому месту отдельно
          // Для каждого места считаем объем отдельно, затем умножаем на количество товаров
          productInForm.product.cargoPlaces.forEach(place => {
            // Объем одного грузового места в м³ (переводим см в м)
            // Используем length × depth × height для каждого места
            const placeVolume = (place.length * place.depth * place.height) / 1000000;
            
            // Умножаем объем одного места на количество товаров
            // Каждое место повторяется quantity раз
            totalVolume += placeVolume * productInForm.quantity;
            
            // Вес одного места умножаем на количество товаров
            totalWeight += place.weight * productInForm.quantity;
          });
        });
        
        // Расчет для ручных грузов (не из товаров)
        cargos.forEach(cargo => {
          // Учитываем только грузы, которые:
          // 1. Не из товаров (isFromProduct !== true или нет productId)
          // 2. Имеют заполненные размеры и вес
          // 3. Не пустые (length, width, height, weight > 0)
          const isManualCargo = !cargo.isFromProduct && !cargo.productId;
          const hasValidDimensions = cargo.length && cargo.width && cargo.height && cargo.weight;
          const isNotEmpty = cargo.length > 0 && cargo.width > 0 && cargo.height > 0 && cargo.weight > 0;
          
          if (isManualCargo && hasValidDimensions && isNotEmpty) {
            // Объем одного груза в м³ (переводим см в м)
            const cargoVolume = (cargo.length * cargo.width * cargo.height) / 1000000;
            totalVolume += cargoVolume;
            totalWeight += cargo.weight;
            totalCargoPlaces += 1;
          }
        });
        
        return (
          <Card className="bg-blue-900/20 border-blue-700">
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 font-medium">Всего товаров:</span>
                  <span className="text-white">
                    {products.reduce((sum, p) => sum + p.quantity, 0)} шт.
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 font-medium">Грузовых мест:</span>
                  <span className="text-white">
                    {totalCargoPlaces} шт.
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-blue-700 pt-2">
                  <span className="text-blue-300 font-medium">Общая стоимость:</span>
                  <span className="text-green-400 font-bold text-lg">
                    {formatPrice(totalCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-blue-700 pt-2">
                  <span className="text-blue-300 font-medium">Общий объем:</span>
                  <span className="text-white font-medium">
                    {totalVolume.toFixed(3)} м³
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 font-medium">Общий вес:</span>
                  <span className="text-white font-medium">
                    {totalWeight.toFixed(1)} кг
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })() : null}
    </div>
  );
}
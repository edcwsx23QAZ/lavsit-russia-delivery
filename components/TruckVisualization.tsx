'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck } from 'lucide-react';

interface Cargo {
  id: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  productName?: string;
}

interface CargoPlacement {
  cargo: Cargo;
  x: number;
  y: number;
  z: number;
  rotatedLength: number;
  rotatedWidth: number;
  rotatedHeight: number;
  color: string;
}

interface TruckVisualizationProps {
  cargos: Cargo[];
  isVisible?: boolean;
}

// Размеры кузова в мм
const TRUCK_DIMENSIONS = {
  length: 4200,
  width: 2025,
  height: 2025
};

// Цвета для разных грузов
const CARGO_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
  '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7', '#FD79A8'
];

export default function TruckVisualization({ cargos, isVisible = false }: TruckVisualizationProps) {
  // Функция проверки ключевых слов
  const isChairOrSeat = (productName?: string) => {
    if (!productName) return false;
    const lowerName = productName.toLowerCase();
    return lowerName.includes('стул') || lowerName.includes('кресло');
  };

  // Алгоритм размещения грузов
  const calculateCargoPlacement = (): CargoPlacement[] => {
    if (!cargos.length) return [];

    // Фильтруем только заполненные грузы (не нулевые размеры)
    const validCargos = cargos.filter(cargo => 
      cargo.length > 0 && cargo.width > 0 && cargo.height > 0 && cargo.weight > 0
    );

    if (!validCargos.length) return [];

    // Сортируем грузы: 
    // 1. Сначала стулья/кресла (они имеют ограничения)
    // 2. Потом по весу (убывание) 
    // 3. Потом по объему (убывание)
    const sortedCargos = [...validCargos].sort((a, b) => {
      const aIsChair = isChairOrSeat(a.productName);
      const bIsChair = isChairOrSeat(b.productName);
      
      // Стулья/кресла размещаем первыми
      if (aIsChair && !bIsChair) return -1;
      if (!aIsChair && bIsChair) return 1;
      
      // Сортировка по весу (тяжелые вниз)
      const weightDiff = b.weight - a.weight;
      if (weightDiff !== 0) return weightDiff;
      
      // Сортировка по объему
      const volumeA = a.length * a.width * a.height;
      const volumeB = b.length * b.width * b.height;
      return volumeB - volumeA;
    });

    const placements: CargoPlacement[] = [];
    const occupiedSpaces: Array<{
      x: number, y: number, z: number, 
      length: number, width: number, height: number,
      cargoId: string, weight: number, productName?: string
    }> = [];

    sortedCargos.forEach((cargo, index) => {
      const color = CARGO_COLORS[index % CARGO_COLORS.length];
      
      // Определяем возможные ориентации груза
      const orientations = getValidOrientations(cargo);
      
      let bestPlacement: CargoPlacement | null = null;
      let bestScore = Infinity;

      for (const orientation of orientations) {
        const placement = findBestPosition(cargo, orientation, occupiedSpaces, color);
        if (placement) {
          // Оценка размещения: приоритет минимальной площади пола и низкой высоте
          const floorArea = placement.rotatedLength * placement.rotatedWidth;
          const heightPenalty = placement.z * 0.1; // Небольшой штраф за высоту
          const score = floorArea + heightPenalty;
          
          if (score < bestScore) {
            bestScore = score;
            bestPlacement = placement;
          }
        }
      }

      if (bestPlacement) {
        placements.push(bestPlacement);
        occupiedSpaces.push({
          x: bestPlacement.x,
          y: bestPlacement.y,
          z: bestPlacement.z,
          length: bestPlacement.rotatedLength,
          width: bestPlacement.rotatedWidth,
          height: bestPlacement.rotatedHeight,
          cargoId: cargo.id,
          weight: cargo.weight,
          productName: cargo.productName
        });
      }
    });

    return placements;
  };

  // Получение допустимых ориентаций груза
  const getValidOrientations = (cargo: Cargo) => {
    const orientations = [
      { length: cargo.length, width: cargo.width, height: cargo.height },
      { length: cargo.width, width: cargo.length, height: cargo.height },
    ];

    // Если это не стул/кресло, добавляем вертикальные ориентации
    if (!isChairOrSeat(cargo.productName)) {
      orientations.push(
        { length: cargo.length, width: cargo.height, height: cargo.width },
        { length: cargo.height, width: cargo.length, height: cargo.width },
        { length: cargo.width, width: cargo.height, height: cargo.length },
        { length: cargo.height, width: cargo.width, height: cargo.length }
      );
    }

    return orientations;
  };

  // Поиск лучшей позиции для размещения груза
  const findBestPosition = (
    cargo: Cargo, 
    orientation: {length: number, width: number, height: number}, 
    occupiedSpaces: Array<{
      x: number, y: number, z: number, 
      length: number, width: number, height: number,
      cargoId: string, weight: number, productName?: string
    }>,
    color: string
  ): CargoPlacement | null => {
    
    // Проверяем, помещается ли груз в кузов
    if (orientation.length > TRUCK_DIMENSIONS.length || 
        orientation.width > TRUCK_DIMENSIONS.width || 
        orientation.height > TRUCK_DIMENSIONS.height) {
      return null;
    }

    // Создаем список возможных Z позиций (пол + верх каждого груза)
    const possibleZ = [0]; // Пол
    occupiedSpaces.forEach(space => {
      const topZ = space.z + space.height;
      if (topZ <= TRUCK_DIMENSIONS.height - orientation.height) {
        possibleZ.push(topZ);
      }
    });
    
    // Удаляем дубликаты и сортируем
    const uniqueZ = possibleZ.filter((value, index, self) => self.indexOf(value) === index);
    const sortedZ = uniqueZ.sort((a, b) => a - b);

    // Ищем позицию с приоритетом: сначала по Z (снизу вверх), потом по Y и X
    for (const z of sortedZ) {
      // Используем меньший шаг для более плотного размещения
      const step = Math.min(50, Math.min(orientation.length, orientation.width) / 4);
      
      for (let y = 0; y <= TRUCK_DIMENSIONS.width - orientation.width; y += step) {
        for (let x = 0; x <= TRUCK_DIMENSIONS.length - orientation.length; x += step) {
          
          if (isPositionValid(x, y, z, orientation, occupiedSpaces, cargo)) {
            return {
              cargo,
              x, y, z,
              rotatedLength: orientation.length,
              rotatedWidth: orientation.width,
              rotatedHeight: orientation.height,
              color
            };
          }
        }
      }
    }

    return null;
  };

  // Проверка валидности позиции
  const isPositionValid = (
    x: number, y: number, z: number,
    orientation: {length: number, width: number, height: number},
    occupiedSpaces: Array<{
      x: number, y: number, z: number, 
      length: number, width: number, height: number,
      cargoId: string, weight: number, productName?: string
    }>,
    cargo: Cargo
  ): boolean => {
    
    // Проверяем пересечения с уже размещенными грузами
    for (const occupied of occupiedSpaces) {
      if (!(x >= occupied.x + occupied.length || 
            x + orientation.length <= occupied.x ||
            y >= occupied.y + occupied.width || 
            y + orientation.width <= occupied.y ||
            z >= occupied.z + occupied.height || 
            z + orientation.height <= occupied.z)) {
        return false;
      }
    }

    // Проверяем правила размещения по весу и для стульев/кресел
    if (z > 0) { // Если груз не на полу
      const supportingCargos = occupiedSpaces.filter(occupied => 
        z === occupied.z + occupied.height && // Груз стоит прямо на другом грузе
        !(x >= occupied.x + occupied.length || 
          x + orientation.length <= occupied.x ||
          y >= occupied.y + occupied.width || 
          y + orientation.width <= occupied.y)
      );

      if (supportingCargos.length === 0) {
        return false; // Груз должен на чем-то стоять
      }

      // Проверяем правило по весу: тяжелый груз нельзя ставить на легкий
      for (const supporting of supportingCargos) {
        if (cargo.weight > supporting.weight) {
          return false;
        }
      }

      // Проверяем правила для стульев/кресел
      if (isChairOrSeat(cargo.productName)) {
        // На стулья/кресла можно ставить только другие стулья/кресла
        const allSupportingAreChairs = supportingCargos.every(supporting => 
          isChairOrSeat(supporting.productName)
        );
        
        if (!allSupportingAreChairs) {
          return false;
        }

        // Считаем количество стульев/кресел под текущим (максимум 2 друг на друге)
        let chairLevels = 1; // Текущий уровень
        let currentZ = z;
        
        while (currentZ > 0) {
          const supportingChairs = occupiedSpaces.filter(occupied =>
            occupied.z + occupied.height === currentZ &&
            isChairOrSeat(occupied.productName) &&
            !(x >= occupied.x + occupied.length || 
              x + orientation.length <= occupied.x ||
              y >= occupied.y + occupied.width || 
              y + orientation.width <= occupied.y)
          );
          
          if (supportingChairs.length > 0) {
            chairLevels++;
            currentZ = Math.min(...supportingChairs.map(c => c.z));
          } else {
            break;
          }
        }
        
        if (chairLevels > 2) { // Максимум 2 стула друг на друге
          return false;
        }
      } else {
        // Обычные грузы: нельзя ставить на стулья/кресла
        const hasChairSupport = supportingCargos.some(supporting => 
          isChairOrSeat(supporting.productName)
        );
        
        if (hasChairSupport) {
          return false;
        }
      }
    }

    return true;
  };

  const placements = calculateCargoPlacement();

  // Расчет статистики
  const calculateStats = () => {
    if (!placements.length) return null;

    const maxX = Math.max(...placements.map(p => p.x + p.rotatedLength));
    const maxY = Math.max(...placements.map(p => p.y + p.rotatedWidth));
    const maxZ = Math.max(...placements.map(p => p.z + p.rotatedHeight));

    const occupiedFloorArea = (maxX * maxY) / 1000000; // в м²
    const occupiedVolume = (maxX * maxY * maxZ) / 1000000000; // в м³
    const floorUtilization = (occupiedFloorArea / ((TRUCK_DIMENSIONS.length * TRUCK_DIMENSIONS.width) / 1000000)) * 100;

    return {
      occupiedFloorArea: occupiedFloorArea.toFixed(2),
      occupiedVolume: occupiedVolume.toFixed(3),
      floorUtilization: floorUtilization.toFixed(1),
      dimensions: {
        length: (maxX / 1000).toFixed(2),
        width: (maxY / 1000).toFixed(2),
        height: (maxZ / 1000).toFixed(2)
      }
    };
  };

  const stats = calculateStats();

  if (!isVisible) return null;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Truck className="h-4 w-4" />
          Визуализация размещения в кузове
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* SVG визуализация кузова */}
        <div className="bg-gray-900 p-4 rounded-lg mb-4">
          <svg 
            viewBox="0 0 500 300" 
            className="w-full h-80 border border-gray-600 bg-gray-950"
            style={{ maxHeight: '400px' }}
          >
            {/* Контур кузова (вид сверху) */}
            <rect 
              x="50" y="50" 
              width="400" height="200" 
              fill="none" 
              stroke="#4B5563" 
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            
            {/* Подпись размеров кузова */}
            <text x="250" y="40" textAnchor="middle" fill="#9CA3AF" fontSize="12">
              4200 мм
            </text>
            <text x="30" y="150" textAnchor="middle" fill="#9CA3AF" fontSize="12" transform="rotate(-90, 30, 150)">
              2025 мм
            </text>
            
            {/* Отображение грузов */}
            {placements.map((placement, index) => {
              const scaleX = 400 / TRUCK_DIMENSIONS.length;
              const scaleY = 200 / TRUCK_DIMENSIONS.width;
              
              const rectX = 50 + (placement.x * scaleX);
              const rectY = 50 + (placement.y * scaleY);
              const rectWidth = placement.rotatedLength * scaleX;
              const rectHeight = placement.rotatedWidth * scaleY;
              
              return (
                <g key={`cargo-${index}`}>
                  <rect
                    x={rectX}
                    y={rectY}
                    width={rectWidth}
                    height={rectHeight}
                    fill={placement.color}
                    fillOpacity="0.7"
                    stroke={placement.color}
                    strokeWidth="1"
                  />
                  <text
                    x={rectX + rectWidth/2}
                    y={rectY + rectHeight/2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {index + 1}
                  </text>
                </g>
              );
            })}
            
            {/* Легенда высоты */}
            <text x="470" y="150" textAnchor="middle" fill="#9CA3AF" fontSize="10" transform="rotate(90, 470, 150)">
              Высота: 2025 мм
            </text>
          </svg>
        </div>

        {/* Статистика размещения */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-white">Занятые размеры:</h4>
              <div className="text-gray-300 space-y-1">
                <div>Длина: {stats.dimensions.length} м</div>
                <div>Ширина: {stats.dimensions.width} м</div>
                <div>Высота: {stats.dimensions.height} м</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-white">Использование:</h4>
              <div className="text-gray-300 space-y-1">
                <div>Площадь пола: {stats.occupiedFloorArea} м²</div>
                <div>Объем: {stats.occupiedVolume} м³</div>
                <div>Загрузка пола: {stats.floorUtilization}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Легенда грузов */}
        {placements.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-white mb-2">Грузы:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {placements.map((placement, index) => (
                <div key={`legend-${index}`} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: placement.color }}
                  />
                  <span className="text-gray-300">
                    Груз {index + 1}: {placement.rotatedLength}×{placement.rotatedWidth}×{placement.rotatedHeight} мм
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
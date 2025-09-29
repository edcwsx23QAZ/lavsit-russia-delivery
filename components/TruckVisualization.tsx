'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck } from 'lucide-react';

interface Cargo {
  id: string;
  length: number; // в мм
  width: number;  // в мм
  height: number; // в мм
  weight: number;
  productName?: string;
}

interface Orientation {
  length: number;
  width: number;
  height: number;
  rotationAngle: number; // в градусах
  flipped: boolean; // перевернут ли груз по высоте
}

interface CargoPlacement {
  cargo: Cargo;
  x: number;
  y: number;
  z: number;
  orientation: Orientation;
  color: string;
  projectedVertices: Array<{x: number, y: number}>; // Для 3D отображения
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

// Углы поворота для размещения грузов (в градусах)
const ROTATION_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

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

  // Генерация всех возможных ориентаций груза
  const generateOrientations = (cargo: Cargo): Orientation[] => {
    const orientations: Orientation[] = [];
    const baseDimensions = [
      [cargo.length, cargo.width, cargo.height],
      [cargo.width, cargo.length, cargo.height],
      [cargo.length, cargo.height, cargo.width],
      [cargo.height, cargo.length, cargo.width],
      [cargo.width, cargo.height, cargo.length],
      [cargo.height, cargo.width, cargo.length]
    ];

    // Для стульев/кресел ограничиваем повороты (нельзя переворачивать)
    const allowedDimensions = isChairOrSeat(cargo.productName) 
      ? baseDimensions.slice(0, 2) // Только первые 2 варианта (без поворота по высоте)
      : baseDimensions;

    allowedDimensions.forEach(([l, w, h]) => {
      ROTATION_ANGLES.forEach(angle => {
        // Вычисляем размеры после поворота
        const rad = (angle * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        
        const rotatedLength = l * cos + w * sin;
        const rotatedWidth = l * sin + w * cos;

        orientations.push({
          length: rotatedLength,
          width: rotatedWidth,
          height: h,
          rotationAngle: angle,
          flipped: h !== cargo.height
        });
      });
    });

    return orientations;
  };

  // Проверка пересечения двух прямоугольников с учетом поворота
  const checkCollision = (
    x1: number, y1: number, x2: number, y2: number,
    length1: number, width1: number, length2: number, width2: number,
    angle1: number, angle2: number
  ): boolean => {
    // Упрощенная проверка через ограничивающие прямоугольники
    const rad1 = (angle1 * Math.PI) / 180;
    const rad2 = (angle2 * Math.PI) / 180;
    
    const cos1 = Math.abs(Math.cos(rad1));
    const sin1 = Math.abs(Math.sin(rad1));
    const cos2 = Math.abs(Math.cos(rad2));
    const sin2 = Math.abs(Math.sin(rad2));
    
    const bbox1 = {
      minX: x1,
      maxX: x1 + length1 * cos1 + width1 * sin1,
      minY: y1,
      maxY: y1 + length1 * sin1 + width1 * cos1
    };
    
    const bbox2 = {
      minX: x2,
      maxX: x2 + length2 * cos2 + width2 * sin2,
      minY: y2,
      maxY: y2 + length2 * sin2 + width2 * cos2
    };

    return !(bbox1.maxX <= bbox2.minX || bbox2.maxX <= bbox1.minX ||
             bbox1.maxY <= bbox2.minY || bbox2.maxY <= bbox1.minY);
  };

  // Проверка валидности позиции
  const isPositionValid = (
    x: number, y: number, z: number,
    orientation: Orientation,
    placements: CargoPlacement[],
    cargo: Cargo
  ): boolean => {
    
    // Проверяем границы кузова
    const rad = (orientation.rotationAngle * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    
    const effectiveLength = orientation.length * cos + orientation.width * sin;
    const effectiveWidth = orientation.length * sin + orientation.width * cos;
    
    if (x + effectiveLength > TRUCK_DIMENSIONS.length || 
        y + effectiveWidth > TRUCK_DIMENSIONS.width ||
        z + orientation.height > TRUCK_DIMENSIONS.height) {
      return false;
    }

    // Проверяем пересечения с уже размещенными грузами
    for (const placement of placements) {
      // Проверка по высоте
      if (!(z >= placement.z + placement.orientation.height || 
            z + orientation.height <= placement.z)) {
        
        // Если высоты пересекаются, проверяем пересечение по площади
        if (checkCollision(
          x, y, placement.x, placement.y,
          orientation.length, orientation.width,
          placement.orientation.length, placement.orientation.width,
          orientation.rotationAngle, placement.orientation.rotationAngle
        )) {
          return false;
        }
      }
    }

    // Проверяем правила размещения
    if (z > 0) { // Груз не на полу
      const supportingCargos = placements.filter(p => 
        z === p.z + p.orientation.height && // Стоит прямо на другом грузе
        !checkCollision(
          x, y, p.x, p.y,
          orientation.length, orientation.width,
          p.orientation.length, p.orientation.width,
          orientation.rotationAngle, p.orientation.rotationAngle
        ) === false // Есть пересечение по площади (поддержка)
      );

      if (supportingCargos.length === 0) {
        return false; // Должен на чем-то стоять
      }

      // Правило по весу
      for (const supporting of supportingCargos) {
        if (cargo.weight > supporting.cargo.weight) {
          return false;
        }
      }

      // Правила для стульев/кресел
      if (isChairOrSeat(cargo.productName)) {
        const allSupportingAreChairs = supportingCargos.every(p => 
          isChairOrSeat(p.cargo.productName)
        );
        
        if (!allSupportingAreChairs) {
          return false;
        }

        // Максимум 2 стула друг на друге
        let chairLevels = 1;
        let currentZ = z;
        
        while (currentZ > 0) {
          const chairsBelow = placements.filter(p =>
            p.z + p.orientation.height === currentZ &&
            isChairOrSeat(p.cargo.productName)
          );
          
          if (chairsBelow.length > 0) {
            chairLevels++;
            currentZ = Math.min(...chairsBelow.map(p => p.z));
          } else {
            break;
          }
        }
        
        if (chairLevels > 2) {
          return false;
        }
      } else {
        // Обычные грузы нельзя ставить на стулья
        const hasChairSupport = supportingCargos.some(p => 
          isChairOrSeat(p.cargo.productName)
        );
        
        if (hasChairSupport) {
          return false;
        }
      }
    }

    return true;
  };

  // Расчет площади пола, занимаемой размещениями
  const calculateFloorArea = (placements: CargoPlacement[], newPlacement?: CargoPlacement) => {
    const allPlacements = newPlacement ? [...placements, newPlacement] : placements;
    
    if (allPlacements.length === 0) return 0;

    let minX = Infinity, maxX = 0, minY = Infinity, maxY = 0;

    allPlacements.forEach(p => {
      const rad = (p.orientation.rotationAngle * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      
      const effectiveLength = p.orientation.length * cos + p.orientation.width * sin;
      const effectiveWidth = p.orientation.length * sin + p.orientation.width * cos;
      
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + effectiveLength);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y + effectiveWidth);
    });

    return (maxX - minX) * (maxY - minY);
  };

  // Основной алгоритм размещения
  const calculateCargoPlacement = (): CargoPlacement[] => {
    if (!cargos.length) return [];

    // Фильтруем только заполненные грузы
    const validCargos = cargos.filter(cargo => 
      cargo.length > 0 && cargo.width > 0 && cargo.height > 0 && cargo.weight > 0
    );

    if (!validCargos.length) return [];

    // Сортировка: стулья первыми, потом по весу, потом по объему
    const sortedCargos = [...validCargos].sort((a, b) => {
      const aIsChair = isChairOrSeat(a.productName);
      const bIsChair = isChairOrSeat(b.productName);
      
      if (aIsChair && !bIsChair) return -1;
      if (!aIsChair && bIsChair) return 1;
      
      const weightDiff = b.weight - a.weight;
      if (weightDiff !== 0) return weightDiff;
      
      const volumeA = a.length * a.width * a.height;
      const volumeB = b.length * b.width * b.height;
      return volumeB - volumeA;
    });

    const placements: CargoPlacement[] = [];

    sortedCargos.forEach((cargo, index) => {
      const color = CARGO_COLORS[index % CARGO_COLORS.length];
      const orientations = generateOrientations(cargo);
      
      let bestPlacement: CargoPlacement | null = null;
      let bestScore = Infinity;

      // Генерируем возможные Z позиции
      const possibleZ = [0];
      placements.forEach(p => {
        const topZ = p.z + p.orientation.height;
        if (topZ <= TRUCK_DIMENSIONS.height - 100) { // Минимум 100мм сверху
          possibleZ.push(topZ);
        }
      });
      
      const uniqueZ = possibleZ.filter((value, index, self) => self.indexOf(value) === index);
      const sortedZ = uniqueZ.sort((a, b) => a - b);

      // Перебираем все ориентации и позиции
      for (const orientation of orientations) {
        for (const z of sortedZ) {
          if (z + orientation.height > TRUCK_DIMENSIONS.height) continue;

          // Более частая сетка для точного размещения
          const step = 25; // 25мм шаг
          
          for (let y = 0; y <= TRUCK_DIMENSIONS.width - 50; y += step) {
            for (let x = 0; x <= TRUCK_DIMENSIONS.length - 50; x += step) {
              
              if (isPositionValid(x, y, z, orientation, placements, cargo)) {
                const testPlacement: CargoPlacement = {
                  cargo,
                  x, y, z,
                  orientation,
                  color,
                  projectedVertices: []
                };

                // Оценка: приоритет площади пола, потом высота, потом объем
                const floorArea = calculateFloorArea(placements, testPlacement);
                const heightPenalty = z * 0.001;
                const volumePenalty = (floorArea * orientation.height) * 0.000001;
                const score = floorArea + heightPenalty + volumePenalty;

                if (score < bestScore) {
                  bestScore = score;
                  bestPlacement = testPlacement;
                }
              }
            }
          }
        }
      }

      if (bestPlacement) {
        // Вычисляем проекционные вершины для 3D отображения
        bestPlacement.projectedVertices = calculateProjectedVertices(bestPlacement);
        placements.push(bestPlacement);
      }
    });

    return placements;
  };

  // Вычисление проекционных вершин для 3D отображения
  const calculateProjectedVertices = (placement: CargoPlacement) => {
    const { x, y, z, orientation } = placement;
    const angle = orientation.rotationAngle * Math.PI / 180;
    
    // Основные вершины параллелепипеда
    const vertices3D = [
      [x, y, z],
      [x + orientation.length * Math.cos(angle), y + orientation.length * Math.sin(angle), z],
      [x + orientation.length * Math.cos(angle) - orientation.width * Math.sin(angle), 
       y + orientation.length * Math.sin(angle) + orientation.width * Math.cos(angle), z],
      [x - orientation.width * Math.sin(angle), y + orientation.width * Math.cos(angle), z],
      // Верхние вершины
      [x, y, z + orientation.height],
      [x + orientation.length * Math.cos(angle), y + orientation.length * Math.sin(angle), z + orientation.height],
      [x + orientation.length * Math.cos(angle) - orientation.width * Math.sin(angle), 
       y + orientation.length * Math.sin(angle) + orientation.width * Math.cos(angle), z + orientation.height],
      [x - orientation.width * Math.sin(angle), y + orientation.width * Math.cos(angle), z + orientation.height]
    ];

    // Изометрическая проекция (вид сзади 3/4)
    return vertices3D.map(([x3d, y3d, z3d]) => {
      const scale = 0.08; // Масштаб для отображения
      const offsetX = 50;
      const offsetY = 300;
      
      // Изометрия: поворот на 45° по Y, потом наклон на 30°
      const projX = (x3d - y3d) * Math.cos(Math.PI / 6) * scale + offsetX;
      const projY = offsetY - ((x3d + y3d) * Math.sin(Math.PI / 6) + z3d) * scale;
      
      return { x: projX, y: projY };
    });
  };

  const placements = calculateCargoPlacement();

  // Расчет статистики
  const calculateStats = () => {
    if (!placements.length) return null;

    const floorArea = calculateFloorArea(placements);
    
    let maxX = 0, maxY = 0, maxZ = 0;
    placements.forEach(p => {
      const rad = (p.orientation.rotationAngle * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      
      const effectiveLength = p.orientation.length * cos + p.orientation.width * sin;
      const effectiveWidth = p.orientation.length * sin + p.orientation.width * cos;
      
      maxX = Math.max(maxX, p.x + effectiveLength);
      maxY = Math.max(maxY, p.y + effectiveWidth);
      maxZ = Math.max(maxZ, p.z + p.orientation.height);
    });

    const occupiedVolume = (maxX * maxY * maxZ) / 1000000000; // в м³
    const floorUtilization = (floorArea / ((TRUCK_DIMENSIONS.length * TRUCK_DIMENSIONS.width))) * 100;

    return {
      occupiedFloorArea: (floorArea / 1000000).toFixed(2), // в м²
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
          3D Визуализация размещения в кузове (вид сзади 3/4)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 3D SVG визуализация кузова */}
        <div className="bg-gray-900 p-4 rounded-lg mb-4">
          <svg 
            viewBox="0 0 600 400" 
            className="w-full h-96 border border-gray-600 bg-gray-950"
            style={{ maxHeight: '480px' }}
          >
            {/* Контур кузова в изометрии */}
            <g stroke="#4B5563" strokeWidth="2" fill="none">
              {/* Задняя стенка */}
              <rect x="50" y="100" width="163" height="163" strokeDasharray="3,3" />
              
              {/* Правая боковая стенка */}
              <polygon points="213,100 350,50 350,213 213,263" strokeDasharray="3,3" />
              
              {/* Пол */}
              <polygon points="50,263 213,263 350,213 187,213" fill="#374151" fillOpacity="0.3" />
              
              {/* Верх */}
              <polygon points="50,100 213,100 350,50 187,50" strokeDasharray="3,3" />
              
              {/* Левая стенка (видимая часть) */}
              <line x1="50" y1="100" x2="187" y2="50" strokeDasharray="3,3" />
              <line x1="50" y1="263" x2="187" y2="213" strokeDasharray="3,3" />
            </g>
            
            {/* Размеры кузова */}
            <text x="300" y="40" textAnchor="middle" fill="#9CA3AF" fontSize="10">
              4200×2025×2025 мм
            </text>
            
            {/* Отображение размещенных грузов */}
            {placements.map((placement, index) => {
              const vertices = placement.projectedVertices;
              if (vertices.length < 8) return null;

              return (
                <g key={`cargo-3d-${index}`}>
                  {/* Нижняя грань */}
                  <polygon
                    points={`${vertices[0].x},${vertices[0].y} ${vertices[1].x},${vertices[1].y} ${vertices[2].x},${vertices[2].y} ${vertices[3].x},${vertices[3].y}`}
                    fill={placement.color}
                    fillOpacity="0.6"
                    stroke={placement.color}
                    strokeWidth="1"
                  />
                  
                  {/* Верхняя грань */}
                  <polygon
                    points={`${vertices[4].x},${vertices[4].y} ${vertices[5].x},${vertices[5].y} ${vertices[6].x},${vertices[6].y} ${vertices[7].x},${vertices[7].y}`}
                    fill={placement.color}
                    fillOpacity="0.8"
                    stroke={placement.color}
                    strokeWidth="1"
                  />
                  
                  {/* Боковые грани */}
                  <polygon
                    points={`${vertices[1].x},${vertices[1].y} ${vertices[2].x},${vertices[2].y} ${vertices[6].x},${vertices[6].y} ${vertices[5].x},${vertices[5].y}`}
                    fill={placement.color}
                    fillOpacity="0.7"
                    stroke={placement.color}
                    strokeWidth="1"
                  />
                  
                  <polygon
                    points={`${vertices[2].x},${vertices[2].y} ${vertices[3].x},${vertices[3].y} ${vertices[7].x},${vertices[7].y} ${vertices[6].x},${vertices[6].y}`}
                    fill={placement.color}
                    fillOpacity="0.5"
                    stroke={placement.color}
                    strokeWidth="1"
                  />

                  {/* Номер груза */}
                  <text
                    x={(vertices[4].x + vertices[6].x) / 2}
                    y={(vertices[4].y + vertices[6].y) / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    {index + 1}
                  </text>
                </g>
              );
            })}
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
            <h4 className="font-medium text-white mb-2">Размещенные грузы:</h4>
            <div className="grid grid-cols-1 gap-2 text-xs max-h-32 overflow-y-auto">
              {placements.map((placement, index) => (
                <div key={`legend-${index}`} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: placement.color }}
                  />
                  <span className="text-gray-300">
                    Груз {index + 1}: {Math.round(placement.orientation.length)}×{Math.round(placement.orientation.width)}×{Math.round(placement.orientation.height)} мм
                    {placement.orientation.rotationAngle !== 0 && (
                      <span className="text-blue-300"> (повернут {placement.orientation.rotationAngle}°)</span>
                    )}
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
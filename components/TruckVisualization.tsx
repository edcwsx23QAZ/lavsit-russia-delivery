'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Truck, Move, RotateCw as Rotate3d } from 'lucide-react';

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
  // Состояние для 3D трансформаций (вид сзади 3/4, стоящий на колесах)
  const [rotationX, setRotationX] = useState(-15); // Поворот по оси X (наклон вверх для вида сзади-сверху)
  const [rotationY, setRotationY] = useState(-135); // Поворот по оси Y (поворот для вида сзади 3/4)
  const [rotationZ, setRotationZ] = useState(0);   // Поворот по оси Z
  const [positionX, setPositionX] = useState(50);  // Позиция по X (0-100%)
  const [positionY, setPositionY] = useState(70);  // Позиция по Y (немного ниже для лучшего вида)
  const [scale, setScale] = useState(65); // Увеличенный масштаб для лучшей видимости
  
  // Состояние джойстика
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<SVGSVGElement>(null);
  
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

  // 3D матричные трансформации
  const applyRotations = (vertices: number[][]) => {
    const radX = (rotationX * Math.PI) / 180;
    const radY = (rotationY * Math.PI) / 180;
    const radZ = (rotationZ * Math.PI) / 180;

    return vertices.map(([x, y, z]) => {
      // Поворот по оси X
      let newY = y * Math.cos(radX) - z * Math.sin(radX);
      let newZ = y * Math.sin(radX) + z * Math.cos(radX);
      y = newY;
      z = newZ;

      // Поворот по оси Y
      let newX = x * Math.cos(radY) + z * Math.sin(radY);
      newZ = -x * Math.sin(radY) + z * Math.cos(radY);
      x = newX;
      z = newZ;

      // Поворот по оси Z
      newX = x * Math.cos(radZ) - y * Math.sin(radZ);
      newY = x * Math.sin(radZ) + y * Math.cos(radZ);
      
      return [newX, newY, newZ];
    });
  };

  // Проекция 3D точек на 2D плоскость с учетом позиции и масштаба
  const project3DTo2D = (vertices: number[][]) => {
    const currentScale = (scale / 100) * 0.15; // Базовый масштаб
    const svgWidth = 600;
    const svgHeight = 400;
    const offsetX = (positionX / 100) * svgWidth;
    const offsetY = (positionY / 100) * svgHeight;
    
    return vertices.map(([x, y, z]) => {
      // Простая ортогональная проекция с перспективой
      const perspective = 1 + z * 0.0001;
      const projX = (x * currentScale / perspective) + offsetX;
      const projY = offsetY - (y * currentScale / perspective) - (z * currentScale * 0.7 / perspective);
      
      return { x: projX, y: projY };
    });
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

  // Вычисление проекционных вершин для 3D отображения грузов
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

    // Применяем 3D повороты и проекцию
    const rotatedVertices = applyRotations(vertices3D);
    return project3DTo2D(rotatedVertices);
  };

  // Вычисление вершин кузова
  const calculateTruckVertices = () => {
    const vertices3D = [
      // Нижние вершины кузова
      [0, 0, 0],
      [TRUCK_DIMENSIONS.length, 0, 0],
      [TRUCK_DIMENSIONS.length, TRUCK_DIMENSIONS.width, 0],
      [0, TRUCK_DIMENSIONS.width, 0],
      // Верхние вершины кузова
      [0, 0, TRUCK_DIMENSIONS.height],
      [TRUCK_DIMENSIONS.length, 0, TRUCK_DIMENSIONS.height],
      [TRUCK_DIMENSIONS.length, TRUCK_DIMENSIONS.width, TRUCK_DIMENSIONS.height],
      [0, TRUCK_DIMENSIONS.width, TRUCK_DIMENSIONS.height]
    ];

    const rotatedVertices = applyRotations(vertices3D);
    return project3DTo2D(rotatedVertices);
  };

  // Вычисление вершин кабины и шасси
  const calculateCabinAndChassisVertices = () => {
    const cabinLength = 2000; // 2 метра
    const cabinHeight = 2500; // 2.5 метра  
    const cabinWidth = TRUCK_DIMENSIONS.width;
    const chassisHeight = 300; // Высота шасси
    
    // Кабина (впереди кузова)
    const cabinVertices = [
      // Нижние вершины кабины
      [-cabinLength, 0, 0],
      [0, 0, 0],
      [0, cabinWidth, 0],
      [-cabinLength, cabinWidth, 0],
      // Верхние вершины кабины
      [-cabinLength, 0, cabinHeight],
      [0, 0, cabinHeight],
      [0, cabinWidth, cabinHeight],
      [-cabinLength, cabinWidth, cabinHeight]
    ];

    // Шасси (под кабиной и кузовом)
    const chassisVertices = [
      // Шасси под кабиной
      [-cabinLength, cabinWidth * 0.2, -chassisHeight],
      [0, cabinWidth * 0.2, -chassisHeight],
      [0, cabinWidth * 0.8, -chassisHeight],
      [-cabinLength, cabinWidth * 0.8, -chassisHeight],
      // Шасси под кузовом
      [0, cabinWidth * 0.2, -chassisHeight],
      [TRUCK_DIMENSIONS.length, cabinWidth * 0.2, -chassisHeight],
      [TRUCK_DIMENSIONS.length, cabinWidth * 0.8, -chassisHeight],
      [0, cabinWidth * 0.8, -chassisHeight]
    ];

    // Колеса
    const wheelRadius = 200;
    const wheelVertices = [
      // Передние колеса
      [-cabinLength * 0.8, 0, -chassisHeight],
      [-cabinLength * 0.8, cabinWidth, -chassisHeight],
      // Задние колеса
      [TRUCK_DIMENSIONS.length * 0.8, 0, -chassisHeight],
      [TRUCK_DIMENSIONS.length * 0.8, cabinWidth, -chassisHeight]
    ];

    const rotatedCabin = applyRotations(cabinVertices);
    const rotatedChassis = applyRotations(chassisVertices);
    const rotatedWheels = applyRotations(wheelVertices);
    
    return {
      cabin: project3DTo2D(rotatedCabin),
      chassis: project3DTo2D(rotatedChassis),
      wheels: project3DTo2D(rotatedWheels),
      wheelRadius: wheelRadius * (scale / 100) * 0.15
    };
  };

  // Обработчики джойстика
  const handleJoystickStart = (event: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  };

  const handleJoystickMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !joystickRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    
    const deltaX = (currentX - centerX) / centerX; // -1 до 1
    const deltaY = (currentY - centerY) / centerY; // -1 до 1
    
    // Плавное обновление углов поворота
    setRotationY(prev => Math.max(-90, Math.min(90, prev + deltaX * 2)));
    setRotationX(prev => Math.max(-90, Math.min(90, prev + deltaY * 2)));
  };

  const handleJoystickEnd = () => {
    setIsDragging(false);
  };

  // Эффект для обработки движения мыши вне джойстика
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging && joystickRef.current) {
        const rect = joystickRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;
        
        const deltaX = (currentX - centerX) / centerX;
        const deltaY = (currentY - centerY) / centerY;
        
        setRotationY(prev => Math.max(-90, Math.min(90, prev + deltaX * 2)));
        setRotationX(prev => Math.max(-90, Math.min(90, prev + deltaY * 2)));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Функция для получения первых двух слов из названия товара
  const getProductShortName = (productName?: string) => {
    if (!productName) return '';
    const words = productName.trim().split(/\s+/);
    return words.slice(0, 2).join(' ');
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
  const truckVertices = calculateTruckVertices();
  const truckComponents = calculateCabinAndChassisVertices();

  if (!isVisible) return null;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Truck className="h-4 w-4" />
          Интерактивная 3D визуализация грузовика с размещением груза
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Панель управления 3D моделью */}
        <div className="bg-gray-800 p-4 rounded-lg mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium flex items-center gap-2">
              <Rotate3d className="h-4 w-4" />
              Управление 3D моделью
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRotationX(-15);
                setRotationY(-135);
                setRotationZ(0);
                setPositionX(50);
                setPositionY(70);
                setScale(65);
              }}
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              Сброс
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Джойстик для поворотов */}
            <div className="space-y-2">
              <label className="text-sm text-gray-300 flex items-center gap-2">
                <Rotate3d className="h-3 w-3" />
                Поворот (X: {rotationX.toFixed(0)}°, Y: {rotationY.toFixed(0)}°)
              </label>
              <div className="flex justify-center">
                <svg
                  ref={joystickRef}
                  width="80"
                  height="80"
                  className="border border-gray-600 rounded-full bg-gray-900 cursor-move"
                  onMouseDown={handleJoystickStart}
                  onMouseMove={handleJoystickMove}
                  onMouseUp={handleJoystickEnd}
                >
                  {/* Внешний круг */}
                  <circle cx="40" cy="40" r="35" fill="none" stroke="#4B5563" strokeWidth="2" />
                  
                  {/* Центральные оси */}
                  <line x1="40" y1="10" x2="40" y2="70" stroke="#6B7280" strokeWidth="1" strokeDashArray="2,2" />
                  <line x1="10" y1="40" x2="70" y2="40" stroke="#6B7280" strokeWidth="1" strokeDashArray="2,2" />
                  
                  {/* Джойстик */}
                  <circle 
                    cx={40 + (rotationY / 90) * 25} 
                    cy={40 + (rotationX / 90) * 25} 
                    r="8" 
                    fill={isDragging ? '#3B82F6' : '#6B7280'} 
                    stroke="white" 
                    strokeWidth="2"
                    className="transition-colors"
                  />
                  
                  {/* Указатели осей */}
                  <text x="40" y="8" textAnchor="middle" fill="#9CA3AF" fontSize="8">-X</text>
                  <text x="40" y="76" textAnchor="middle" fill="#9CA3AF" fontSize="8">+X</text>
                  <text x="8" y="44" textAnchor="middle" fill="#9CA3AF" fontSize="8">-Y</text>
                  <text x="72" y="44" textAnchor="middle" fill="#9CA3AF" fontSize="8">+Y</text>
                </svg>
              </div>
            </div>
            
            {/* Слайдеры позиции */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                  <Move className="h-3 w-3" />
                  Позиция X: {positionX.toFixed(0)}%
                </label>
                <Slider
                  value={[positionX]}
                  onValueChange={(value) => setPositionX(value[0])}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-300">
                  Позиция Y: {positionY.toFixed(0)}%
                </label>
                <Slider
                  value={[positionY]}
                  onValueChange={(value) => setPositionY(value[0])}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Слайдеры масштаба и Z-поворота */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">
                  Масштаб: {scale.toFixed(0)}%
                </label>
                <Slider
                  value={[scale]}
                  onValueChange={(value) => setScale(value[0])}
                  max={100}
                  min={10}
                  step={1}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-300">
                  Поворот Z: {rotationZ.toFixed(0)}°
                </label>
                <Slider
                  value={[rotationZ]}
                  onValueChange={(value) => setRotationZ(value[0])}
                  max={180}
                  min={-180}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3D SVG визуализация кузова */}
        <div className="bg-gray-900 p-4 rounded-lg mb-4">
          <svg 
            viewBox="0 0 600 400" 
            className="w-full h-96 border border-gray-600 bg-gray-950"
            style={{ maxHeight: '480px' }}
          >
            {/* Размеры кузова */}
            <text x="300" y="20" textAnchor="middle" fill="#9CA3AF" fontSize="12" fontWeight="bold">
              Грузовик с кузовом 4200×2025×2025 мм
            </text>
            
            {/* Кабина грузовика */}
            <g stroke="#10B981" strokeWidth="2" fill="#065F46" fillOpacity="0.3">
              {/* Передняя стенка кабины */}
              <polygon 
                points={`${truckComponents.cabin[0].x},${truckComponents.cabin[0].y} ${truckComponents.cabin[1].x},${truckComponents.cabin[1].y} ${truckComponents.cabin[5].x},${truckComponents.cabin[5].y} ${truckComponents.cabin[4].x},${truckComponents.cabin[4].y}`}
              />
              
              {/* Правая боковая стенка кабины */}
              <polygon 
                points={`${truckComponents.cabin[1].x},${truckComponents.cabin[1].y} ${truckComponents.cabin[2].x},${truckComponents.cabin[2].y} ${truckComponents.cabin[6].x},${truckComponents.cabin[6].y} ${truckComponents.cabin[5].x},${truckComponents.cabin[5].y}`}
                fillOpacity="0.4"
              />
              
              {/* Верх кабины */}
              <polygon 
                points={`${truckComponents.cabin[4].x},${truckComponents.cabin[4].y} ${truckComponents.cabin[5].x},${truckComponents.cabin[5].y} ${truckComponents.cabin[6].x},${truckComponents.cabin[6].y} ${truckComponents.cabin[7].x},${truckComponents.cabin[7].y}`}
                fillOpacity="0.5"
              />
              
              {/* Левая стенка кабины */}
              <polygon 
                points={`${truckComponents.cabin[3].x},${truckComponents.cabin[3].y} ${truckComponents.cabin[0].x},${truckComponents.cabin[0].y} ${truckComponents.cabin[4].x},${truckComponents.cabin[4].y} ${truckComponents.cabin[7].x},${truckComponents.cabin[7].y}`}
                fillOpacity="0.2"
              />
            </g>
            
            {/* Шасси */}
            <g stroke="#374151" strokeWidth="3" fill="#1F2937">
              {/* Шасси под кабиной */}
              <polygon 
                points={`${truckComponents.chassis[0].x},${truckComponents.chassis[0].y} ${truckComponents.chassis[1].x},${truckComponents.chassis[1].y} ${truckComponents.chassis[2].x},${truckComponents.chassis[2].y} ${truckComponents.chassis[3].x},${truckComponents.chassis[3].y}`}
              />
              
              {/* Шасси под кузовом */}
              <polygon 
                points={`${truckComponents.chassis[4].x},${truckComponents.chassis[4].y} ${truckComponents.chassis[5].x},${truckComponents.chassis[5].y} ${truckComponents.chassis[6].x},${truckComponents.chassis[6].y} ${truckComponents.chassis[7].x},${truckComponents.chassis[7].y}`}
              />
            </g>
            
            {/* Колеса */}
            <g fill="#1F2937" stroke="#374151" strokeWidth="2">
              {truckComponents.wheels.map((wheel, index) => (
                <circle 
                  key={`wheel-${index}`}
                  cx={wheel.x} 
                  cy={wheel.y} 
                  r={Math.max(truckComponents.wheelRadius, 3)}
                />
              ))}
            </g>
            
            {/* Контур кузова в изометрии */}
            <g stroke="#EF4444" strokeWidth="2" fill="none">
              {/* Пол кузова */}
              <polygon 
                points={`${truckVertices[0].x},${truckVertices[0].y} ${truckVertices[1].x},${truckVertices[1].y} ${truckVertices[2].x},${truckVertices[2].y} ${truckVertices[3].x},${truckVertices[3].y}`}
                fill="#7F1D1D" 
                fillOpacity="0.3" 
              />
              
              {/* Задняя стенка */}
              <polygon 
                points={`${truckVertices[0].x},${truckVertices[0].y} ${truckVertices[1].x},${truckVertices[1].y} ${truckVertices[5].x},${truckVertices[5].y} ${truckVertices[4].x},${truckVertices[4].y}`}
                strokeDasharray="3,3" 
              />
              
              {/* Правая боковая стенка */}
              <polygon 
                points={`${truckVertices[1].x},${truckVertices[1].y} ${truckVertices[2].x},${truckVertices[2].y} ${truckVertices[6].x},${truckVertices[6].y} ${truckVertices[5].x},${truckVertices[5].y}`}
                strokeDasharray="3,3" 
              />
              
              {/* Передняя стенка */}
              <polygon 
                points={`${truckVertices[2].x},${truckVertices[2].y} ${truckVertices[3].x},${truckVertices[3].y} ${truckVertices[7].x},${truckVertices[7].y} ${truckVertices[6].x},${truckVertices[6].y}`}
                strokeDasharray="3,3" 
              />
              
              {/* Левая боковая стенка */}
              <polygon 
                points={`${truckVertices[3].x},${truckVertices[3].y} ${truckVertices[0].x},${truckVertices[0].y} ${truckVertices[4].x},${truckVertices[4].y} ${truckVertices[7].x},${truckVertices[7].y}`}
                strokeDasharray="3,3" 
              />
              
              {/* Верх кузова */}
              <polygon 
                points={`${truckVertices[4].x},${truckVertices[4].y} ${truckVertices[5].x},${truckVertices[5].y} ${truckVertices[6].x},${truckVertices[6].y} ${truckVertices[7].x},${truckVertices[7].y}`}
                strokeDasharray="3,3" 
              />
            </g>
            
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
                    Груз {index + 1}{getProductShortName(placement.cargo.productName) && (
                      <span className="text-blue-300"> "{getProductShortName(placement.cargo.productName)}"</span>
                    )}: {Math.round(placement.orientation.length)}×{Math.round(placement.orientation.width)}×{Math.round(placement.orientation.height)} мм
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
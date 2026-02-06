import React from 'react'

interface Cargo {
  id: string
  length: number
  width: number
  height: number
  weight?: number
}

interface TruckVisualizationProps {
  cargos: Cargo[]
}

export default function TruckVisualization({ cargos }: TruckVisualizationProps) {
  if (!cargos || cargos.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        Нет грузов для визуализации
      </div>
    )
  }

  const totalVolume = cargos.reduce((sum, cargo) => {
    return sum + (cargo.length * cargo.width * cargo.height) / 1000000 // Переводим в м³
  }, 0)

  const totalWeight = cargos.reduce((sum, cargo) => {
    return sum + (cargo.weight || 0)
  }, 0)

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Визуализация груза</h3>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Количество мест:</span>
          <span className="text-sm font-medium">{cargos.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Общий объем:</span>
          <span className="text-sm font-medium">{totalVolume.toFixed(2)} м³</span>
        </div>
        {totalWeight > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Общий вес:</span>
            <span className="text-sm font-medium">{totalWeight.toFixed(2)} кг</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {cargos.map((cargo, index) => (
          <div
            key={cargo.id || index}
            className="p-2 border rounded text-sm"
          >
            <div className="font-medium">Место #{index + 1}</div>
            <div className="text-xs text-muted-foreground">
              {cargo.length} × {cargo.width} × {cargo.height} мм
              {cargo.weight && ` • ${cargo.weight} кг`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


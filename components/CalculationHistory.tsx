import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CalculationHistoryProps {
  calculations?: any[]
  onLoad?: (calculation: any) => void
}

export default function CalculationHistory({ 
  calculations = [], 
  onLoad 
}: CalculationHistoryProps) {
  if (calculations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>История расчетов</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            История расчетов пуста
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>История расчетов</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {calculations.map((calc, index) => (
            <div
              key={index}
              className="p-2 border rounded cursor-pointer hover:bg-accent"
              onClick={() => onLoad?.(calc)}
            >
              <div className="text-sm font-medium">
                Расчет #{index + 1}
              </div>
              {calc.date && (
                <div className="text-xs text-muted-foreground">
                  {new Date(calc.date).toLocaleString('ru-RU')}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


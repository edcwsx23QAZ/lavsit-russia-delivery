import React from 'react'

interface CalculationProgressProps {
  progress?: number
  message?: string
}

export default function CalculationProgress({ 
  progress = 0, 
  message = 'Выполняется расчет...' 
}: CalculationProgressProps) {
  if (progress === 0 && !message) return null

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {message}
          </div>
          {progress > 0 && (
            <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


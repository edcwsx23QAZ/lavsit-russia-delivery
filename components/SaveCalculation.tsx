import React from 'react'
import { Button } from '@/components/ui/button'

interface SaveCalculationProps {
  onSave?: () => void
  disabled?: boolean
}

export default function SaveCalculation({ 
  onSave, 
  disabled = false 
}: SaveCalculationProps) {
  return (
    <Button 
      onClick={onSave} 
      disabled={disabled}
      variant="outline"
    >
      Сохранить расчет
    </Button>
  )
}


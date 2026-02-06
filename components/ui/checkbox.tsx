import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, checked, defaultChecked, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked)
      }
      if (onChange) {
        onChange(e)
      }
    }

    // Исключаем onCheckedChange из пропсов, передаваемых в input
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onCheckedChange: _, ...inputProps } = props as any

    // Если checked передан, всегда должен быть onChange (через handleChange)
    // Если checked не передан, используем defaultChecked для неконтролируемого компонента
    const inputChecked = checked !== undefined ? checked : undefined
    const inputDefaultChecked = checked === undefined ? defaultChecked : undefined

    return (
      <input
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary",
          className
        )}
        ref={ref}
        checked={inputChecked}
        defaultChecked={inputDefaultChecked}
        onChange={handleChange}
        {...inputProps}
      />
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }


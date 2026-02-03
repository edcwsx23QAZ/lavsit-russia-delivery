import React from 'react'
import { TableCell } from '@/components/ui/table'

interface ResizableTableCellProps {
  columnKey: string
  children?: React.ReactNode
  className?: string
  columnWidths: Record<string, number>
  [key: string]: any
}

export const ResizableTableCell = ({ columnKey, children, className = '', columnWidths, ...props }: ResizableTableCellProps) => {
  return (
    <TableCell 
      className={`border-r border-gray-200 dark:border-gray-700 p-0 relative ${className}`}
      style={{ width: columnWidths[columnKey], minWidth: columnWidths[columnKey], maxWidth: columnWidths[columnKey] }}
      {...props}
    >
      <div className="w-full h-full px-0.5 py-0.5">
        {children}
      </div>
    </TableCell>
  )
}

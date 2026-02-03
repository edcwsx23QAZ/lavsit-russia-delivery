import React from 'react'
import { TableHead } from '@/components/ui/table'

interface ResizableTableHeadProps {
  columnKey: string
  children?: React.ReactNode
  className?: string
  columnWidths: Record<string, number>
}

export const ResizableTableHead = ({ columnKey, children, className = '', columnWidths }: ResizableTableHeadProps) => {
  return (
    <TableHead 
      className={`relative border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${className}`}
      style={{ 
        width: columnWidths[columnKey], 
        minWidth: columnWidths[columnKey], 
        maxWidth: columnWidths[columnKey]
      }}
    >
      <div className="flex items-center justify-center relative h-full">
        <div 
          className="flex-1 text-center" 
          style={{ 
            padding: '1px',
            fontSize: '0.75rem',
            lineHeight: '1.2',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
            whiteSpace: 'normal'
          }}
        >
          {children}
        </div>
      </div>
    </TableHead>
  )
}

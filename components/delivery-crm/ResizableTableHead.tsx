import React, { useEffect, useRef } from 'react'
import { TableHead } from '@/components/ui/table'

interface ResizableTableHeadProps {
  columnKey: string
  children?: React.ReactNode
  className?: string
  columnWidths: Record<string, number>
}

export const ResizableTableHead = ({ columnKey, children, className = '', columnWidths }: ResizableTableHeadProps) => {
  const headRef = useRef<HTMLTableCellElement>(null)
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (headRef.current && divRef.current) {
      const headRect = headRef.current.getBoundingClientRect()
      const divRect = divRef.current.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(headRef.current)
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8ab1f4de-87e7-4df6-9295-7afa67d5d9f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResizableTableHead.tsx:useEffect',message:'TableHead dimensions and styles',data:{columnKey,headHeight:headRect.height,headTop:headRect.top,divHeight:divRect.height,divTop:divRect.top,padding:computedStyle.padding,verticalAlign:computedStyle.verticalAlign,lineHeight:computedStyle.lineHeight,childrenText:typeof children === 'string' ? children : 'complex'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }
  }, [columnKey, children])

  return (
    <TableHead 
      ref={headRef}
      className={`relative border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${className}`}
      style={{ 
        width: columnWidths[columnKey], 
        minWidth: columnWidths[columnKey], 
        maxWidth: columnWidths[columnKey],
        verticalAlign: 'top',
        padding: '0.25rem 0.25rem',
        height: 'auto'
      }}
    >
      <div 
        ref={divRef}
        className="text-center w-full flex items-center justify-center" 
        style={{ 
          fontSize: '0.75rem',
          lineHeight: '1.2',
          fontWeight: '500',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal',
          minHeight: '2rem'
        }}
      >
        {children}
      </div>
    </TableHead>
  )
}

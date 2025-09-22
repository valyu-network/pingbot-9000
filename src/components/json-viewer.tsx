"use client"

import { CopyButton } from './copy-button'

interface JsonViewerProps {
  data: any
  title?: string
}

export function JsonViewer({ data, title }: JsonViewerProps) {
  const jsonString = JSON.stringify(data, null, 2)

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <CopyButton text={jsonString} />
        </div>
      )}
      <pre className="overflow-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50">
        <code>{jsonString}</code>
      </pre>
    </div>
  )
}
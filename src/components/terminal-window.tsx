"use client"

import React from 'react'

interface TerminalWindowProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function TerminalWindow({ title = "request-inspector", children, className = "" }: TerminalWindowProps) {
  return (
    <div className={`bg-black border border-gray-700 rounded-lg font-mono text-sm leading-relaxed shadow-2xl h-full overflow-hidden flex flex-col ${className}`}>
      <div className="bg-gray-900 border-b border-gray-700 p-3 flex items-center gap-2 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-xs">▸</span>
          <span className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent text-xs font-mono font-semibold">{title}</span>
        </div>
        <div className="ml-auto flex items-center">
          <span className="text-green-400 animate-pulse text-xs">●</span>
        </div>
      </div>
      <div className="p-5 bg-black rounded-b-lg flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  )
}

interface TerminalLineProps {
  prompt?: string
  command?: string
  output?: React.ReactNode
  className?: string
}

export function TerminalLine({ prompt = "user@ping-bot9k", command, output, className = "" }: TerminalLineProps) {
  return (
    <div className={`${className}`}>
      {command && (
        <div className="flex items-center mb-2">
          <span className="text-blue-400 font-semibold before:content-['$_'] before:text-cyan-400">{prompt}</span>
          <span className="text-white ml-2">{command}</span>
          <span className="text-white animate-pulse ml-1">█</span>
        </div>
      )}
      {output && (
        <div className="text-gray-400 my-2 ml-0 pl-4 border-l-2 border-gray-700">
          {output}
        </div>
      )}
    </div>
  )
}

interface TerminalSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function TerminalSection({ title, children, className = "" }: TerminalSectionProps) {
  return (
    <div className={`my-6 border border-gray-700 rounded bg-gray-900 ${className}`}>
      <div className="bg-gray-800 p-2 border-b border-gray-700 font-semibold text-white flex items-center gap-2">
        [{title.toUpperCase()}]
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

interface TerminalJsonProps {
  data: any
  className?: string
}

export function TerminalJson({ data, className = "" }: TerminalJsonProps) {
  const formatValue = (value: any, indent: number = 0): React.ReactNode => {
    const spaces = "  ".repeat(indent)

    if (value === null) {
      return <span className="text-gray-500">null</span>
    }

    if (typeof value === 'boolean') {
      return <span className="text-purple-400">{value.toString()}</span>
    }

    if (typeof value === 'number') {
      return <span className="text-yellow-400">{value}</span>
    }

    if (typeof value === 'string') {
      // Special formatting for IPs
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
        return <span className="text-blue-400 font-medium">"{value}"</span>
      }
      return <span className="text-green-400">"{value}"</span>
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span>[]</span>

      return (
        <span>
          [<br />
          {value.map((item, index) => (
            <span key={index}>
              {spaces}  {formatValue(item, indent + 1)}
              {index < value.length - 1 ? ',' : ''}<br />
            </span>
          ))}
          {spaces}]
        </span>
      )
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value)
      if (entries.length === 0) return <span>{'{}'}</span>

      return (
        <span>
          {'{'}<br />
          {entries.map(([key, val], index) => (
            <span key={key}>
              {spaces}  <span className="text-pink-400 font-medium">"{key}"</span>: {formatValue(val, indent + 1)}
              {index < entries.length - 1 ? ',' : ''}<br />
            </span>
          ))}
          {spaces}{'}'}
        </span>
      )
    }

    return <span className="text-white">{String(value)}</span>
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded p-4 font-mono text-xs overflow-x-auto whitespace-pre ${className}`}>
      {formatValue(data)}
    </div>
  )
}

interface TerminalTableProps {
  data: Array<[string, string]>
  className?: string
}

export function TerminalTable({ data, className = "" }: TerminalTableProps) {
  if (data.length === 0) return <div className="text-gray-400 my-2 ml-0 pl-4 border-l-2 border-gray-700">No data</div>

  // Calculate max key length for alignment
  const maxKeyLength = Math.max(...data.map(([key]) => key.length))

  return (
    <div className={`${className}`}>
      {data.map(([key, value], index) => (
        <div key={index} className="flex font-mono text-sm">
          <span className="text-pink-400 font-medium" style={{ minWidth: `${maxKeyLength + 2}ch` }}>
            {key.padEnd(maxKeyLength)}
          </span>
          <span className="text-gray-400 mx-2">:</span>
          <span className="text-white break-all">{value}</span>
        </div>
      ))}
    </div>
  )
}
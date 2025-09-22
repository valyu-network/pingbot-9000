"use client"

import { useState } from 'react'

interface TerminalCopyButtonProps {
  text: string
  className?: string
}

export function TerminalCopyButton({ text, className = "" }: TerminalCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded bg-muted hover:bg-card transition-colors ${className}`}
      style={{
        color: copied ? 'var(--primary)' : 'var(--accent)',
        fontFamily: 'monospace'
      }}
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  )
}
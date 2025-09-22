"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { CopyButton } from './copy-button'

interface RequestSectionProps {
  title: string
  children: React.ReactNode
  data?: any
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  defaultOpen?: boolean
}

export function RequestSection({
  title,
  children,
  data,
  badge,
  badgeVariant = "secondary",
  defaultOpen = true
}: RequestSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <CardTitle className="text-lg">{title}</CardTitle>
                {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
              </div>
              {data && (
                <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <CopyButton
                    text={typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
                  />
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
import React from 'react'
import { Card, CardContent } from './card'
import { Button } from './button'
import { Alert, AlertDescription } from './alert'

interface GameCardErrorProps {
  title?: string
  message?: string
  variant?: 'grid' | 'list' | 'featured' | 'sidebar' | 'trending' | 'compact'
  onRetry?: () => void
  showRetry?: boolean
}

export function GameCardError({
  title = '游戏加载失败',
  message = '无法加载游戏信息，请重试。',
  variant = 'grid',
  onRetry,
  showRetry = true
}: GameCardErrorProps) {
  const getAspectClass = () => {
    switch (variant) {
      case 'featured':
        return 'aspect-[4/3]'
      case 'compact':
        return 'aspect-square'
      default:
        return 'aspect-video'
    }
  }

  const getCardHeight = () => {
    switch (variant) {
      case 'featured':
        return 'min-h-[350px]'
      case 'compact':
        return 'min-h-[200px]'
      case 'sidebar':
      case 'trending':
        return 'min-h-[180px]'
      default:
        return 'min-h-[280px]'
    }
  }

  return (
    <Card className={`${getCardHeight()} flex flex-col justify-center border-destructive/50 bg-destructive/5`}>
      <CardContent className="p-4 flex flex-col items-center justify-center space-y-4">
        {/* Error Icon */}
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg 
            className="w-6 h-6 text-destructive" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>

        {/* Error Message */}
        <div className="text-center space-y-2">
          <h3 className="font-medium text-sm text-destructive">{title}</h3>
          <p className="text-xs text-muted-foreground max-w-[200px]">{message}</p>
        </div>

        {/* Retry Button */}
        {showRetry && onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="h-7 px-3 text-xs border-destructive/20 text-destructive hover:bg-destructive/10"
          >
            <svg 
              className="w-3 h-3 mr-1" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
            重试
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default GameCardError
import React from 'react'
import { Alert, AlertDescription, AlertTitle } from './alert'
import { Button } from './button'

interface ErrorAlertProps {
  title?: string
  message: string
  variant?: 'default' | 'destructive'
  showRetry?: boolean
  onRetry?: () => void
  retryText?: string
  className?: string
}

export function ErrorAlert({
  title = '出现错误',
  message,
  variant = 'destructive',
  showRetry = false,
  onRetry,
  retryText = '重试',
  className
}: ErrorAlertProps) {
  return (
    <Alert variant={variant} className={className}>
      <svg 
        className="h-4 w-4" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <AlertTitle className="text-sm font-medium">{title}</AlertTitle>
      <AlertDescription className="text-sm text-muted-foreground">
        <div className="mb-3">{message}</div>
        {showRetry && onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="h-7 px-3 text-xs"
          >
            <svg 
              className="h-3 w-3 mr-1" 
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
            {retryText}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export default ErrorAlert
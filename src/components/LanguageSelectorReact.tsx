import React, { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Language {
  code: string
  label: string
  flag: string
  path: string
}

interface Props {
  currentLang: string
  languages: Language[]
  currentLanguage: Language
}

export default function LanguageSelectorReact({ currentLang, languages, currentLanguage }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  const handleValueChange = async (value: string) => {
    if (isNavigating) return // 防止重复点击
    
    const selectedLanguage = languages.find(lang => lang.code === value)
    if (selectedLanguage) {
      try {
        setError(null)
        setIsNavigating(true)
        
        // 简单的路径验证
        if (!selectedLanguage.path) {
          throw new Error('语言路径无效')
        }
        
        // 执行导航
        window.location.href = selectedLanguage.path
        
      } catch (error) {
        console.error('Language navigation error:', error)
        setError(error instanceof Error ? error.message : '切换语言失败')
        setIsNavigating(false)
      }
    } else {
      setError('选择的语言不存在')
    }
  }

  // 如果有错误，显示简化的错误状态
  if (error) {
    return (
      <div className="w-[140px]">
        <Alert variant="destructive" className="p-2">
          <AlertDescription className="text-xs">
            <div className="mb-2">{error}</div>
            <button 
              className="text-xs underline hover:no-underline"
              onClick={() => {
                setError(null)
                setIsNavigating(false)
              }}
            >
              重试
            </button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <Select value={currentLang} onValueChange={handleValueChange} disabled={isNavigating}>
      <SelectTrigger className={`w-[140px] h-9 bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <span className="text-sm">{currentLanguage.flag}</span>
            <span className="text-sm font-medium">{currentLanguage.label}</span>
            {isNavigating && (
              <div className="ml-1">
                <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[140px]">
        {languages.map((language) => (
          <SelectItem 
            key={language.code} 
            value={language.code}
            className="cursor-pointer hover:bg-primary/10 focus:bg-primary/10"
            disabled={isNavigating}
          >
            <div className="flex items-center gap-2 w-full text-sm">
              <span>{language.flag}</span>
              <span>{language.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
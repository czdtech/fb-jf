import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const handleValueChange = (value: string) => {
    const selectedLanguage = languages.find(lang => lang.code === value)
    if (selectedLanguage) {
      window.location.href = selectedLanguage.path
    }
  }

  return (
    <Select value={currentLang} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[140px] h-9 bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
        <SelectValue>
          <div className="flex items-center gap-2">
            <span className="text-sm">{currentLanguage.flag}</span>
            <span className="text-sm font-medium">{currentLanguage.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[140px]">
        {languages.map((language) => (
          <SelectItem 
            key={language.code} 
            value={language.code}
            className="cursor-pointer hover:bg-primary/10 focus:bg-primary/10"
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
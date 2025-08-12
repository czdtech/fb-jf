import React, { useState } from 'react';
import type { NavigationItem, Language } from '@/types';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui';

interface MobileSheetNavProps {
  navigation: NavigationItem[];
  languages: Language[];
  currentPath?: string;
}

export default function MobileSheetNav({ navigation, languages, currentPath = '/' }: MobileSheetNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button 
        className={cn(
          "inline-flex h-10 min-h-[44px] w-10 items-center justify-center",
          "rounded-md border border-border bg-background text-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <SheetContent side="right" className="w-80 max-w-[85vw] p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle>Menu</SheetTitle>
          <SheetClose className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-md",
            "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )} aria-label="Close menu">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </SheetClose>
        </SheetHeader>

        <nav className="px-4 py-3">
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => (
              <li key={item.url}>
                <SheetClose asChild>
                  <a
                    href={item.url}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm font-medium",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      currentPath === item.url
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {item.label}
                  </a>
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-2 border-t px-4 py-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Languages</div>
          <ul className="flex flex-wrap gap-2">
            {languages?.map((lang) => (
              <li key={lang.code}>
                <SheetClose asChild>
                  <a
                    href={lang.url}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  >
                    {lang.label}
                  </a>
                </SheetClose>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}

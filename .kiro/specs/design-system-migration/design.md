# Design Document

## Overview

This design document outlines the architecture and implementation approach for migrating the FiddleBops music creation game website from a custom CSS design system to Tailwind CSS + shadcn/ui. The migration will transform the current complex visual effects into a clean, modern, and maintainable design system while preserving the music-themed brand identity and core functionality.

## Architecture

### Design System Architecture

```
New Architecture:
├── tailwind.config.mjs          # Tailwind configuration with custom theme
├── src/components/ui/           # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── navigation-menu.tsx
│   ├── sheet.tsx
│   ├── select.tsx
│   └── ...
├── src/components/
│   ├── GameCard.astro          # Custom game card using shadcn/ui
│   ├── GameGrid.astro          # Responsive grid using Tailwind
│   ├── AudioPlayer.astro       # Audio controls with shadcn/ui buttons
│   ├── Navigation.astro        # Navigation using shadcn/ui components
│   └── LanguageSelector.astro  # Language switcher with shadcn/ui
└── src/styles/
    └── globals.css             # Minimal global styles + Tailwind imports
```

### Technology Stack Integration

- **Astro 5.11.0**: Maintained as the core framework
- **Tailwind CSS**: Primary styling framework replacing custom CSS
- **shadcn/ui**: Component library for consistent UI elements
- **TypeScript**: Enhanced type safety for component props
- **Astro Components**: Maintained for server-side rendering benefits

## Components and Interfaces

### Core UI Components

#### 1. Button System
```typescript
// Using shadcn/ui Button with music theme variants
interface ButtonProps {
  variant: 'default' | 'secondary' | 'ghost' | 'outline' | 'music-primary'
  size: 'sm' | 'md' | 'lg' | 'icon'
  className?: string
}

// Custom music-primary variant in tailwind.config.mjs
```

#### 2. Game Card Component
```astro
---
// GameCard.astro - Enhanced with shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Props {
  game: {
    id: string
    title: string
    description: string
    image: string
    category: string
    playUrl: string
  }
}
---

<Card class="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
  <CardContent class="p-0">
    <div class="aspect-video relative overflow-hidden rounded-t-lg">
      <img src={game.image} alt={game.title} class="object-cover w-full h-full transition-transform group-hover:scale-105" />
      <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button size="lg" variant="music-primary" class="rounded-full">
          <Play class="w-6 h-6 mr-2" />
          Play Now
        </Button>
      </div>
    </div>
    <div class="p-4 space-y-3">
      <CardTitle class="text-lg font-semibold line-clamp-2">{game.title}</CardTitle>
      <p class="text-muted-foreground text-sm line-clamp-2">{game.description}</p>
      <div class="flex items-center justify-between">
        <Badge variant="secondary" class="bg-primary/10 text-primary hover:bg-primary/20">
          {game.category}
        </Badge>
        <Button variant="ghost" size="sm" class="text-primary hover:text-primary/80">
          Learn More →
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

#### 3. Navigation System
```astro
---
// Navigation.astro - Desktop and Mobile
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
---

<!-- Desktop Navigation -->
<NavigationMenu class="hidden md:flex">
  <NavigationMenuList class="space-x-6">
    <NavigationMenuItem>
      <NavigationMenuLink href="/" class="text-foreground hover:text-primary transition-colors">
        Home
      </NavigationMenuLink>
    </NavigationMenuItem>
    <!-- Additional menu items -->
  </NavigationMenuList>
</NavigationMenu>

<!-- Mobile Navigation -->
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" class="md:hidden">
      <Menu class="h-6 w-6" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" class="w-80">
    <nav class="flex flex-col space-y-4 mt-8">
      <!-- Mobile menu items -->
    </nav>
  </SheetContent>
</Sheet>
```

#### 4. Responsive Game Grid System
```astro
---
// GameGrid.astro - Unified responsive grid
interface Props {
  games: Game[]
  variant?: 'standard' | 'featured' | 'compact'
}

const gridClasses = {
  standard: 'grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  featured: 'grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  compact: 'grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
}
---

<div class={`games-grid ${gridClasses[variant || 'standard']}`}>
  {games.map(game => (
    <GameCard game={game} />
  ))}
</div>
```

### Audio Player Integration
```astro
---
// AudioPlayer.astro - Enhanced with shadcn/ui
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
---

<Card class="p-4 bg-card/50 backdrop-blur-sm border-primary/20">
  <div class="flex items-center space-x-4">
    <Button variant="music-primary" size="icon" class="rounded-full">
      <Play class="w-5 h-5" />
    </Button>
    
    <div class="flex-1 space-y-2">
      <div class="text-sm font-medium">{currentTrack.title}</div>
      <Slider value={[progress]} max={100} step={1} class="w-full" />
    </div>
    
    <div class="text-xs text-muted-foreground">
      {formatTime(currentTime)} / {formatTime(duration)}
    </div>
  </div>
</Card>
```

## Data Models

### Theme Configuration Model
```typescript
// tailwind.config.mjs theme extension
interface ThemeConfig {
  colors: {
    primary: {
      DEFAULT: '#a855f7'  // Music purple
      50: '#faf5ff'
      100: '#f3e8ff'
      500: '#a855f7'
      600: '#9333ea'
      900: '#581c87'
    }
    background: string
    foreground: string
    card: string
    'card-foreground': string
    muted: string
    'muted-foreground': string
  }
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif']
  }
  spacing: {
    // 8px grid system maintained
  }
  screens: {
    xs: '480px'
    sm: '640px'
    md: '768px'
    lg: '1024px'
    xl: '1280px'
    '2xl': '1536px'
  }
}
```

### Component Props Models
```typescript
interface GameCardProps {
  game: {
    id: string
    title: string
    description: string
    image: string
    category: string
    playUrl: string
    featured?: boolean
  }
  variant?: 'standard' | 'featured' | 'compact'
  showCategory?: boolean
  showDescription?: boolean
}

interface NavigationProps {
  currentPath: string
  locale: string
  menuItems: MenuItem[]
}

interface AudioPlayerProps {
  tracks: AudioTrack[]
  autoplay?: boolean
  showPlaylist?: boolean
}
```

## Error Handling

### Component Error Boundaries
```astro
---
// Error handling for component failures
try {
  // Component rendering logic
} catch (error) {
  console.error('Component render error:', error)
  // Fallback UI
}
---

<!-- Fallback UI for failed components -->
{error && (
  <Card class="p-6 border-destructive/50 bg-destructive/5">
    <div class="text-center text-destructive">
      <AlertCircle class="w-8 h-8 mx-auto mb-2" />
      <p class="text-sm">Unable to load content. Please refresh the page.</p>
    </div>
  </Card>
)}
```

### CSS Migration Error Prevention
```typescript
// Utility for safe class name migration
function migrateClassName(oldClassName: string): string {
  const classMap = {
    'btn-primary': 'bg-primary text-primary-foreground hover:bg-primary/90',
    'card-glass': 'bg-card/50 backdrop-blur-sm border-primary/20',
    'grid-games': 'grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }
  
  return classMap[oldClassName] || oldClassName
}
```

### Build-time Validation
```javascript
// tailwind.config.mjs - Ensure required classes exist
module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  safelist: [
    // Ensure critical classes are never purged
    'bg-primary',
    'text-primary',
    'border-primary',
    'hover:bg-primary/90'
  ]
}
```

## Testing Strategy

### Visual Regression Testing
```typescript
// Component visual testing approach
describe('GameCard Component', () => {
  test('renders with shadcn/ui styling', async () => {
    const component = render(<GameCard game={mockGame} />)
    
    // Verify shadcn/ui classes are applied
    expect(component.getByRole('article')).toHaveClass('group', 'hover:shadow-lg')
    
    // Verify music theme colors
    const playButton = component.getByRole('button', { name: /play/i })
    expect(playButton).toHaveClass('bg-primary')
  })
  
  test('maintains responsive behavior', async () => {
    // Test responsive grid classes
    const grid = render(<GameGrid games={mockGames} />)
    expect(grid.container.firstChild).toHaveClass('grid-cols-1', 'sm:grid-cols-2')
  })
})
```

### Cross-browser Compatibility Testing
```typescript
// Ensure shadcn/ui components work across browsers
const browserTests = [
  'Chrome >= 90',
  'Firefox >= 88',
  'Safari >= 14',
  'Edge >= 90'
]

// Test critical interactions
describe('Cross-browser compatibility', () => {
  test('navigation menu works in all browsers', () => {
    // Test NavigationMenu component
  })
  
  test('card hover effects work consistently', () => {
    // Test Card component interactions
  })
})
```

### Performance Testing
```typescript
// Bundle size and performance validation
describe('Performance metrics', () => {
  test('CSS bundle size is reduced after migration', () => {
    // Compare before/after bundle sizes
    expect(newBundleSize).toBeLessThan(oldBundleSize * 0.8)
  })
  
  test('component render performance is maintained', () => {
    // Measure component render times
    const renderTime = measureRenderTime(<GameGrid games={largeGameSet} />)
    expect(renderTime).toBeLessThan(100) // ms
  })
})
```

### Accessibility Testing
```typescript
// Ensure shadcn/ui maintains accessibility
describe('Accessibility compliance', () => {
  test('navigation is keyboard accessible', () => {
    // Test keyboard navigation
    const nav = render(<Navigation />)
    // Verify tab order and focus management
  })
  
  test('game cards have proper ARIA labels', () => {
    const card = render(<GameCard game={mockGame} />)
    expect(card.getByRole('article')).toHaveAttribute('aria-label')
  })
  
  test('color contrast meets WCAG standards', () => {
    // Verify primary color (#a855f7) meets contrast requirements
  })
})
```

### Multi-language Testing
```typescript
// Ensure layout works with all supported languages
describe('Multi-language support', () => {
  const languages = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko']
  
  languages.forEach(lang => {
    test(`layout works correctly for ${lang}`, () => {
      const component = render(<GameCard game={mockGame} locale={lang} />)
      // Verify text doesn't overflow containers
      // Verify proper text direction and alignment
    })
  })
})
```

## Implementation Phases

### Phase 1: Foundation Setup
- Install and configure Tailwind CSS + shadcn/ui
- Set up custom theme with music purple primary color
- Create base component structure

### Phase 2: Core Component Migration
- Migrate Button, Card, Badge, Navigation components
- Implement responsive game grid system
- Update game card component with shadcn/ui

### Phase 3: Layout and Page Migration
- Migrate main layout components
- Update homepage and game listing pages
- Implement mobile navigation with Sheet component

### Phase 4: Feature Integration
- Integrate audio player with shadcn/ui components
- Implement language selector with Select component
- Add loading states with Skeleton components

### Phase 5: Testing and Optimization
- Comprehensive testing across all supported languages
- Performance optimization and bundle size analysis
- Accessibility audit and improvements

This design provides a comprehensive roadmap for migrating to a clean, maintainable design system while preserving the FiddleBops brand identity and functionality.
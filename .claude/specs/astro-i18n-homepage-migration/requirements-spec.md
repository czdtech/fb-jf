# Astro Official i18n Homepage Migration - Technical Specification

## Problem Statement
- **Business Issue**: Current architecture maintains 7 separate, identical homepage files (`/pages/[lang]/index.astro`) with hardcoded locale values, creating maintenance overhead and potential inconsistencies
- **Current State**: Each language homepage contains duplicate logic with only the locale variable differing (e.g., `const lang: SupportedLocale = 'zh';`)
- **Expected Outcome**: Single unified homepage using Astro's official i18n system with `Astro.currentLocale` for automatic locale detection while maintaining exact URL structure
- **Mobile Context**: Maintain mobile-first responsive design and performance optimizations across all language variants

## Solution Overview
- **Approach**: Migrate from 7 duplicate files to single `/pages/index.astro` using Astro official i18n system with automatic locale routing
- **Core Changes**: Replace hardcoded locale constants with `Astro.currentLocale`, leverage `astro:i18n` helper functions, implement configurable game counts
- **Success Criteria**: URL structure preserved (`/`, `/zh/`, `/de/`, etc.), game count configuration (4,4,8), SEO structure maintained, build time reduced by ~85%
- **Performance Budget**: Mobile loading time maintained < 3s, bundle size optimization through single file architecture

## Technical Implementation

### Mobile-First Design Constraints
- **Viewport Strategy**: Preserve existing responsive breakpoints starting from 320px mobile-first
- **Touch Targets**: Maintain 44px minimum touch targets across all language variants
- **Performance Budget**: Single file architecture improves mobile loading performance (reduce 7 HTTP requests to 1)
- **Network Adaptability**: Preserve existing offline support and progressive loading strategies

### Astro Configuration Changes
- **File to Modify**: `astro.config.mjs`
- **Current State**: i18n config exists but `fallback` is commented out
- **Required Changes**: 
  ```javascript
  // Enable fallback configuration for missing translations
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh", "es", "fr", "de", "ja", "ko"],
    routing: {
      prefixDefaultLocale: false, // Maintain current URL structure
    },
    fallback: {
      zh: "en",
      es: "en", 
      fr: "en",
      de: "en",
      ja: "en",
      ko: "en",
    },
  }
  ```

### Database Changes
- **Tables to Modify**: None - Content Collections structure remains unchanged
- **Migration Scripts**: None required - existing content structure preserved
- **Mobile Optimization**: Existing indexing strategies maintained

### Code Changes

#### Files to Delete
- `/src/pages/zh/index.astro`
- `/src/pages/de/index.astro`
- `/src/pages/es/index.astro`
- `/src/pages/fr/index.astro`
- `/src/pages/ja/index.astro`
- `/src/pages/ko/index.astro`

#### Files to Modify
- **Target File**: `/src/pages/index.astro`
- **Modification Type**: Replace hardcoded locale logic with Astro official i18n system

#### Key Function Signatures to Implement
```typescript
// Replace hardcoded locale with Astro.currentLocale
const currentLocale: SupportedLocale = (Astro.currentLocale as SupportedLocale) || 'en';

// Game count configuration system
interface GameCountConfig {
  popular: number;    // Default: 4
  new: number;        // Default: 4  
  trending: number;   // Default: 8
}

// Configurable game filtering
const getFilteredGames = (games: any[], category: string, count: number) => 
  games.filter(game => game.data.category === category).slice(0, count);
```

#### Mobile Components to Preserve
- **Touch-Friendly Interface**: Maintain existing `HeroSectionNew`, `SoundSamplesSection` with touch optimization
- **Responsive Navigation**: Preserve mobile-first navigation patterns
- **Performance Optimization**: Keep existing lazy loading and intersection observer patterns

### API Changes
- **Endpoints**: No API changes required - Content Collections API remains unchanged
- **Request/Response**: Maintain existing lightweight payload structures for mobile
- **Validation Rules**: Preserve existing input validation with mobile UX considerations
- **Caching Strategy**: Single file reduces cache complexity, improves mobile performance

### Frontend Mobile Implementation
- **Responsive Strategy**: Maintain existing mobile-first CSS with specific breakpoints (320px → 768px → 1024px)
- **Touch Interactions**: Preserve existing swipe, tap gesture implementations in `music-notes-animation.js`
- **Performance Optimization**: Single file architecture reduces bundle splitting overhead
- **PWA Features**: Maintain existing service worker and offline functionality

### Configuration Changes
- **Game Count Configuration**:
  ```typescript
  // Add to extractedData.homepage or separate config
  const GAME_COUNT_CONFIG: GameCountConfig = {
    popular: 4,
    new: 4,
    trending: 8
  };
  ```
- **Environment Variables**: No new environment variables required
- **Feature Flags**: No feature flags needed for this migration
- **Build Optimization**: Single file reduces build complexity, improves mobile bundle size

### Specific Implementation Details

#### 1. Locale Detection Migration
**Current Code (in each language file):**
```typescript
const lang: SupportedLocale = 'zh'; // Hardcoded per file
```

**New Code (single file):**
```typescript
const currentLocale: SupportedLocale = (Astro.currentLocale as SupportedLocale) || 'en';
```

#### 2. Game Count Configuration Implementation
**Current Code:**
```typescript
const popularGames = localizedGames.filter((game: any) => game.data.category === 'popular').slice(0, 4);
const newGames = localizedGames.filter((game: any) => game.data.category === 'new').slice(0, 4);
const trendingGames = localizedGames.filter((game: any) => game.data.category === 'trending').slice(0, 8);
```

**New Code:**
```typescript
const GAME_COUNT_CONFIG = {
  popular: 4,
  new: 4,
  trending: 8
};

const popularGames = localizedGames
  .filter((game: any) => game.data.category === 'popular')
  .slice(0, GAME_COUNT_CONFIG.popular);
const newGames = localizedGames
  .filter((game: any) => game.data.category === 'new')
  .slice(0, GAME_COUNT_CONFIG.new);
const trendingGames = localizedGames
  .filter((game: any) => game.data.category === 'trending')
  .slice(0, GAME_COUNT_CONFIG.trending);
```

#### 3. SEO and Hreflang Preservation
**Maintain existing hreflang generation:**
```typescript
// Preserve existing logic but use currentLocale
const pageMeta = {
  title: uiText?.meta?.title || extractedData.homepage.meta.title,
  description: uiText?.meta?.description || extractedData.homepage.meta.description,
  keywords: uiText?.meta?.keywords || extractedData.homepage.meta.keywords,
  canonical: getAbsoluteLocaleUrl(currentLocale, '/'),
  ogImage: extractedData.homepage.meta.ogImage
};
```

#### 4. Navigation Path Updates
**Current Code (in language-specific files):**
```typescript
<Navigation locale={lang} currentPath={`/${lang}/`} />
```

**New Code:**
```typescript
<Navigation
  locale={currentLocale}
  currentPath={currentLocale === 'en' ? '/' : `/${currentLocale}/`}
/>
```

#### 5. Footer Locale Handling
**Current Code:**
```typescript
<Footer locale={lang} />
```

**New Code:**
```typescript
<Footer locale={currentLocale} />
```

## Implementation Sequence

### Phase 1: Mobile Core Foundation (Astro Config & Single File Setup)
1. **Enable fallback configuration** in `astro.config.mjs` (5 minutes)
2. **Update `/src/pages/index.astro`** with Astro.currentLocale logic (30 minutes)
3. **Implement game count configuration system** (15 minutes)
4. **Test mobile responsive behavior** across all locales (20 minutes)

### Phase 2: Performance & Validation (File Cleanup & Testing)
1. **Delete 6 duplicate language homepage files** (5 minutes)
2. **Validate URL routing** for all 7 languages (30 minutes)
3. **Test mobile performance metrics** and touch interactions (20 minutes)
4. **Verify SEO structure** and hreflang generation (15 minutes)

### Phase 3: Enhancement & Comprehensive Testing (Final Validation)
1. **Comprehensive mobile device testing** across language variants (45 minutes)
2. **Performance benchmarking** against previous implementation (20 minutes)
3. **Accessibility testing** for mobile screen readers (25 minutes)
4. **Final build and deployment validation** (10 minutes)

Each phase should be independently deployable and testable on mobile devices.

## Mobile Validation Plan

### Device Testing
- **Real Device Testing**: Test on iOS Safari, Android Chrome across 5 different screen sizes per language
- **Responsive Breakpoints**: Validate 320px, 480px, 768px, 1024px breakpoints for all 7 languages
- **Touch Interaction Testing**: Verify game cards, navigation, language selector touch responsiveness

### Performance Testing
- **Core Web Vitals**: Validate FCP < 1.8s, LCP < 2.5s across all language variants on mobile networks
- **Bundle Size Comparison**: Measure bundle size reduction from single file architecture
- **Network Conditions**: Test on 3G, 4G, and offline conditions for each language

### Accessibility Testing
- **Mobile Screen Reader**: Test VoiceOver (iOS) and TalkBack (Android) for each language variant
- **Keyboard Navigation**: Ensure touch-equivalent keyboard navigation works across locales
- **Color Contrast**: Verify 4.5:1 minimum contrast ratio maintained across all language content

### Network Conditions Testing
- **Slow Network Performance**: Test 3G network performance for all language variants
- **Offline Functionality**: Verify PWA offline capabilities work consistently across locales
- **Progressive Loading**: Confirm game images and content load progressively in all languages

### Business Logic Verification
- **Game Count Configuration**: Verify 4/4/8 game counts work correctly for popular/new/trending in all languages
- **Content Fallback**: Test that missing translations fall back to English content correctly
- **URL Structure**: Confirm `/`, `/zh/`, `/de/`, etc. URLs work identically to current implementation
- **SEO Structure**: Validate meta tags, structured data, and hreflang links generate correctly for each locale

### Performance Benchmarks
- **Build Time**: Measure reduction in build time with single file vs. 7 files
- **Bundle Size**: Document bundle size improvements from architecture consolidation
- **Runtime Performance**: Confirm no regression in mobile JavaScript execution time
- **Memory Usage**: Verify mobile memory usage remains stable across language switches

## Success Criteria

### Functional Requirements
- ✅ All 7 language URLs (`/`, `/zh/`, `/de/`, `/es/`, `/fr/`, `/ja/`, `/ko/`) render correctly
- ✅ Game counts display exactly 4 popular, 4 new, 8 trending games per language
- ✅ Content fallback to English works for missing translations
- ✅ SEO meta tags and hreflang links generate correctly for each locale

### Performance Requirements
- ✅ Mobile FCP < 1.8s maintained across all language variants
- ✅ Build time reduced by minimum 50% due to single file architecture
- ✅ Touch response < 100ms for all interactive elements
- ✅ Bundle size reduction measurable and documented

### Technical Requirements
- ✅ No duplicate code - single unified homepage file
- ✅ Astro.currentLocale used instead of hardcoded locale values
- ✅ Game count configuration system implemented and functional
- ✅ Mobile-first responsive design preserved across all languages

### Quality Assurance
- ✅ Zero regression in mobile user experience across any language
- ✅ All existing mobile accessibility features maintained
- ✅ PWA functionality works consistently across language variants
- ✅ No mobile performance degradation measured via Core Web Vitals
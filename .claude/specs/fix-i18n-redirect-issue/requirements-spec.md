# Technical Specification - Fix Astro i18n Redirect Issue

## Problem Statement
- **Business Issue**: All multi-language URLs (e.g., /zh/sprunki-retake/, /de/sprunki-retake/) are performing 302 redirects to English versions (/sprunki-retake/)
- **Current State**: Multi-language game pages completely broken - 100% redirect rate to English versions
- **Expected Outcome**: Multi-language URLs should serve localized content without redirects
- **Mobile Context**: Critical impact on mobile SEO and user experience as mobile users heavily rely on language-specific URLs

## Solution Overview
- **Approach**: Fix `getStaticPaths()` implementation to generate paths for all supported locales in Astro i18n routing system
- **Core Changes**: Update static path generation to work correctly with `redirectToDefaultLocale: false` configuration
- **Success Criteria**: Zero redirects for multi-language game URLs, all locales serve appropriate content
- **Performance Budget**: Fix must maintain current performance (no additional load time)

## Technical Implementation

### Mobile-First Design Constraints
- **Viewport Strategy**: No changes needed - existing responsive design maintained
- **Touch Targets**: No UI changes - this is a routing fix only
- **Performance Budget**: Zero performance impact expected, may improve by eliminating redirects
- **Network Adaptability**: Fewer redirects improve mobile network efficiency

### Root Cause Analysis
**Current Incorrect Implementation**:
```typescript
// src/utils/i18n.ts - generateMultiLanguageStaticPaths()
// ❌ PROBLEM: Only generates English paths, causing Astro i18n to redirect
export async function generateMultiLanguageStaticPaths() {
  // Only processes English games
  const englishGames = allGames.filter(game => {
    return gameId.startsWith('en/');
  });
  
  // Only creates paths for English locale
  paths.push({
    params: { slug },
    props: { game: englishGame, locale: 'en' }
  });
}
```

**Astro i18n Behavior with `redirectToDefaultLocale: false`**:
- Requires `getStaticPaths()` to generate paths for ALL locales
- When paths missing for non-default locales → automatic 302 redirect to default locale
- This is expected Astro behavior when static paths incomplete

### Code Changes

#### Files to Modify
1. **`src/utils/i18n.ts`** - Fix static path generation logic
2. **`src/pages/[slug].astro`** - Simplify locale detection logic

#### Mobile-Optimized Static Path Generation
**File**: `src/utils/i18n.ts`

**Current Function**: `generateMultiLanguageStaticPaths()`
**Issue**: Only generates English paths
**Solution**: Generate paths for all locales with existing content

```typescript
export async function generateMultiLanguageStaticPaths(): Promise<Array<{
  params: { slug: string };
  props: { game: CollectionEntry<'games'>; locale: string };
}>> {
  const allGames = await getCollection('games');
  const paths: Array<{
    params: { slug: string };
    props: { game: CollectionEntry<'games'>; locale: string };
  }> = [];
  
  // Get all unique slugs first
  const slugSet = new Set<string>();
  allGames.forEach(game => {
    const gameId = game.id.replace(/\.md$/, '');
    const parts = gameId.split('/');
    if (parts.length === 2) {
      const [locale, slug] = parts;
      if (supportedLocales.includes(locale)) {
        slugSet.add(slug);
      }
    }
  });

  // For each unique slug, generate paths for all supported locales
  for (const slug of slugSet) {
    // Find the primary game (English preferred, fallback to any available)
    let primaryGame = allGames.find(game => {
      const gameId = game.id.replace(/\.md$/, '');
      return gameId === `en/${slug}`;
    });
    
    if (!primaryGame) {
      // Fallback to first available locale for this slug
      primaryGame = allGames.find(game => {
        const gameId = game.id.replace(/\.md$/, '');
        const parts = gameId.split('/');
        return parts.length === 2 && parts[1] === slug && supportedLocales.includes(parts[0]);
      });
    }

    if (primaryGame) {
      // Generate path for each supported locale
      for (const locale of supportedLocales) {
        paths.push({
          params: { slug },
          props: { 
            game: primaryGame, 
            locale: locale // Let page logic handle locale-specific content loading
          }
        });
      }
    }
  }

  console.log(`[DEBUG] Generated ${paths.length} total paths for ${slugSet.size} unique slugs`);
  return paths;
}
```

#### Simplified Page Logic
**File**: `src/pages/[slug].astro`

**Current Lines 28-46**: Complex locale detection and game loading
**Issue**: Redundant logic since `getStaticPaths()` now provides correct locale
**Solution**: Simplify to use provided locale directly

```typescript
// Line 28-46 replacement:
const { game: initialGame, locale } = Astro.props as { 
  game: CollectionEntry<'games'>; 
  locale: string 
};

// Get the actual locale from Astro's i18n routing
const currentLocale = Astro.currentLocale || locale || 'en';
const slug = Astro.params.slug as string;

console.log(`[DEBUG] [slug].astro - Locale: ${currentLocale}, Slug: ${slug}`);

// Load the appropriate game content for the current locale
const game = await getLocalizedGameContent(slug, currentLocale) || initialGame;

console.log(`[DEBUG] Final game loaded:`, {
  slug,
  currentLocale,
  gameId: game.id,
  title: game.data.title
});
```

### Configuration Validation
**File**: `astro.config.mjs` 
**Status**: ✅ Already correctly configured
**Current Configuration**:
```javascript
i18n: {
  defaultLocale: "en",
  locales: ["en", "zh", "es", "fr", "de", "ja", "ko"],
  routing: {
    prefixDefaultLocale: false,     // ✅ Correct
    redirectToDefaultLocale: false  // ✅ Correct  
  }
}
```

### Performance Optimization
- **Reduced Redirects**: Eliminates 302 redirects, improving mobile loading times
- **Caching Efficiency**: Direct content serving improves CDN caching effectiveness
- **Path Generation**: Optimized slug processing to avoid duplicate work

## Implementation Sequence
1. **Phase 1: Static Path Generation Fix** - Update `generateMultiLanguageStaticPaths()` function
2. **Phase 2: Page Logic Simplification** - Streamline locale detection in `[slug].astro`
3. **Phase 3: Testing & Validation** - Comprehensive multi-language URL testing

Each phase can be tested independently on mobile devices.

## Mobile Validation Plan

### Real Device Testing Matrix
**Devices**: iPhone (Safari), Android (Chrome), Android (Samsung Internet)
**Network Conditions**: Wi-Fi, 4G, 3G, Offline

### URL Testing Checklist
- **English URLs**: `/sprunki-retake/` → No redirect ✅
- **Chinese URLs**: `/zh/sprunki-retake/` → No redirect, Chinese content ✅
- **German URLs**: `/de/sprunki-retake/` → No redirect, German content ✅ 
- **French URLs**: `/fr/incredibox/` → No redirect, French content ✅
- **Spanish URLs**: `/es/sprunki-christmas/` → No redirect, Spanish content ✅

### Performance Validation
- **Before Fix**: 302 redirect + content load = ~500ms overhead
- **After Fix**: Direct content load = ~0ms redirect overhead
- **Mobile Network**: Validate on 3G networks for worst-case performance

### Accessibility Testing
- **Screen Reader**: Test language-specific content reading correctly
- **Language Switching**: Ensure navigation between locales works smoothly
- **URL Sharing**: Confirm shared URLs load correctly on different devices

### Business Logic Verification
- **Content Fallback**: English content serves when translation missing
- **SEO Preservation**: Meta tags and structured data correct per locale  
- **Navigation State**: Language selector shows correct current locale

## Rollback Plan

### Immediate Rollback (< 5 minutes)
```bash
# Revert to previous working state
git revert HEAD
npm run dev
```

### Partial Rollback Option
If only `generateMultiLanguageStaticPaths()` causes issues:
```typescript
// Quick fix: Revert to English-only path generation
export async function generateMultiLanguageStaticPaths() {
  // Original English-only logic as fallback
  const englishGames = allGames.filter(game => 
    game.id.replace(/\.md$/, '').startsWith('en/')
  );
  // ... rest of original logic
}
```

## Success Metrics

### Immediate Success Indicators
- **Zero 302 Redirects**: All multi-language URLs serve content directly
- **Content Accuracy**: Correct language content serves per URL
- **Performance**: No regression in page load times

### Long-term Success Indicators  
- **SEO Recovery**: Multi-language pages regain search rankings
- **User Engagement**: Bounce rate improvement on non-English pages
- **Mobile Performance**: Core Web Vitals maintain or improve

## Technical Standards Compliance

### Performance Requirements
- **Loading Performance**: No impact expected, potential improvement from eliminated redirects
- **Mobile Bundle**: No bundle size changes - server-side routing fix only
- **Network Efficiency**: Reduced HTTP redirects improve mobile network usage

### Accessibility Standards
- **Language Detection**: Correct `lang` attribute serving per locale
- **Screen Reader**: Proper content language announcement
- **Navigation**: Language switching functionality preserved

This specification provides immediate fix implementation that restores the multi-language functionality critical for mobile-first international user experience.
# Astro i18n Official Migration Technical Specification

## Problem Statement

- **Business Issue**: Current website uses custom i18n utilities (`getCurrentLocale`, `getTranslation`) instead of Astro's official i18n module, increasing maintenance overhead and limiting SEO optimization
- **Current State**: Custom i18n implementation in `src/i18n/utils.ts` with manual URL routing and translation management
- **Expected Outcome**: Migration to Astro's official i18n module with maintained URL structure, improved SEO, and reduced custom code
- **Mobile Context**: Maintain mobile-first responsive design and performance while upgrading i18n infrastructure

## Solution Overview

- **Approach**: Progressive migration from custom utils to Astro's `astro:i18n` module while preserving existing URL structure and functionality
- **Core Changes**: Update astro.config.mjs configuration, replace custom functions with official Astro i18n functions, maintain unified fallback behavior
- **Success Criteria**: All components use official Astro i18n functions, SEO-optimized routing, no breaking changes to URLs, improved maintainability
- **Performance Budget**: No performance regression, maintain Core Web Vitals targets for mobile devices

## Technical Implementation

### Mobile-First Design Constraints
- **Viewport Strategy**: Maintain existing mobile-first responsive breakpoints (320px+)
- **Touch Targets**: Preserve 44px minimum touch targets in navigation and language selectors
- **Performance Budget**: No increase in bundle size, maintain <3s mobile loading time
- **Network Adaptability**: Preserve existing caching strategies and offline capabilities

### Configuration Changes

#### astro.config.mjs Updates
```javascript
// Current Configuration (KEEP)
i18n: {
  defaultLocale: "en",
  locales: ["en", "zh", "es", "fr", "de", "ja", "ko"],
  routing: {
    prefixDefaultLocale: false,
    redirectToDefaultLocale: false
  }
  // Add fallback configuration for unified fallback behavior
  fallback: {
    zh: "en",
    es: "en", 
    fr: "en",
    de: "en",
    ja: "en",
    ko: "en"
  }
}
```

### Function Migration Mapping

#### Custom Utils → Astro i18n Equivalents
```typescript
// REPLACE: Custom getCurrentLocale(url: URL)
// WITH: Astro.currentLocale (automatic in components)

// REPLACE: Custom getLocalizedPath(locale, path)  
// WITH: getRelativeLocaleUrl(locale, path) from 'astro:i18n'

// REPLACE: Custom getTranslation(locale, key?)
// WITH: Direct Content Collections access + getRelativeLocaleUrl() for routing

// KEEP: SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_NAMES (constants)
// KEEP: Content Collections access patterns for UI translations
```

### Code Changes

#### Files to Modify

**1. Navigation Component** (`src/components/Navigation.astro`)
- **Current Usage**: `getCurrentLocale(Astro.url)`, `getRelativeLocaleUrl()` (already using official function)
- **Changes**: Replace `getCurrentLocale()` with `Astro.currentLocale`
- **Mobile Considerations**: Maintain touch-friendly navigation structure

**2. Footer Component** (`src/components/Footer.astro`) 
- **Current Usage**: `getCurrentLocale(Astro.url)`, manual URL construction
- **Changes**: Replace manual URL construction with `getRelativeLocaleUrl()`
- **Mobile Considerations**: Preserve responsive footer layout

**3. Language Selector** (`src/components/LanguageSelector.astro`)
- **Current Usage**: `getCurrentLocale()`, manual locale switching
- **Changes**: Use `Astro.currentLocale` and `getRelativeLocaleUrl()`
- **Mobile Considerations**: Maintain touch-friendly dropdown/selector UI

**4. Page Components** (26 files using custom utils)
- **Pattern**: All pages using `getCurrentLocale()` and `getTranslation()`
- **Changes**: Replace with `Astro.currentLocale` and direct Content Collections access
- **Mobile Considerations**: No impact on mobile responsiveness

#### Translation Access Pattern
```typescript
// OLD PATTERN
const currentLocale = getCurrentLocale(Astro.url);
const translation = await getTranslation(currentLocale);
const uiText = translation.ui;

// NEW PATTERN  
const currentLocale = Astro.currentLocale || 'en';
const uiCollection = await getCollection('i18nUI');
const uiEntry = uiCollection.find(entry => entry.id === currentLocale);
const uiText = uiEntry?.data || await getCollection('i18nUI').find(entry => entry.id === 'en')?.data;
```

#### URL Generation Pattern
```typescript
// OLD PATTERN
const gameUrl = currentLocale === 'en' ? `/${slug}/` : `/${currentLocale}/${slug}/`;

// NEW PATTERN
import { getRelativeLocaleUrl } from 'astro:i18n';
const gameUrl = getRelativeLocaleUrl(currentLocale, `/${slug}/`);
```

### API Changes

#### Routing Updates
- **Endpoints**: No changes to REST endpoints (static site)
- **URL Structure**: Maintain existing `/zh/`, `/fr/`, etc. structure via `prefixDefaultLocale: false`
- **Fallback Strategy**: Implement unified fallback through astro.config.mjs `fallback` configuration
- **Mobile Optimization**: Preserve existing route-based code splitting

### Frontend Mobile Implementation

#### Responsive Strategy
- **Breakpoints**: Maintain existing mobile-first CSS (320px → 768px → 1024px)
- **Navigation**: Preserve mobile navigation patterns (hamburger menu, bottom nav)
- **Language Selector**: Keep touch-friendly dropdown interface
- **Content Loading**: Maintain progressive enhancement for language switching

#### Performance Optimization
- **Bundle Impact**: No increase in JavaScript bundle size (Astro i18n is build-time)
- **Runtime Performance**: Faster locale detection (built-in vs custom parsing)
- **SEO Enhancement**: Improved hreflang generation via official Astro i18n
- **Mobile Loading**: Maintain sub-3s page load times on mobile networks

### Fallback Configuration

#### Unified Fallback Implementation
```javascript
// astro.config.mjs fallback ensures all non-English languages fallback to English
fallback: {
  zh: "en", es: "en", fr: "en", de: "en", ja: "en", ko: "en"
}
```

#### Content Collections Fallback Pattern
```typescript
// Enhanced fallback in components
const getUITranslation = async (locale: string) => {
  const uiCollection = await getCollection('i18nUI');
  return uiCollection.find(entry => entry.id === locale)?.data || 
         uiCollection.find(entry => entry.id === 'en')?.data || {};
};
```

## Implementation Sequence

### Phase 1: Core Configuration & Utils Migration (Mobile-First Foundation)
1. **Update astro.config.mjs** - Add fallback configuration
2. **Create new i18n utilities** - Wrapper functions for Astro i18n + Content Collections
3. **Update Navigation component** - Replace custom utils with official functions
4. **Test mobile navigation** - Verify touch interactions and responsive behavior

### Phase 2: Component Migration & Performance (Mobile Performance Focus)
1. **Update Footer component** - Migrate URL generation to official functions  
2. **Update LanguageSelector** - Use Astro.currentLocale and getRelativeLocaleUrl
3. **Migrate page components** - Update all 26 files using custom utils
4. **Performance validation** - Verify mobile loading times and Core Web Vitals

### Phase 3: Enhancement & Testing (Cross-Platform Validation)
1. **Remove deprecated utils** - Clean up src/i18n/utils.ts (keep constants)
2. **SEO optimization** - Validate hreflang generation and canonical URLs
3. **Comprehensive testing** - Mobile devices, network conditions, accessibility
4. **Documentation update** - Update any migration guides or developer docs

## Mobile Validation Plan

### Device Testing
- **iOS Testing**: Safari on iPhone (iOS 15+), various screen sizes (375px-428px)
- **Android Testing**: Chrome Mobile on Android devices (360px-414px viewports)
- **Tablet Testing**: iPad (768px-1024px), Android tablets
- **Legacy Device Testing**: Older mobile devices with limited JavaScript support

### Performance Testing  
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1 on mobile
- **Network Conditions**: 3G, 4G, WiFi testing for language switching performance
- **Bundle Analysis**: Verify no increase in mobile JavaScript bundle size
- **Memory Usage**: Monitor memory consumption during language switching

### Accessibility Testing
- **Screen Readers**: VoiceOver (iOS), TalkBack (Android) compatibility
- **Touch Navigation**: Language selector accessibility with touch/swipe
- **Keyboard Navigation**: Tab navigation through language options
- **Color Contrast**: Maintain 4.5:1 contrast ratio for mobile displays

### Network Conditions
- **Offline Testing**: Service Worker compatibility with new i18n routing
- **Slow Network**: 2G network simulation for translation loading
- **Error Handling**: Network failure during language switching scenarios
- **Caching Validation**: Ensure translated content caches properly on mobile

### Business Logic Verification
- **URL Structure**: Verify `/zh/`, `/fr/` URL patterns preserved on mobile
- **Language Switching**: Mobile-specific language switching flows (touch, gestures)
- **Content Fallback**: Verify English fallback works on mobile networks
- **SEO Mobile**: Mobile-specific meta tags and hreflang attributes

### Critical Success Metrics
- **Mobile Performance**: No regression in mobile page load times
- **Touch Usability**: Language selector remains fully functional with touch
- **URL Preservation**: All existing mobile bookmark URLs continue working
- **Fallback Reliability**: English content loads reliably on poor mobile connections
- **Accessibility Compliance**: WCAG 2.1 AA compliance maintained on mobile

## Key Implementation Notes

### MUST Requirements
- **URL Structure Preservation**: Maintain exact existing URL patterns (`/zh/`, `/fr/`, etc.)
- **Fallback Behavior**: All non-English languages must fallback to English seamlessly  
- **Mobile Performance**: Zero performance regression on mobile devices
- **Touch Accessibility**: Language switching must remain fully accessible via touch
- **SEO Maintenance**: Preserve existing SEO performance while improving hreflang generation

### MUST NOT Requirements  
- **Breaking URL Changes**: Never modify existing URL structure or routes
- **Performance Degradation**: Never increase mobile bundle size or loading times
- **Custom Logic Removal**: Never remove Content Collections or existing translation patterns
- **Mobile UX Changes**: Never modify mobile navigation or language selector UX
- **Fallback Failures**: Never allow scenarios where non-English users cannot access English content

### Risk Mitigation
- **Gradual Migration**: Implement component-by-component to avoid wholesale breakage
- **Fallback Testing**: Extensive testing of English fallback scenarios
- **Mobile Testing**: Continuous mobile device testing throughout migration
- **Performance Monitoring**: Real-time monitoring of Core Web Vitals during deployment

This specification enables automatic code generation for a complete migration to Astro's official i18n system while maintaining mobile-first excellence and zero breaking changes.
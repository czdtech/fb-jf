# Implementation Plan

- [x] 1. Set up Tailwind CSS and shadcn/ui foundation

  - Install @astrojs/tailwind and configure Astro integration
  - Initialize shadcn/ui for Astro with proper TypeScript configuration
  - Create tailwind.config.mjs with music purple theme (#a855f7) and custom design tokens
  - Set up src/components/ui/ directory structure for shadcn/ui components
  - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2_

- [x] 2. Configure custom theme and design tokens

  - Extend Tailwind theme with music purple primary color and variants
  - Configure responsive breakpoints (xs:480px → 2xl:1536px) in Tailwind config
  - Set up custom CSS variables for shadcn/ui theme integration
  - Create globals.css with Tailwind imports and minimal custom styles
  - _Requirements: 2.1, 2.2, 4.1, 3.3_

- [x] 3. Install and configure core shadcn/ui components

  - Install shadcn/ui Button component with custom music-primary variant
  - Install shadcn/ui Card, CardContent, CardHeader, CardTitle components
  - Install shadcn/ui Badge component for game categories
  - Install shadcn/ui NavigationMenu and NavigationMenuList components
  - Install shadcn/ui Sheet component for mobile navigation
  - _Requirements: 3.1, 5.4, 6.1, 6.2_

- [x] 4. Create responsive game grid system with Tailwind

  - Implement GameGrid.astro component with three grid variants (standard/featured/compact)
  - Write Tailwind utility classes for responsive grid layouts
  - Create grid container classes that work across all breakpoints
  - Test grid responsiveness on different screen sizes

  - _Requirements: 4.1, 4.2, 4.4_

- [x] 5. Migrate game card component to shadcn/ui

  - Rewrite GameCard.astro using shadcn/ui Card components
  - Implement hover effects with Tailwind transition classes
  - Add play button overlay using shadcn/ui Button component
  - Style game title, description, and category with shadcn/ui typography
  - Integrate Badge component for game categories
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Implement main navigation with shadcn/ui components

  - Create Navigation.astro using shadcn/ui NavigationMenu for desktop
  - Implement mobile navigation using shadcn/ui Sheet component
  - Add responsive visibility classes (hidden md:flex, md:hidden)
  - Style navigation links with hover states and active indicators
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Create language selector with shadcn/ui Select

  - Install shadcn/ui Select, SelectContent, SelectItem components
  - Implement LanguageSelector.astro component with current language detection
  - Style language options with proper flags or text indicators
  - Integrate with existing multi-language routing system
  - _Requirements: 8.2, 8.3, 8.4_

- [x] 8. Migrate audio player to use shadcn/ui components


  - Rewrite AudioPlayer.astro using shadcn/ui Button components for controls
  - Install and implement shadcn/ui Slider component for progress bar
  - Style audio player container with shadcn/ui Card component
  - Maintain existing audio playback functionality and event handlers
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 9. Update homepage layout with new components




  - Replace custom hero section with clean shadcn/ui layout
  - Integrate new GameGrid component with featured games
  - Update homepage to use new Navigation component
  - Apply consistent spacing and typography using Tailwind utilities
  - _Requirements: 3.2, 3.3, 4.3_

- [ ] 10. Migrate game listing pages

  - Update game category pages to use new GameGrid component
  - Implement filtering and search using shadcn/ui Input and Select components
  - Replace custom pagination with shadcn/ui Button components
  - Ensure proper responsive behavior on all game listing pages
  - _Requirements: 4.2, 4.4, 3.1_

- [ ] 11. Update game detail pages

  - Migrate game detail page layout to use shadcn/ui components
  - Style game screenshots and media using shadcn/ui Card components
  - Update game description and metadata sections with proper typography
  - Integrate AudioPlayer component for game music previews
  - _Requirements: 3.2, 7.3, 5.3_

- [ ] 12. Implement loading states with shadcn/ui Skeleton

  - Install shadcn/ui Skeleton component
  - Create loading states for GameCard components
  - Add skeleton loading for game grids and navigation
  - Implement loading states for audio player and language selector
  - _Requirements: 10.4, 3.1_

- [ ] 13. Add error handling and fallback UI

  - Create error boundary components using shadcn/ui Alert components
  - Implement fallback UI for failed game card loading
  - Add error states for audio player and navigation components
  - Style error messages with appropriate shadcn/ui styling
  - _Requirements: 10.4, 3.3_

- [ ] 14. Test multi-language compatibility

  - Test all components with different language content lengths
  - Verify proper text wrapping and layout for Asian languages (zh/ja/ko)
  - Ensure RTL language support if needed
  - Test language selector functionality across all pages
  - _Requirements: 8.1, 8.3, 8.4_

- [ ] 15. Optimize responsive behavior across all breakpoints

  - Test all components on mobile devices (xs, sm breakpoints)
  - Verify tablet layout behavior (md, lg breakpoints)
  - Test desktop and large screen layouts (xl, 2xl breakpoints)
  - Ensure touch interactions work properly on mobile devices
  - _Requirements: 4.1, 4.4, 6.2_

- [ ] 16. Remove legacy CSS files and clean up

  - Remove or significantly reduce src/styles/ directory
  - Delete unused custom CSS files (hero.css, buttons.css, etc.)
  - Clean up any remaining custom CSS that conflicts with Tailwind
  - Update any remaining components to use Tailwind classes
  - _Requirements: 1.4, 9.3_

- [ ] 17. Performance testing and optimization

  - Measure and compare bundle sizes before and after migration
  - Test page load performance with new Tailwind CSS setup
  - Verify Tailwind purging is working correctly to minimize CSS bundle
  - Optimize any performance regressions found during testing
  - _Requirements: 10.1, 10.2, 9.3_

- [ ] 18. Accessibility audit and improvements

  - Test keyboard navigation with new shadcn/ui components
  - Verify color contrast ratios with music purple theme
  - Ensure proper ARIA labels and semantic HTML structure
  - Test screen reader compatibility with all interactive components
  - _Requirements: 6.4, 3.3, 10.4_

- [ ] 19. Cross-browser compatibility testing

  - Test all components in Chrome, Firefox, Safari, and Edge
  - Verify shadcn/ui component behavior across browsers
  - Test responsive layouts on different browser viewport sizes
  - Fix any browser-specific styling issues discovered
  - _Requirements: 9.1, 10.3, 4.4_

- [ ] 20. Final integration testing and deployment preparation
  - Test complete user flows from homepage to game playing
  - Verify all audio functionality works with new components
  - Test language switching across different page types
  - Ensure build process works correctly with new dependencies
  - Validate that all original functionality is preserved
  - _Requirements: 7.4, 8.4, 9.2, 10.1_

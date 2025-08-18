## Project Overview

This is a multilingual, static website built with the [Astro](https://astro.build/) framework. It appears to be a fan site or informational site for a game or a series of games, possibly called "Fiddlebops" or "Sprunki".

The key technologies and architectural patterns are:

*   **Framework**: Astro
*   **UI**: React components are used within the Astro project, along with Tailwind CSS for styling, complemented by `shadcn/ui` components.
*   **Styling**: Tailwind CSS, with a custom theme defined in `tailwind.config.mjs`.
*   **Content**: Content is managed through Astro's Content Collections. Game data is stored in Markdown files (`src/content/games/`), while UI text (i18n) and other static data are stored in JSON files (`src/content/i18nUI/` and `src/content/staticData/`).
*   **Internationalization (i18n)**: The site is configured for 7 languages (`en`, `zh`, `es`, `fr`, `de`, `ja`, `ko`) using Astro's built-in i18n routing. The default language is English (`en`), which does not have a path prefix.
*   **TypeScript**: The project is configured with a strict TypeScript setup, using path aliases for cleaner imports.

## Building and Running

The project uses `npm` as the package manager. Key commands are defined in the `scripts` section of `package.json`.

*   **To start the development server:**
    ```bash
    npm run dev
    ```

*   **To build the project for production:**
    ```bash
    npm run build
    ```

*   **To preview the production build locally:**
    ```bash
    npm run preview
    ```

## Development Conventions

### Content Management

*   **Game Content**: All game-related content is stored as Markdown files in `src/content/games/`. The schema for this content is defined in `src/content/config.ts` within the `gamesCollection`.
*   **UI Translations**: All UI text (like button labels, section titles, etc.) is managed in JSON files inside `src/content/i18nUI/`. Each language has its own JSON file (e.g., `en.json`, `zh.json`). The structure of these files is strictly defined by the `i18nUICollection` schema in `src/content/config.ts`.
*   **Static Data**: General, non-translatable data used across the site is stored in `src/content/staticData/`.

### Internationalization (i18n)

*   The project has a strong focus on maintaining consistency across different language versions of the site.
*   There are custom scripts to validate the content and translations.
*   **`npm run i18n:validate`**: This script checks for consistency in translations.
*   **`validate-multilingual-consistency.js`**: This is a custom script that ensures certain fields (like `category`, `image`, `iframe`) are identical across all language versions of a game's content file. It also validates the slug format for each language.

### Code Structure

*   **Pages**: Astro pages are located in `src/pages/`.
*   **Layouts**: Base layouts are in `src/layouts/`.
*   **Components**: Reusable components (both Astro and React) are in `src/components/`.
*   **Utilities**: Helper functions and utilities are located in `src/utils/`.
*   **i18n Logic**: Core i18n configuration and utility functions are in `src/i18n/`.

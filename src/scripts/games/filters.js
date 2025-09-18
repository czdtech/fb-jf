/**
 * Game list filters: search, category filter, sort, clear.
 * DOM contracts (must exist in the same document):
 * - #game-search (input[type=search])
 * - #category-select (select)
 * - #sort-select (select)
 * - #clear-filters (button)
 * - [data-game-grid] (container)
 * - [data-game-card] (each card, with data-game-title and data-game-category)
 * - .results-info p (text node for count)
 */

function initGameFilters() {
  const searchInput = /** @type {HTMLInputElement|null} */(document.getElementById('game-search'));
  const categorySelect = /** @type {HTMLSelectElement|null} */(document.getElementById('category-select'));
  const sortSelect = /** @type {HTMLSelectElement|null} */(document.getElementById('sort-select'));
  const clearFiltersBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('clear-filters'));

  const filterGames = (searchTerm, category) => {
    const gameCards = document.querySelectorAll('[data-game-card]');
    let visibleCount = 0;

    gameCards.forEach((card) => {
      const title = (card.getAttribute('data-game-title') || '').toLowerCase();
      const gameCategory = (card.getAttribute('data-game-category') || '').toLowerCase();

      const matchesSearch = !searchTerm || title.includes(searchTerm) || gameCategory.includes(searchTerm);
      const matchesCategory = !category || category === 'all' || gameCategory === category;

      if (matchesSearch && matchesCategory) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    updateResultsCount(visibleCount);
  };

  const sortGames = (sortBy) => {
    const gameGrid = document.querySelector('[data-game-grid]');
    if (!gameGrid) return;

    const gameCards = Array.from(gameGrid.querySelectorAll('[data-game-card]'));

    gameCards.sort((a, b) => {
      const titleA = a.getAttribute('data-game-title') || '';
      const titleB = b.getAttribute('data-game-title') || '';

      switch (sortBy) {
        case 'name':
          return titleA.localeCompare(titleB);
        case 'name-desc':
          return titleB.localeCompare(titleA);
        case 'newest':
        case 'rating':
        case 'featured':
        default:
          return 0; // keep original order
      }
    });

    gameCards.forEach((card) => gameGrid.appendChild(card));
  };

  const showAllGames = () => {
    const gameCards = document.querySelectorAll('[data-game-card]');
    gameCards.forEach((card) => {
      card.style.display = '';
    });
    updateResultsCount(gameCards.length);
  };

  const updateResultsCount = (count) => {
    const resultsInfo = document.querySelector('.results-info p');
    if (resultsInfo) {
      resultsInfo.textContent = `Showing ${count} games`;
    }
  };

  // Wire events
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = /** @type {HTMLInputElement} */(e.target).value.toLowerCase();
      filterGames(term, categorySelect?.value);
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      const category = /** @type {HTMLSelectElement} */(e.target).value;
      filterGames((searchInput?.value || '').toLowerCase(), category);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const sortBy = /** @type {HTMLSelectElement} */(e.target).value;
      sortGames(sortBy);
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categorySelect) categorySelect.selectedIndex = 0;
      if (sortSelect) sortSelect.selectedIndex = 0;
      showAllGames();
    });
  }
}

// Self-initialize safely
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameFilters, { once: true });
  } else {
    initGameFilters();
  }
}

export {}; // keep as module


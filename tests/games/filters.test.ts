/**
 * Game filters module tests
 */

describe('games/filters', () => {
  beforeEach(async () => {
    history.replaceState(null, '', '/games/');
    document.body.innerHTML = `
      <input id="game-search" />
      <select id="category-select">
        <option value="all">All</option>
        <option value="beats">Beats</option>
        <option value="effects">Effects</option>
      </select>
      <select id="sort-select">
        <option value="featured">Featured</option>
        <option value="name">Name</option>
        <option value="name-desc">Name Z-A</option>
      </select>
      <button id="clear-filters">Clear</button>
      <div class="results-info"><p></p></div>
      <div data-game-grid>
        <div data-game-card data-game-title="Alpha" data-game-category="beats"></div>
        <div data-game-card data-game-title="Bravo" data-game-category="effects"></div>
        <div data-game-card data-game-title="Charlie" data-game-category="beats"></div>
      </div>
    `;

    await import('@/scripts/games/filters.js');
  });

  test('search filters cards and syncs URL', () => {
    const search = document.getElementById('game-search') as HTMLInputElement;
    search.value = 'br';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(location.search).toContain('q=br');

    const cards = [...document.querySelectorAll('[data-game-card]')] as HTMLElement[];
    const visible = cards.filter((c) => c.style.display !== 'none');
    expect(visible).toHaveLength(1);
  });

  test('category change updates URL', () => {
    const select = document.getElementById('category-select') as HTMLSelectElement;
    select.value = 'effects';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(location.search).toContain('cat=effects');
  });

  test('sort change updates URL', () => {
    const select = document.getElementById('sort-select') as HTMLSelectElement;
    select.value = 'name';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(location.search).toContain('sort=name');
  });

  test('clear filters resets URL and shows all', () => {
    const btn = document.getElementById('clear-filters') as HTMLButtonElement;
    btn.click();
    expect(location.search).toBe('');
    const cards = [...document.querySelectorAll('[data-game-card]')] as HTMLElement[];
    const visible = cards.filter((c) => c.style.display !== 'none');
    expect(visible).toHaveLength(3);
  });
});


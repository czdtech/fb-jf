// Jest setup file
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
};

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock window.location for URL tests
delete window.location;
window.location = {
  pathname: "/",
  href: "https://www.playfiddlebops.com/",
  origin: "https://www.playfiddlebops.com",
};

// Mock process.memoryUsage for performance tests
if (typeof process !== "undefined") {
  process.memoryUsage = jest.fn(() => ({
    rss: 50 * 1024 * 1024,
    heapTotal: 30 * 1024 * 1024,
    heapUsed: 20 * 1024 * 1024,
    external: 5 * 1024 * 1024,
    arrayBuffers: 1 * 1024 * 1024,
  }));
}

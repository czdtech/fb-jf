import { getSiteUrl } from '@/utils/site';

describe('getSiteUrl', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('falls back to default when env not set', () => {
    delete process.env.PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe('https://www.playfiddlebops.com');
  });

  test('uses PUBLIC_SITE_URL and strips trailing slash', () => {
    process.env.PUBLIC_SITE_URL = 'https://example.com/';
    expect(getSiteUrl()).toBe('https://example.com');
  });
});


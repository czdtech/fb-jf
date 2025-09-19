import { isHostnameWhitelisted, computeSandboxValue } from '@/utils/iframe-security';

describe('iframe security allowlist', () => {
  test('allows whitelisted host and subdomains', () => {
    expect(isHostnameWhitelisted('https://turbowarp.org/foo')).toBe(true);
    expect(isHostnameWhitelisted('https://projects.turbowarp.org/bar')).toBe(true);
    expect(isHostnameWhitelisted('https://example.com/')).toBe(false);
  });

  test('sandbox adds same-origin only for whitelisted', () => {
    const base = 'allow-scripts allow-forms allow-popups allow-presentation';
    expect(computeSandboxValue('https://evil.example/')).toBe(base);
    expect(computeSandboxValue('https://minijuegos.com/embed')).toContain('allow-same-origin');
  });
});


/**
 * Iframe 安全策略工具（仅内部使用）
 * - 白名单主机名判定
 * - sandbox 值计算（基于白名单放宽 same-origin）
 */

const iframeWhitelistHosts = [
  "turbowarp.org",
  "minijuegos.com",
  "kdata1.com",
  // 放宽至所有 Netlify 预览/部署子域
  "netlify.app",
] as const;

export function isHostnameWhitelisted(urlString: string): boolean {
  try {
    if (!urlString) return false;
    const hostname = new URL(urlString).hostname;
    return iframeWhitelistHosts.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

export function computeSandboxValue(src: string): string {
  const base = "allow-scripts allow-forms allow-popups allow-presentation";
  return isHostnameWhitelisted(src) ? `${base} allow-same-origin` : base;
}


export function mergeConfig<TConfig extends Record<string, unknown>>(
  defaultConfig: TConfig,
  config: Partial<TConfig> = {}
): TConfig {
  return { ...defaultConfig, ...config };
}


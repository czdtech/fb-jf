# Astro i18n测试配置

## Jest配置

```json
{
  "name": "fiddlebops-i18n-tests",
  "version": "1.0.0",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testMatch='**/*.integration.test.ts'",
    "test:unit": "jest --testMatch='**/*.test.ts' --testPathIgnorePatterns='**/integration.test.ts'"
  },
  "devDependencies": {
    "@types/jest": "^29.5.8",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "jest-environment-jsdom": "^29.7.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
    "moduleNameMapping": {
      "^@/(.*)$": "<rootDir>/src/$1",
      "^astro:content$": "<rootDir>/src/utils/__mocks__/astro-content.ts"
    },
    "testMatch": [
      "**/__tests__/**/*.test.ts"
    ],
    "collectCoverageFrom": [
      "src/utils/i18n.ts",
      "src/utils/hreflang.ts",
      "src/pages/[slug].astro"
    ],
    "coverageReporters": ["text", "html", "lcov"],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 85,
        "lines": 85,
        "statements": 85
      }
    }
  }
}
```

## Mock文件设置

```typescript
// src/utils/__mocks__/astro-content.ts
export const getCollection = jest.fn(() => Promise.resolve([]));

export type CollectionEntry<T> = {
  id: string;
  slug: string;
  body: string;
  collection: T;
  data: any;
  render: () => Promise<{ Content: () => any }>;
};
```

## 测试运行指南

### 安装依赖
```bash
npm install --save-dev @types/jest jest ts-jest jest-environment-jsdom
```

### 运行所有测试
```bash
npm run test
```

### 运行特定测试文件
```bash
npm test -- --testNamePattern="i18n工具函数测试"
npm test -- --testNamePattern="URL路由和语言检测测试"
```

### 运行覆盖率测试
```bash
npm run test:coverage
```

### 监听模式开发
```bash
npm run test:watch
```

## 测试文件说明

### 1. `i18n.test.ts` - 核心i18n工具函数测试
- **目标**: 验证多语言内容加载和静态路径生成
- **覆盖**: `getLocalizedGameContent`, `generateMultiLanguageStaticPaths`, 路径工具函数
- **关键测试**: fallback机制、错误处理、性能验证

### 2. `url-routing.test.ts` - URL路由和语言检测测试  
- **目标**: 验证多语言URL解析和路径生成
- **覆盖**: `extractLocaleFromPath`, `getGameLocalizedPath`, 语言验证
- **关键测试**: 边缘情况处理、SEO友好URL、语言切换流程

### 3. `content-translation.test.ts` - 内容加载和翻译测试
- **目标**: 验证翻译内容质量和fallback机制
- **覆盖**: 内容本地化、翻译完整性、质量检查
- **关键测试**: 翻译一致性、SEO本地化、性能优化

### 4. `seo-hreflang.test.ts` - SEO和hreflang测试
- **目标**: 验证SEO元数据和多语言链接生成
- **覆盖**: `generateHreflangLinks`, SEO标准合规性
- **关键测试**: hreflang准确性、搜索引擎优化、国际化标准

### 5. `page-integration.test.ts` - 页面集成测试
- **目标**: 验证完整页面渲染和组件集成
- **覆盖**: [slug].astro页面逻辑、组件交互
- **关键测试**: 数据流、用户体验、响应式设计

### 6. `performance-build.test.ts` - 性能和构建测试
- **目标**: 验证构建性能和生产环境优化
- **覆盖**: 构建产物、Web Vitals、加载性能
- **关键测试**: Core Web Vitals、构建效率、移动端优化

## 测试数据说明

### Mock游戏数据结构
```typescript
interface MockGame {
  id: string;           // 'en/game-slug.md'
  slug: string;         // 'game-slug'
  data: {
    title: string;
    description: string;
    image: string;
    category: string;
    meta?: {
      title: string;
      description: string;
      ogImage: string;
    };
    seo?: {
      title: string;
      description: string;
      keywords: string;
    };
  };
}
```

### 支持的语言配置
```typescript
const supportedLocales = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];
```

## 性能基准

### 构建性能目标
- **单语言页面生成**: < 200ms
- **多语言静态路径生成**: < 5秒
- **内存使用增长**: < 100MB
- **增量构建时间**: < 总构建时间的20%

### 加载性能目标
- **FCP (移动端)**: < 2.5秒
- **LCP (移动端)**: < 2.5秒  
- **CLS**: < 0.1
- **FID**: < 100ms

### 页面大小目标
- **单页面大小**: 30-50kB (gzipped)
- **多语言页面大小差异**: < 5kB
- **资源共享率**: > 80%

## CI/CD集成

### GitHub Actions配置
```yaml
name: i18n Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## 故障排除

### 常见问题
1. **Mock模块未找到**: 检查`moduleNameMapping`配置
2. **Astro环境模拟失败**: 确保正确mock `astro:content`
3. **异步测试超时**: 增加Jest超时设置或优化mock数据

### 调试技巧
```typescript
// 启用详细日志
console.log('[DEBUG]', '测试数据:', mockData);

// 性能监控
const startTime = performance.now();
await testFunction();
console.log('执行时间:', performance.now() - startTime, 'ms');
```

这套测试方案提供了完整的i18n功能验证，确保多语言游戏页面在生产环境中的可靠性和性能。
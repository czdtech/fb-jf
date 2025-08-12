# Requirements Specification - Astro i18n Slug Integration

## Problem Statement
- **Business Issue**: 单游戏页面([slug].astro)未集成多语言支持，限制了国际用户体验和SEO性能
- **Current State**: 游戏页面仅支持英文路径(/sprunki-retake/)，多语言用户无法访问本地化内容
- **Expected Outcome**: 实现完整的多语言游戏页面系统，支持/sprunki-retake/和/zh/sprunki-retake/等多语言URL
- **Mobile Context**: 优化移动端多语言切换体验，支持触屏友好的语言选择和页面导航

## Solution Overview
- **Approach**: 基于Astro i18n系统的Content Collections多语言架构重构，实现预生成静态多语言页面
- **Core Changes**: 重构内容架构为语言目录分离模式，修改[slug].astro支持getCurrentLocale()，集成Claude AI翻译流程
- **Success Criteria**: 所有游戏页面支持7种语言访问，SEO完全本地化，页面加载速度<3s(移动端)
- **Performance Budget**: 移动端LCP<2.5s，CLS<0.1，FID<100ms

## Technical Implementation

### Mobile-First Design Constraints
- **Viewport Strategy**: 保持现有响应式设计(320px移动端起)，语言切换组件触屏优化
- **Touch Targets**: 语言选择器按钮最小44px，支持手势导航
- **Performance Budget**: 多语言内容预生成，避免运行时翻译延迟
- **Network Adaptability**: 支持离线浏览已访问的多语言页面

### Database Changes
- **Content Collections Schema**: 无需修改数据库表结构，基于文件系统的Content Collections
- **Migration Scripts**: 
```bash
# 创建多语言目录结构
mkdir -p src/content/games/{zh,de,fr,es,ja,ko}
# 移动现有英文内容到en目录
mv src/content/games/*.md src/content/games/en/
```
- **Mobile Optimization**: 无额外索引需求，静态文件系统访问

### Code Changes
- **Files to Modify**:
  - `src/pages/[slug].astro` - 集成getCurrentLocale()和多语言内容加载
  - `src/content/config.ts` - 保持现有schema，无需修改
  - `src/utils/i18n.ts` - 添加getLocalizedGameContent()辅助函数
- **New Files**:
  - `src/content/games/{locale}/` - 各语言游戏内容目录
  - `.claude/game-translation-prompt.md` - Claude翻译专用提示词
- **Function Signatures**:
```typescript
// 新增辅助函数
export async function getLocalizedGameContent(slug: string, locale: string): Promise<CollectionEntry<'games'> | null>
export async function getStaticPathsI18n(): Promise<Array<{params: {slug: string}, props: {game: any, locale: string}}>>
```
- **Mobile Components**: 保持现有Navigation组件的语言切换功能

### API Changes
- **Endpoints**: 无需API端点修改，基于静态文件系统
- **Request/Response**: 通过Astro路由系统自动处理多语言请求
- **Validation Rules**: 文件存在性检查和locale参数验证
- **Caching Strategy**: Astro静态生成自动缓存，CDN友好

### Frontend Mobile Implementation
- **Responsive Strategy**: 保持现有mobile-first CSS，language-switcher组件触屏优化
- **Touch Interactions**: 语言切换保持现有手势支持
- **Performance Optimization**: 
  - 预生成所有语言版本页面
  - 图片资源共享(无需本地化)
  - 代码分割保持现有策略
- **PWA Features**: 支持离线访问已缓存的多语言页面

### Configuration Changes
- **Settings**: 
```typescript
// astro.config.mjs 已正确配置
i18n: {
  defaultLocale: "en",
  locales: ["en", "zh", "es", "fr", "de", "ja", "ko"],
  routing: { prefixDefaultLocale: false }
}
```
- **Environment Variables**: 无需新增环境变量
- **Feature Flags**: 无需功能开关
- **Build Optimization**: 预生成策略，构建时间可能增加但运行时性能最优

## Implementation Sequence

### Phase 1: Content Structure Migration (Mobile Core Foundation)
1. **创建多语言目录结构**
   ```bash
   mkdir -p src/content/games/{en,zh,de,fr,es,ja,ko}
   mv src/content/games/*.md src/content/games/en/
   ```
2. **修改[slug].astro支持多语言路由**
   ```typescript
   // 集成getCurrentLocale()
   const currentLocale = getCurrentLocale(Astro.url);
   const gameContent = await getLocalizedGameContent(params.slug, currentLocale);
   ```
3. **创建getLocalizedGameContent()辅助函数**
4. **修改getStaticPaths()支持多语言路径生成**

### Phase 2: AI Translation Integration (Performance & Content)
1. **创建Claude游戏翻译提示词模板**
2. **批量翻译游戏内容文件(优先级: zh > es > fr > de > ja > ko)**
3. **实现fallback机制(缺失翻译时显示英文内容)**
4. **验证所有语言路径正确生成**

### Phase 3: Testing & Optimization (Enhancement & Mobile Testing)
1. **多语言SEO验证(hreflang, canonical, meta)**
2. **移动端语言切换体验测试**
3. **性能基准测试(LCP, CLS, FID)**
4. **跨浏览器兼容性验证**

每个阶段都能独立部署和在移动设备上测试。

## Mobile Validation Plan
- **Device Testing**: iOS Safari(iPhone 12+), Chrome Mobile(Android 10+), 测试所有语言页面
- **Performance Testing**: 
  - Core Web Vitals验证: LCP<2.5s, FID<100ms, CLS<0.1
  - 移动网络测试: 3G/4G环境下页面加载时间
- **Accessibility Testing**: VoiceOver/TalkBack支持多语言内容朗读
- **Touch Interaction Testing**: 语言切换按钮响应性，手势导航流畅性
- **Network Conditions**: 离线模式下已访问页面可用性
- **Business Logic Verification**: 
  - URL结构正确: /sprunki-retake/ vs /zh/sprunki-retake/
  - SEO元数据完整翻译验证
  - 相关游戏推荐多语言一致性

## Game Translation Prompt Template

### FiddleBops游戏内容专业翻译提示词

```markdown
# FiddleBops游戏内容翻译专家

你是一位专业的游戏本地化翻译专家，专门负责FiddleBops音乐创作游戏网站的内容翻译。

## 翻译任务
将以下英文游戏内容翻译为{TARGET_LANGUAGE}，保持游戏的趣味性和吸引力。

## 翻译准则

### 核心原则
- **保持游戏性**: 翻译要体现游戏的乐趣和互动性
- **用户友好**: 使用目标语言用户熟悉的表达方式
- **SEO优化**: 标题和描述要适合搜索引擎优化
- **文化适配**: 考虑目标文化背景，避免文化冲突

### 专业术语处理
- **音乐术语**: beat(节拍), rhythm(节奏), melody(旋律) - 使用标准音乐术语翻译
- **游戏术语**: gameplay(玩法), character(角色), level(关卡) - 保持游戏行业惯用翻译
- **技术术语**: drag-and-drop(拖放), interactive(互动) - 使用技术领域标准翻译
- **品牌名称**: Sprunki, Incredibox, FiddleBops等品牌名保持英文原文

### 内容类型处理

#### SEO元数据翻译
- **title**: 简洁有力，包含关键游戏名称，长度控制在60字符内
- **description**: 吸引用户点击，突出游戏特色，长度控制在160字符内  
- **keywords**: 使用目标语言的搜索关键词，包含游戏类型词汇

#### 游戏描述翻译
- **保持热情**: 使用积极正面的语调
- **强调特色**: 突出游戏的独特卖点和创新功能
- **用户导向**: 从玩家角度描述游戏体验

#### 玩法说明翻译
- **步骤清晰**: 确保操作步骤逻辑清楚
- **动词准确**: 使用精确的动作描述词汇
- **友好提示**: 适当添加鼓励性语言

### 语言特色要求

#### 中文(zh)翻译
- 使用简体中文
- 语调活泼但不过于幼稚
- 适当使用网络流行词汇增加亲和力
- 避免过于正式的书面语

#### 西班牙语(es)翻译  
- 使用通用西班牙语(避免地区方言)
- 保持热情活跃的拉丁语调
- 游戏术语使用国际通用翻译

#### 其他语言
- 德语: 严谨准确，符合德语语法规范
- 法语: 优雅流畅，注意性别一致性  
- 日语: 使用敬语适度的友好语调
- 韩语: 现代化表达，适合年轻用户群体

## 翻译格式要求

### Frontmatter翻译
```yaml
title: "[翻译的游戏标题]"
description: "[翻译的游戏描述，2-3句话概括]"
meta:
  title: "[SEO优化标题 - 包含'在线玩'等本地化搜索词]"
  description: "[SEO描述 - 突出免费、在线、音乐创作等关键词]"
seo:
  title: "[备用SEO标题]"  
  description: "[备用SEO描述]"
  keywords: "[本地化关键词，逗号分隔]"
```

### Markdown内容翻译
- 保持原有标题结构(## ###)
- 列表格式保持不变
- 强调标记(**bold**)保持原有位置
- 链接地址保持英文不变

## 质量检查清单
- [ ] 游戏名称准确无误
- [ ] 专业术语翻译标准
- [ ] 语调符合目标用户群体
- [ ] SEO元数据长度适当
- [ ] 文化敏感性检查通过
- [ ] 格式标记完整保留

请严格按照以上准则翻译以下内容：

---
[在此处粘贴需要翻译的游戏内容]
---
```

## Detailed Technical Specifications

### Content Collections重构方案

#### 目录结构变更
```
src/content/games/
├── en/                    # 英文内容(现有内容移动)
│   ├── sprunki-retake.md
│   ├── incredibox.md
│   └── ...
├── zh/                    # 中文翻译内容
│   ├── sprunki-retake.md
│   ├── incredibox.md  
│   └── ...
├── es/                    # 西班牙语翻译内容
├── fr/                    # 法语翻译内容
├── de/                    # 德语翻译内容
├── ja/                    # 日语翻译内容
└── ko/                    # 韩语翻译内容
```

#### [slug].astro核心修改
```typescript
// src/pages/[slug].astro 
import { getCurrentLocale } from 'astro:i18n';
import { getLocalizedGameContent } from '@/utils/i18n';

export async function getStaticPaths() {
  const supportedLocales = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];
  const paths = [];
  
  for (const locale of supportedLocales) {
    try {
      const games = await getCollection('games', (entry) => 
        entry.id.startsWith(`${locale}/`) || (locale === 'en' && !entry.id.includes('/'))
      );
      
      for (const game of games) {
        const slug = game.id.replace(`${locale}/`, '');
        paths.push({
          params: { slug },
          props: { game, locale }
        });
      }
    } catch (error) {
      console.warn(`Failed to load games for locale ${locale}:`, error);
    }
  }
  
  return paths;
}

// 页面组件中使用
const { game } = Astro.props;
const currentLocale = getCurrentLocale(Astro.url);
const gameContent = await getLocalizedGameContent(game.slug, currentLocale);
```

#### 辅助函数实现
```typescript
// src/utils/i18n.ts
import { getCollection, type CollectionEntry } from 'astro:content';

export async function getLocalizedGameContent(
  slug: string, 
  locale: string
): Promise<CollectionEntry<'games'> | null> {
  try {
    // 尝试加载指定语言的内容
    const localizedContent = await getCollection('games', (entry) => 
      entry.id === `${locale}/${slug}.md` || entry.slug === slug
    );
    
    if (localizedContent.length > 0) {
      return localizedContent[0];
    }
    
    // Fallback到英文内容
    if (locale !== 'en') {
      const englishContent = await getCollection('games', (entry) => 
        entry.slug === slug && !entry.id.includes('/')
      );
      return englishContent[0] || null;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to load game content for ${slug} in ${locale}:`, error);
    return null;
  }
}

export function getGameLocalizedPath(slug: string, locale: string): string {
  return locale === 'en' ? `/${slug}/` : `/${locale}/${slug}/`;
}
```

### Performance Optimization Strategy

#### 预生成静态页面策略
- **构建时生成**: 所有语言×所有游戏的排列组合页面
- **增量更新**: 仅重新生成内容变更的页面
- **CDN优化**: 静态页面完全可缓存，边缘节点部署

#### 移动端性能优化
- **关键资源优先加载**: hero区域内容优先渲染
- **图片延迟加载**: 保持现有lazy loading策略
- **CSS代码分割**: 按语言分割非关键CSS
- **Service Worker缓存**: 支持离线浏览多语言内容

### SEO完整性保证

#### Hreflang标签生成
```typescript
// 自动生成hreflang标签
const hreflangLinks = supportedLocales.map(locale => ({
  href: locale === 'en' ? `${SITE_URL}/${slug}/` : `${SITE_URL}/${locale}/${slug}/`,
  hreflang: locale
}));
```

#### 本地化SEO元数据
```typescript
// 根据语言动态生成SEO数据
const localizedMeta = {
  title: gameData.meta?.title || `${gameData.title} - ${t('playOnline')} | FiddleBops`,
  description: gameData.meta?.description || `${t('playFree')} ${gameData.title}!`,
  keywords: gameData.seo?.keywords || gameData.title,
  canonical: getGameLocalizedPath(gameData.slug, currentLocale)
};
```

### Error Handling & Fallback Strategy

#### 内容缺失处理
1. **语言级Fallback**: 目标语言不存在时显示英文内容
2. **部分翻译支持**: SEO已翻译但内容未翻译时的混合显示
3. **用户友好提示**: 显示"翻译正在进行中"等提示信息

#### 移动端错误处理
- **网络异常**: 离线模式下显示缓存的多语言内容
- **加载失败**: 优雅降级到基础版本页面
- **触屏异常**: 确保语言切换按钮在各种设备上可用

## Translation Workflow Integration

### Claude AI翻译集成流程
1. **批量内容提取**: 脚本提取所有英文游戏内容的待翻译字段
2. **API调用翻译**: 使用专用翻译prompt调用Claude API
3. **质量检查**: 自动验证翻译内容格式和长度
4. **文件生成**: 自动生成各语言目录下的markdown文件
5. **构建验证**: 确保所有生成的页面可正常访问

### 内容维护策略
- **增量翻译**: 新增游戏时自动触发多语言翻译流程
- **版本同步**: 英文内容更新时标记对应翻译需要更新
- **质量监控**: 定期审查翻译质量和用户反馈

This specification provides a complete mobile-first blueprint for implementing i18n support in the [slug].astro system, with emphasis on performance, user experience, and maintainable architecture.
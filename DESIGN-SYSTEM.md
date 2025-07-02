# FiddleBops 设计系统文档

## 🎵 设计系统概述

**版本**: 1.0.0  
**更新日期**: 2024-12-30  
**核心理念**: "创造音乐，传递快乐" - 通过现代化的视觉语言传达音乐创作的乐趣和自由

### 设计原则

1. **律动感** - 设计元素应体现音乐的节奏和流动性
2. **包容性** - 适合不同音乐背景和技能水平的用户
3. **互动性** - 鼓励用户探索和创造
4. **现代感** - 符合当代数字产品的美学标准
5. **情感连接** - 通过设计传达音乐带来的情感体验

## 🎨 色彩系统

### 主色调 - 音乐紫
基于音乐创作的创意特质，选择紫色作为主色调，体现创造力和想象力。

```css
--color-primary-500: #a855f7    /* 主要操作色 */
--color-primary-600: #9333ea    /* 深度交互色 */
--color-primary-700: #7c3aed    /* 强调色 */
```

### 渐变色系 - 创意光谱
使用渐变色彩创造音乐般的流动感和层次感。

```css
--gradient-primary: linear-gradient(135deg, #9333ea 0%, #ec4899 100%)
--gradient-secondary: linear-gradient(135deg, #06b6d4 0%, #9333ea 100%)
--gradient-tertiary: linear-gradient(135deg, #10b981 0%, #06b6d4 100%)
```

### 功能色彩
```css
--color-success: #10b981    /* 成功状态 */
--color-warning: #f59e0b    /* 警告状态 */
--color-error: #ef4444     /* 错误状态 */
--color-info: #3b82f6      /* 信息状态 */
```

### 玻璃拟态效果
```css
--glass-bg: rgba(255, 255, 255, 0.1)
--glass-border: rgba(255, 255, 255, 0.3)
--glass-backdrop: blur(20px)
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1)
```

## ✍️ 排版系统

### 字体家族
```css
--font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
--font-family-mono: 'Fira Code', 'Monaco', 'Consolas', monospace
```

### 字体大小比例 (1.25 Major Third)
```css
--font-size-xs: 0.75rem     /* 12px */
--font-size-sm: 0.875rem    /* 14px */
--font-size-base: 1rem      /* 16px */
--font-size-lg: 1.125rem    /* 18px */
--font-size-xl: 1.25rem     /* 20px */
--font-size-2xl: 1.5rem     /* 24px */
--font-size-3xl: 1.875rem   /* 30px */
--font-size-4xl: 2.25rem    /* 36px */
--font-size-5xl: 3rem       /* 48px */
```

### 标题系统
```css
h1: var(--font-size-5xl)    /* 48px */
h2: var(--font-size-4xl)    /* 36px */
h3: var(--font-size-3xl)    /* 30px */
h4: var(--font-size-2xl)    /* 24px */
h5: var(--font-size-xl)     /* 20px */
h6: var(--font-size-lg)     /* 18px */
```

## 📏 空间系统

### 基于 8px 网格的间距系统
```css
--space-1: 0.25rem    /* 4px */
--space-2: 0.5rem     /* 8px */
--space-3: 0.75rem    /* 12px */
--space-4: 1rem       /* 16px */
--space-6: 1.5rem     /* 24px */
--space-8: 2rem       /* 32px */
--space-12: 3rem      /* 48px */
--space-16: 4rem      /* 64px */
```

### 容器系统
```css
--container-sm: 640px
--container-md: 768px
--container-lg: 1024px
--container-xl: 1280px
--container-2xl: 1536px
```

## 🎭 组件系统

### 按钮组件

#### 基础按钮
```css
.btn {
  padding: var(--space-3) var(--space-6);
  border-radius: var(--border-radius-lg);
  font-weight: var(--font-weight-medium);
  transition: all var(--duration-200) var(--ease-in-out);
}
```

#### 按钮变体
- **主要按钮**: `.btn-primary` - 使用渐变背景，适用于主要操作
- **次要按钮**: `.btn-secondary` - 透明背景，边框样式
- **玻璃按钮**: `.btn-glass` - 玻璃拟态效果

#### 按钮尺寸
- **小尺寸**: `.btn-sm` - 适用于次要操作
- **默认尺寸**: `.btn` - 标准操作按钮
- **大尺寸**: `.btn-lg` - 突出的主要操作
- **超大尺寸**: `.btn-xl` - 页面级主要操作

### 游戏卡片组件

#### 基础结构
```html
<div class="game-card">
  <div class="game-card-image">
    <img src="game-image.jpg" alt="游戏名称">
    <div class="game-card-overlay">
      <button class="game-card-play-button">▶</button>
    </div>
  </div>
  <div class="game-card-content">
    <h3 class="game-card-title">游戏标题</h3>
    <p class="game-card-description">游戏描述</p>
  </div>
</div>
```

#### 卡片变体
- **网格变体**: `.game-card-grid` - 适用于游戏列表展示
- **侧边栏变体**: `.game-card-sidebar` - 适用于推荐游戏展示
- **特色变体**: `.game-card-featured` - 适用于重点推荐

### 导航组件

#### 导航结构
```html
<header class="header">
  <nav class="nav">
    <a href="/" class="nav-brand">FiddleBops</a>
    <ul class="nav-menu">
      <li><a href="/" class="nav-link">首页</a></li>
      <li><a href="/games/" class="nav-link">游戏</a></li>
    </ul>
  </nav>
</header>
```

### 音频样本组件

#### 结构设计
```html
<div class="sound-sample">
  <div class="sound-sample-image">
    <img src="sample-image.jpg" alt="音频样本">
    <div class="sound-sample-overlay">
      <button class="sound-sample-play">▶</button>
    </div>
  </div>
  <h4 class="sound-sample-title">Beat 1</h4>
  <audio src="beat1.wav"></audio>
</div>
```

## 🎬 动效系统

### 动效时长
```css
--duration-150: 150ms    /* 快速反馈 */
--duration-200: 200ms    /* 标准过渡 */
--duration-300: 300ms    /* 舒缓过渡 */
--duration-500: 500ms    /* 强调动效 */
```

### 缓动函数
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)      /* 标准过渡 */
--ease-rhythm: cubic-bezier(0.25, 0.46, 0.45, 0.94)  /* 音乐律动 */
--ease-beat: cubic-bezier(0.68, -0.55, 0.265, 1.55)   /* 强烈节拍 */
```

### 微交互动效

#### 悬停效果
- 卡片悬停：向上移动 4px，增加阴影
- 按钮悬停：向上移动 1px，增加发光效果
- 链接悬停：下划线从左到右展开

#### 点击效果
- 按钮点击：缩小到 98% 再恢复
- 卡片点击：3D 倾斜效果

#### 音乐主题动效
- 律动动画：模拟音乐节拍的缩放效果
- 波浪扩散：音频播放时的同心圆扩散
- 浮动音符：页面背景的装饰性音符动画

## 🎯 状态系统

### 组件状态
- **默认状态**: 基础展示状态
- **悬停状态**: 鼠标悬停时的视觉反馈
- **激活状态**: 点击或选中时的状态
- **禁用状态**: 不可交互时的灰化状态
- **加载状态**: 内容加载时的占位状态

### 状态转换
所有状态变化都使用平滑过渡，时长为 200-300ms，缓动函数为 `ease-in-out`。

## 🔧 工具类

### 渐变背景类
```css
.bg-gradient-primary    /* 主渐变 */
.bg-gradient-secondary  /* 次渐变 */
.bg-gradient-tertiary   /* 第三渐变 */
```

### 玻璃拟态类
```css
.glass         /* 标准玻璃效果 */
.glass-strong  /* 强玻璃效果 */
```

### 发光效果类
```css
.glow         /* 标准发光 */
.glow-strong  /* 强发光 */
```

### 过渡效果类
```css
.transition-all       /* 全属性过渡 */
.transition-colors    /* 颜色过渡 */
.transition-transform /* 变换过渡 */
.transition-rhythm    /* 音乐律动过渡 */
```

## 📱 响应式设计

### 断点系统
```css
--breakpoint-sm: 640px   /* 小屏幕 */
--breakpoint-md: 768px   /* 中等屏幕 */
--breakpoint-lg: 1024px  /* 大屏幕 */
--breakpoint-xl: 1280px  /* 超大屏幕 */
```

### 响应式规则
- 移动优先的设计方法
- 字体大小在小屏幕上适当缩小
- 卡片布局在小屏幕上变为单列
- 导航在移动端变为汉堡菜单

## ♿ 可访问性

### 色彩对比度
- 所有文本与背景的对比度符合 WCAG 2.1 AA 标准
- 主色调与白色背景对比度 > 4.5:1
- 深色文本与浅色背景对比度 > 7:1

### 键盘导航
- 所有交互元素支持键盘访问
- 焦点状态有明显的视觉指示
- 逻辑的 Tab 顺序

### 屏幕阅读器
- 所有图片都有 alt 属性
- 语义化的 HTML 结构
- 适当的 ARIA 标签

## 🌙 暗色模式

### 暗色模式适配
```css
@media (prefers-color-scheme: dark) {
  :root {
    --glass-bg: rgba(0, 0, 0, 0.2);
    --glass-border: rgba(255, 255, 255, 0.2);
  }
}
```

## 🚀 使用指南

### 1. 引入设计系统
```html
<link rel="stylesheet" href="/src/styles/design-tokens.css">
<link rel="stylesheet" href="/src/styles/components.css">
<script src="/src/scripts/interactions.js"></script>
```

### 2. 基础页面结构
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FiddleBops</title>
  <link rel="stylesheet" href="/src/styles/design-tokens.css">
  <link rel="stylesheet" href="/src/styles/components.css">
</head>
<body>
  <header class="header">
    <!-- 导航组件 -->
  </header>
  
  <main>
    <section class="hero">
      <!-- 主要内容 -->
    </section>
  </main>
  
  <footer class="footer">
    <!-- 页脚内容 -->
  </footer>
  
  <script src="/src/scripts/interactions.js"></script>
</body>
</html>
```

### 3. 组件使用示例

#### 创建主要按钮
```html
<button class="btn btn-primary">开始创作</button>
```

#### 创建游戏卡片
```html
<div class="game-card game-card-grid">
  <div class="game-card-image">
    <img src="game.jpg" alt="游戏名称">
    <div class="game-card-overlay">
      <button class="game-card-play-button">▶</button>
    </div>
  </div>
  <div class="game-card-content">
    <h3 class="game-card-title">游戏名称</h3>
    <p class="game-card-description">游戏描述</p>
  </div>
</div>
```

## 🔄 更新日志

### v1.0.0 (2024-12-30)
- ✨ 初始设计系统发布
- 🎨 完整的色彩系统和设计令牌
- 🧩 核心组件库实现
- 🎭 音乐主题动效系统
- 📱 响应式设计支持
- ♿ 可访问性规范

## 📞 支持与反馈

如有任何问题或建议，请联系设计团队：
- 项目文档：查看项目 README.md
- 组件示例：访问 Storybook (如果可用)
- 问题反馈：通过 GitHub Issues 提交

---

**让我们一起创造美妙的音乐体验！** 🎵✨
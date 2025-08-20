# 多语言内容管理最佳实践

## 概述

本文档提供了为多语言网站管理内容的最佳实践，确保所有语言版本的数据保持一致性和质量。

## 数据一致性要求

### 必须保持一致的字段

以下字段在所有语言版本中必须保持完全一致：

- `category` - 游戏分类
- `rating.score` - 评分分数
- `rating.maxScore` - 最大评分
- `rating.votes` - 投票数
- `rating.stars` - 星级评分
- `image` - 图片路径
- `iframe` - 嵌入式游戏链接

### Slug命名标准

- **英文版本**: 直接使用游戏名称，如 `sprunki-craft`
- **其他语言**: 使用 `{lang}-{game-name}` 格式，如 `de-sprunki-craft`

支持的语言代码：
- `de` - 德语
- `es` - 西班牙语
- `fr` - 法语
- `ja` - 日语
- `ko` - 韩语
- `zh` - 中文

## 内容管理流程

### 1. 新增游戏

1. 首先创建英文版本作为基准
2. 确保所有必要字段正确填写
3. 为其他语言创建翻译版本
4. 运行验证脚本确保一致性

### 2. 更新现有内容

1. 以英文版本为主要参考
2. 更新所有语言版本的一致性字段
3. 运行批量修复脚本同步数据
4. 验证修改结果

### 3. 质量控制

定期运行以下脚本进行质量检查：

```bash
# 标准化slug格式
node standardize-slugs.js

# 批量修复数据不一致问题
node fix-multilingual-consistency.js

# 验证所有语言版本的一致性
node validate-multilingual-consistency.js
```

## 自动化工具

### 可用脚本

1. **standardize-slugs.js** - 标准化slug命名格式
2. **fix-multilingual-consistency.js** - 批量修复数据不一致
3. **validate-multilingual-consistency.js** - 验证数据一致性

### 集成到构建流程

建议将验证脚本集成到CI/CD流程中：

```yaml
# .github/workflows/content-validation.yml
name: Content Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: node validate-multilingual-consistency.js
```

## 文件组织结构

```
src/content/games/
├── game1.md                    # 英文版本
├── game2.md
├── de/                        # 德语版本
│   ├── game1.md
│   └── game2.md
├── es/                        # 西班牙语版本
│   ├── game1.md
│   └── game2.md
└── ...                        # 其他语言
```

## 常见问题和解决方案

### 1. 数据不一致

**问题**: 不同语言版本的评分、分类等信息不一致

**解决方案**:
```bash
node fix-multilingual-consistency.js
```

### 2. Slug格式错误

**问题**: 语言版本的slug缺少语言前缀

**解决方案**:
```bash
node standardize-slugs.js
```

### 3. 新增游戏时遗漏字段

**问题**: 创建新游戏时忘记设置必要字段

**解决方案**: 
- 使用现有游戏作为模板
- 运行验证脚本检查遗漏字段

## 维护指南

### 日常维护任务

1. **每日**: 运行验证脚本检查新增内容
2. **每周**: 批量修复发现的不一致问题
3. **每月**: 检查和更新自动化脚本

### 内容更新原则

1. **英文版本优先**: 所有更改先在英文版本进行
2. **批量同步**: 使用自动化脚本同步数据到其他语言
3. **验证确认**: 每次更改后验证一致性

### 错误处理

遇到错误时的处理流程：

1. 检查控制台错误信息
2. 确认文件路径和格式正确
3. 使用验证脚本定位具体问题
4. 手动修复或使用批量修复脚本

## 性能优化建议

### 1. 批量操作

- 避免单个文件逐一处理
- 使用批量脚本进行大规模更新

### 2. 缓存策略

- 实现构建时验证，避免运行时检查
- 使用Git hooks在提交时进行验证

### 3. 监控和告警

- 设置自动化监控脚本
- 在发现不一致时发送告警通知

## 总结

遵循这些最佳实践可以确保：

- 所有语言版本数据的一致性
- 高效的内容管理流程
- 减少人为错误
- 提高内容质量

定期使用提供的自动化工具进行维护，确保多语言内容始终保持高质量和一致性。
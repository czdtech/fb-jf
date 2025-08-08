#!/usr/bin/env bash

# Task 20 资源清理脚本
echo "🧹 开始清理Task 20资源..."

# 保留重要文档和最终报告
KEEP_FILES=(
  "MIGRATION-GUIDE.md"
  "TASK_17_FINAL_REPORT.md"
  "TASK_18_ACCESSIBILITY_SUMMARY.md"
  "TASK_19_BROWSER_COMPATIBILITY_SUMMARY.md"
  "TASK_20_INTEGRATION_SUMMARY.md"
  "TASK_20_FINAL_PROJECT_REPORT.md"
)

# 移除临时测试报告
echo "清理临时测试报告..."
rm -f TASK_1*_COMPLETION_REPORT.md
rm -f TASK_17_PERFORMANCE_REPORT.json
rm -f TASK_18_ACCESSIBILITY_REPORT.json
rm -f TASK_18_COMPLETION_REPORT.md
rm -f TASK_19_BROWSER_COMPATIBILITY_REPORT.json
rm -f TASK_20_INTEGRATION_TEST_REPORT.json
rm -f BUNDLE_ANALYSIS_REPORT.md
rm -f bundle-analysis-report.json

# 清理测试页面（保留browser-compatibility.astro作为工具页面）
echo "清理测试页面..."
find src/pages -name "*test*.astro" -not -name "browser-compatibility.astro" -delete || true
find src/pages -name "*debug*.astro" -delete || true
find src/pages -name "*validation*.astro" -delete || true

# 清理临时组件
echo "清理临时测试组件..."
find src/components -name "*test*.astro" -delete || true
find src/components/ui -name "*test*.astro" -delete || true
find src/components/ui -name "task-*.md" -delete || true

# 清理临时脚本
echo "清理临时脚本..."
rm -f scripts/integration-test.js
rm -f scripts/bundle-analyzer.js
rm -f scripts/lighthouse-tester.js

# 清理空目录
echo "清理空目录..."
find src -type d -empty -delete || true

# 统计清理结果
echo "✅ 资源清理完成！"
echo "📁 保留的重要文档："
for file in "${KEEP_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "  - $file"
  fi
done

echo ""
echo "🗑️  已清理临时文件和测试资源"
echo "📊 当前项目状态："
echo "  - 源代码: $(find src -name "*.astro" -o -name "*.tsx" -o -name "*.ts" | wc -l) 个文件"
echo "  - 组件: $(find src/components -name "*.astro" -o -name "*.tsx" | wc -l) 个文件"
echo "  - 页面: $(find src/pages -name "*.astro" | wc -l) 个页面"
echo "  - 样式: $(find src/styles -name "*.css" | wc -l) 个CSS文件"
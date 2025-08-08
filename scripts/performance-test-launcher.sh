#!/bin/bash

# Task 17 Performance Testing Quick Launcher
# 快速启动所有性能测试工具

echo "🚀 Task 17 性能测试工具启动器"
echo "======================================"

# 检查依赖
echo "📋 检查项目依赖..."
if [ ! -f "package.json" ]; then
    echo "❌ 未找到 package.json，请在项目根目录运行"
    exit 1
fi

echo "✅ 项目环境正常"

# 提供选项菜单
echo ""
echo "请选择要执行的测试："
echo "1) 🔍 Bundle大小分析"
echo "2) ⚡ 完整性能测试套件"
echo "3) 🌐 启动性能监控页面"
echo "4) 🎨 Tailwind Purging验证"
echo "5) 📊 查看已有报告"
echo "6) 🧹 清理测试输出"
echo "7) ❌ 退出"

read -p "输入选项 (1-7): " choice

case $choice in
    1)
        echo "🔍 执行Bundle大小分析..."
        npm run test:bundle
        ;;
    2)
        echo "⚡ 执行完整性能测试套件..."
        npm run test:performance
        ;;
    3)
        echo "🌐 启动开发服务器以访问性能监控页面..."
        echo "访问以下URL查看性能测试工具:"
        echo "  - http://localhost:4321/performance-test/"
        echo "  - http://localhost:4321/tailwind-purging-test/"
        echo ""
        echo "按 Ctrl+C 停止服务器"
        npm run dev
        ;;
    4)
        echo "🎨 Tailwind Purging验证"
        echo "请启动开发服务器并访问: http://localhost:4321/tailwind-purging-test/"
        echo "要启动服务器吗? (y/n)"
        read -p "> " start_server
        if [ "$start_server" = "y" ] || [ "$start_server" = "Y" ]; then
            npm run dev
        fi
        ;;
    5)
        echo "📊 查看已有性能报告..."
        echo ""
        if [ -f "TASK_17_COMPLETION_REPORT.md" ]; then
            echo "📋 Task 17 完成报告:"
            head -20 "TASK_17_COMPLETION_REPORT.md"
            echo ""
            echo "完整报告: TASK_17_COMPLETION_REPORT.md"
        else
            echo "❌ 未找到 Task 17 完成报告"
        fi
        
        if [ -f "BUNDLE_ANALYSIS_REPORT.md" ]; then
            echo ""
            echo "📦 Bundle分析报告:"
            head -15 "BUNDLE_ANALYSIS_REPORT.md"
            echo ""
            echo "完整报告: BUNDLE_ANALYSIS_REPORT.md"
        else
            echo "❌ 未找到 Bundle分析报告"
        fi
        
        if [ -f "PERFORMANCE_TEST_REPORT.md" ]; then
            echo ""
            echo "⚡ Lighthouse性能报告:"
            head -15 "PERFORMANCE_TEST_REPORT.md"
            echo ""
            echo "完整报告: PERFORMANCE_TEST_REPORT.md"
        else
            echo "ℹ️  Lighthouse报告未生成 (需要运行 npm run test:lighthouse)"
        fi
        ;;
    6)
        echo "🧹 清理测试输出..."
        echo "要删除以下文件吗?"
        echo "  - TASK_17_COMPLETION_REPORT.md"
        echo "  - BUNDLE_ANALYSIS_REPORT.md"
        echo "  - PERFORMANCE_TEST_REPORT.md"
        echo "  - TASK_17_PERFORMANCE_REPORT.json"
        echo "  - bundle-analysis-report.json"
        echo "  - lighthouse-performance-report.json"
        read -p "确认删除? (y/n): " confirm
        
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            rm -f TASK_17_COMPLETION_REPORT.md
            rm -f BUNDLE_ANALYSIS_REPORT.md  
            rm -f PERFORMANCE_TEST_REPORT.md
            rm -f TASK_17_PERFORMANCE_REPORT.json
            rm -f bundle-analysis-report.json
            rm -f lighthouse-performance-report.json
            echo "✅ 测试输出已清理"
        else
            echo "❌ 取消清理"
        fi
        ;;
    7)
        echo "👋 退出性能测试工具"
        exit 0
        ;;
    *)
        echo "❌ 无效选项，请输入 1-7"
        exit 1
        ;;
esac

echo ""
echo "🎉 Task 17 性能测试完成!"
echo "💡 提示: 重新运行此脚本可执行其他测试"
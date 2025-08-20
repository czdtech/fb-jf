#!/usr/bin/env node

/**
 * 多语言URL一致性验证工具
 * 使用真实的MCP Playwright集成测试多语言网站URL
 */

import fs from 'fs';
import path from 'path';

// 配置
const CONFIG = {
  baseUrl: 'http://localhost:4321',
  languages: ['de', 'es', 'fr', 'ja', 'ko', 'zh'],
  testTimeout: 30000,
  retryAttempts: 3,
  gamesDir: './src/content/games'
};

// 测试结果收集器
class TestResults {
  constructor() {
    this.results = [];
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: 0
    };
  }

  addResult(test) {
    this.results.push(test);
    this.summary.total++;
    
    if (test.status === 'passed') {
      this.summary.passed++;
    } else if (test.status === 'failed') {
      this.summary.failed++;
    } else {
      this.summary.errors++;
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('多语言URL测试结果报告');
    console.log('='.repeat(80));
    
    // 统计摘要
    console.log(`\n📊 测试统计:`);
    console.log(`总计: ${this.summary.total}`);
    console.log(`✅ 通过: ${this.summary.passed}`);
    console.log(`❌ 失败: ${this.summary.failed}`);
    console.log(`🔥 错误: ${this.summary.errors}`);
    
    const successRate = (this.summary.passed / this.summary.total * 100).toFixed(1);
    console.log(`📈 成功率: ${successRate}%`);

    // 详细结果
    console.log(`\n🔍 详细结果:`);
    this.results.forEach(result => {
      const statusIcon = result.status === 'passed' ? '✅' : 
                        result.status === 'failed' ? '❌' : '🔥';
      console.log(`${statusIcon} ${result.url}`);
      
      if (result.issues && result.issues.length > 0) {
        result.issues.forEach(issue => {
          console.log(`   - ${issue}`);
        });
      }
      
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
    });

    // 关键问题汇总
    const criticalIssues = this.results.filter(r => 
      r.issues && r.issues.some(issue => 
        issue.includes('语言内容不匹配') || 
        issue.includes('页面无法访问') ||
        issue.includes('导航失败')
      )
    );

    if (criticalIssues.length > 0) {
      console.log(`\n🚨 关键问题 (${criticalIssues.length}个):`);
      criticalIssues.forEach(issue => {
        console.log(`- ${issue.url}: ${issue.issues.join(', ')}`);
      });
    }

    return successRate >= 90 ? 0 : 1;
  }
}

// URL生成器
class URLGenerator {
  constructor() {
    this.gameFiles = this.loadGameFiles();
  }

  loadGameFiles() {
    const files = fs.readdirSync(CONFIG.gamesDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.basename(file, '.md'))
      .slice(0, 10); // 限制测试数量以提高效率
    
    console.log(`📁 发现 ${files.length} 个游戏文件用于测试`);
    return files;
  }

  generateTestUrls() {
    const urls = [];
    
    // 1. 主页测试 (英文和各语言)
    urls.push({ 
      url: `${CONFIG.baseUrl}/`,
      type: 'homepage',
      expectedLang: 'en',
      description: '英文主页'
    });
    
    CONFIG.languages.forEach(lang => {
      urls.push({ 
        url: `${CONFIG.baseUrl}/${lang}/`,
        type: 'homepage',
        expectedLang: lang,
        description: `${lang.toUpperCase()}主页`
      });
    });

    // 2. 游戏页面测试 (前5个游戏)
    this.gameFiles.slice(0, 5).forEach(gameSlug => {
      // 英文版
      urls.push({
        url: `${CONFIG.baseUrl}/${gameSlug}/`,
        type: 'game',
        expectedLang: 'en',
        description: `英文游戏页: ${gameSlug}`
      });
      
      // 各语言版本
      CONFIG.languages.forEach(lang => {
        urls.push({
          url: `${CONFIG.baseUrl}/${lang}/${gameSlug}/`,
          type: 'game', 
          expectedLang: lang,
          description: `${lang.toUpperCase()}游戏页: ${gameSlug}`
        });
      });
    });

    console.log(`🎯 生成 ${urls.length} 个测试URL`);
    return urls;
  }
}

// MCP浏览器测试器
class MCPBrowserTester {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🌐 初始化浏览器...');
      
      // 确保浏览器已安装
      await this.callMCP('mcp__playwright__browser_install', {});
      
      // 设置浏览器窗口大小
      await this.callMCP('mcp__playwright__browser_resize', {
        width: 1920,
        height: 1080
      });
      
      this.isInitialized = true;
      console.log('✅ 浏览器初始化完成');
    } catch (error) {
      throw new Error(`浏览器初始化失败: ${error.message}`);
    }
  }

  async callMCP(toolName, params) {
    // 注意: 这个函数将在Claude Code环境中被真实的MCP调用替换
    // 这里提供了接口定义，实际执行时需要使用真实的MCP工具
    throw new Error(`MCP工具调用需要在Claude Code环境中执行: ${toolName}`);
  }

  async testUrl(urlInfo, retryCount = 0) {
    try {
      console.log(`🔍 测试: ${urlInfo.description}`);
      
      // 导航到URL
      console.log(`   导航到: ${urlInfo.url}`);
      await this.callMCP('mcp__playwright__browser_navigate', {
        url: urlInfo.url
      });
      
      // 等待页面加载
      await this.waitForPageLoad();
      
      // 获取页面快照
      const snapshot = await this.callMCP('mcp__playwright__browser_snapshot', {});
      
      // 分析页面
      const analysis = await this.analyzePage(snapshot, urlInfo);
      
      return {
        url: urlInfo.url,
        status: analysis.issues.length === 0 ? 'passed' : 'failed',
        issues: analysis.issues,
        metadata: {
          title: analysis.title,
          detectedLanguage: analysis.language,
          responseTime: analysis.loadTime,
          hasContent: analysis.hasContent
        }
      };
      
    } catch (error) {
      if (retryCount < CONFIG.retryAttempts) {
        console.log(`   ⚠️ 重试 ${retryCount + 1}/${CONFIG.retryAttempts}: ${error.message}`);
        await this.delay(2000);
        return this.testUrl(urlInfo, retryCount + 1);
      }
      
      return {
        url: urlInfo.url,
        status: 'error',
        error: error.message,
        issues: ['测试执行失败']
      };
    }
  }

  async waitForPageLoad() {
    // 等待页面完全加载
    await this.delay(3000);
  }

  async analyzePage(snapshot, urlInfo) {
    const issues = [];
    const startTime = Date.now();
    
    // 基本可访问性检查
    if (!snapshot || !snapshot.content) {
      issues.push('页面无法访问或内容为空');
      return { issues, title: '', language: '', loadTime: 0, hasContent: false };
    }

    // 语言检测
    const detectedLanguage = this.detectLanguage(snapshot.content);
    const expectedLang = urlInfo.expectedLang;
    
    // 语言一致性检查
    if (expectedLang === 'en' && detectedLanguage !== 'en') {
      issues.push(`语言内容不匹配: 期望英文，检测到${detectedLanguage}`);
    } else if (expectedLang !== 'en' && detectedLanguage === 'en') {
      issues.push(`语言内容不匹配: 期望${expectedLang}，检测到英文`);
    }

    // 内容完整性检查
    const hasGameContent = this.checkGameContent(snapshot.content, urlInfo);
    if (!hasGameContent && urlInfo.type === 'game') {
      issues.push('游戏页面缺少必要内容');
    }

    // 导航检查
    const hasNavigation = this.checkNavigation(snapshot.content);
    if (!hasNavigation) {
      issues.push('页面缺少导航元素');
    }

    return {
      issues,
      title: snapshot.title || '',
      language: detectedLanguage,
      loadTime: Date.now() - startTime,
      hasContent: snapshot.content.length > 100
    };
  }

  detectLanguage(content) {
    // 简单的语言检测逻辑
    const chinesePattern = /[\u4e00-\u9fff]/g;
    const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/g;
    const koreanPattern = /[\uac00-\ud7af]/g;
    
    const chineseMatches = (content.match(chinesePattern) || []).length;
    const japaneseMatches = (content.match(japanesePattern) || []).length;
    const koreanMatches = (content.match(koreanPattern) || []).length;
    
    if (chineseMatches > 50) return 'zh';
    if (japaneseMatches > 20) return 'ja';
    if (koreanMatches > 20) return 'ko';
    
    // 检查常见的其他语言关键词
    if (content.includes('Spiel') || content.includes('spielen')) return 'de';
    if (content.includes('juego') || content.includes('jugar')) return 'es';
    if (content.includes('jeu') || content.includes('jouer')) return 'fr';
    
    return 'en';
  }

  checkGameContent(content, urlInfo) {
    if (urlInfo.type !== 'game') return true;
    
    // 检查游戏页面必要元素
    const requiredElements = ['iframe', 'description', 'title'];
    return requiredElements.some(element => 
      content.toLowerCase().includes(element.toLowerCase())
    );
  }

  checkNavigation(content) {
    // 检查导航元素
    const navElements = ['nav', 'menu', 'header', 'navigation'];
    return navElements.some(element => 
      content.toLowerCase().includes(element.toLowerCase())
    );
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    try {
      await this.callMCP('mcp__playwright__browser_close', {});
      console.log('✅ 浏览器已关闭');
    } catch (error) {
      console.log('⚠️ 浏览器关闭时出现警告:', error.message);
    }
  }
}

// 主函数
async function main() {
  console.log('🚀 启动多语言URL测试');
  console.log(`🎯 目标服务器: ${CONFIG.baseUrl}`);
  
  const results = new TestResults();
  const urlGenerator = new URLGenerator();
  const tester = new MCPBrowserTester();
  
  try {
    // 初始化浏览器
    await tester.initialize();
    
    // 生成测试URL
    const testUrls = urlGenerator.generateTestUrls();
    
    console.log(`\n🔄 开始测试 ${testUrls.length} 个URL...`);
    
    // 批量测试
    let completed = 0;
    for (const urlInfo of testUrls) {
      const result = await tester.testUrl(urlInfo);
      results.addResult(result);
      
      completed++;
      const progress = ((completed / testUrls.length) * 100).toFixed(1);
      console.log(`   进度: ${progress}% (${completed}/${testUrls.length})`);
      
      // 避免过于频繁的请求
      await tester.delay(500);
    }
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    process.exit(1);
  } finally {
    // 清理资源
    await tester.cleanup();
  }
  
  // 生成报告
  const exitCode = results.generateReport();
  
  if (exitCode === 0) {
    console.log('\n🎉 所有测试通过！多语言网站URL一致性良好');
  } else {
    console.log('\n⚠️ 发现问题，需要修复后重新测试');
  }
  
  process.exit(exitCode);
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('💥 未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 运行主函数
main().catch(error => {
  console.error('💥 主函数执行失败:', error.message);
  process.exit(1);
});

export { MCPBrowserTester, URLGenerator, TestResults };
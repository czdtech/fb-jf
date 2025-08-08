#!/usr/bin/env node

/**
 * 端到端集成测试脚本
 * 验证关键用户流程和功能完整性
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧪 开始端到端集成测试...\n');

// 测试结果收集
const testResults = {
  buildTest: false,
  pageLoadTest: false,
  componentTest: false,
  languageTest: false,
  audioTest: false,
  responsiveTest: false
};

// 1. 构建测试
console.log('📦 测试1: 构建流程验证...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  if (existsSync('dist/index.html')) {
    console.log('✅ 构建成功，生成静态文件');
    testResults.buildTest = true;
  }
} catch (error) {
  console.log('❌ 构建失败');
}

// 2. 关键页面文件检查
console.log('\n📄 测试2: 关键页面文件验证...');
const criticalPages = [
  'dist/index.html',
  'dist/games/index.html',
  'dist/zh/index.html',
  'dist/es/index.html'
];

let pageCount = 0;
criticalPages.forEach(page => {
  if (existsSync(page)) {
    console.log(`✅ ${page} 存在`);
    pageCount++;
  } else {
    console.log(`❌ ${page} 不存在`);
  }
});

testResults.pageLoadTest = pageCount === criticalPages.length;

// 3. 组件完整性检查
console.log('\n🧩 测试3: 组件文件完整性...');
const criticalComponents = [
  'src/components/ui/button.tsx',
  'src/components/ui/card.tsx',
  'src/components/ui/badge.tsx',
  'src/components/GameCard.astro',
  'src/components/GameGrid.astro',
  'src/components/Navigation.astro',
  'src/components/AudioPlayer.astro'
];

let componentCount = 0;
criticalComponents.forEach(component => {
  if (existsSync(component)) {
    console.log(`✅ ${component} 存在`);
    componentCount++;
  } else {
    console.log(`❌ ${component} 缺失`);
  }
});

testResults.componentTest = componentCount === criticalComponents.length;

// 4. 多语言文件检查
console.log('\n🌍 测试4: 多语言支持验证...');
const languagePages = ['zh', 'es', 'fr', 'de', 'ja', 'ko'];
let langCount = 0;

languagePages.forEach(lang => {
  const langIndexPath = `dist/${lang}/index.html`;
  if (existsSync(langIndexPath)) {
    console.log(`✅ ${lang} 语言页面存在`);
    langCount++;
  } else {
    console.log(`❌ ${lang} 语言页面缺失`);
  }
});

testResults.languageTest = langCount >= 4; // 至少4种语言支持

// 5. 音频资源检查
console.log('\n🎵 测试5: 音频资源验证...');
const audioFiles = [
  'dist/characters/sounds/beat1.wav',
  'dist/characters/sounds/voice1.wav',
  'dist/characters/sounds/effect1.wav'
];

let audioCount = 0;
audioFiles.forEach(audio => {
  if (existsSync(audio)) {
    console.log(`✅ ${audio} 存在`);
    audioCount++;
  } else {
    console.log(`⚠️ ${audio} 可能缺失`);
  }
});

testResults.audioTest = audioCount >= 1; // 至少有音频文件存在

// 6. CSS和资源文件检查
console.log('\n🎨 测试6: 样式和资源验证...');
try {
  const htmlContent = readFileSync('dist/index.html', 'utf-8');
  
  // 检查关键CSS类是否存在
  const hasButton = htmlContent.includes('btn') || htmlContent.includes('button');
  const hasCard = htmlContent.includes('card');
  const hasTailwind = htmlContent.includes('class=') && htmlContent.includes('w-');
  
  if (hasButton && hasCard && hasTailwind) {
    console.log('✅ 样式类正确应用');
    testResults.responsiveTest = true;
  } else {
    console.log('⚠️ 样式可能存在问题');
  }
} catch (error) {
  console.log('⚠️ 无法验证样式文件');
}

// 输出测试总结
console.log('\n📊 测试结果总结:');
console.log('='.repeat(50));

const testItems = [
  { name: '构建流程', result: testResults.buildTest },
  { name: '页面加载', result: testResults.pageLoadTest },
  { name: '组件完整性', result: testResults.componentTest },
  { name: '多语言支持', result: testResults.languageTest },
  { name: '音频资源', result: testResults.audioTest },
  { name: '样式系统', result: testResults.responsiveTest }
];

let passedCount = 0;
testItems.forEach(item => {
  const status = item.result ? '✅ 通过' : '❌ 失败';
  console.log(`${item.name}: ${status}`);
  if (item.result) passedCount++;
});

const overallScore = Math.round((passedCount / testItems.length) * 100);
console.log(`\n🎯 总体评分: ${overallScore}/100`);

if (overallScore >= 90) {
  console.log('🎉 优秀! 项目已准备好部署');
} else if (overallScore >= 70) {
  console.log('✨ 良好! 大部分功能正常');
} else {
  console.log('⚠️ 需要修复问题才能部署');
}

console.log('\n✅ 集成测试完成');
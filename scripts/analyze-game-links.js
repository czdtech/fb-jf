import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 JSON 文件
function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return null;
    }
}

// 分析游戏链接
function analyzeGameLinks(data) {
    const analysis = {
        total: 0,
        withLinks: 0,
        withoutLinks: 0,
        linkTypes: {
            turbowarp: 0,
            scratch: 0,
            github: 0,
            other: 0
        },
        categories: {},
        potentialIssues: []
    };
    
    if (!data || !data.categories) {
        console.error('数据格式不正确，缺少 categories 字段');
        return analysis;
    }
    
    // 遍历所有分类
    Object.keys(data.categories).forEach(categoryKey => {
        const games = data.categories[categoryKey];
        analysis.categories[categoryKey] = {
            total: 0,
            withLinks: 0,
            withoutLinks: 0
        };
        
        if (Array.isArray(games)) {
            games.forEach(game => {
                analysis.total++;
                analysis.categories[categoryKey].total++;
                
                const link = game.iframe || game.url || game.gameUrl;
                
                if (link) {
                    analysis.withLinks++;
                    analysis.categories[categoryKey].withLinks++;
                    
                    // 分析链接类型
                    if (link.includes('turbowarp.org')) {
                        analysis.linkTypes.turbowarp++;
                    } else if (link.includes('scratch.mit.edu')) {
                        analysis.linkTypes.scratch++;
                    } else if (link.includes('github.io') || link.includes('github.com')) {
                        analysis.linkTypes.github++;
                    } else {
                        analysis.linkTypes.other++;
                    }
                    
                    // 检查潜在问题
                    if (link.includes('error') || link.includes('404') || link.includes('undefined') || link.includes('null')) {
                        analysis.potentialIssues.push({
                            title: game.title,
                            slug: game.slug,
                            link: link,
                            category: categoryKey,
                            issue: '链接包含错误标识'
                        });
                    }
                    
                    if (link.length < 10) {
                        analysis.potentialIssues.push({
                            title: game.title,
                            slug: game.slug,
                            link: link,
                            category: categoryKey,
                            issue: '链接过短'
                        });
                    }
                } else {
                    analysis.withoutLinks++;
                    analysis.categories[categoryKey].withoutLinks++;
                    
                    analysis.potentialIssues.push({
                        title: game.title,
                        slug: game.slug,
                        link: null,
                        category: categoryKey,
                        issue: '缺少链接'
                    });
                }
            });
        }
    });
    
    return analysis;
}

// 生成分析报告
function generateAnalysisReport(analysis) {
    console.log('='.repeat(80));
    console.log('游戏链接分析报告');
    console.log('='.repeat(80));
    
    console.log(`\n📊 总体统计:`);
    console.log(`- 总游戏数量: ${analysis.total}`);
    console.log(`- 有链接的游戏: ${analysis.withLinks} (${(analysis.withLinks / analysis.total * 100).toFixed(1)}%)`);
    console.log(`- 无链接的游戏: ${analysis.withoutLinks} (${(analysis.withoutLinks / analysis.total * 100).toFixed(1)}%)`);
    
    console.log(`\n🔗 链接类型分布:`);
    console.log(`- TurboWarp: ${analysis.linkTypes.turbowarp}`);
    console.log(`- Scratch: ${analysis.linkTypes.scratch}`);
    console.log(`- GitHub: ${analysis.linkTypes.github}`);
    console.log(`- 其他: ${analysis.linkTypes.other}`);
    
    console.log(`\n📂 分类统计:`);
    Object.keys(analysis.categories).forEach(category => {
        const cat = analysis.categories[category];
        console.log(`- ${category}: ${cat.total} 个游戏 (${cat.withLinks} 有链接, ${cat.withoutLinks} 无链接)`);
    });
    
    if (analysis.potentialIssues.length > 0) {
        console.log(`\n🚨 潜在问题 (${analysis.potentialIssues.length} 个):`);
        analysis.potentialIssues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue.title} (${issue.category})`);
            console.log(`   问题: ${issue.issue}`);
            console.log(`   链接: ${issue.link || 'null'}`);
            console.log('');
        });
    }
    
    console.log(`\n💡 建议:`);
    if (analysis.withoutLinks > 0) {
        console.log(`1. 需要为 ${analysis.withoutLinks} 个游戏添加链接`);
    }
    if (analysis.potentialIssues.length > 0) {
        console.log(`2. 需要修复 ${analysis.potentialIssues.length} 个潜在问题`);
    }
    console.log(`3. 建议优先使用 TurboWarp 链接以获得更好的性能`);
}

// 生成游戏列表
function generateGameList(data) {
    const gameList = [];
    
    if (!data || !data.categories) {
        return gameList;
    }
    
    Object.keys(data.categories).forEach(categoryKey => {
        const games = data.categories[categoryKey];
        if (Array.isArray(games)) {
            games.forEach(game => {
                gameList.push({
                    title: game.title,
                    slug: game.slug,
                    id: game.id,
                    category: categoryKey,
                    link: game.iframe || game.url || game.gameUrl,
                    hasLink: !!(game.iframe || game.url || game.gameUrl)
                });
            });
        }
    });
    
    return gameList;
}

// 保存详细报告
function saveDetailedReport(analysis, gameList) {
    const report = {
        timestamp: new Date().toISOString(),
        analysis: analysis,
        games: gameList
    };
    
    const reportPath = path.join(__dirname, '../game_analysis_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n详细报告已保存到: ${reportPath}`);
}

// 主函数
function main() {
    const currentFilePath = path.join(__dirname, '../src/data/games-extended.json');
    
    console.log('读取游戏数据文件...');
    const currentData = readJsonFile(currentFilePath);
    
    if (!currentData) {
        console.error('无法读取数据文件');
        return;
    }
    
    const analysis = analyzeGameLinks(currentData);
    const gameList = generateGameList(currentData);
    
    generateAnalysisReport(analysis);
    saveDetailedReport(analysis, gameList);
}

main();
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

// 提取游戏链接信息
function extractGameLinks(data) {
    const linkMap = new Map();
    
    // 检查数据结构
    if (!data || !data.categories) {
        console.error('数据格式不正确，缺少 categories 字段');
        return linkMap;
    }
    
    // 遍历所有分类
    Object.keys(data.categories).forEach(categoryKey => {
        const games = data.categories[categoryKey];
        if (Array.isArray(games)) {
            games.forEach(game => {
                const key = game.slug || game.id || game.title;
                if (key) {
                    linkMap.set(key, {
                        title: game.title,
                        slug: game.slug,
                        id: game.id,
                        iframe: game.iframe || null,
                        url: game.url || null,
                        gameUrl: game.gameUrl || null,
                        category: categoryKey
                    });
                }
            });
        }
    });
    
    return linkMap;
}

// 对比两个游戏链接映射
function compareGameLinks(currentLinks, backupLinks) {
    const report = {
        identical: [],
        different: [],
        currentOnly: [],
        backupOnly: [],
        potentiallyBroken: [],
        canRestore: []
    };
    
    // 获取所有游戏的键
    const allKeys = new Set([...currentLinks.keys(), ...backupLinks.keys()]);
    
    for (const key of allKeys) {
        const current = currentLinks.get(key);
        const backup = backupLinks.get(key);
        
        if (current && backup) {
            // 两个文件中都存在的游戏
            const currentIframe = current.iframe || current.url || current.gameUrl;
            const backupIframe = backup.iframe || backup.url || backup.gameUrl;
            
            if (currentIframe === backupIframe) {
                report.identical.push({
                    title: current.title,
                    slug: key,
                    link: currentIframe
                });
            } else {
                const item = {
                    title: current.title,
                    slug: key,
                    currentLink: currentIframe,
                    backupLink: backupIframe
                };
                report.different.push(item);
                
                // 检查是否是失效链接
                if (!currentIframe || currentIframe.includes('error') || currentIframe.includes('404')) {
                    report.potentiallyBroken.push(item);
                }
                
                // 检查是否可以从备份恢复
                if (backupIframe && backupIframe.length > 0 && !backupIframe.includes('error')) {
                    report.canRestore.push(item);
                }
            }
        } else if (current && !backup) {
            // 只在当前文件中存在
            report.currentOnly.push({
                title: current.title,
                slug: key,
                link: current.iframe || current.url || current.gameUrl
            });
        } else if (!current && backup) {
            // 只在备份文件中存在
            report.backupOnly.push({
                title: backup.title,
                slug: key,
                link: backup.iframe || backup.url || backup.gameUrl
            });
        }
    }
    
    return report;
}

// 生成报告
function generateReport(report) {
    console.log('='.repeat(80));
    console.log('游戏链接对比报告');
    console.log('='.repeat(80));
    
    console.log(`\n📊 统计概览:`);
    console.log(`- 链接相同的游戏: ${report.identical.length}`);
    console.log(`- 链接不同的游戏: ${report.different.length}`);
    console.log(`- 仅在当前文件中的游戏: ${report.currentOnly.length}`);
    console.log(`- 仅在备份文件中的游戏: ${report.backupOnly.length}`);
    console.log(`- 可能失效的链接: ${report.potentiallyBroken.length}`);
    console.log(`- 可从备份恢复的链接: ${report.canRestore.length}`);
    
    if (report.different.length > 0) {
        console.log(`\n🔴 链接不同的游戏 (${report.different.length}个):`);
        report.different.forEach((item, index) => {
            console.log(`${index + 1}. ${item.title} (${item.slug})`);
            console.log(`   当前链接: ${item.currentLink || 'null'}`);
            console.log(`   备份链接: ${item.backupLink || 'null'}`);
            console.log('');
        });
    }
    
    if (report.potentiallyBroken.length > 0) {
        console.log(`\n🚨 可能失效的链接 (${report.potentiallyBroken.length}个):`);
        report.potentiallyBroken.forEach((item, index) => {
            console.log(`${index + 1}. ${item.title} (${item.slug})`);
            console.log(`   当前链接: ${item.currentLink || 'null'}`);
            console.log(`   备份链接: ${item.backupLink || 'null'}`);
            console.log('');
        });
    }
    
    if (report.canRestore.length > 0) {
        console.log(`\n🔧 可从备份恢复的链接 (${report.canRestore.length}个):`);
        report.canRestore.forEach((item, index) => {
            console.log(`${index + 1}. ${item.title} (${item.slug})`);
            console.log(`   当前链接: ${item.currentLink || 'null'}`);
            console.log(`   备份链接: ${item.backupLink || 'null'}`);
            console.log('');
        });
    }
    
    if (report.currentOnly.length > 0) {
        console.log(`\n➕ 仅在当前文件中的游戏 (${report.currentOnly.length}个):`);
        report.currentOnly.slice(0, 10).forEach((item, index) => {
            console.log(`${index + 1}. ${item.title} (${item.slug})`);
            console.log(`   链接: ${item.link || 'null'}`);
        });
        if (report.currentOnly.length > 10) {
            console.log(`   ... 还有 ${report.currentOnly.length - 10} 个游戏`);
        }
    }
    
    if (report.backupOnly.length > 0) {
        console.log(`\n📁 仅在备份文件中的游戏 (${report.backupOnly.length}个):`);
        report.backupOnly.slice(0, 10).forEach((item, index) => {
            console.log(`${index + 1}. ${item.title} (${item.slug})`);
            console.log(`   链接: ${item.link || 'null'}`);
        });
        if (report.backupOnly.length > 10) {
            console.log(`   ... 还有 ${report.backupOnly.length - 10} 个游戏`);
        }
    }
    
    console.log(`\n💡 修复建议:`);
    if (report.canRestore.length > 0) {
        console.log(`1. 优先修复 ${report.canRestore.length} 个可从备份恢复的链接`);
    }
    if (report.potentiallyBroken.length > 0) {
        console.log(`2. 检查 ${report.potentiallyBroken.length} 个可能失效的链接`);
    }
    if (report.backupOnly.length > 0) {
        console.log(`3. 考虑是否需要恢复 ${report.backupOnly.length} 个仅在备份中的游戏`);
    }
    
    return report;
}

// 生成修复脚本
function generateFixScript(report) {
    if (report.canRestore.length === 0) {
        return;
    }
    
    console.log(`\n🔧 生成修复脚本...`);
    
    const fixScript = `import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从备份恢复链接的修复脚本
const currentFilePath = path.join(__dirname, '../src/data/games-extended.json');
const backupFilePath = path.join(__dirname, '../src/data/games-extended.json.backup');

// 需要修复的游戏链接
const fixList = ${JSON.stringify(report.canRestore, null, 2)};

function applyFixes() {
    try {
        // 读取当前文件
        const currentData = JSON.parse(fs.readFileSync(currentFilePath, 'utf8'));
        
        let fixedCount = 0;
        
        // 应用修复
        fixList.forEach(fix => {
            const game = currentData.find(g => g.slug === fix.slug || g.title === fix.title);
            if (game) {
                console.log(\`修复游戏: \${fix.title}\`);
                console.log(\`  旧链接: \${fix.currentLink || 'null'}\`);
                console.log(\`  新链接: \${fix.backupLink}\`);
                
                // 更新链接
                if (fix.backupLink) {
                    game.iframe = fix.backupLink;
                    fixedCount++;
                }
                console.log('');
            }
        });
        
        // 保存修复后的文件
        fs.writeFileSync(currentFilePath, JSON.stringify(currentData, null, 2));
        console.log(\`✅ 修复完成！共修复 \${fixedCount} 个游戏链接\`);
        
    } catch (error) {
        console.error('修复过程中出错:', error);
    }
}

// 询问是否执行修复
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('是否执行修复？这将修改当前的 games-extended.json 文件 (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        applyFixes();
    } else {
        console.log('取消修复');
    }
    rl.close();
});
`;
    
    fs.writeFileSync(path.join(__dirname, 'fix-game-links.js'), fixScript);
    console.log('修复脚本已保存到: scripts/fix-game-links.js');
}

// 主函数
function main() {
    const currentFilePath = path.join(__dirname, '../src/data/games-extended.json');
    const backupFilePath = path.join(__dirname, '../src/data/games-extended.json.backup');
    
    console.log('读取游戏数据文件...');
    const currentData = readJsonFile(currentFilePath);
    const backupData = readJsonFile(backupFilePath);
    
    if (!currentData || !backupData) {
        console.error('无法读取数据文件');
        return;
    }
    
    const currentLinks = extractGameLinks(currentData);
    const backupLinks = extractGameLinks(backupData);
    
    console.log(`当前文件游戏数量: ${currentLinks.size}`);
    console.log(`备份文件游戏数量: ${backupLinks.size}`);
    
    const report = compareGameLinks(currentLinks, backupLinks);
    generateReport(report);
    generateFixScript(report);
}

main();
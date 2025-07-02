# 🎯 Stagewise 集成说明

## ✅ 安装完成

Stagewise 已成功集成到 FiddleBops 项目中！

## 🚀 使用方法

### 1. 安装 VS Code 扩展
在 VS Code 中安装 Stagewise 扩展：
- 搜索 "stagewise"
- 安装 "stagewise.stagewise-vscode-extension"

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问测试页面
浏览器打开：http://localhost:4322/stagewise-test/

### 4. 开始使用
1. 🎯 **选择元素**: 在浏览器中选择任意 UI 元素
2. 💬 **添加评论**: 为选中的元素添加修改建议
3. 🤖 **AI 处理**: AI 代理将自动修改代码

## 📁 集成文件

- `src/scripts/stagewise.js` - Stagewise 工具栏初始化脚本
- `src/layouts/BaseLayout.astro` - 已集成 stagewise 脚本
- `src/pages/stagewise-test.astro` - 测试页面
- `astro.config.mjs` - 已配置 Vite 优化

## 🔧 配置

### 当前配置
```javascript
const stagewiseConfig = {
  plugins: [], // 可在此添加插件
};
```

### 自定义插件
可以在 `src/scripts/stagewise.js` 中添加自定义插件来扩展功能。

## ⚠️ 注意事项

1. **开发环境专用**: Stagewise 仅在开发环境下运行
2. **单窗口使用**: 保持只有一个 Cursor/VS Code 窗口打开
3. **扩展连接**: 确保 VS Code 扩展已正确安装和连接

## 🎮 测试元素

访问测试页面后，你可以尝试选择以下元素：
- 游戏卡片
- 按钮组件
- 音频控件
- 设置面板

## 🆘 故障排除

### 工具栏未显示
1. 检查 VS Code 扩展是否已安装
2. 确认在开发环境下运行
3. 查看浏览器控制台是否有错误

### 提示未发送
1. 确保只有一个 VS Code 窗口打开
2. 检查扩展是否正确连接
3. 尝试重启开发服务器

## 🎉 开始创造

现在你可以通过 Stagewise 直接在浏览器中编辑 UI 元素，让 AI 帮你实现设计想法！

访问测试页面：http://localhost:4322/stagewise-test/
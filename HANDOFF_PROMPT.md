## 继任者提示词（Project Handoff Prompt）

---

## 任务背景 / 总目标

- **目标范围**：`src/content/games/*.md`（英文为 canonical），对 6 个 locale：`zh / ja / es / fr / de / ko` 的游戏详情页做审校。
- **工作内容（Only copy changes）**：
  - 清理残留英文/半英文
  - 修正生硬机翻、语病、错字/乱码
  - 术语统一（按 glossary）
  - 语气统一（按 style guide）
  - 允许改标题/描述的翻译质量，但不要做 SEO/结构层面的"发明"

---

## 硬性门槛（必须 100% 遵守）

- **每批（10 篇）结束后必须跑**：`npm run validate:i18n`
  - 输出里必须满足：`metadata errors=0` 且 `structure mismatches=0`
- **Markdown 结构不乱动**（这是最容易把项目搞成屎山的点）：
  - 不要删除段落/标题/列表层级
  - 不要随便改标题层级（`###` 还是 `###`）
  - FAQ：**问题必须是 list-item**，**答案必须是缩进段落**（不要给答案再加子 bullet）
- **不要提交报告文件**：校验会生成 `i18n-metadata-report.json` 和 `i18n-structure-report.json`，每批验证通过后删除它们。

---

## 校验工具说明（你要靠它活命）

- 命令：`npm run validate:i18n`
  - `scripts/validate-i18n-metadata.mts`：检查 frontmatter 结构、字段、locale 等
  - `scripts/validate-i18n-structure.mts`：把 markdown body 解析成节点序列（heading/list-item/paragraph），要求 localized **按顺序包含** canonical 节点
    - localized 允许有"额外节点"，但 canonical 节点不能缺、顺序不能乱

当结构校验失败时：看根目录生成的 `i18n-structure-report.json`，按报告提示补齐缺失节点（通常是缺标题/缺 FAQ 项/缺段落）。必要时对照英文 canonical：`src/content/games/<slug>.md`。

---

## 语言风格资料（不要凭感觉瞎翻）

都在：`.kiro/specs/i18n-style-harmonization-lite/`

- **Style Guide**：`STYLE-GUIDE.<lang>.md`
- **Glossary**：`GLOSSARY.<lang>.md`

法语额外约定：
- 默认用 **tu**（除非该文件明显全篇稳定使用 vous 面向"受众群体"）
- 语气专业、清晰，少用夸张营销词

---

## 当前进度（截至 2025-12-16）

### 6 个 locale 总体完成度（每个 locale 679 篇）

- **ES**：679/679（100%）✅
- **JA**：679/679（100%）✅
- **FR**：160/679（23.56%）🚧（已审校 slug：`2-tricky-stories` → `fullspeed-racing`）
- **DE**：0/679（0%）
- **KO**：679/679（100%）✅（修复残留英文：`sprunki-retake`、`zumba-ocean`）
- **ZH**：679/679（100%）✅（修复英文标题：`cookie-clicker`、`slope`、`incredibox`、`friday-night-funkin`、`geometry-dash`）

按"需要审校的总页面数"（6*679=4074）计：已完成 2846/4074（≈69.86%）。

### 法语 FR：下一批（B17，10 篇，字典序）

`funny-shooter`, `funny-shooter-2`, `futoshiki`, `fuzzies`, `g-switch`, `g-switch-2`, `g-switch-3`, `g-switch-4`, `galactic-empire`, `gangsters`

对应文件路径：`src/content/games/<slug>.fr.md`

---

## 继任者的下一步（照这个流程干，别自作聪明）

### 每批（10 篇）的固定流程

1. **逐个编辑 10 个 `<slug>.<lang>.md`**：只做 copy/翻译质量修正，保持既有 markdown 结构。
2. **跑校验**：`npm run validate:i18n`
   - 必须：`metadata errors=0` + `structure mismatches=0`
3. **删除报告**（通过后立刻删）：
   - `rm -f i18n-metadata-report.json i18n-structure-report.json`
4. **提交并推送**：把这 10 篇的改动 commit + push（避免一次提交混太多批次，后期 review/回滚会救你命）。

### 如何快速算"下一批 10 个 slug"

（字典序基于 `src/content/games/*.fr.md` 的文件名）

```bash
node -e "const fs=require('fs');const p='src/content/games';const files=fs.readdirSync(p).filter(f=>f.endsWith('.fr.md')).map(f=>f.replace(/\\.fr\\.md$/,''));files.sort();const start='family-feud';const i=files.indexOf(start);console.log(files.slice(i+1,i+11).join(', '));"
```

---

## FAQ 结构示例（别搞错）

正确（Q 是 list-item，A 是缩进段落）：

- **Q : Question ici ?**
    **R :** Réponse ici, en paragraphe indenté.

错误（A 又加了 bullet / 结构变了）：

- **Q : ...**
  - **R : ...**  ❌

---

## Git 状态（方便你接手）

- 分支：`main`
- 远端：`origin`（SSH）=`git@github.com:czdtech/fb-jf.git`
- 已把历史改动推送到 `origin/main`，当前工作区应当是干净的。

---

## 你应该避免的坑（别把项目拖进坟墓）

- 不要"优化结构"/"重写排版"来追求好看：结构校验会直接打爆你。
- 不要提交 report JSON。
- 不要在没跑 `npm run validate:i18n` 前就自信地说"搞定了"。
- 任何看起来像模板残留/英文段落：翻成目标语言，但保持原本段落/列表形态。

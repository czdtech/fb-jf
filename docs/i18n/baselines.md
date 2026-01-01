# i18n Baselines（基线）说明

本仓库的 i18n 校验默认采用“基线 + 回归检测（baseline gate）”：

- **允许历史遗留**：基线里已记录的存量问题不会阻塞 CI。
- **禁止新增回归**：任何“比基线更差”的变化都会直接失败。
- **目标是清零**：基线不是长期豁免，应该逐步把存量清到 0。

> 基线文件统一放在：`config/i18n/baselines/`（需要提交到仓库，CI 才能使用）。

## 1) 基线文件一览

| 基线文件 | 对应校验 | 说明 |
|---|---|---|
| `config/i18n/baselines/hardpoints-baseline.json` | `npm run validate:i18n-hardpoints` | 硬信息点对齐（iframeSrc / 数值 / 键位 / FAQ 顺序 / hard-sync frontmatter） |
| `config/i18n/baselines/section-markers-baseline.json` | `npm run validate:i18n:section-markers` | `<!-- i18n:section:* -->` 缺失对齐（让 hardpoints 抽取“看得见”） |
| `config/i18n/baselines/zh-english-mix-baseline.json` | `npm run validate:i18n:zh-mix` | 中文页面英文残留（英文段落/小标题/括号英文等） |
| `config/i18n/baselines/zh-traditional-baseline.json` | `npm run validate:i18n:zh-traditional` | 简繁残留（OpenCC t→cn 转换有变化则视为残留） |
| `config/i18n/baselines/zh-cn-wording-baseline.json` | `npm run validate:i18n:zh-wording` | 中文“港澳台用词”回归检测（如“透过/依照/本局”等） |
| `config/i18n/baselines/other-locales-english-residue-baseline.json` | `npm run validate:i18n:other-locales:en-residue` | 非中文语种英文残留（模板小标题/英文段落/英文 Q&A） |
| `config/i18n/baselines/terminology-baseline.json` | `npm run validate:i18n:terminology` | 术语一致性回归检测（规则源自 `docs/i18n/terminology.<locale>.json`） |

## 2) 常用命令

- 全量校验（本地/CI 推荐）：`npm run validate:i18n`

### 更新基线（谨慎使用，需要 commit）

> `--update-baseline` 会把“当前问题全集”写入基线文件；只在你明确接受“存量过渡”的时候使用。

- hardpoints：`npm run baseline:i18n-hardpoints`
- section markers：`npm run baseline:i18n:section-markers`
- zh 英文残留：`npm run baseline:i18n:zh-mix`
- zh 简繁残留：`npm run baseline:i18n:zh-traditional`
- zh 用词：`npm run baseline:i18n:zh-wording`
- 其他语种英文残留：`npm run baseline:i18n:other-locales:en-residue`
- 术语：`npm run baseline:i18n:terminology`

### 只出报告不失败（用于确认范围/排查）

- hardpoints：`npm run report:i18n-hardpoints`
- zh 英文残留：`npm run report:i18n:zh-mix`
- 其他语种英文残留：`npm run report:i18n:other-locales:en-residue`
- 术语：`npm run report:i18n:terminology`

## 3) 一条经验（避免“看不见”）

如果某个游戏缺少 `<!-- i18n:section:* -->` 标记，很多检查会对那段内容“看不见”，更容易漏改/误改。

因此建议优先清零 `section-markers-baseline.json`，再做大规模内容润色与对齐。

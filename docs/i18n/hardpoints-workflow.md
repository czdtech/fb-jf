# i18n 硬信息点对齐：工作流

> 适用范围：仅 `src/content/games/*`。  
> 一致性口径：**只要求同一 `urlstr/slug` 的跨语言版本一致**；不同游戏之间不要求结构一致。

## 0) TL;DR（最短路径）

- 英文 `*.en.md` 是唯一事实源（Single Source of Truth）。
- 结构锚点靠 i18n 注释标记（markers），而不是靠标题文案。
- **硬信息点必须严格对齐**：`iframeSrc` / Controls 键位 tokens / 玩法数值 tokens / FAQ ID 集合与顺序 / hard-sync frontmatter。
- 常用自检：
  - 全量：`npm run validate:i18n`
  - 仅硬信息点：`npm run validate:i18n-hardpoints`
- 常用对齐（单 slug）：
  - `npx tsx scripts/align-i18n-hardpoints.mts --slug <slug> --locale zh,ja,es,fr,de,ko --apply`

## 1) 规范与契约

- 内容契约（必读）：`docs/i18n/games-content-contract-v1.md`
- 术语/风格（逐语言）：`docs/i18n/GLOSSARY.<locale>.md` 与 `docs/i18n/terminology.<locale>.json`

## 2) 文件映射规则（必须）

- 英文事实源：`src/content/games/<slug>.en.md`
- 其它语言：`src/content/games/<slug>.<locale>.md`
- `<slug>` 以 frontmatter `urlstr` 为准（建议与文件名一致）。

> 任何 “存在 `<slug>.<locale>.md` 但缺少 `<slug>.en.md`” 都会被视为错误（Orphan localized）。

## 3) 日常工作流

### 3.1 新增一个游戏（推荐流程）

1. 新增英文 canonical：`src/content/games/<slug>.en.md`
2. 按契约写好 sections 与 markers（例如 `<!-- i18n:section:how-to-play -->`）
3. 如果有 FAQ：
   - 每个问题前必须有一行 `<!-- i18n:faq:id=... -->`
   - **一旦有 ID，就不要随意改动/重算**（改问题文本不影响 ID）
4. 如果缺语言文件，可生成 stub（不会覆盖已存在文件）：
   - `npm run generate:stubs -- --filter <slug> --lang zh,ja,es,fr,de,ko --dry-run`
   - `npm run generate:stubs -- --filter <slug> --lang zh,ja,es,fr,de,ko`
5. 翻译/补内容
6. 对齐硬信息点（强烈建议对新 slug 跑一次）：
   - `npx tsx scripts/align-i18n-hardpoints.mts --slug <slug> --locale zh,ja,es,fr,de,ko --apply`
7. 本地自检：
   - `npm run validate:i18n`

### 3.2 修改英文事实源后，如何避免“漏同步”

只要你改动了下列任一项，就应该视为“联动修改”，需要对同 slug 的所有语言跑一次对齐器：
- `iframeSrc`
- `<!-- i18n:section:controls -->` 内的键位 tokens（inline code）
- `<!-- i18n:section:how-to-play --> / rules / tips` 内的玩法数值（数字、百分比、时间等）
- `<!-- i18n:section:faq -->` 内的 FAQ 集合与顺序（FAQ ID 序列）
- hard-sync frontmatter（详见契约里的 hard-sync 列表）

命令：
- `npx tsx scripts/align-i18n-hardpoints.mts --slug <slug> --locale zh,ja,es,fr,de,ko --apply`

### 3.3 门禁失败时怎么排查

1. 先看 hardpoints 报告（默认输出在根目录）：
   - `i18n-hardpoints-diff-report.json`
2. 只想输出报告、不失败：
   - `npm run validate:i18n-hardpoints -- --report-only`
3. 只想生成差分报告（不做 baseline 判定）：
   - `npm run report:i18n-hardpoints`
4. 修复优先级：
   - 优先修内容（让英文与各语言对齐）
   - baseline 仅用于“存量过渡”，不建议把新增问题直接 baseline 掉

## 4) Baseline（基线）使用原则

- baseline 文件位置：`.kiro/specs/i18n-hardpoints-alignment/hardpoints-baseline.json`
- baseline 的目标是**逐步清零**，不是长期豁免。
- 只有在明确接受“历史遗留且短期无法修”的情况下才使用 baseline，并补充可追溯的 note。
- 更新 baseline（会覆盖为“当前问题全集”，需 commit）：
  - `npm run baseline:i18n-hardpoints`


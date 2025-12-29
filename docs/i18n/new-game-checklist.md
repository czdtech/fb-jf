# 新增游戏 Checklist（i18n / hardpoints）

> 范围：仅 `src/content/games/*`。  
> 口径：只要求同一 `urlstr/slug` 的跨语言版本一致。

## A) 英文事实源（必须）

- [ ] 新建 `src/content/games/<slug>.en.md`
- [ ] `urlstr` 唯一且与文件名 `<slug>` 一致（建议只用 `a-z0-9-`）
- [ ] hard-sync frontmatter 字段齐全且稳定（至少：`urlstr`/`iframeSrc`/`thumbnail`/`releaseDate`/`score`）
- [ ] sections 与 markers 按契约落位：`docs/i18n/games-content-contract-v1.md`
- [ ] 若有 Controls：
  - [ ] 键位 token 用 inline code（反引号），例如 `W` `A` `S` `D`
- [ ] 若有 FAQ：
  - [ ] 每个问题前都有一行 `<!-- i18n:faq:id=... -->`
  - [ ] FAQ 顺序就是“事实顺序”（后续其它语言必须严格一致）

## B) 生成/维护各语言文件（可分批）

- [ ] 如缺语言文件，先生成 stub（不会覆盖已存在文件）：
  - [ ] `npm run generate:stubs -- --filter <slug> --lang zh,ja,es,fr,de,ko --dry-run`
  - [ ] `npm run generate:stubs -- --filter <slug> --lang zh,ja,es,fr,de,ko`
- [ ] 完成翻译（标题/正文可本地化；hardpoints 必须保留一致性）
- [ ] 跑一次对齐器（强烈建议，避免漏同步）：
  - [ ] `npx tsx scripts/align-i18n-hardpoints.mts --slug <slug> --locale zh,ja,es,fr,de,ko --apply`

## C) 合入前自检

- [ ] 全量校验：`npm run validate:i18n`
- [ ] 只看 hardpoints：`npm run validate:i18n-hardpoints`
- [ ] 如门禁报错，先修内容，再考虑 baseline（baseline 仅用于历史遗留过渡）：
  - [ ] `npm run report:i18n-hardpoints`


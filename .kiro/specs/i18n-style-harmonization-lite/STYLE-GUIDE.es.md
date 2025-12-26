# STYLE GUIDE (es) - 西语审校风格指南

> 适用范围：`src/content/games/*.es.md`  
> 目标：让西语文案达到大型 H5 游戏站（CrazyGames/Poki）水准，去机翻味、术语一致、结构不变。

## 1. 语气与人称

- 默认使用 **tú** 系（二人称单数），语气亲和专业；除非具体内容明显更适合 usted（保持整篇一致）。
- 面向休闲玩家：清晰直接、带一点推荐感，但不要夸张到广告腔。

## 2. 章节写法模板

- **介绍段（Game/Detailed Introduction）**
  1. 一句话定义游戏类型与核心玩法。
  2. 一句话说明目标/胜利条件。
  3. 一句话点出 1–2 个亮点（机制、难点、特色）。
  - 推荐开头：  
    - “**Bubble Shooter** es un clásico juego de puzles en el que…”  
    - “En **Sprunki Retake**, tu objetivo es…”

- **策略/攻略段（Gameplay Strategy & Walkthrough / Tips）**
  - 用动词开头的短句 list：Apunta…, Aprovecha…, Evita…, Planifica…
  - 每条聚焦一个可执行技巧，不要复述英文长句。

- **操作段（Controls Guide）**
  - 指令式：Haz clic…, Arrastra…, Usa las flechas…, Pulsa la barra espaciadora…
  - 设备/平台说明用短句补充即可。

- **FAQ**
  - 问句必须带 `¿ ?`；答句直接给结论 → 简短解释。
  - 避免直译英文问法，改成自然玩家会问的问题。

## 3. 标点与排版

- 西语问号/感叹号必须成对出现：`¿...?`、`¡...!`
- 避免英语式破折号滥用；优先用逗号/分号或拆句。
- 句子尽量短：一行不塞多个从句。

## 4. 术语与专有名

- 游戏名/品牌名/系列名保留英文（Sprunki/Incredibox/Minecraft 等）。
- 玩法与系统词严格使用 `docs/i18n/GLOSSARY.es.md` 约定译法。
- 英文 SEO 关键词若重复堆砌，可自然化，但信息不丢。

## 5. 常见机翻问题与修法

- ❌ “proporciona una experiencia…” 过度泛化  
  ✅ 换成具体机制或玩家体验。
- ❌ 直译英文被动/长从句  
  ✅ 拆成 2–3 个短句。

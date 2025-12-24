# 中文术语表（游戏详情页）

> 适用范围：`src/content/games/*.zh.md`（正文与可翻译字段）
>
> 目标：对齐大型游戏平台（CrazyGames / Poki 风格）的中文表达习惯，统一译法、减少中英混用、避免机翻腔。  
> 说明：本表面向“游戏详情页内容”，UI 固定文案另见 `src/i18n/zh.json`。

---

## 0. 总体约定（先读这一段）

1. **专有名默认保留英文**
   - 游戏名/品牌名/系列名：Sprunki、Incredibox、Minecraft、Roblox 等。
   - 若需要解释，可用中文补一句说明，但避免每行都做中英对照。
2. **按键/快捷键保留原键位**
   - 示例：`WASD`、`Spacebar`、`Shift`、`Tab`、`Esc`、`Left/Right Mouse Button`。
   - 推荐写法：中文说明 + 键位（必要时括号补充），例如“按 `Spacebar` 跳跃”。
3. **缩写的处理**
   - 首次出现可写“中文（缩写）”，后续可单用缩写：例如“第一人称射击（FPS）”。
   - 允许保留行业通用缩写：FPS/HP/NPC/PvP/PvE/AI/RNG/AFK 等。
4. **同一术语全站一致**
   - 同一个英文术语，不要在不同页面里来回切换译法（例如 timer：统一用“倒计时”）。
5. **括号内尽量不要放英文**
   - 避免在中文括号里塞英文对照（容易形成“中英混排感”）。
   - 推荐写法：把英文放在括号外、中文放在括号内，例如 `Turf War（涂地对战）`。
6. **不保留整句英文**
   - 正文段落/列表项/小标题如果整行基本是英文，默认视为“英文残留”，需要翻译为自然中文。
   - 若确有必要保留整句英文（极少见），必须在本术语表记录“为什么要保留 + 适用范围”，避免后续误删或漏删。

---

## 1. 页面结构：常见小标题（推荐译法）

> 小标题只改文字，不改层级/顺序（结构对齐要求仍要遵守）。

| 英文（常见） | 推荐中文 | 备注 |
|---|---|---|
| Game Introduction | 游戏介绍 | 也可用“游戏简介”，但建议全站统一一种 |
| Detailed Game Introduction | 详细游戏介绍 | |
| Overview | 概览 | |
| How to Play | 如何游玩 | 也可用“如何玩” |
| Gameplay Strategy | 玩法策略 | |
| Gameplay Strategy & Walkthrough | 玩法策略与通关思路 | |
| Gameplay Strategy & Tips | 玩法策略与实用技巧 | |
| Gameplay Guide | 玩法指南 | |
| Controls | 操作 | |
| Controls Guide | 操作指南 | |
| Tips / Tips and Strategies | 小技巧 / 玩法技巧 | |
| Frequently Asked Questions (FAQ) | 常见问题（FAQ） | 建议统一这种写法 |
| FAQ | 常见问题（FAQ） | |
| Conclusion / Wrapping Up / Bottom Line | 总结 | |

---

## 2. 游戏类型 / 标签（Genre & Category）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| action | 动作 | |
| adventure | 冒险 | |
| arcade | 街机 | |
| casual | 休闲 | |
| puzzle | 益智 | 如强调解谜，可写“益智解谜” |
| strategy | 策略 | |
| simulation | 模拟 | 经营向可写“模拟经营” |
| management | 经营 / 管理 | 与 tycoon 配合时偏“经营” |
| tycoon | 大亨 / 经营 | 统一时建议写“经营”或“模拟经营” |
| idle | 放置 | |
| clicker | 点击 | 与 idle 并列时可写“放置点击” |
| platformer | 平台跳跃 | 分类页可简写“平台” |
| runner / endless runner | 跑酷 / 无尽跑酷 | 统一：无尽跑酷（当强调 endless 时） |
| shooter / shooting | 射击 | |
| first-person shooter | 第一人称射击（FPS） | 首次可带 FPS |
| third-person shooter | 第三人称射击（TPS） | |
| racing | 竞速 / 赛车 | 统一：竞速（泛化）或“赛车”视语境 |
| driving | 驾驶 | |
| sports | 体育 | |
| multiplayer | 多人 | |
| 2-player | 双人 | |
| rhythm | 节奏 | “节奏游戏”也可 |
| music | 音乐 | |
| horror | 恐怖 | |
| board game | 桌游 / 棋盘游戏 | |
| card game | 卡牌游戏 | |
| word game | 文字游戏 | |
| match-3 | 三消 | |
| merge | 合成 / 合并 | 玩法机制：统一“合并” |
| tower defense | 塔防 | |
| roguelike | 肉鸽 | 更正式可写“类 Rogue”但不推荐 |
| survival | 生存 | |
| sandbox | 沙盒 | |
| crafting | 制作 / 合成 | 注意与 merge 区分 |

---

## 3. 通用玩法 / 系统词（Core Mechanics & Systems）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| objective / goal | 目标 | |
| win condition | 胜利条件 | |
| mission | 任务 | |
| quest | 任务 / 委托 | RPG 场景可用“委托” |
| challenge | 挑战 | |
| level / stage | 关卡 | 统一：关卡 |
| round | 回合 | |
| match | 对局 / 比赛 | 棋牌偏“对局”，体育偏“比赛” |
| mode | 模式 | |
| game mode | 游戏模式 | |
| difficulty | 难度 | |
| tutorial | 新手教程 | |
| time limit | 时间限制 / 限时 | 倒计时更像 timer；time limit 是“限制” |
| timer | 倒计时 | 统一：倒计时 |
| score | 分数 | |
| points | 积分 / 点数 | 与 score 并存时：points=积分 |
| high score | 最高分 | |
| combo | 连击 | |
| multiplier | 倍率 | |
| leaderboard | 排行榜 | |
| achievement(s) | 成就 | |
| daily challenge | 每日挑战 | |
| reward(s) | 奖励 | |
| currency | 货币 / 游戏币 | |
| coin(s) | 金币 | |
| gem(s) | 宝石 | |
| unlock | 解锁 | |
| upgrade | 升级 | |
| power-up | 道具 | 统一：道具 |
| buff | 增益 | |
| debuff | 负面效果 | |
| item(s) | 物品 / 道具 | 与 power-up 并存时：item=物品 |
| collectible(s) | 收集品 | |
| inventory | 背包 | |
| equipment | 装备 | |
| loadout | 配装 / 配置 | FPS/动作类常用“配装” |
| stats | 属性 | |
| skill / ability | 技能 | |
| cooldown | 冷却时间 | |
| health / HP | 生命值（血量） | 统一：生命值；括号“血量”可选 |
| life / lives | 生命（条） | 更明确可写“生命数” |
| damage | 伤害 | |
| attack / defense | 攻击 / 防御 | |
| enemy | 敌人 | |
| boss | Boss / 头目 | 建议：Boss（玩家更熟） |
| obstacle(s) | 障碍物 | |
| trap(s) | 陷阱 | |
| checkpoint | 检查点 | |
| respawn | 复活 / 重生 | 竞技类偏“复活” |
| restart | 重新开始 / 重开 | |
| save | 保存 | |
| progress | 进度 | |

---

## 4. 操作与输入（Controls & Input）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| keyboard & mouse | 键盘与鼠标 | |
| touchscreen | 触控屏 | |
| joystick | 摇杆 | |
| click | 点击 | |
| tap | 轻触 | |
| press | 按下 | |
| hold | 长按 / 按住 | |
| release | 松开 | |
| drag and drop | 拖拽 | |
| swipe | 滑动 | |
| move | 移动 | |
| jump | 跳跃 | |
| interact | 交互 | |
| aim | 瞄准 | |
| shoot / fire | 射击 / 开火 | |
| reload | 换弹 | |
| sprint | 冲刺 / 疾跑 | |
| crouch | 下蹲 | |
| slide | 滑铲 | |
| rotate / turn | 转向 / 旋转 | |
| accelerate / brake | 加速 / 刹车 | |
| select | 选择 | |
| confirm | 确认 | |
| cancel | 取消 | |
| settings | 设置 | |
| fullscreen | 全屏 | |
| pause / resume | 暂停 / 继续 | |

### 常见键位写法（建议）

| 英文键位 | 推荐中文 |
|---|---|
| Arrow Keys | 方向键 |
| Spacebar | 空格键 |
| Left/Right Mouse Button | 鼠标左键 / 鼠标右键 |
| Mouse Wheel | 鼠标滚轮 |
| Enter | Enter 键 |
| Esc / Escape | Esc 键 |
| Tab | Tab 键 |
| Shift | Shift 键 |
| Ctrl / Control | Ctrl 键 |
| Alt | Alt 键 |

---

## 5. 射击 / FPS 相关（常见于 Bullet Force 等）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| aim down sights / ADS | 开镜（ADS） | 首次出现建议带 ADS |
| hip-fire | 腰射 | |
| recoil | 后坐力 | |
| accuracy | 精准度 / 命中率 | |
| rate of fire | 射速 | |
| ammo | 弹药 | |
| magazine | 弹匣 | |
| attachment(s) | 配件 | |
| sight / scope | 瞄具 / 镜 | |
| suppressor | 消音器 | |
| laser | 激光瞄具 | |
| camo / camouflage | 迷彩 | |
| loadout | 配装 | |
| kill / kills | 击杀 | |
| killstreak | 连杀奖励 | |
| UAV | 无人机侦察（UAV） | 可写“UAV（侦察）” |
| bot(s) | 机器人 / AI 机器人 | |
| team deathmatch (TDM) | 团队死斗（TDM） | |
| free for all (FFA) | 自由混战（FFA） | |

---

## 6. 经营 / 模拟常用词（常见于 Grow a Garden 等）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| farm / garden | 农场 / 花园 | 视题材选用 |
| crop(s) | 作物 | |
| seed(s) | 种子 | |
| till (the soil) | 翻地 / 耕地 | |
| sow (seeds) | 播种 | |
| water / watering can | 浇水 / 浇水壶 | |
| fertilize / fertilizer | 施肥 / 肥料 | |
| harvest | 收获 | |
| barn / silo | 谷仓 / 粮仓 | |
| greenhouse | 温室 | |
| order board | 订单告示板 | |
| NPC | NPC | 允许保留 |
| offline growth | 离线生长 | |

---

## 7. 棋牌 / 纸牌 / 棋类常用词（常见于 Checkers / Solitaire 等）

### 跳棋（Checkers）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| checkers / draughts | 跳棋 | 首次可写“跳棋（Checkers）” |
| piece(s) | 棋子 | |
| capture | 吃子 | |
| forced capture | 强制吃子 | |
| chain jump | 连跳 | |
| king (piece) | 王棋 | |
| crown / crowned | 冠冕 / 升王 | “升王”更口语 |

### 接龙（Solitaire / Klondike）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| solitaire / klondike | 纸牌接龙 | |
| tableau | 牌桌 | |
| foundation | 基座 | |
| stock pile | 牌库 | |
| waste pile | 废牌堆 | |

### 国际象棋（Chess）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| chess | 国际象棋 | 首次可写“国际象棋（Chess）” |
| piece(s) | 棋子 | |
| pawn / rook / bishop / knight / queen / king | 兵 / 车 / 象 / 马 / 后 / 王 | 建议全站统一用简写 |
| move | 走子 | |
| capture | 吃子 | |
| check / checkmate | 将军 / 将死 | |
| draw | 和棋 / 平局 | 统一：和棋 |
| stalemate | 逼和（僵局） | |
| castling | 王车易位 | |
| en passant | 吃过路兵 | |
| promotion | 升变 | |
| opening / endgame | 开局 / 残局 | |

### 麻将（Mahjong / Mahjong Solitaire）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| mahjong | 麻将 | |
| mahjong solitaire | 麻将接龙 | 也常见“单人麻将/麻将消除”；建议统一“麻将接龙” |
| tile(s) | 牌（牌面） | |
| match / matching | 匹配 / 配对 | |
| pair | 一对 | |
| layout | 牌阵 / 布局 | |
| free tile | 可选牌 | 指“没有被压住、两侧至少一边为空”的牌 |
| shuffle | 重排 / 洗牌 | 统一：重排 |
| hint | 提示 | |
| undo | 撤销 | |

### 数独（Sudoku）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| sudoku | 数独 | |
| grid | 网格 | |
| row / column | 行 / 列 | |
| box / block / subgrid | 宫 | 统一：九宫格里的“宫” |
| candidate(s) | 候选数 | |
| notes / pencil marks | 笔记（候选标记） | |
| hint | 提示 | |
| mistake | 错误 | |

### 多米诺（Domino / Dominoes）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| domino / dominoes | 多米诺（骨牌） | 标题可只写“多米诺” |
| tile(s) | 牌 | |
| double | 双数牌 | |
| chain | 牌链 | |
| boneyard | 牌库（抽牌堆） | |
| draw | 抽牌 | |
| pass | 过牌 | |

### 台球（Pool / Billiards）

| 英文 | 推荐中文 | 备注 |
|---|---|---|
| pool / billiards | 台球 | |
| cue | 球杆 | |
| cue ball | 母球 | |
| pocket | 球袋 | |
| shot | 击球 | |
| break | 开球 | |
| foul | 犯规 | |
| scratch | 母球落袋 | |
| spin | 旋转（加塞） | |

---

## 8. 常见缩写（建议写法）

| 缩写 | 推荐中文写法 | 备注 |
|---|---|---|
| FPS | 第一人称射击（FPS） | |
| TPS | 第三人称射击（TPS） | |
| HP | 生命值（HP） | |
| AI | AI（电脑） | |
| NPC | NPC（非玩家角色） | |
| PvP / PvE | 玩家对战 / 玩家对环境 | |
| RNG | 随机性（RNG） | |
| AFK | 挂机（AFK） | |

---

## 9. 简体站用词统一（避免港台译法）

> 适用范围：`src/content/games/*.zh.md`（正文与可翻译字段）
>
> 说明：以下词在港台译法中常见，但在简体站（zh-CN）会显得“机翻/混用”。建议统一替换为右侧写法。

| 港台常见写法 | 推荐写法（zh-CN） | 备注 |
|---|---|---|
| 透过 | 通过 | |
| 依照 | 按照 | |
| 滑鼠 | 鼠标 | |
| 拖曳 | 拖拽 | |
| 萤幕 | 屏幕 | |
| 行动装置 | 移动设备 | 也可写“手机/平板/移动端”，视语境选择 |
| 音讯 | 音频 | |
| 本局 | 这一局 | 也可用“这局”，但建议全站统一一种 |

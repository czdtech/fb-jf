---
locale: zh
urlstr: checkers
title: Checkers 西洋跳棋
description: 《Checkers 西洋跳棋》是经典 8×8 棋盘跳棋游戏，两位玩家轮流沿斜线移动棋子，通过跳吃与升王争夺盘面优势。
iframeSrc: 'https://checkers.h5games.usercontent.goog/v/0b0q83ht6qjqg/'
thumbnail: /new-images/checkers.jpg
tags:
  - board
  - puzzle
score: 4.0/5  (1907 votes)
releaseDate: 2025-10-18T00:00:00.000Z
---


### 详细游戏介绍

*Checkers* 是最流行的西洋跳棋玩法之一，在 8×8 棋盘深色格子上进行。每位玩家持 12 枚棋子，摆放在靠近自己的一侧三行深色格上。双方轮流下子，目标是吃掉对方全部棋子或让对方无合法步可走。

基本规则（以常见规则为例）：

- **普通棋子：** 每回合沿前方斜对角移动一格，不能后退。  
- **吃子：** 若相邻斜对角格有对方棋子，且其后斜对角格为空，则可跳过该子并将其吃掉并移至对面空格。  
- **连吃：** 吃子后若仍存在可吃子路径，通常要求继续连跳。  
- **升王（King）：** 当普通棋子到达对方底线行时，会升为王棋，此后可前后两个方向斜走与吃子。  

具体实施中，某些版本可能对强制吃子等细节有所差异，以游戏内说明为准。


- A **King** can move diagonally both forwards and backwards, and can capture in both directions.

- When a standard piece reaches the farthest row from its starting position (the opponent's back row), it is "crowned" and becomes a **King**.

- If a capture is available, it is **mandatory** to make that capture. If multiple captures are possible in a single turn (a chain jump), the player must complete the entire chain.

- A piece captures an opponent's piece by jumping over it diagonally to an empty square immediately beyond it.

- Standard pieces (men) can only move one square diagonally forward.

- Pieces are always placed and moved on the dark squares only.
### 基本策略与对局思路

1.  **占据中线与前场，避免只龟缩后方**  
    控制棋盘中央能让你的棋子拥有更多斜走和吃子机会，也更容易制造多重跳吃的局面。

2.  **谨慎移动边线棋子，避免被“双吃”**  
    边线和角落既可能是防守要点，也可能成为对手连吃的起点。移动前要观察是否会给对手构成“必然双吃或多吃”的机会。

3.  **围绕升王做规划**  
    王棋的前后移动能力能在残局中发挥巨大作用。中后期可以刻意为某几枚棋子铺路，让它们安全抵达对方底线升王。

4.  **多看一手：走之前先想对方下一步**  
    每次走子前问自己：“如果我是对手，下一步能否通过这步棋展开强力吃子？”这样可以及时避免明显失误。

5.  **残局中合理利用王棋牵制对方**  

- **The Power of Kings:** Getting the first King can be a game-changing advantage. A King is the most powerful piece on the board. Use it to hunt down your opponent's remaining pieces and control large areas of the board.
    王棋可前后移动，常用于封锁对方兵线或追击残子。注意不要贪吃导致王棋冲得太深，被对手布局包围。

### 操作指南


In a digital version of Checkers, the controls are typically very simple point-and-click or tap-and-drag.
-   **选择棋子：** 点击己方棋子即可选中；  
-   **移动 / 吃子：** 再点击目标格子，若为合法步或吃子路径，系统会自动完成移动或跳吃；若存在连吃，通常会提示继续。  


- **Jumping/Capturing:** If a capture is possible, the game will usually force you to select that piece. Click the piece and then the destination square to complete the jump. For multiple jumps, you simply continue clicking the next destination squares in the chain.
### 常见问题解答（FAQ）

**问：是不是只要能吃就必须吃？****
答：** 多数规则采用“强制吃子”，即存在吃子路线时必须选择吃子而不能走普通步。但也有变体允许自由选择，具体以游戏模式说明为准。

**问：普通棋子能后退吗？****
答：** 一般情况下普通棋子不能后退，只能前进到对方方向；只有升王后才具备前后移动和吃子的能力。



> A piece becomes a King when it reaches the last row on the opponent's side of the board (the row where their pieces started). In a physical game, this is usually marked by placing a second checker of the same color on top of it.

**4. How does a piece become a King?**

> No, standard pieces can only move diagonally *forward* towards the opponent's side of the board. Only a King can move both forwards and backwards.

**3. Can a regular piece (a "man") move backwards?**

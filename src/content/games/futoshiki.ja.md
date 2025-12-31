---
title: Futoshiki
description: Futoshikiは論理を鋭くします。行/列の一意性で数字を配置し、不等号を尊重して優雅な推論を行いましょう。
iframeSrc: 'https://6g7i64vihegl0.h5games.usercontent.goog/v/7bd886r75d4ag/'
thumbnail: /new-images/thumbnails/futoshiki.jpg
urlstr: futoshiki
score: 4.3/5  (2098 votes)
tags:
  - puzzle
  - thinky
developer: ''
releaseDate: 2025-10-18T00:00:00.000Z
locale: ja
---

<!-- i18n:section:introduction -->
### ゲーム紹介

Futoshiki（「等しくない」）は、数独のようなラテン方陣論理パズルですが、隣接するセル間に不等号（>、<）があります。各行/列にすべての数字が正確に1回ずつ含まれ、すべての不等式が満たされるように数字を配置する必要があります。記号は、優雅な推論を強化する強力なチェーンを作成します。

<!-- i18n:section:tips -->
<!-- i18n:section:how-to-play -->
### ゲームプレイ戦略と攻略法

1.  **不等式チェーン:** A>B>CはA≥C+2を意味します。それに応じて候補を鉛筆で書きます。
2.  **極値:** A>…>BはAを高く、Bを低く制限します。チェーンの端で1/最大値の除外を使用します。
3.  **行/列スキャン:** ラテン制約を適用して候補を積極的に刈り込みます。
4.  **矛盾ループ:** タイトなセルで値を仮定します。不等式が壊れるか、行/列が重複する場合はバックトラックします。
5.  **対称性:** バランスの取れたパズルには、多くの場合、ミラー化された不等式構造があります。それらを活用します。

<!-- i18n:section:controls -->
### 操作ガイド
<!-- i18n:controls:keys -->
- キー（整合）： `Tap` `enter`

- セルをタップして候補/値を入力します。鉛筆モードを切り替えます。元に戻す/やり直します。

<!-- i18n:section:faq -->
### よくある質問 (FAQ)

<!-- i18n:faq:id=faq:futoshiki:i-cant-progress-any-tip-26670f59 -->
- **Q: 進めません。ヒントはありますか？**
  A: 不等式チェーンを明示的な範囲に展開します（例：5>□>3なら中間∈{4}）。行/列ヒットと組み合わせます。
<!-- i18n:faq:id=faq:futoshiki:are-guesses-required-13834711 -->
- **Q: 推測は必要ですか？**
  A: 良いセットは論理的に解決可能です。最悪の場合、クイックバックトラックで制御された仮定を使用します。
<!-- i18n:faq:id=faq:futoshiki:difference-vs-sudoku-89f94240 -->
- **Q: 数独との違いは？**
  A: 不等式は方向性のある制約を追加し、より強い強制移動を可能にします。



# タイムテーブル レイアウト 仕様まとめ

SideTimeTable のメインタイムテーブル部分の表示・計算・CSS に関する技術仕様を網羅的にまとめたドキュメント。

---

## 目次

1. [座標系の基本原則](#1-座標系の基本原則)
2. [DOM 構造の全体像](#2-dom-構造の全体像)
3. [TimelineComponent の役割](#3-timelinecomponent-の役割)
4. [イベント配置計算 (EventLayoutManager)](#4-イベント配置計算-eventlayoutmanager)
5. [現在時刻ライン (CurrentTimeLineManager)](#5-現在時刻ライン-currenttimelinemanager)
6. [業務時間背景の表示](#6-業務時間背景の表示)
7. [CSS 詳細](#7-css-詳細)
   - 7.8 密度別スタイル (レーン)
   - 7.9 継続時間別スタイル (duration)
   - 7.10 現在時刻ライン
8. [スクロール制御](#8-スクロール制御)
9. [レスポンシブ対応](#9-レスポンシブ対応)
10. [z-index マップ](#10-z-index-マップ)

---

## 1. 座標系の基本原則

タイムテーブル全体は **1分 = 1px** の座標系を採用している。

```
0:00  →  top: 0px
1:00  →  top: 60px
6:00  →  top: 360px
12:00 →  top: 720px
23:00 →  top: 1380px
24:00 →  top: 1440px  ← 総高さ (TOTAL_HEIGHT)
```

### 計算式

```
topPosition (px) = hour × 60 + minute
```

**例: 10:30 のイベント**
```
top = 10 × 60 + 30 = 630px
```

**例: 高さ (継続時間)**
```
height (px) = (endHour × 60 + endMinute) - (startHour × 60 + startMinute)
```

### 定数 (TimelineComponent)

| 定数 | 値 | 意味 |
|------|-----|------|
| `TOTAL_HEIGHT` | 1440px | 24時間分の総高さ |
| `HOUR_HEIGHT` | 60px | 1時間分の高さ |

---

## 2. DOM 構造の全体像

```
#sideTimeTableHeaderWrapper          ← sticky ヘッダー
└── #sideTimeTableHeader             ← 日付ナビゲーション、ボタン群

.side-time-table                     ← メインスクロール領域
│   height: calc(100vh - 120px)
│   overflow-y: auto
│
├── .side-time-table-base            ← ベースレイヤー (時刻軸)
│   │   position: absolute, height: 1440px, z-index: 10
│   │
│   ├── .work-time-background        ← 業務時間の背景色帯 (動的生成)
│   ├── .hour-line × 24             ← 時刻の区切り線 (水平破線)
│   ├── #currentTimeLine            ← 現在時刻ライン (動的生成)
│   │       .current-time-line
│   └── .hour-label × 24             ← 0:00 〜 23:00 の時刻ラベル
│
└── .side-time-table-events          ← イベントレイヤー
    │   position: absolute, height: 1440px, z-index: 20
    │
    ├── .side-time-table-events-local   ← ローカルイベントコンテナ
    │   └── .event.local-event × N      ← 各ローカルイベント
    │
    └── .side-time-table-events-google  ← Google イベントコンテナ
        └── .event.google-event × N     ← 各 Google イベント
```

---

## 3. TimelineComponent の役割

`src/side_panel/components/timeline/timeline-component.js`

### 初期化フロー

```
new TimelineComponent()
    └── createElement()
        ├── _createBaseLayer()     ← 時刻軸 DOM 生成
        ├── _createEventsLayer()   ← イベント領域 DOM 生成
        ├── _setupCurrentTimeLine() ← 現在時刻ライン初期化
        └── _initLocaleAndRelabel() ← 時刻ラベルのローカライズ
```

### ベースレイヤー生成 (`_createBaseLayer`)

0 〜 23 時間ループで各時間に対して：
1. **`hour-label`** : `top = hour × 60` px に配置、時刻テキストを表示
2. **`hour-line`** : 同じ `top` に水平破線を配置

```javascript
for (let hour = 0; hour < 24; hour++) {
    const topPosition = hour * this.HOUR_HEIGHT; // hour × 60
    label.style.top = `${topPosition}px`;
    line.style.top  = `${topPosition}px`;
}
```

### 時刻ラベルのローカライズ

`window.formatTime()` / `window.formatTimeByFormat()` / `window.formatTimeForLocale()` を順に検索して利用。
- 英語 (en) : 12時間表記 ("12:00 PM") または 24時間表記
- 日本語 (ja) : 24時間表記 ("12:00")

---

## 4. イベント配置計算 (EventLayoutManager)

`src/side_panel/time-manager.js`

イベント同士が時間的に重複する場合に、横並びで配置するためのレイアウトエンジン。

### 4.1 レイアウト定数

```javascript
const LAYOUT_CONSTANTS = {
    BASE_LEFT: 40,           // イベント左端の基準位置 (px) = 時刻ラベル幅
    GAP: 5,                  // レーン間のギャップ (px)
    RESERVED_SPACE_MARGIN: 5,  // 右端の余白 (px)
    MIN_WIDTH: 100,          // 最小保証幅 (px)
    DEFAULT_WIDTH: 200,      // baseElement なし時のデフォルト幅 (px)
    MIN_CONTENT_WIDTH: 20,   // 最小コンテンツ幅 (px)
    MIN_DISPLAY_WIDTH: 100,  // タイトルのみ表示に切り替える閾値 (px)
    Z_INDEX: 21,

    LANE_THRESHOLDS: {
        COMPACT: 2,  // このレーン数以下でコンパクト
        MICRO: 4     // このレーン数以下でマイクロ
    }
};
```

### 4.2 利用可能幅の計算 (`_calculateMaxWidth`)

```
maxWidth = panel幅 - BASE_LEFT - RESERVED_SPACE_MARGIN
         = panel幅 - 40 - 5
         = panel幅 - 45px

下限: MAX(maxWidth, MIN_WIDTH=60)
```

`ResizeObserver` でパネル幅変化を監視し、5px 以上の変化があった場合に再計算。
デバウンス: 100ms。

### 4.3 重複検出 (`_areEventsOverlapping`)

時刻を分単位の整数値にキャッシュして比較：

```javascript
// 時刻キャッシュ: ISO文字列 → 0時からの経過分
_getCachedTimeValue(time) {
    return time.getHours() * 60 + time.getMinutes();
}

// 重複条件: 互いの区間が交差する
start1 < end2 AND start2 < end1
```

キャッシュ構造: `Map<ISO文字列, 分数>` で同一 Date の再計算を省略。

### 4.4 重複グループ化 (Union-Find)

全イベントペアを O(N²) でスキャンし、重複するペアを Union-Find でグループ化。
推移的な重複 (A↔B, B↔C → A,B,C 同一グループ) も正しく処理する。

```
Union-Find のアルゴリズム:
- Path compression (経路圧縮)
- Union by rank (ランクによる合併)
```

### 4.5 レーン割り当て (`_assignLanesToGroup`)

各グループ内で開始時刻順に並べ、グリーディにレーンを割り当てる：

```
レーン = [イベントのリスト]

for event in グループ(開始時刻順):
    for i, lane in lanes:
        if lane内の全イベントと重複しない:
            lane.push(event)
            event.lane = i
            BREAK
    else:
        lanes.push([event])
        event.lane = lanes.length - 1

event.totalLanes = lanes.length
```

### 4.6 位置・幅の計算 (単独イベント)

```javascript
element.style.left  = `${BASE_LEFT}px`;          // 40px
element.style.width = `${maxWidth}px`;
element.style.zIndex = Z_INDEX;                   // 21
```

### 4.7 位置・幅の計算 (複数重複イベント)

```
totalGap      = GAP × (laneCount - 1)             // 5 × (N-1)
availableWidth = maxWidth - totalGap
laneWidth     = MAX(availableWidth / laneCount, MIN_CONTENT_WIDTH=20)

各イベントの left:
leftPosition  = BASE_LEFT + lane × (laneWidth + GAP)
              = 40 + lane × (laneWidth + 5)
```

**例: 3つのイベントが重複、maxWidth=200px の場合**
```
totalGap      = 5 × 2 = 10px
availableWidth = 200 - 10 = 190px
laneWidth     = 190 / 3 ≈ 63px

lane 0: left = 40 + 0 × (63+5) = 40px
lane 1: left = 40 + 1 × (63+5) = 108px
lane 2: left = 40 + 2 × (63+5) = 176px
```

### 4.8 z-index 決定

後から始まるイベントが手前に表示されるよう、開始時刻の分数を加算：

```javascript
zIndex = Z_INDEX + startValue  // 21 + (時刻の分数)
```

### 4.9 パディング調整

レーン数によって自動的に CSS クラスで padding を調整：

| レーン数 | モード | CSS クラス | padding (CSS定義) |
|----------|--------|-----------|-------------------|
| 1〜2     | BASIC  | なし      | 5px 10px (デフォルト) |
| 3〜4     | COMPACT | `.compact` | 8px (左右のみ)   |
| 5以上    | MICRO  | `.micro`   | 6px (左右のみ)   |

**注**: パディング値はCSSで定義されており、JavaScriptの定数には含まれていません。

### 4.10 幅が狭い場合の表示最適化

```javascript
if (laneWidth < MIN_DISPLAY_WIDTH) {  // 100px未満
    element.classList.add('narrow-display');   // タイトルのみ表示
} else {
    element.classList.remove('narrow-display');
}
```

### 4.11 CSS トランジション制御

レイアウト再計算時に `no-transition` クラスを付与してアニメーションを一時停止し、
`requestAnimationFrame` 後に削除してスムーズな復帰を実現：

```javascript
element.classList.add('no-transition');    // 即座に配置
requestAnimationFrame(() => {
    element.classList.remove('no-transition'); // アニメーション再開
});
```

---

## 5. 現在時刻ライン (CurrentTimeLineManager)

`src/lib/current-time-line-manager.js`

### 表示条件

対象日が **今日の日付と一致する場合のみ** 表示：

```javascript
today.toDateString() === targetDate.toDateString()
```

### 位置計算

```
topPosition (px) = hours × 60 + minutes  // 1分 = 1px
```

例: 現在時刻が 14:35 の場合
```
top = 14 × 60 + 35 = 875px
```

### 自動更新

`setInterval` で **60秒ごと** に `_updatePosition()` を呼び出して位置を更新。

### ライフサイクル

```
new CurrentTimeLineManager(parentElement, targetDate)
    └── update()
        ├── _shouldShowTimeLine()     ← 表示判定
        ├── _ensureTimeLineElement()  ← DOM 生成 (重複防止)
        ├── _updatePosition()         ← top 設定
        └── show()                   ← display 解除 + タイマー開始

setTargetDate(date) → update()       ← 日付変更時
forceHide()         → hide() + タイマー停止
destroy()           → DOM削除 + タイマー停止
```

### DOM

```html
<div id="currentTimeLine" class="current-time-line"
     style="top: 875px;">
</div>
```

---

## 6. 業務時間背景の表示

`TimelineComponent.setWorkTimeBackground(startTime, endTime, color)`

### 計算式

```javascript
startMinutes = startHour × 60 + startMinute
endMinutes   = endHour × 60 + endMinute

// DOM に適用
background.style.top    = `${startMinutes}px`;
background.style.height = `${endMinutes - startMinutes}px`;
```

**例: 9:00〜18:00 の業務時間**
```
top    = 9 × 60 + 0 = 540px
height = (18 × 60 + 0) - 540 = 540px
```

生成される `.work-time-background` 要素は `z-index: 1` で最背面に配置される。

---

## 7. CSS 詳細

### 7.1 CSS カスタムプロパティ (色変数)

```css
:root {
    --side-calendar-work-time-color:      #d4d4d4;  /* 業務時間背景 */
    --side-calendar-break-time-color:     #fda9ca;  /* 休憩時間背景 */
    --side-calendar-local-event-color:    #bbf2b1;  /* ローカルイベント */
    --side-calendar-current-time-line-color: #ff0000; /* 現在時刻ライン */
}
```

### 7.2 メインタイムテーブル

```css
.side-time-table {
    position: relative;
    border: 1px solid #ccc;
    height: calc(100vh - 120px);  /* ヘッダー等を除いた画面高さ */
    overflow-y: auto;              /* 縦スクロール */
}
```

### 7.3 ベースレイヤー・イベントレイヤー

```css
.side-time-table-base {
    position: absolute;
    left: 0; right: 0;
    height: 1440px;  /* 24h × 60px */
    z-index: 10;
}

.side-time-table-events {
    position: absolute;
    left: 0; width: 100%;
    height: 1440px;
    z-index: 20;
}
```

### 7.4 時刻ラベル

```css
.hour-label {
    position: absolute;
    left: 0;
    width: 35px;
    text-align: right;
    padding-right: 5px;
    font-size: 12px;
    transform: translateY(-50%);  /* 線の中央に揃える */
    z-index: 30;
}
```

### 7.5 時刻区切り線

```css
.hour-line {
    position: absolute;
    left: 40px;                    /* 時刻ラベル幅の直後から */
    width: calc(100% - 40px);
    border-top: 1px dashed #ccc;
    z-index: 31;
}
```

### 7.6 イベント共通スタイル

```css
.event {
    position: absolute;
    left: 35px;               /* BASE_LEFT - 5px (EventLayoutManager が上書き) */
    padding: 5px 10px;
    background: lightgray;
    border-radius: 5px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    z-index: 21;

    /* 幅・位置のスムーズな移動 */
    transition: left 0.2s ease-out, width 0.2s ease-out;

    /* テキストはみ出し防止 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    min-width: 60px;
    font-size: clamp(0.75rem, 1vw, 1rem);  /* レスポンシブフォント */
}

/* トランジション一時無効 (レイアウト再計算時) */
.event.no-transition {
    transition: none !important;
}

/* 短時間イベント */
.short {
    padding: 0 10px;
}
```

### 7.7 イベント種別スタイル

```css
/* ローカルイベント: CSS変数で緑系 */
.local-event {
    background-color: var(--side-calendar-local-event-color);  /* #bbf2b1 */
}

/* Google イベント: JavaScript から動的にカレンダーの色を設定 */
.google-event {
    /* background は JS が API の色コードで設定 */
}
```

### 7.8 密度別スタイル (CSS クラス)

レーン密度 (EventLayoutManager が付与) による **水平方向** の最適化：

```css
/* 3〜4レーン時: 横パディング・フォント縮小 */
.event.compact {
    padding-left: 8px;
    padding-right: 8px;
    font-size: 0.85em;
    line-height: 1.2;
}

/* 5レーン以上: さらに縮小 */
.event.micro {
    padding-left: 6px;
    padding-right: 6px;
    font-size: 0.75em;
    line-height: 1.1;
}
```

### 7.9 継続時間別スタイル (CSS クラス)

継続時間 (applyDurationBasedStyling が付与) による **垂直方向** の最適化：

| クラス | 閾値 | 説明 |
|--------|------|------|
| `event-compact` | ≤ 30 分 | 上下パディングを 2px に縮小 |
| `event-micro`   | ≤ 15 分 | 上下パディングを 0 に、最小高さを保証 |

```css
/* 30分以下: 上下パディング縮小 */
.event.event-compact {
    padding-top: 2px;
    padding-bottom: 2px;
}

/* 15分以下: パディング除去 + 最小高さ保証 */
.event.event-micro {
    padding-top: 0;
    padding-bottom: 0;
    min-height: 15px;  /* JS の MIN_HEIGHT (15) と一致させ CSS レベルでも保証 */
}
```

**高さの決定ロジック:**

```
height = Math.max(durationMinutes, MIN_HEIGHT=15)  // JS inline style
                                                    // ↑ と同値を CSS min-height でも保証
```

`event-micro` の閾値 (15分) と `MIN_HEIGHT` (15px) を揃えることで、
0〜15分の全イベントが最低 1 スロット分の高さを持つことが保証される。

### 7.10 現在時刻ライン

```css
.current-time-line {
    position: absolute;
    width: 100%;   /* パネル全幅 (時刻ラベル列を含む) */
    height: 2px;
    background-color: var(--side-calendar-current-time-line-color);  /* 赤 */
    z-index: 32;   /* 全要素の最前面 */
}
```

---

## 8. スクロール制御

`TimelineComponent` が提供するスクロールメソッド：

### scrollToTime(time: "HH:MM")

```javascript
const [hour, minute] = time.split(':').map(Number);
const totalMinutes   = hour * 60 + minute;
const scrollTop      = Math.max(0, totalMinutes - 200); // 200px 上に余白
element.scrollTop    = scrollTop;
```

### scrollToCurrentTime()

今日の表示時のみ動作。現在時刻を `scrollToTime()` に渡す。

### scrollToWorkTime(startTime)

業務開始時刻を `scrollToTime()` に渡す。

---

## 9. レスポンシブ対応

### ResizeObserver によるリアルタイム幅更新

```
ResizeObserver → baseElement の幅変化を検知
    → 100ms デバウンス
        → _calculateMaxWidth() で maxWidth 再計算
            → 変化量が 5px 以上なら calculateLayout() 再実行
```

### 各状態での幅計算例

| パネル幅 | BASE_LEFT | RESERVED_SPACE_MARGIN | maxWidth |
|----------|-----------|----------------------|----------|
| 320px    | 40px      | 5px                  | 275px    |
| 200px    | 40px      | 5px                  | 155px    |
| 150px    | 40px      | 5px                  | 105px    |
| 100px    | 40px      | 5px                  | 60px (MIN_WIDTH) |

### フォントの自動調整

```css
font-size: clamp(0.75rem, 1vw, 1rem);
```

---

## 10. z-index マップ

| 要素 | z-index | 説明 |
|------|---------|------|
| `.work-time-background` | 1 | 業務時間背景 |
| `.hour-line` | 5 | 区切り線 |
| `.current-time-line` | 10 | 現在時刻ライン (イベントの下) |
| `.side-time-table-base` | 10 | 時刻軸ベース |
| `.hour-label` | 15 | 時刻ラベル |
| `.side-time-table-events` | 20 | イベントレイヤー |
| `.event` (単独) | 21 | 重複なしイベント (CSS・JS 一致) |
| `.event` (重複) | 21 + startMinutes | 開始が遅いほど前面 |
| `#sideTimeTableHeaderWrapper` | 100 | ヘッダー (sticky) |
| `.modal` | 100 | モーダルダイアログ |

---

## 付録: イベント配置の全体フロー

```
1. イベントデータ取得
   (Google Calendar API / Chrome Storage)
        ↓
2. DOM 要素生成
   .event.local-event / .event.google-event
   style.top    = startMinutes (px)
   style.height = durationMinutes (px)
        ↓
3. EventLayoutManager.registerEvent() で登録
        ↓
4. EventLayoutManager.calculateLayout() 実行
   a. _calculateMaxWidth()     ← 利用可能幅を確定
   b. _groupOverlappingEvents() ← Union-Find でグループ化
   c. グループ内分岐:
      - 単独: _applySingleEventLayout()
              left=40px, width=maxWidth
      - 複数: _assignLanesToGroup() でレーン割り当て
              _applyMultiEventLayout() で位置・幅を計算
        ↓
5. DOM への反映 (requestAnimationFrame)
   style.left   = BASE_LEFT + lane × (laneWidth + GAP)
   style.width  = laneWidth
   style.zIndex = 5 + startMinutes
   style.padding = 10/8/6px (レーン数による)
        ↓
6. CurrentTimeLineManager.update() で現在時刻ライン更新
   (今日のみ表示、60秒ごとに自動更新)
```

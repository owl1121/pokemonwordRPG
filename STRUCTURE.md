# 結構說明（給 AI 開新對話時先讀這份）

純前端單頁遊戲，無建置流程。`index.html` 依序載入 `data.js` → `mon-parts.js` → `mon-art.js` → `sounds/list.js`（可缺）→ `battle.js` → `features.js`，再跑 index.html 內的主程式。全域變數共用，不是 ES module。
存檔在 `localStorage`，key 為 `pkmn_tower_save_v2`（舊版 v1 會自動轉移）。行號會隨修改位移，僅供定位，請用 grep 函式名。

## 檔案

| 檔案 | 內容 |
|---|---|
| `data.js`（約 1100 行） | 純資料表：`DEX`（圖鑑，`[名稱,屬性1,屬性2,tier]`，依世代排）、`EVO`/`STONE_EVO`/`TIME_EVO`（進化）、`CHART`（屬性相剋）、`MOVES`、`STATUS_FX`、`ITEMS`、`GYMS`、`TRAINERS`、`QUESTS`、`MILESTONES`、`MEGAS`、`CHECKIN_*`、`MAP_NAMES` |
| `mon-art.js` | 每隻寶可夢「專屬手繪」外框裝飾：`MON_ART[DEX索引]` = 一串 piece（`s` 貼哪一邊 t/b/l/r、`x`/`xr`/`xc`/`y`/`yb`/`yc` 位置、`svg` 自己畫的圖），`monArtHtml(dex)` 組成 HTML。有專屬圖就用這個，沒有的退回 `mon-parts.js` 零件組。目前做完索引 0~9（妙蛙種子～綠毛蟲），一代其餘仍用零件組，要逐隻改成專屬圖 |
| `mon-parts.js` | 寶可夢外觀的 SVG 零件庫：`MON_FEATURES`（零件，共 77 種；成對零件用 `sidePair` 產生左右鏡射；零件位置 CSS 在 index.html 的 `.ft-xxx`）、`MON_PARTS`（每隻的顏色 c1~c3 與零件清單 ft，key 為 DEX 索引）。一代 151 隻（索引 0~150）已全部設定完成，二代起尚未做 |
| `battle.js`（約 1420 行） | 音效 `SFX`、屬性相剋 `eff`、傷害 `dmg`/`attackCore`、回合流程 `playerMove`/`enemyTurn`/`endOfTurn`、捕捉 `tryCatch`、換人、進化 `evoTarget`/`evolveTo`、經驗 `grantExp`、戰鬥結算 `winBattle`/`loseBattle`、對戰畫面 `renderStage`/`screenBattle`、擊倒與捕捉動畫 `koFx`/`catchFx`、球框 `FRAME_*` |
| `features.js`（約 550 行） | 性格 `NATURES`、特性 `ABILITIES`、攜帶道具 `HELD`（含商店 `screenHeldShop`）、每日活動 `DAILY_EVENTS`、天氣 `WEATHER`、戰鬥中各種效果掛勾（`afterHitFx`、`endTurnFx`、`onEntry` 等） |
| `index.html`（約 2960 行） | 見下 |
| `tools/check-mon-parts.js` | 驗證 `mon-parts.js`：`node tools/check-mon-parts.js` |
| `test-save.json` | 測試用存檔（約 600KB，不要整個讀進對話） |

## index.html 內部分段

- 第 7~449 行：CSS
- 第 450~470 行：HTML 骨架（`#stage` 對戰畫面、`#log` 文字、`#bar` 狀態列、`#opts` 選項按鈕、`#modal` 選單、`#hub` 活動/信箱）
- 第 476~802 行：節日活動 `EVENTS`、背景主題、信箱 `mail*`、`openHub`
- 第 815 行起：主程式。常數、`makeMon`（產生寶可夢）、能力值/個體值計算、塔與傳說挑戰規則、`state`（全部遊戲狀態）、`print`（文字輸出）、`setOptions`（選項按鈕）
- 約 1071~1260 行：存檔 `saveGame`/`loadGame`/匯出入
- 之後是各個畫面函式，命名都是 `screenXxx`：`screenField`（野外主畫面）、`encounter`（遇敵）、`screenShop`、`screenTower`（無盡塔）、`screenGym`（道館）、`screenParty`/`screenBox`/`screenBag`、`screenDex`（圖鑑）、Mega 進化相關 `startMegaBattle`/`megaEvolve`
- 約 2615 行起：成就 `ACH`、稱號、簽到、任務、個人資料；`openMenu` 為選單入口
- 最後兩個 `<script>`：音效掛勾（用 `wrap` 包住 `doAttack` 等函式）、按鈕按下動畫

## 慣例

- 畫面切換 = 呼叫某個 `screenXxx()`，內部用 `print()` 輸出文字、`setOptions([...])` 放按鈕。
- 改完要存檔就呼叫 `saveGame()`；新增存檔欄位要在 `loadGame`/`fixMon` 補預設值，避免舊存檔壞掉。
- 新增寶可夢外觀（優先）：在 `mon-art.js` 的 `MON_ART` 加一隻專屬 SVG，左側突出量 ≤ 約 28px。舊做法：在 `mon-parts.js` 加 `MON_PARTS[DEX索引]`，改完跑 `tools/check-mon-parts.js`。新增零件要同時加 `MON_FEATURES.xxx`（SVG）和 index.html 的 `.ft-xxx` 定位 CSS；同一位置（頭頂中央、右下尾巴）不要疊兩個零件。卡片寬度是畫面的 66% 且靠左，左側零件突出量要 ≤ 約 28px，不然會被畫面邊緣切掉。
- 商店買東西一律「選道具 → 選數量 → 確認頁」才扣錢：一般商店 `screenShop` → `screenShopItem` → `screenShopConfirm` → `buyItem`；攜帶道具 `screenHeldShop` → `screenHeldBuy` → `screenHeldConfirm` → `buyHeld`。新增購買入口也要走確認頁。
- 各檔之間用全域函式互相呼叫，改函式名要全 repo grep。

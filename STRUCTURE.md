# 結構說明（給 AI 開新對話時先讀這份）

純前端單頁遊戲，無建置流程。`index.html` 依序載入 `data.js` → `mon-art.js` → `mon-art-gen1.js`~`mon-art-gen7.js` → `sounds/list.js`（可缺）→ `battle.js` → `features.js`，再跑 index.html 內的主程式。全域變數共用，不是 ES module。
存檔在 `localStorage`，key 為 `pkmn_tower_save_v2`（舊版 v1 會自動轉移）。行號會隨修改位移，僅供定位，請用 grep 函式名。

## 檔案

| 檔案 | 內容 |
|---|---|
| `data.js`（約 1100 行） | 純資料表：`DEX`（圖鑑，`[名稱,屬性1,屬性2,tier]`，依世代排）、`EVO`/`STONE_EVO`/`TIME_EVO`（進化）、`CHART`（屬性相剋）、`MOVES`、`STATUS_FX`、`ITEMS`、`GYMS`、`TRAINERS`、`QUESTS`、`MILESTONES`、`MEGAS`、`CHECKIN_*`、`MAP_NAMES` |
| `mon-art.js` | 外框特徵的共用部分：宣告 `const MON_ART = {}`，和 `monArtHtml(dex)`（把 piece 組成 HTML）。`MON_ART[DEX索引]` = 一串 piece（`s` 貼哪一邊 t/b/l/r、`x`/`xr`/`xc`/`y`/`yb`/`yc` 位置、`svg` 是 HTML 字串）。沒有在 MON_ART 裡的寶可夢不畫特徵。 |
| `mon-art-gen1.js`~`mon-art-gen7.js` | 外框特徵資料，依世代拆檔，各自 `Object.assign(MON_ART, {...})`：gen1 索引 0~150（#1~#151）、gen2 151~250、gen3 251~385、gen4 386~492（#387~#493）、gen5 493~648（#494~#649）、gen6 649~720（#650~#721）、gen7 721~808（#722~#809）。全部是 base64 內嵌的像素圖 `<img>`：0~2 是使用者提供的像素圖，3~385 從 PokeAPI 第三代火紅葉綠（64×64）切出特徵，386~492 用 PokeAPI 白金版（80×80，火紅葉綠沒有第四代），493~648 用 PokeAPI 黑白版（96×96），649~808 用 PokeAPI generation-v/black-white 資料夾裡社群補的第六、七代黑白風格像素圖（96×96，非官方）。每隻只做一個主要特徵，蓋進球框 2px。各檔尾端 `/*__NEXT__*/` 是該代新增下一隻的插入點（前一隻結尾要補逗號）。之後做第八代就新增 `mon-art-gen8.js`，並在 index.html 的 gen7 後面加一行 `<script>`。切圖規則見專案文件「畫外框規則」。 |
| `battle.js`（約 1420 行） | 音效 `SFX`、屬性相剋 `eff`、傷害 `dmg`/`attackCore`、回合流程 `playerMove`/`enemyTurn`/`endOfTurn`、捕捉 `tryCatch`、換人、進化 `evoTarget`/`evolveTo`、經驗 `grantExp`、戰鬥結算 `winBattle`/`loseBattle`、對戰畫面 `renderStage`/`screenBattle`、擊倒與捕捉動畫 `koFx`/`catchFx`、球框 `FRAME_*` |
| `features.js`（約 550 行） | 性格 `NATURES`、特性 `ABILITIES`、攜帶道具 `HELD`（含商店 `screenHeldShop`）、每日活動 `DAILY_EVENTS`、天氣 `WEATHER`、戰鬥中各種效果掛勾（`afterHitFx`、`endTurnFx`、`onEntry` 等） |
| `index.html`（約 2960 行） | 見下 |
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
- 新增寶可夢外觀：在對應世代的 `mon-art-genN.js` 加一隻（索引 = 圖鑑編號 − 1），左側突出量 ≤ 約 28px（卡片寬度是畫面的 66% 且靠左，超出會被畫面邊緣切掉）。沒有專屬圖的寶可夢不畫特徵（舊的 mon-parts.js 零件組已刪除）。
- 商店買東西一律「選道具 → 選數量 → 確認頁」才扣錢：一般商店 `screenShop` → `screenShopItem` → `screenShopConfirm` → `buyItem`；攜帶道具 `screenHeldShop` → `screenHeldBuy` → `screenHeldConfirm` → `buyHeld`。新增購買入口也要走確認頁。
- 各檔之間用全域函式互相呼叫，改函式名要全 repo grep。

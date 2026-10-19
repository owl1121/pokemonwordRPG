# 結構說明（給 AI 開新對話時先讀這份）

純前端單頁遊戲，無建置流程。`index.html` 依序載入 `data.js` → `mon-art.js` → `mon-colors.js` → `sounds/list.js`（可缺）→ `battle.js` → `features.js`，再跑 index.html 內的主程式。全域變數共用，不是 ES module。
外框特徵圖（約 4MB）**不在 index.html 載入**，由 `mon-art.js` 的 `loadArtFile()` 在對戰卡片要畫某隻時才動態載入該組的檔案（見下）。
存檔在 `localStorage`，key 為 `pkmn_tower_save_v2`（舊版 v1 會自動轉移）。行號會隨修改位移，僅供定位，請用 grep 函式名。

## 檔案

| 檔案 | 內容 |
|---|---|
| `data.js`（約 1100 行） | 純資料表：`DEX`（圖鑑，`[名稱,屬性1,屬性2,tier]`，依世代排）、`EVO`/`STONE_EVO`/`TIME_EVO`（進化）、`CHART`（屬性相剋）、`MOVES`、`STATUS_FX`、`ITEMS`、`GYMS`、`TRAINERS`、`QUESTS`、`MILESTONES`、`MEGAS`（`[圖鑑編號,後綴,屬性1,屬性2]`，id = 編號+後綴，例如 `6X`）、`CHECKIN_*`、`MAP_NAMES` |
| `mon-art.js` | 外框特徵的共用部分：宣告 `const MON_ART = {}`、`const MON_ART_SHINY = {}`；延遲載入 `artGroup(key)`/`artFile(key, shiny)`/`loadArtFile(檔名)`（回傳 Promise，失敗就不畫、不重試）/`artLoaded`/`artFilesFor(m)`（某隻要用的檔，含超進化、異色）/`preloadArtFor(list)`（空閒時預載，開機時對隊伍呼叫）；`monArtHtml(key, table)`（把 piece 組成 HTML）。piece 格式：`s` 貼哪一邊 t/b/l/r、`x`/`xr`/`xc`/`y`/`yb`/`yc` 位置、`svg` 是 HTML 字串。沒有在 MON_ART 裡的寶可夢不畫特徵。 |
| `mon-art-gen1.js`~`mon-art-gen9.js`、`mon-art-regional.js`、`mon-art-mega.js` | 一般版外框特徵資料，各自 `Object.assign(MON_ART, {...})`。索引分組（同 `ART_GROUPS`）：gen1 0~150（#1~#151）、gen2 151~250、gen3 251~385、gen4 386~492、gen5 493~648、gen6 649~720、gen7 721~808、gen8 809~904（#810~#905，含洗翠 #899~#905）、regional 905~961（地區形態）、gen9 962~1081（#906~#1025，索引 = 編號 + 56）、mega key 是 `'M'+MEGAS.id`（例如 `'M6X'`）。全部是 base64 內嵌的像素圖 `<img>`：0~2 是使用者提供的像素圖，3~385 從 PokeAPI 第三代火紅葉綠（64×64）切出特徵，386~492 用白金版（80×80），493~648 用黑白版（96×96），649~904 和 962~1081 用 PokeAPI generation-v/black-white 資料夾裡社群補的第六~九代黑白風格像素圖（96×96，非官方）；地區形態和超進化用同資料夾的形態圖（10xxx），Mega基格爾德（10301）沒像素圖，用 HOME 圖縮成 96×96。每隻只做一個主要特徵，蓋進球框 2px（'t' top:-7px、'b' top:7px、'r' left:7px、'l' left:-7px；#1~#25 是使用者定案的舊偏移，不要動）。gen1~gen9 檔尾 `/*__NEXT__*/` 是該組新增下一隻的插入點（前一隻結尾要補逗號）。切圖規則見專案文件「畫外框規則」。 |
| `mon-art-shiny-gen1.js`~`…-gen9.js`、`mon-art-shiny-regional.js`、`mon-art-shiny-mega.js` | 異色版，`Object.assign(MON_ART_SHINY, {...})`，分組和 key 同一般版（全部 1175 組）。用「一般圖→異色圖」逐像素顏色對照把 MON_ART 重新上色產生；MON_ART 改了某隻就要對那隻重跑上色並寫回對應組的 shiny 檔（工具見專案文件「外框工具腳本-異色」）。 |
| `mon-colors.js` | 每隻寶可夢的代表色 `MON_COLORS[key] = [一般主色, 一般副色, 異色主色, 異色副色]`（key 同 MON_ART），從 PokeAPI 像素圖自動抓（略過黑色描邊）。給「無框」邊框用。直接載入（約 58KB）。 |
| `battle.js`（約 1450 行） | 音效 `SFX`、屬性相剋 `eff`、傷害 `dmg`/`attackCore`、回合流程 `playerMove`/`enemyTurn`/`endOfTurn`、捕捉 `tryCatch`、換人、進化 `evoTarget`/`evolveTo`、經驗 `grantExp`、戰鬥結算 `winBattle`/`loseBattle`、對戰畫面 `renderStage`/`screenBattle`、擊倒與捕捉動畫 `koFx`/`catchFx`、球框 `FRAME_*`（`none` 無框：`frameStyle()` 用 MON_COLORS 做上→下雙色漸層，異色用異色色、超進化中用超進化色；其他球種照原本球的配色）。外框特徵 `frameFeatures(m)`：圖檔還沒載就先回空字串並觸發載入，載完 `refreshFrameFeatures()` 補進場上的 `.card.me`（超進化中優先用 `'M'+id`，異色優先用 MON_ART_SHINY）。 |
| `features.js`（約 560 行） | 性格 `NATURES`、特性 `ABILITIES`、攜帶道具 `HELD`（含商店 `screenHeldShop`）、每日活動 `DAILY_EVENTS`、天氣 `WEATHER`、戰鬥中各種效果掛勾（`afterHitFx`、`endTurnFx`、`onEntry` 等） |
| `index.html`（約 2960 行） | 見下 |
| `test-save.json` | 測試用存檔（約 600KB，不要整個讀進對話）。網址加 `?test` 會載入 |

## index.html 內部分段

- 第 18~427 行：CSS（`.art` 是 `z-index:-1`，靠 `#stage{isolation:isolate}` 才會在背景之上、卡片之下）
- 第 430~445 行：HTML 骨架（`#stage` 對戰畫面、`#log` 文字、`#bar` 狀態列、`#opts` 選項按鈕、`#modal` 選單、`#hub` 活動/信箱）
- 約 466~846 行：節日活動 `EVENTS`、背景主題、信箱 `mail*`、`openHub`
- 約 848 行起：主程式。常數、`makeMon`（產生寶可夢）、能力值/個體值計算、塔與傳說挑戰規則、`state`（全部遊戲狀態）、`print`（文字輸出）、`setOptions`（選項按鈕）
- 約 1052~1250 行：存檔 `saveGame`/`loadGame`/匯出入
- 之後是各個畫面函式，命名都是 `screenXxx`：`screenField`（野外主畫面，約 1366 行）、`encounter`（遇敵）、`screenShop`、`screenTower`（無盡塔）、`screenGym`（道館）、`screenParty`/`screenBox`/`screenBag`、`screenDex`（圖鑑）、Mega 進化相關 `startMegaBattle`/`megaEvolve`
- 約 2608 行起：成就 `ACH`、稱號、簽到、任務、個人資料；`openMenu`（約 2827 行）為選單入口
- 約 2890 行：BOOT（`loadGame` → `preloadArtFor(state.party)` → `screenCover`）
- 最後兩個 `<script>`：音效掛勾（用 `wrap` 包住 `doAttack` 等函式）、按鈕按下動畫

## 慣例

- 畫面切換 = 呼叫某個 `screenXxx()`，內部用 `print()` 輸出文字、`setOptions([...])` 放按鈕。
- 改完要存檔就呼叫 `saveGame()`；新增存檔欄位要在 `loadGame`/`fixMon` 補預設值，避免舊存檔壞掉。
- 新增寶可夢外觀：在對應組的 `mon-art-*.js` 加一隻（索引 = 圖鑑編號 − 1，第九代 + 56），左側突出量 ≤ 約 28px（卡片寬度是畫面的 66% 且靠左，超出會被畫面邊緣切掉）；上緣特徵放在卡片右半邊（x 超過約 50%）會被對手卡片蓋住。新增一組檔案要同步改 `mon-art.js` 的 `ART_GROUPS`。
- 預覽或測試外框時，要先 `await loadArtFile(artFile(key))`（異色再載 `artFile(key, true)`），MON_ART 才會有資料。
- 商店買東西一律「選道具 → 選數量 → 確認頁」才扣錢：一般商店 `screenShop` → `screenShopItem` → `screenShopConfirm` → `buyItem`；攜帶道具 `screenHeldShop` → `screenHeldBuy` → `screenHeldConfirm` → `buyHeld`。新增購買入口也要走確認頁。
- 各檔之間用全域函式互相呼叫，改函式名要全 repo grep。

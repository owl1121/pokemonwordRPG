# 結構說明（給 AI 開新對話時先讀這份）

純前端單頁遊戲，無建置流程。`index.html` 依序載入 `data.js` → `moves-data.js` → `mon-art.js` → `mon-colors.js` → `sounds/list.js`（可缺）→ `battle.js` → `features.js` → `moves.js`，再跑 index.html 內的主程式。全域變數共用，不是 ES module。
寶可夢卡片底圖在 `art/`（每張約 13KB，瀏覽器顯示卡片時才下載）。
存檔在 `localStorage`，key 為 `pkmn_tower_save_v2`（舊版 v1 會自動轉移）。行號會隨修改位移，僅供定位，請用 grep 函式名。

## 檔案

| 檔案 | 內容 |
|---|---|
| `data.js`（約 1090 行） | 純資料表：`DEX`（圖鑑，`[名稱,屬性1,屬性2,tier]`，依世代排）、`EVO`/`STONE_EVO`/`TIME_EVO`（進化）、`CHART`（屬性相剋）、`ITEMS`（含解眠藥、解凍藥、萬能藥，`cure:'any'`＝全治）、`GYMS`、`TRAINERS`、`QUESTS`、`MILESTONES`、`MEGAS`（`[圖鑑編號,後綴,屬性1,屬性2]`，id = 編號+後綴，例如 `6X`）、`CHECKIN_*`、`MAP_NAMES` |
| `moves-data.js`（自動產生，約 190KB） | 本傳招式資料，來源 PokeAPI（產生腳本見專案文件「招式資料腳本」，不要手改）：`MOVE_DB[id] = [名稱,屬性,種類 0物理/1特殊/2變化,威力,PP,命中(0必中),先制度,效果碼,(1=不會被守住擋)]`、`TM_LIST`（朱紫招式學習器 `[編號,招式id]`）、`DEX_WEIGHT`（體重 0.1kg）、`LEARNSET[DEX索引]`（`"等級.招式id ..."` 皆 36 進位，等級 0＝進化時學；`|` 後是學習器相容位元的 16 進位字串）。學習表優先用朱紫，沒收錄的用劍盾、究極日月；地區形態用各自的表，超進化用原形態。 |
| `moves.js`（約 1270 行） | 招式系統。招式物件 `makeMove(id)`；學習表 `learnset`/`knownMoves(m)`（依等級算＋`m.xm` 額外學會的）/`defaultMoves(dex,lv)`（最後學的 4 招，至少 2 招攻擊、進化招優先）/`learnOnLevel`/`learnOnEvolve`/`migrateMoves`（舊存檔）。出招 `useMove` → `useStatusMove`/`useDamageMove`，效果碼由 `runFx`/`specialFx` 處理（說明表 `SP_DESC`）；變動威力 `dmgPower`、固定傷害 `fixedDamage`、會心 `calcHit`、光牆場地 `fieldDmgMul`。能力等級 `statChange`（倍率 `atkMul/defMul/spaMul/sdfMul/spdMul/accMul/evaMul`）、異常 `setStatus`（含睡眠 `_slp`、劇毒 `_tox`、冰凍）、混亂 `setConfuse`。場地 `state.battle.field`（terrain、troom、mroom、wroom、grav、sport）、雙方場地 `state.battle.side.me/foe`（光牆反射壁、順風、撒菱類 `hz`、願望、預知未來）。能不能用 `moveBlockReason`、對手選招 `chooseFoeMove`（排除沒用的變化招）。換人 `pivotOut`/`screenPivot`/`doFoePivot`/`forceOut`、提前結束 `endEarly`/`finishEarly`。每回合 `moveEndTurn`/`fieldEndTurn`，換下場清狀態 `clearVolatile`/`restoreTemp`。另有招式學習器商店 `screenTmShop`→`screenTmItem`→`screenTmConfirm`→`buyTm`（`state.tms[招式id]=數量`）、隊伍招式頁 `screenMoves`/`screenMoveSwap`/`screenTmUse`/`teachTm`、親密度 `friendOf`/`addFriend`/`FRIEND_EVO`、統計頁 `statsHtml`。雙打專用招（幫助、看我嘛等）、自然之恩、投擲沒有收。 |
| `mon-art.js` | 卡片底圖：`monBgSrc(m)` 回傳 `art/<key>.webp`（異色 `art/shiny/<key>.webp`；`ART_SHINY_MISSING` 目前是空的。M445Z、M978 沒有官方圖鑑異色圖，異色改用 PokeAPI HOME 異色圖做）、`preloadArtFor(list)`（開機時空閒預載隊伍的圖）。key 是 DEX 索引或超進化 `'M'+MEGAS.id`。 |
| `art/<key>.webp`、`art/shiny/<key>.webp` | 1175 組（一般＋異色共 2350 張）。來源 PokeAPI official-artwork 官方圖鑑圖 → 256 正方形 → 超強順時針旋渦 → 跟白色 30% 混合調淡 → 裁 256×116 → 霧化（模糊 4px＋蓋 12% 白）→ WebP。key→官方圖編號（地區形態、超進化是 10xxx）與產生腳本見專案文件「外框特徵進度」。舊的外框特徵／旋渦／馬賽克版本都在 git 歷史（原圖 345fea8、旋渦 c24f864、小圖示 e694b91、馬賽克 db4b168）。 |
| `mon-colors.js` | 每隻寶可夢的代表色 `MON_COLORS[key] = [一般主色, 一般副色, 異色主色, 異色副色]`（key 是 DEX 索引或 `'M'+id`），從 PokeAPI 像素圖自動抓（略過黑色描邊）。給「無框」邊框用。直接載入（約 58KB）。 |
| `battle.js`（約 1440 行） | 音效 `SFX`、屬性相剋 `eff`/`moveEff`、傷害 `dmg`（物理特殊看招式 `cls`）/`attackCore`（呼叫 moves.js 的 `useMove`）、回合流程 `playerMove`（`turnOrder`：先比先制度再比速度）/`enemyTurn`/`endOfTurn`、捕捉 `tryCatch`、換人、進化 `evoTarget`/`evolveTo`、經驗 `grantExp`、戰鬥結算 `winBattle`/`loseBattle`、對戰畫面 `renderStage`/`screenBattle`、擊倒與捕捉動畫 `koFx`/`catchFx`、色違出場特效 `shinyFx(side)`（卡片閃兩下＋星星散開＋`SFX` 的 `shiny` 音效，`entryCheck` 遇到色違時呼叫，會等開場動畫播完）、球框 `FRAME_*`（`none` 無框：`frameStyle()` 用 MON_COLORS 做上→下雙色漸層，異色用異色色、超進化中用超進化色；其他球種照原本球的配色）。卡片底圖 `monBgAttr(m, side, extraStyle)`（產生 `.card` 的 class 和 style；玩家和對手卡片都用，`side` 是 `me`/`foe`）：加 class `mz` 和 CSS 變數 `--mzimg:url(art/…)`（超進化中用 `'M'+id` 的圖，異色用 shiny 圖）。`frameStyle(m)` 回傳 CSS 文字（不含 `style=`）。 |
| `features.js`（約 580 行） | 性格 `NATURES`、特性 `ABILITIES`、攜帶道具 `HELD`（含商店 `screenHeldShop`；`holds`/`heldIt` 在被打落、查封、魔法空間時無效）、每日活動 `DAILY_EVENTS`、天氣 `WEATHER`、戰鬥中各種效果掛勾（`afterHitFx`、`endTurnFx`、`onEntry`、`entryCheck`（會呼叫撒菱類 `entryHazards`）、`fxDmgMul`（會心等級看 `move._crit`）等） |
| `index.html`（約 2960 行） | 見下 |
| `test-save.json` | 測試用存檔（約 600KB，不要整個讀進對話）。網址加 `?test` 會載入 |

## index.html 內部分段

- 第 18~435 行：CSS（卡片底圖是 `.card.mz`：`--mzimg` 以 cover 鋪滿 padding-box，`.r1>span`/`.r2`/`.hpt` 各自墊 `--half` 60% 底色）
- 第 430~445 行：HTML 骨架（`#stage` 對戰畫面、`#log` 文字、`#bar` 狀態列、`#opts` 選項按鈕、`#modal` 選單、`#hub` 活動/信箱）
- 約 466~846 行：節日活動 `EVENTS`、背景主題、信箱 `mail*`、`openHub`
- 約 848 行起：主程式。常數、`makeMon`（產生寶可夢）、能力值/個體值計算、塔與傳說挑戰規則、`state`（全部遊戲狀態）、`print`（文字輸出）、`setOptions`（選項按鈕）
- 約 1052~1250 行：存檔 `saveGame`/`loadGame`/匯出入
- 之後是各個畫面函式，命名都是 `screenXxx`：`screenField`（野外主畫面，約 1366 行）、`encounter`（遇敵）、`screenShop`、`screenTower`（無盡塔）、`screenGym`（道館）、`screenParty`/`screenBox`/`screenBag`、`screenDex`（圖鑑）、Mega 進化相關 `startMegaBattle`/`megaEvolve`
- 約 2608 行起：成就 `ACH`、稱號、簽到、任務、個人資料；`openMenu`（約 2827 行）為選單入口
- 約 2890 行：BOOT（`loadGame` → `preloadArtFor(state.party)（預載隊伍底圖）` → `screenCover`）
- 最後兩個 `<script>`：音效掛勾（用 `wrap` 包住 `doAttack` 等函式）、按鈕按下動畫

## 慣例

- 畫面切換 = 呼叫某個 `screenXxx()`，內部用 `print()` 輸出文字、`setOptions([...])` 放按鈕。
- 改完要存檔就呼叫 `saveGame()`；新增存檔欄位要在 `loadGame`/`fixMon` 補預設值，避免舊存檔壞掉。
- 寶可夢身上的招式：`m.moves`（上場 4 招，招式物件含 `id`）、`m.xm`（額外學會的招式 id）、`m.friend`（親密度 0~255，預設 70）。對戰中的暫時狀態都是底線開頭（`_sub`、`_cnf`、`_seed`…），換下場或對戰結束由 `clearVolatile` 清掉。
- 統計 `state.stats` 新增：`losses`、`flees`、`faints`、`movesUsed`、`crits`、`maxHit`/`maxHitBy`、`tmUsed`、`pu`（各圖鑑上場次數）。
- 新增寶可夢：底圖要另外產生 `art/<key>.webp` 和 `art/shiny/<key>.webp`（腳本見專案文件），沒有圖的話卡片只會是純色底。
- 商店買東西一律「選道具 → 選數量 → 確認頁」才扣錢：一般商店 `screenShop` → `screenShopItem` → `screenShopConfirm` → `buyItem`；攜帶道具 `screenHeldShop` → `screenHeldBuy` → `screenHeldConfirm` → `buyHeld`。新增購買入口也要走確認頁。
- 各檔之間用全域函式互相呼叫，改函式名要全 repo grep。

# 結構說明（給 AI 開新對話時先讀這份）

純前端單頁遊戲，無建置流程。`index.html` 依序載入 `data.js` → `moves-data.js` → `poke-data.js` → `mon-art.js` → `mon-colors.js` → `sounds/list.js`（目前不存在，載入失敗會自動略過，放音效清單用）→ `battle.js` → `features.js` → `moves.js` → `abilities.js` → `gimmicks.js` → `growth.js` → `league.js`，再跑 index.html 內的主程式，主程式之後才載入 `extras.js` → `doubles.js`（這兩個要包主程式的函式，所以放在後面）。全域變數共用，不是 ES module。
寶可夢卡片底圖在 `art/`（每張約 13KB，瀏覽器顯示卡片時才下載）。
存檔在 `localStorage`，key 為 `pkmn_tower_save_v2`（舊版 v1 會自動轉移）。存檔的寶可夢是瘦身過的（`packMon`，見「慣例」）。
可以加到手機主畫面、離線遊玩：`manifest.webmanifest`＋`sw.js`＋`icon-192.png`/`icon-512.png`/`apple-touch-icon.png`。行號會隨修改位移，僅供定位，請用 grep 函式名。

## 檔案

| 檔案 | 內容 |
|---|---|
| `data.js`（約 1090 行） | 純資料表：`DEX`（圖鑑，`[名稱,屬性1,屬性2,tier]`，依世代排）、`EVO`/`STONE_EVO`/`TIME_EVO`（進化）、`CHART`（屬性相剋）、`ITEMS`（含解眠藥、解凍藥、萬能藥，`cure:'any'`＝全治）、`GYMS`、`TRAINERS`、`QUESTS`、`MILESTONES`、`MEGAS`（`[圖鑑編號,後綴,屬性1,屬性2]`，id = 編號+後綴，例如 `6X`）、`CHECKIN_*`、`MAP_NAMES` |
| `moves-data.js`（自動產生，約 190KB） | 本傳招式資料，來源 PokeAPI（產生腳本見專案文件「招式資料腳本」，不要手改）：`MOVE_DB[id] = [名稱,屬性,種類 0物理/1特殊/2變化,威力,PP,命中(0必中),先制度,效果碼,不會被守住擋(1),旗標(1接觸 2拳 4聲音 8咬 16波動 32球彈 64粉末 128斬擊 256風 512舞 1024回復)]`、`TM_LIST`（朱紫招式學習器 `[編號,招式id]`）、`DEX_WEIGHT`（體重 0.1kg）、`LEARNSET[DEX索引]`（`"等級.招式id ..."` 皆 36 進位，等級 0＝進化時學；`|` 後是學習器相容位元的 16 進位字串）。學習表優先用朱紫，沒收錄的用劍盾、究極日月；地區形態用各自的表，超進化用原形態。 |
| `moves.js`（約 1340 行） | 招式系統。招式物件 `makeMove(id)`；學習表 `learnset`/`knownMoves(m)`（依等級算＋`m.xm` 額外學會的）/`defaultMoves(dex,lv)`（最後學的 4 招，至少 2 招攻擊、進化招優先）/`learnOnLevel`/`learnOnEvolve`/`migrateMoves`（舊存檔）。出招 `useMove` → `useStatusMove`/`useDamageMove`，效果碼由 `runFx`/`specialFx` 處理（說明表 `SP_DESC`）；變動威力 `dmgPower`、固定傷害 `fixedDamage`、會心 `calcHit`、光牆場地 `fieldDmgMul`。能力等級 `statChange`（倍率 `atkMul/defMul/spaMul/sdfMul/spdMul/accMul/evaMul`）、異常 `setStatus`（含睡眠 `_slp`、劇毒 `_tox`、冰凍）、混亂 `setConfuse`。場地 `state.battle.field`（terrain、troom、mroom、wroom、grav、sport）、雙方場地 `state.battle.side.me/foe`（光牆反射壁、順風、撒菱類 `hz`、願望、預知未來）。能不能用 `moveBlockReason`、對手選招 `chooseFoeMove`（排除沒用的變化招）。換人 `pivotOut`/`screenPivot`/`doFoePivot`/`forceOut`、提前結束 `endEarly`/`finishEarly`。每回合 `moveEndTurn`/`fieldEndTurn`，換下場清狀態 `clearVolatile`/`restoreTemp`。另有招式學習器商店 `screenTmShop`→`screenTmItem`→`screenTmConfirm`→`buyTm`（`state.tms[招式id]=數量`）、隊伍招式頁 `screenMoves`/`screenMoveSwap`/`screenTmUse`/`teachTm`、親密度 `friendOf`/`addFriend`/`FRIEND_EVO`、統計頁 `statsHtml`。雙打專用招（幫助、看我嘛等）、自然之恩、投擲沒有收。 |
| `poke-data.js`（自動產生，約 95KB） | 來源 PokeAPI（產生腳本見專案文件「寶可夢資料腳本」）：`BASE_STATS[DEX索引]`＝[HP,攻,防,特攻,特防,速度]、`MEGA_STATS[超進化id]`、`ABIL[DEX索引]`＝[特性1,特性2,隱藏特性]、`MEGA_ABIL`、`AB_TEXT[key]`＝[中文名,官方說明]、`GENDER_RATE`（雌性機率/8，-1 無性別）、`TIME_PREF`（白天／夜晚比較常出現的，只有第一~四代的資料）、`EVO_FIX`（把本傳要道具／通訊交換／時段／性別／會的招式才進化的改過來）、`EVO_ITEM_NAMES`、`MAX_MOVE_NAME`、`Z_MOVE_NAME`。 |
| `abilities.js`（約 460 行） | 特性：`ABILITIES`（從 AB_TEXT 建，沒做效果的說明後面加「本作沒有效果」，有做的列在 `AB_IMPL`）、`rollAbilitySlot`/`abilityAt`/`ensureAbility`（`m.abSlot` 0/1/2，野生 5% 隱藏特性）。各掛勾：`abOnEntry` 出場、`intimidateBlocked`、`abStatMul` 能力值、`abSpdMul` 速度、`abPriority`/`abOrderBias` 出招順序、`abAccMul`/`abNoGuard` 命中、`abImmune` 招式無效（吸收、飄浮、隔音…）、`abStatusMoveImmune`（魔法鏡、惡作劇之心對惡）、`abStatusBlock` 異常免疫、`abStatChange`/`abAfterDrop` 能力變化、`abPowerMul` 威力、`abMoveType`（妖精皮膚類）、`abBeforeMove`（變幻自如、懶惰）、`abCritStage`/`abCritBlocked`、`abAfterHit`/`abOnKo`、`abEndTurn`、`abPoisonHeal`、`abSwitchOut`、`abTrapped`、`abDisguise`、`berryBlocked`、`abSuppressed`（化學變化氣體）。破格類用 `dAb(att, def, key)` 判斷對方特性。 |
| `gimmicks.js`（約 150 行） | 難度：`aiSmart(w)`（對手挑最佳招式的機率，野生 0.4、訓練家 0.7、道館 0.55＋每間 0.02、塔 0.85／小魔王 0.95）、`hardenFoe(m, 能力點下限, 帶道具)`（訓練家 35；道館 30＋每間 1.5、第 4 間起帶道具、第 8 間起 +2 級；塔 35／小魔王 50＋道具）、`foeAceEntry`（第 7 間起館主王牌、小魔王出場太晶化）。選招估算在 moves.js 的 `estDamage`/`moveScore`/`chooseFoeMove`。關鍵道具 `KEY_ITEMS`/`hasKeyItem`/`keyItemAward`/`keyItemsHtml`（太晶珠第 2 枚徽章、極巨腕帶第 4 枚徽章；直接看 `state.meta.badges`，不存檔、舊存檔自動有；只限制玩家，對手照樣太晶化）。每場對戰一次的強化（和 Mega 進化共用 `gimmickFree()`，`state.battle.gimmick`）：太晶化 `doTera`（`m.tera` 太晶屬性、`p._tera`、本系加成 `stabMul`、隊伍頁 `screenTeraPick` 花 3000 換屬性）、Z 招式 `screenZ`/`zMoveOf`（要帶 Z 純晶，HELD 的 `z` 類）、極巨化 `doDmax`/`maxMoveOf`/`endDmax`/`dmaxTick`（3 回合、HP ×1.5、極巨招式附帶天氣／場地／能力變化）。 |
| `growth.js`（約 130 行） | 性別 `rollGender`/`ensureGender`/`genderSign`（`m.gender` 'M'/'F'/''）；白天夜晚 `isNight`/`timePool`（`biasPool` 呼叫）；進化 `EVO_COND`（升級時的條件進化）、`STONE_EVO` 加上道具進化（值可以是陣列）、`EVO_ITEM_COND`、`FAIRY_EVO`、`condEvoTarget`、`stoneTargets`；ITEMS 加進化道具（`stone:true`，含聯繫繩）、ＰＰ提升劑／ＰＰ極限提升劑（`mv.ppUp`）、神奇糖果，使用畫面 `screenGrowItem`/`useCandy`/`screenPpPick`。 |
| `league.js`（約 350 行） | 難度 `DIFF`/`diff()`/`diffLv(l)`/`setDiff`（`state.profile.diff` easy/normal/hard；影響 `aiSmart`、`hardenFoe` 能力點、訓練家／道館／塔／聯盟／工廠等級、道館帶道具與王牌太晶化；檔案頁 `diffHtml`）。性格薄荷／特性膠囊／特性膏藥（ITEMS 的 `mod`，`screenModItem`/`useModItem`）。寶可夢聯盟 `screenLeague`/`leagueStart`/`leagueNext`/`leagueWin`（每個地區 8 個徽章後開放，四天王 5 隻＋冠軍 6 隻，名字在 `LEAGUE_NAMES`/`LEAGUE_CHAMP`（官方繁中譯名），`leagueRun` 在記憶體、去補給站算放棄，`state.meta.champ`/`hof`；伽勒爾是冠軍盃）。對戰工廠 `screenFactory`/`facStart`/`screenFacPick`/`facNext`/`facKo`/`screenFacSwap`/`facEnd`（模式 'factory'，租借 Lv.50，`fac.backup` 存原隊伍、saveGame 存 backup；`state.meta.bp`/`facBest`；BP 交換所 `screenBpShop`/`BP_SHOP`）。圖鑑詳細頁 `dexDetail`/`renderDexDetail`/`evoLines`（不顯示官方圖鑑說明文字）（第一次打開才載入 dex-text.js）。 |
| `extras.js`（約 450 行） | 用 `xwrap(函式名, fn)` 包住原本的函式加功能。**大量出現**：`outbreakFor(r)`（每天每個地區挑一區＋一種寶可夢）/`outbreakHere`/`outbreakList`，包 `pickWildIndexPity`（那一區 50% 遇到牠）、`encounter`、`pityResolve`（打倒／捕捉累積連鎖 `state.meta.obc`，`OB_STEPS` 10／30／60 連鎖異色率 ×2／3／4）、`shinyRate`（再乘閃耀護符、閃耀三明治）；原本的每日事件「大量出現」改名「屬性熱潮」。**護符**：`CHARMS`（全國非神獸捕捉 25% 捕獲護符、50% 閃耀護符，`hasCharm`/`charmCheck`，不存檔、直接算）、`catchBonus()`（battle.js 的捕捉率呼叫）。**圖鑑獎勵** `screenDexReward`（各地區 50%／100%，`state.meta.dexrw`）。**交換所** `screenTrade`（`tradeOffers` 每天 3 個、`state.meta.trade`；換來的 `m.ot`＝原訓練家，經驗 ×1.5）、通訊交換進化 `screenTradeEvo`（`TRADE_EVO` 從 EVO_FIX 的聯繫繩條件產生）。**野餐** `screenPicnic`（`PICNIC`，`state.meta.picnic={id,type,left}`，以野外遭遇次數計）。設施選單 `screenFacility`（野外的 🏕）。**團體戰** `screenRaid`/`raidDens`（每天 4 個巢穴，太晶要太晶珠、極巨要極巨腕帶，`state.meta.raid`）/`startRaid`（模式 'raid'，HP ×`RAID_HP`、`RAID_TURNS` 回合限制、半血放衝擊波）/`raidCatchAsk`（贏了必定收服）。 |
| `doubles.js`（約 430 行） | **雙打引擎**（模式 'doubles'，`state.battle.d={me:[隊伍索引×2], foe:[team索引×2], team, fainted}`，`b.sub` 是 'trainer'／'btower'）：每次出招前 `dSetCtx` 把 `b.wild`／`b.playerIdx` 切成這一招的攻擊方和目標，直接沿用 `doAttack`/`useMove`。`SPREAD`（招式 id → 'foes'／'all'，威力 ×0.75）、`dblScreen`→`dPickFor`→`dPickTarget`→`dRunTurn`→`dEndTurn`→`dRefill`、`dWin`/`dLose`。雙打中 `screenBattle`/`checkBattleEnd`/`winBattle`/`endOfTurn`/`afterFaintCheck`/`renderStage`/`who` 都被改道。不能用道具和強化，換人類招式效果無效。路上訓練家 2 隻以上時 `DBL_TRAINER_RATE` 30% 變雙打（包 `startMultiBattle`）。**對戰塔** `screenBTower`/`btPickStart`/`screenBtPick`/`btNext`/`btWin`/`btEnd`（`bt={backup,fmt,streak}`，隊伍換成 `btClone` 的 Lv.50 複製品，saveGame 存 backup；單打模式 'btower'；`state.meta.btBest`，BP 和工廠共用）。 |
| `dex-text.js`（自動產生，約 25KB，延遲載入） | `DEX_TEXT[DEX索引]`＝[分類, 身高(0.1m)]。圖鑑說明文字（官方著作）不收錄。 |
| `mon-art.js` | 卡片底圖：`monBgSrc(m)` 回傳 `art/<key>.webp`（異色 `art/shiny/<key>.webp`；`ART_SHINY_MISSING` 目前是空的。M445Z、M978 沒有官方圖鑑異色圖，異色改用 PokeAPI HOME 異色圖做）、`preloadArtFor(list)`（開機時空閒預載隊伍的圖）。key 是 DEX 索引或超進化 `'M'+MEGAS.id`。 |
| `art/<key>.webp`、`art/shiny/<key>.webp` | 1175 組（一般＋異色共 2350 張）。來源 PokeAPI official-artwork 官方圖鑑圖 → 256 正方形 → 超強順時針旋渦 → 跟白色 30% 混合調淡 → 裁 256×116 → 霧化（模糊 4px＋蓋 12% 白）→ WebP。key→官方圖編號（地區形態、超進化是 10xxx）與產生腳本見專案文件「外框特徵進度」。舊的外框特徵／旋渦／馬賽克版本都在 git 歷史（原圖 345fea8、旋渦 c24f864、小圖示 e694b91、馬賽克 db4b168）。 |
| `mon-colors.js` | 每隻寶可夢的代表色 `MON_COLORS[key] = [一般主色, 一般副色, 異色主色, 異色副色]`（key 是 DEX 索引或 `'M'+id`），從 PokeAPI 像素圖自動抓（略過黑色描邊）。給「無框」邊框用。直接載入（約 58KB）。 |
| `battle.js`（約 1490 行） | 音效 `SFX`、屬性相剋 `eff`/`moveEff`、傷害 `dmg`（物理特殊看招式 `cls`）/`attackCore`（呼叫 moves.js 的 `useMove`）、回合流程 `playerMove`（`turnOrder`：先比先制度再比速度）/`enemyTurn`/`endOfTurn`、捕捉 `tryCatch`、換人、進化 `evoTarget`/`evolveTo`、經驗 `grantExp`、戰鬥結算 `winBattle`/`loseBattle`、對戰畫面 `renderStage`/`screenBattle`、擊倒與捕捉動畫 `koFx`/`catchFx`、色違出場特效 `shinyFx(side)`（卡片閃兩下＋星星散開＋`SFX` 的 `shiny` 音效，`entryCheck` 遇到色違時呼叫，會等開場動畫播完）、球框 `FRAME_*`（`none` 無框：`frameStyle()` 用 MON_COLORS 做上→下雙色漸層，異色用異色色、超進化中用超進化色；其他球種照原本球的配色）。卡片底圖 `monBgAttr(m, side, extraStyle)`（產生 `.card` 的 class 和 style；玩家和對手卡片都用，`side` 是 `me`/`foe`）：加 class `mz` 和 CSS 變數 `--mzimg:url(art/…)`（超進化中用 `'M'+id` 的圖，異色用 shiny 圖）。`frameStyle(m)` 回傳 CSS 文字（不含 `style=`）。 |
| `features.js`（約 520 行） | 性格 `NATURES`、特性 `ABILITIES`、攜帶道具 `HELD`（含商店 `screenHeldShop`；`holds`/`heldIt` 在被打落、查封、魔法空間時無效）、每日活動 `DAILY_EVENTS`、天氣 `WEATHER`、戰鬥中各種效果掛勾（`afterHitFx`、`endTurnFx`、`onEntry`、`entryCheck`（會呼叫撒菱類 `entryHazards`）、`fxDmgMul`（會心等級看 `move._crit`）等） |
| `index.html`（約 3190 行） | 見下 |
| `sw.js` | Service worker（只在 https 註冊）：程式檔網路優先、斷線用快取，所以推新版不會卡舊版；`art/` 底圖快取優先（`ART_CACHE`，改圖要把版本號加一）；`test-save.json` 不快取。新增 js 檔要加進 `CORE` 清單才能離線。 |
| `manifest.webmanifest`、`icon-*.png`、`apple-touch-icon.png` | 加到主畫面用的設定和圖示（深色底對話框圖示，Pillow 畫的） |
| `test-save.json` | 測試用存檔（約 600KB，不要整個讀進對話）。網址加 `?test` 會載入 |
| `tests/fuzz.js` | 自動測試（見下面「自動測試」） |

## index.html 內部分段

- 第 25~515 行：CSS（卡片底圖是 `.card.mz`：`--mzimg` 以 cover 鋪滿 padding-box，`.r1>span`/`.r2`/`.hpt` 各自墊 `--half` 60% 底色）
- 第 516~535 行：HTML 骨架（`#stage` 對戰畫面、`#log` 文字、`#bar` 狀態列（地點＋圖鑑／球／錢／硬幣，`renderBar`）、`#opts` 選項按鈕、`#modal` 選單、`#hub` 活動/信箱）
- 約 560~875 行：節日活動 `EVENTS`、背景主題、信箱 `mail*`、`openHub`
- 約 877 行起：主程式。常數、`makeMon`（產生寶可夢）、能力值/個體值計算、塔與傳說挑戰規則、`state`（全部遊戲狀態）、`print`（文字輸出）、`setOptions`（選項按鈕）、寶可夢小卡 `monCardHtml`/`monCardOpt`（隊伍、倉庫、換人用；`typeChips` 屬性色塊）、野外上方隊伍一覽 `partyStripHtml`（`screenField` 塞進 `stageDetail`）
- 約 1180~1440 行：存檔 `packMon`/`saveGame`/`saveFailNotice`（寫不進去時畫面下方紅色提醒，存成功自動收掉）/`saveOnHide`（切背景、關分頁時存，對戰中不存）/`fixMon`/`loadGame`/匯出入 `screenSaveIO`
- 之後是各個畫面函式，命名都是 `screenXxx`：`screenField`（野外主畫面，約 1540 行）、`encounter`（遇敵）、`screenShop`、`screenTower`（無盡塔）、`screenGym`（道館）、`screenParty`/`screenBox`/`screenBag`、`screenDex`（圖鑑）、Mega 進化相關 `startMegaBattle`/`megaEvolve`
- 約 2817 行起：成就 `ACH`、稱號、簽到、任務、個人資料；`openMenu`（約 3037 行）為選單入口。野外按鈕列多了 🏕 設施（extras.js），對戰選單多了 💠 團體戰、🏰 對戰塔
- 約 3115 行：BOOT（`loadGame` → `preloadArtFor(state.party)`（預載隊伍底圖）→ `screenCover` → LINE 等內建瀏覽器提醒 `showInAppNotice` → iPhone 主畫面版沒存檔時的提醒 `showStandaloneNotice`（主畫面版存檔和 Safari 分開）→ 註冊 `sw.js`）
- 最後兩個 `<script>`：音效掛勾（用 `wrap` 包住 `doAttack` 等函式）、按鈕按下動畫

## 自動測試

`tests/fuzz.js` 用 jsdom 載入整個遊戲（假時鐘，動畫不用真的等），隨機按按鈕，抓例外錯誤、HP／PP／能力值變成 NaN 或超出範圍、畫面出現 `undefined`/`NaN`、對戰卡住、`saveGame()` 存不進去。

- 第一次：`cd tests && npm install`
- `node tests/fuzz.js`：預設跑隨機對戰 300 場（隨機隊伍 1~6 隻、隨機攜帶道具和太晶屬性；野生／訓練家／道館／雙打／團體戰／對戰塔）＋從 test-save.json 亂按 3000 步
- 參數：`battle`／`monkey` 只跑一種、`-n 數量`、`--seed 數字`（重現用，執行時會印出種子）、`--new`（亂按從新遊戲開始）、`-v`（印出出錯前的操作和畫面文字）
- 有問題時結束碼 1。改完戰鬥相關的程式建議跑一次。
- 其他腳本可以 `require('./tests/fuzz.js')` 拿 `{boot, problems}` 自己載入遊戲測（`boot(存檔文字, 種子)` 回傳 `{w, flush}`）。

## 慣例

- 畫面切換 = 呼叫某個 `screenXxx()`，內部用 `print()` 輸出文字、`setOptions([...])` 放按鈕。
- `setOptions` 的按鈕欄位：`label`、`action`、`half`（半寬）、`cls`（`primary` 主要按鈕、`off` 變暗、`q` 四分之一寬）、`html`（自訂內容）、`ic`＋`sub`（圖示在上的小方塊）、`row`（同一個值且連在一起的按鈕排成一列平分寬度，超過 5 顆平均分兩列；對戰的強化用 `gim`、行動用 `act`，倉庫篩選 `mview`）。「點一下跳過動畫」提示只在動畫播放中顯示。
- 文字逐行動畫只在對戰中（`state.battle` 或 `#app.battle`，含剛結束的結算）才有，判斷在 `animText()`；其他畫面 `print` 直接顯示、按鈕不等待。
- 對戰畫面上方的回合／天氣／場地是 `renderStage` 裡的 `.binfo`（舊的 `#turnbar` 已拿掉）；招式卡第二行是「威力（命中不到 100 才顯示）＋PP」，第三行效果說明最多兩行。規則提示（不能逃跑等）只在第 1 回合印。
- 改完要存檔就呼叫 `saveGame()`；新增存檔欄位要在 `loadGame`/`fixMon` 補預設值，避免舊存檔壞掉。
- 存檔瘦身 `packMon`：招式只存 `{id,pp,ppUp}`（讀檔 `migrateMoves`→`refreshMove` 用 MOVE_DB 重建）；`name`/`t1`/`t2`/`tier` 跟 DEX 一樣就不存（`fixMon` 補回，Mega 中的不一樣所以會留著）；`status:null`、`atkMul/defMul:1`、`shiny:false`、空的 `xm` 不存。1076 隻的倉庫約 1MB → 0.44MB。寶可夢新增「可以從別的資料算回來」的欄位時，存檔和讀檔兩邊要一起改。
- 能力值用本傳公式＋種族值（`statsFor(base, level)`、`baseStatsOf(dex, megaId)`），能力點照舊另外加；`m.sv` 是公式版本（`STAT_VER`），舊存檔讀進來會重算。Mega 進化改用 Mega 的種族值和特性（`p._mega.ab` 記原本特性）。
- 寶可夢身上的招式：`m.moves`（上場 4 招，招式物件含 `id`）、`m.xm`（額外學會的招式 id）、`m.friend`（親密度 0~255，預設 70）。對戰中的暫時狀態都是底線開頭（`_sub`、`_cnf`、`_seed`…），換下場或對戰結束由 `clearVolatile` 清掉。
- 統計 `state.stats` 新增：`losses`、`flees`、`faints`、`movesUsed`、`crits`、`maxHit`/`maxHitBy`、`tmUsed`、`pu`（各圖鑑上場次數）、`trades`、`picnics`、`raids`、`raidFails`、`dblWins`、`btWins`。
- 新功能的存檔欄位都放在 `state.meta` 底下，用 `xmeta`/`dayRec`（每天重置的紀錄）在讀取時補預設值，不用改 `loadGame`。
- 新增寶可夢：底圖要另外產生 `art/<key>.webp` 和 `art/shiny/<key>.webp`（腳本見專案文件），沒有圖的話卡片只會是純色底。
- 商店買東西一律「選道具 → 選數量 → 確認頁」才扣錢：一般商店 `screenShop` → `screenShopItem` → `screenShopConfirm` → `buyItem`；攜帶道具 `screenHeldShop` → `screenHeldBuy` → `screenHeldConfirm` → `buyHeld`。新增購買入口也要走確認頁。
- 各檔之間用全域函式互相呼叫，改函式名要全 repo grep。

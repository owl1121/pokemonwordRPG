/* ========== 難度設定、薄荷／特性膠囊／特性膏藥、寶可夢聯盟、對戰工廠（租借）、圖鑑詳細頁 ========== */

/* ---------- 難度（個人檔案裡切換，存在 state.profile.diff） ---------- */
const DIFF = {
  easy:  {name:'簡單', desc:'對手比較少挑最佳招式、能力點較低、等級 −2、館主不帶道具', ai:0.5, iv:-15, lv:-2},
  normal:{name:'普通', desc:'預設難度', ai:1, iv:0, lv:0},
  hard:  {name:'困難', desc:'對手幾乎都挑最佳招式、能力點較高、等級 +3、訓練家也會帶道具、館主王牌更早太晶化', ai:1.3, iv:10, lv:3}
};
function diffKey(){ const k = state.profile && state.profile.diff; return DIFF[k] ? k : 'normal'; }
function diff(){ return DIFF[diffKey()]; }
function diffLv(l){ return Math.max(2, Math.min(MAX_LEVEL, l + diff().lv)); }
function setDiff(k){
  if(!DIFF[k]) return;
  state.profile.diff = k;
  if(state.party.length) saveGame();
  openMenu('profile'); notify(`⚙️ 難度：${DIFF[k].name}`);
}
function diffHtml(){
  const cur = diffKey();
  let h = '<div class="mh">⚙️ 難度（訓練家、道館、塔、聯盟、對戰工廠都會受影響）</div><div class="frgrid">';
  Object.keys(DIFF).forEach(k=>{ h += `<button class="frbtn${k===cur?' on':''}" onclick="setDiff('${k}')"><small>${DIFF[k].name}${k===cur?' ✓':''}</small></button>`; });
  h += `</div><div class="sub" style="margin:-4px 0 12px;opacity:.8">${esc(DIFF[cur].desc)}</div>`;
  return h;
}

/* ---------- 性格薄荷、特性膠囊、特性膏藥 ---------- */
(function(){
  ITEMS.mint = {label:'性格薄荷', desc:'把性格換成任意一種（影響能力值）', price:5000, mod:'mint'};
  ITEMS.abcapsule = {label:'特性膠囊', desc:'在兩種一般特性之間切換', price:8000, mod:'cap'};
  ITEMS.abpatch = {label:'特性膏藥', desc:'在一般特性和隱藏特性之間切換', price:20000, mod:'patch'};
})();
function modUsable(m, kind){
  const s = abSlotsOf(m.dex);
  if(kind === 'cap') return !!s[1] && m.abSlot !== 2;
  if(kind === 'patch') return !!s[2];
  return true;
}
let modPage = 0;
function screenModItem(k, msg){
  const it = ITEMS[k];
  if(!(state.bag[k] > 0)) return screenBag();
  clearLog();
  print(`<span class="em">— ${esc(it.label)}（剩 ${state.bag[k]}）—</span>　<span class="sys">${esc(it.desc)}</span>`);
  if(msg) print(msg);
  const all = viewMons([...state.party.map((m,i)=>({m,i,box:false})), ...state.box.map((m,i)=>({m,i,box:true}))].filter(({m})=>modUsable(m, it.mod)));
  const per = 8, pages = Math.max(1, Math.ceil(all.length/per)); modPage = Math.min(Math.max(0, modPage), pages-1);
  print(all.length ? '要用在誰身上？（📦 = 在倉庫）' : '<span class="sys">沒有可以用的寶可夢。</span>');
  const opts = all.slice(modPage*per, modPage*per+per).map(({m,i,box})=>({label:`${box?'📦 ':''}${monName(m)}${genderSign(m)}　${it.mod === 'mint' ? NATURES[ensureNature(m)].n : abName(m)}`, half:true, action:()=>useModItem(k, box, i)}));
  if(pages > 1){
    opts.push({label:'◀ 上一頁', half:true, cls:modPage===0?'off':'', action:()=>{ if(modPage>0){ modPage--; screenModItem(k); } }});
    opts.push({label:'下一頁 ▶', half:true, cls:modPage>=pages-1?'off':'', action:()=>{ if(modPage<pages-1){ modPage++; screenModItem(k); } }});
  }
  opts.push({label:'← 返回背包', action:screenBag});
  setOptions(opts);
}
function recalcKeepHp(m){ const ratio = m.maxhp ? m.hp/m.maxhp : 1, st = monStats(m); m.maxhp = st.hp; m.hp = m.hp > 0 ? Math.max(1, Math.round(st.hp*ratio)) : 0; setNonHpStats(m, st); }
function useModItem(k, box, i){
  const it = ITEMS[k], m = (box ? state.box : state.party)[i];
  if(!m || !(state.bag[k] > 0) || !modUsable(m, it.mod)) return screenModItem(k);
  if(it.mod === 'mint'){
    clearLog();
    print(`<span class="em">要把 ${nm(m)} 的性格換成哪一種？</span>　<span class="sys">目前：${esc(natureText(m))}</span>`);
    const opts = NATURES.map((n,j)=>({label:(j === m.nature ? '✔ ' : '') + n.n + (n.up ? `（${IV_NAMES[n.up]}↑${IV_NAMES[n.dn]}↓）` : '（無影響）'), half:true, cls:j === m.nature ? 'off' : '', action:()=>{
      if(j === m.nature || !(state.bag[k] > 0)) return;
      state.bag[k]--; m.nature = j; recalcKeepHp(m); saveGame();
      screenModItem(k, `<span class="good">${nm(m)} 的性格變成了「${esc(n.n)}」！</span>`);
    }}));
    opts.push({label:'← 返回', action:()=>screenModItem(k)});
    return setOptions(opts);
  }
  state.bag[k]--;
  const s = abSlotsOf(m.dex), before = abName(m);
  if(it.mod === 'cap') m.abSlot = m.abSlot === 1 ? 0 : 1;
  else m.abSlot = m.abSlot === 2 ? 0 : 2;
  m.ab = s[m.abSlot] || s[0];
  saveGame();
  screenModItem(k, `<span class="good">${nm(m)} 的特性從「${esc(before)}」變成了「${esc(abName(m))}」！</span>`);
}

/* ---------- 寶可夢聯盟：每個地區的道館都打完就能挑戰四天王＋冠軍，五場連戰中間不能回補給站 ---------- */
const LEAGUE_REGIONS = ['關都','城都','豐緣','神奧','合眾','卡洛斯','阿羅拉','伽勒爾','帕底亞'];
// 各地區四天王的屬性與名字（官方繁中譯名，對照神奇寶貝百科）；伽勒爾沒有四天王，用冠軍盃的對手（瑪俐、赫普、彼特、奇巴納），赫普是混合隊伍
const LEAGUE_E4 = [['冰','格鬥','幽靈','龍'], ['超能力','毒','格鬥','惡'], ['惡','幽靈','冰','龍'], ['蟲','地面','火','超能力'], ['幽靈','惡','超能力','格鬥'],
  ['火','水','鋼','龍'], ['格鬥','岩石','幽靈','飛行'], ['惡','','妖精','龍'], ['地面','鋼','飛行','龍']];
const LEAGUE_NAMES = [['科拿','希巴','菊子','阿渡'], ['一樹','阿桔','希巴','梨花'], ['花月','芙蓉','波妮','源治'], ['阿柳','菊野','大葉','悟松'], ['婉龍','越橘','嘉德麗雅','連武'],
  ['帕琦拉','志米','雁鎧','朵拉塞娜'], ['哈拉','麗姿','阿塞蘿拉','卡希麗'], ['瑪俐','赫普','彼特','奇巴納'], ['辛俐','波琵','青木','八朔']];
const LEAGUE_CHAMP = ['青綠','阿渡','大吾','竹蘭','阿戴克','卡露乃','庫庫伊博士','丹帝','也慈'];
let leagueRun = null;   // {r, k}：正在挑戰第 r 個地區、第 k 戰（0~3 四天王、4 冠軍）
function leagueMeta(){ const m = state.meta; if(!m.champ || typeof m.champ !== 'object') m.champ = {}; if(!Array.isArray(m.hof)) m.hof = []; return m; }
function leagueOpen(r){ return state.meta.badges >= (r+1)*8; }
function leagueBaseLv(r){ return 10 + (r*8+7)*4 + 2; }
function leagueName(r, k){
  const t = LEAGUE_E4[r][k];
  if(r === 7) return k < 4 ? `冠軍盃 ${LEAGUE_NAMES[r][k]}${t ? `（${t}）` : ''}` : `伽勒爾冠軍 ${LEAGUE_CHAMP[r]}`;
  return k < 4 ? `${LEAGUE_REGIONS[r]}四天王 ${LEAGUE_NAMES[r][k]}（${t}）` : `${LEAGUE_REGIONS[r]}冠軍 ${LEAGUE_CHAMP[r]}`;
}
let _strongPool = null;
function strongPool(){
  if(_strongPool) return _strongPool;
  return (_strongPool = NONLEG.filter(i=>isFinalForm(i) && DEX[i][3] >= 2));
}
function leagueTeam(r, k){
  const type = k < 4 ? LEAGUE_E4[r][k] : '';
  let pool = strongPool().filter(i=>!type || DEX[i][1] === type || DEX[i][2] === type);
  if(pool.length < 6) pool = strongPool();
  const n = k < 4 ? 5 : 6, lv = Math.min(MAX_LEVEL, diffLv(leagueBaseLv(r) + 2 + k*2 + (k === 4 ? 4 : 0))), team = [], used = new Set();
  while(team.length < n){
    const d = pool[Math.floor(Math.random()*pool.length)];
    if(used.has(d) && used.size < pool.length) continue; used.add(d);
    team.push(hardenFoe(makeMon(d, Math.min(MAX_LEVEL, lv + (team.length === n-1 ? 2 : 0)), {shiny:false}), k === 4 ? 55 : 50, true));
  }
  team[n-1]._ace = true;
  return team;
}
function screenLeague(msg){
  clearLog(); renderBar();
  const meta = leagueMeta();
  print('<span class="em">🏆 寶可夢聯盟</span>');
  print('<span class="sys">一個地區的 8 間道館都打完，就能挑戰那個地區的四天王和冠軍。五場連戰，中間可以用藥，但去補給站就算放棄。</span>');
  if(msg) print(msg);
  if(leagueRun) print(`<span class="boss">挑戰中：${esc(LEAGUE_REGIONS[leagueRun.r])}　下一戰：${esc(leagueName(leagueRun.r, leagueRun.k))}</span>`);
  const opts = [];
  if(leagueRun){
    opts.push({label:`▶ 下一戰：${leagueName(leagueRun.r, leagueRun.k)}`, action:leagueNext});
    opts.push({label:'💊 使用藥品', half:true, action:()=>screenHealItems()});
    opts.push({label:'🏳 放棄挑戰', half:true, action:()=>{ leagueRun = null; screenLeague('<span class="sys">放棄了這次挑戰。</span>'); }});
  } else {
    LEAGUE_REGIONS.forEach((n, r)=>{
      const open = leagueOpen(r), done = meta.champ[r];
      print(`${done ? '🏆' : open ? '🔓' : '🔒'} ${n}${open ? `　Lv.${diffLv(leagueBaseLv(r)+2)}～${diffLv(leagueBaseLv(r)+14)}` : `　（要 ${(r+1)*8} 個徽章）`}${done ? `　已制霸 ${done} 次` : ''}`);
      if(open) opts.push({label:`${done ? '🏆' : '⚔️'} ${n}`, half:true, action:()=>leagueStart(r)});
    });
    if(meta.hof.length){ hr(); print('<span class="em">📜 殿堂入口</span>'); meta.hof.slice(-5).reverse().forEach(h=>print(`<span class="sys">${esc(h.d)}　${esc(LEAGUE_REGIONS[h.r])}冠軍　${esc(h.team)}</span>`)); }
  }
  opts.push({label:'返回', action:screenBattleMenu});
  setOptions(opts);
}
function leagueStart(r){
  if(!leagueOpen(r)) return screenLeague();
  if(noAlive()){ return screenLeague('<span class="bad">隊伍沒有能戰鬥的寶可夢，先去補給站治療吧。</span>'); }
  leagueRun = {r, k:0};
  leagueNext();
}
function leagueNext(){
  if(!leagueRun) return screenLeague();
  if(noAlive()){ leagueRun = null; return screenLeague('<span class="bad">隊伍沒有能戰鬥的寶可夢，挑戰失敗了。</span>'); }
  const {r, k} = leagueRun, foes = leagueTeam(r, k), title = leagueName(r, k);
  const first = startMultiBattle('league', foes, title, {reward:(k === 4 ? 8000 : 3000) + r*1500});
  introLead = introLeadFor('big');
  clearLog();
  print(`<span class="boss">${k === 4 ? '👑' : '🏆'} ${esc(title)} 向你挑戰！（共 ${foes.length + 1} 隻）</span>`);
  print(`${esc(title)} 派出了 ${nm(first)}（Lv.${first.level}）！`);
  screenBattle(); battleIntro('big');
}
// winBattle 在對手全倒時呼叫
function leagueWin(b){
  const run = leagueRun; state.battle = null; battleDone();
  giveMoney(b.reward);
  if(!run){ return runEvolutions(()=>screenLeague()); }
  if(run.k < 4){
    print(`<span class="boss">擊敗了${esc(leagueName(run.r, run.k))}！</span>`);
    run.k++;
    return runEvolutions(()=>screenLeague(`<span class="good">下一位是 ${esc(leagueName(run.r, run.k))}。</span>`));
  }
  const meta = leagueMeta(), first = !meta.champ[run.r];
  meta.champ[run.r] = (meta.champ[run.r]||0) + 1;
  const d = new Date();
  meta.hof.push({r:run.r, d:`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`, team:state.party.map(m=>m.name+' Lv.'+m.level).join('、')});
  if(meta.hof.length > 50) meta.hof.shift();
  leagueRun = null;
  print(`<span class="boss">👑 恭喜！你成為了${esc(LEAGUE_REGIONS[run.r])}的冠軍！</span>`);
  if(first){ state.bag.masterball = (state.bag.masterball||0) + 1; print('<span class="good">第一次制霸獎勵：大師球 ×1、特性膏藥 ×1</span>'); state.bag.abpatch = (state.bag.abpatch||0) + 1; }
  bump('champs');
  saveGame();
  return runEvolutions(()=>screenLeague());
}
function leagueLose(){ leagueRun = null; }

/* ---------- 對戰工廠：從 6 隻租借寶可夢挑 3 隻連戰，贏了可以拿對手的換，賺 BP ---------- */
const FAC_LV = 50;
let fac = null;   // {backup, streak, rent, pick}
function facMeta(){ const m = state.meta; if(!(m.bp >= 0)) m.bp = 0; if(!(m.facBest >= 0)) m.facBest = 0; return m; }
function facRental(lo){
  const pool = strongPool(), d = pool[Math.floor(Math.random()*pool.length)];
  const m = hardenFoe(makeMon(d, diffLv(FAC_LV), {shiny:false}), lo, false);
  m.ball = 'poke'; return m;
}
function screenFactory(msg){
  clearLog(); renderBar();
  const meta = facMeta();
  print('<span class="em">🏭 對戰工廠（租借對戰）</span>');
  print(`<span class="sys">從 6 隻租借的寶可夢挑 3 隻（Lv.${FAC_LV}）連戰，自己的隊伍不會用到。每贏一場全隊回滿，還可以拿對手的一隻來換。每 7 連勝會遇到頭目。</span>`);
  print(`BP ${meta.bp}　最高連勝 ${meta.facBest}`);
  if(msg) print(msg);
  setOptions([
    {label:'▶ 開始挑戰', action:facStart},
    {label:'🛒 BP 交換所', half:true, action:()=>screenBpShop()},
    {label:'返回', half:true, action:screenBattleMenu}
  ]);
}
function facStart(){
  fac = {backup:state.party, streak:0, rent:Array.from({length:6}, ()=>facRental(40)), pick:[]};
  screenFacPick();
}
function screenFacPick(){
  clearLog();
  print('<span class="em">選 3 隻租借寶可夢</span>　<span class="sys">（點一下選／取消）</span>');
  fac.rent.forEach((m,i)=>print(`${fac.pick.includes(i) ? '✅' : '⬜'} <b>${esc(m.name)}</b>${genderHtml(m)}　${esc(typeStr(m))}　特性 ${esc(abName(m))}<br><span class="sys">${m.moves.map(x=>esc(x.name)).join('／')}</span>`));
  const opts = fac.rent.map((m,i)=>({label:`${fac.pick.includes(i) ? '✅ ' : ''}${m.name}`, half:true, action:()=>{
    const j = fac.pick.indexOf(i); if(j >= 0) fac.pick.splice(j,1); else if(fac.pick.length < 3) fac.pick.push(i); screenFacPick();
  }}));
  opts.push({label:`✔ 出發（${fac.pick.length}/3）`, cls:fac.pick.length === 3 ? '' : 'off', action:()=>{
    if(fac.pick.length !== 3) return;
    state.party = fac.pick.map(i=>fac.rent[i]);
    facNext();
  }});
  opts.push({label:'取消', action:()=>{ fac = null; screenFactory(); }});
  setOptions(opts);
}
function facNext(){
  const n = fac.streak + 1, boss = n % 7 === 0;
  const foes = Array.from({length:3}, ()=>facRental(boss ? 60 : Math.min(58, 35 + fac.streak*2)));
  if(boss){ foes.forEach(m=>{ const pool = FOE_HELD.filter(k=>HELD[k]); m.held = pool[Math.floor(Math.random()*pool.length)]; }); foes[2]._ace = true; }
  const title = boss ? '工廠頭目' : `第 ${n} 戰的訓練家`;
  state.party.forEach(m=>{ m.hp = m.maxhp; m.status = null; restorePP(m); resetBattleFlags(m); });
  const first = startMultiBattle('factory', foes, title, {facBoss:boss});
  introLead = introLeadFor(boss ? 'big' : 'trainer');
  clearLog();
  print(`<span class="${boss ? 'boss' : 'em'}">🏭 ${esc(title)}向你挑戰！（連勝 ${fac.streak}）</span>`);
  print(`對手派出了 ${nm(first)}（Lv.${first.level}）！`);
  screenBattle(); battleIntro(boss ? 'big' : 'trainer');
}
// winBattle 呼叫：對手還有就照訓練家的流程派下一隻，全倒就結算
function facKo(b){
  const w = b.wild;
  if(b.foes && b.foes.length){
    (b.foeFainted = b.foeFainted || []).push(w);
    const nx = b.foes[0], cur = state.party[b.playerIdx];
    if(cur.hp <= 0){ b.foes.shift(); b.wild = nx; print(`<span class="em">對手派出了 ${nm(nx)}（Lv.${nx.level}）！</span>`); return afterFaintCheck(cur); }
    return askShiftBeforeFoe(nx);
  }
  const opp = [...(b.foeFainted||[]), w];
  state.battle = null; battleDone();
  fac.streak++;
  const meta = facMeta(), got = 1 + Math.floor(fac.streak/7) + (b.facBoss ? 5 : 0);
  meta.bp += got; if(fac.streak > meta.facBest) meta.facBest = fac.streak;
  print(`<span class="good">贏了！連勝 ${fac.streak}，獲得 BP ${got}（目前 ${meta.bp}）</span>`);
  saveGame();
  screenFacSwap(opp);
}
function screenFacSwap(opp){
  hr();
  print('要不要拿對手的一隻換掉你的一隻？');
  const opts = opp.map((o,j)=>({label:`拿 ${o.name}`, half:true, action:()=>{
    clearLog(); print(`要用 <b>${esc(o.name)}</b>（${esc(typeStr(o))}／${o.moves.map(x=>esc(x.name)).join('、')}）換掉誰？`);
    setOptions(state.party.map((m,i)=>({label:`換掉 ${m.name}`, half:true, action:()=>{
      const n = makeMon(o.dex, o.level, {iv:o.iv, nature:o.nature, abSlot:o.abSlot, gender:o.gender, shiny:false}); n.moves = o.moves.map(x=>makeMove(x.id)); n.ab = o.ab;
      state.party[i] = n; clearLog(); print(`<span class="good">${esc(m.name)} 換成了 ${esc(n.name)}！</span>`); facAfterWin();
    }})).concat([{label:'← 不換了', action:()=>{ clearLog(); facAfterWin(); }}]));
  }}));
  opts.push({label:'不換，繼續', action:facAfterWin});
  setOptions(opts);
}
function facAfterWin(){
  print(`<span class="em">連勝 ${fac.streak}</span>　${fac.streak % 7 === 6 ? '<span class="boss">下一戰是工廠頭目！</span>' : ''}`);
  setOptions([
    {label:'▶ 下一戰', action:facNext},
    {label:'🏳 結束挑戰', action:()=>facEnd(false)}
  ]);
}
function facEnd(lost){
  const r = fac; if(!r) return screenFactory();
  state.battle = null;
  state.party = r.backup; fac = null;
  saveGame();
  clearLog(); renderBar();
  print(lost ? '<span class="bad">全隊倒下了……對戰工廠挑戰結束。</span>' : '<span class="sys">結束了這次挑戰。</span>');
  print(`<span class="em">本次連勝：${r.streak}</span>${r.streak && r.streak >= facMeta().facBest ? ' <span class="boss">🏆 新紀錄！</span>' : ''}`);
  setOptions([{label:'🏭 再挑戰一次', action:()=>screenFactory()}, {label:'返回對戰選單', action:screenBattleMenu}]);
}
// BP 交換所
const BP_SHOP = [['mint', 3], ['abcapsule', 5], ['abpatch', 15], ['rarecandy', 2], ['ppup', 2], ['ppmax', 6], ['masterball', 50]];
function screenBpShop(msg){
  clearLog();
  const meta = facMeta();
  print(`<span class="em">🛒 BP 交換所</span>　BP ${meta.bp}`);
  if(msg) print(msg);
  const opts = BP_SHOP.filter(([k])=>ITEMS[k]).map(([k, c])=>({label:`${ITEMS[k].label}　${c} BP`, half:true, cls:meta.bp >= c ? '' : 'off', action:()=>{
    if(meta.bp < c) return;
    clearLog(); print(`<span class="em">確認交換</span>　${esc(ITEMS[k].label)} ×1　共 ${c} BP　<span class="sys">（目前 ${meta.bp} BP）</span>`); print(`<span class="sys">${esc(ITEMS[k].desc)}</span>`);
    setOptions([{label:`✅ 確認交換 ${c} BP`, action:()=>{ if(meta.bp < c) return screenBpShop(); meta.bp -= c; state.bag[k] = (state.bag[k]||0) + 1; saveGame(); screenBpShop(`<span class="good">換到了 ${esc(ITEMS[k].label)}！</span>`); }}, {label:'取消', action:()=>screenBpShop()}]);
  }}));
  opts.push({label:'← 返回', action:()=>screenFactory()});
  setOptions(opts);
}

/* ---------- 圖鑑詳細頁 ---------- */
let dexTextLoading = null;
function loadDexText(){
  if(typeof DEX_TEXT !== 'undefined') return Promise.resolve();
  if(dexTextLoading) return dexTextLoading;
  return (dexTextLoading = new Promise(res=>{ const s = document.createElement('script'); s.src = 'dex-text.js'; s.onload = res; s.onerror = res; document.head.appendChild(s); }));
}
const STAT_LABELS = ['HP','攻擊','防禦','特攻','特防','速度'];
function evoLines(i){
  const out = [], name = j => esc(DEX[j][0]);
  const from = EVO_FROM[i]; if(from !== undefined) out.push(`由 ${name(from)} 進化而來`);
  const e = EVO[i]; if(e) [].concat(e[0]).forEach(t=>out.push(`→ ${name(t)}（Lv.${e[1]}${FRIEND_EVO.has(i) ? '，或親密度 '+FRIEND_EVO_MIN+' 以上' : ''}）`));
  const s = STONE_EVO[i]; if(s) Object.keys(s).forEach(k=>[].concat(s[k]).forEach(t=>{ const c = EVO_ITEM_COND[i+'>'+t]; out.push(`→ ${name(t)}（${esc(ITEMS[k] ? ITEMS[k].label : k)}${c && c.time ? (c.time === 'night' ? '・晚上' : '・白天') : ''}${c && c.gender ? (c.gender === 'F' ? '・雌性' : '・雄性') : ''}）`); }));
  const te = TIME_EVO[i]; if(te){ out.push(`→ ${name(te.day)}（Lv.${te.lvl}・白天${FRIEND_EVO.has(i) ? '，或親密度夠高' : ''}）`); out.push(`→ ${name(te.night)}（Lv.${te.lvl}・晚上${FRIEND_EVO.has(i) ? '，或親密度夠高' : ''}）`); }
  (EVO_COND[i]||[]).forEach(c=>{
    const why = [c.rel !== undefined ? (c.rel > 0 ? '攻擊比防禦高' : c.rel < 0 ? '防禦比攻擊高' : '攻擊等於防禦') : '', c.move ? `會「${MOVE_DB[c.move] ? MOVE_DB[c.move][0] : '?'}」時升級` : '', c.time ? (c.time === 'night' ? '晚上' : '白天') : '', c.gender ? (c.gender === 'F' ? '雌性' : '雄性') : '', !c.move && c.lvl > 1 ? `Lv.${c.lvl}` : ''].filter(Boolean).join('・');
    out.push(`→ ${name(c.to)}（${why}）`);
  });
  if(FAIRY_EVO[i] !== undefined) out.push(`→ ${name(FAIRY_EVO[i])}（親密度 ${FRIEND_EVO_MIN} 以上＋會妖精屬性招式）`);
  return out;
}
function dexDetail(i){
  if(!state.seen.has(i) && !state.caught.has(i)) return;
  clearLog(); print('<span class="sys">讀取中……</span>');
  loadDexText().then(()=>renderDexDetail(i));
}
function renderDexDetail(i){
  clearLog();
  const e = DEX[i], caught = state.caught.has(i), t = (typeof DEX_TEXT !== 'undefined' && DEX_TEXT[i]) || ['', 0];   // [分類, 身高]
  print(`<span class="em">#${dexNo(i)} ${esc(e[0])}</span>　${esc(e[2] ? e[1]+'／'+e[2] : e[1])}　<span class="sys">${esc(t[0])}</span>${state.shinyCaught.has(i) ? ' <span class="shiny">✨</span>' : ''}`);
  if(!caught){ print('<span class="sys">（只見過，抓到之後才會有完整資料）</span>'); }
  else {
    const w = (typeof DEX_WEIGHT !== 'undefined' ? DEX_WEIGHT[i] : 0);
    const g = GENDER_RATE[i];
    print(`身高 ${(t[1]/10).toFixed(1)} m　體重 ${(w/10).toFixed(1)} kg　性別 ${g < 0 ? '無性別' : g === 0 ? '♂ 100%' : g === 8 ? '♀ 100%' : `♂ ${100 - g*12.5}%／♀ ${g*12.5}%`}`);
    const b = BASE_STATS[i], tot = b.reduce((a,x)=>a+x, 0);
    print('<span class="em">種族值</span>　' + `<span class="sys">合計 ${tot}</span>`);
    print(b.map((v,k)=>`<div class="bsrow"><span>${STAT_LABELS[k]}</span><b>${v}</b><i style="width:${Math.min(100, v/2)}%"></i></div>`).join(''));
    const ab = abSlotsOf(i);
    print('<span class="em">特性</span>');
    ab.forEach((k, s)=>{ if(k && (s < 2 || k !== ab[0])) print(`${s === 2 ? '（隱藏）' : ''}${esc(ABILITIES[k] ? ABILITIES[k].name : k)}<span class="sys">　${esc(ABILITIES[k] ? ABILITIES[k].desc : '')}</span>`); });
    const ev = evoLines(i);
    print('<span class="em">進化</span>　' + (ev.length ? ev.join('<br>') : '<span class="sys">不會進化</span>'));
    const lv = learnset(i).lv.slice().sort((a,b)=>a[0]-b[0]);
    print('<span class="em">升級學會的招式</span>');
    print(lv.map(([l, id])=>`${l ? 'Lv.'+l : '進化'} ${esc(MOVE_DB[id][0])}`).join('、') || '<span class="sys">—</span>');
    const tms = TM_LIST.filter((x, j)=>tmCompat(i, j)).length;
    print(`<span class="sys">招式學習器可以學 ${tms} 招</span>`);
  }
  skipReveal(); logEl.scrollTop = 0;
  setOptions([{label:'← 返回圖鑑', action:screenDexRegion}]);
}

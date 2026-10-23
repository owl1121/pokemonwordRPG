/* extras.js：大量出現（連鎖異色）、圖鑑獎勵與護符、NPC 交換所、野餐、太晶／極巨團體戰
   在 index.html 主程式之後載入，用 xwrap 包住原本的函式（主程式的函式宣告要先存在才能包）。 */

function xwrap(name, fn){ const o = window[name]; if(typeof o !== 'function') return; window[name] = function(){ return fn(o, this, arguments); }; }
function xmeta(k, def){ const m = state.meta; if(!m[k] || typeof m[k] !== 'object') m[k] = def; return m[k]; }
function dayRec(k){ const r = xmeta(k, {}); if(r.k !== todayKey()){ r.k = todayKey(); r.done = []; } if(!Array.isArray(r.done)) r.done = []; return r; }
function giveItem(k, n){ state.bag[k] = (state.bag[k]||0) + (n||1); }
function itemLabel(k){ return (ITEMS[k] || HELD[k] || {label:k}).label; }

/* ========== 1. 大量出現：每天每個地區挑一區、一種寶可夢 ========== */
const OB_CHANCE = 0.5;                       // 在那一區遇敵時，是大量出現那隻的機率
const OB_STEPS = [[60, 4], [30, 3], [10, 2]]; // 連鎖數 → 異色率倍率
function outbreakFor(r){
  const k = todayKey(), [s, e] = zoneRegionRange(r);
  const zone = s + hashStr('obz' + k + r) % (e - s + 1);
  const w = stageWeights(zone), h = (hashStr('obs' + k + r) % 1000) / 1000;
  const st = h < w[0] ? 1 : h < w[0] + w[1] ? 2 : 3;
  const pool = WILD_BY_STAGE[st].length ? WILD_BY_STAGE[st] : WILD_BY_STAGE[1];
  return {r, zone, dex: pool[hashStr('obd' + k + r) % pool.length]};
}
function outbreakList(){ return ZONE_REGIONS.map((_, r)=>outbreakFor(r)).filter(o=>o.zone <= state.maxZone); }
function outbreakHere(){ return outbreakList().find(o=>o.zone === state.zone) || null; }
function obChain(dex){ const c = xmeta('obc', {}); return (c.k === todayKey() + '|' + dex) ? (c.n||0) : 0; }
function obAdd(dex){ const c = xmeta('obc', {}), key = todayKey() + '|' + dex; if(c.k !== key){ c.k = key; c.n = 0; } c.n++; return c.n; }
function obMul(n){ const s = OB_STEPS.find(([t])=>n >= t); return s ? s[1] : 1; }
let _shinyBoost = 1, _obPick = -1;

xwrap('pickWildIndexPity', (o, t, a)=>{
  _obPick = -1; _shinyBoost = 1;
  const ob = outbreakHere();
  if(ob && (state.meta.pity||0) < PITY_N - 1 && Math.random() < OB_CHANCE){
    _obPick = ob.dex; _shinyBoost = obMul(obChain(ob.dex));
    return ob.dex;
  }
  return o.apply(t, a);
});
xwrap('encounter', (o, t, a)=>{
  const r = o.apply(t, a);
  const b = state.battle;
  if(b && b.mode === 'wild' && b.wild){
    if(_obPick >= 0 && b.wild.dex === _obPick){
      b.wild._ob = true;
      const n = obChain(_obPick);
      print(`<span class="boss">📣 大量出現中！</span><span class="sys">　連鎖 ${n}${obMul(n) > 1 ? `　異色率 ×${obMul(n)}` : ''}</span>`);
    }
    picnicTick();
  }
  _obPick = -1; _shinyBoost = 1;
  return r;
});
xwrap('pityResolve', (o, t, a)=>{
  const w = a[0];
  if(w && w._ob){
    delete w._ob;
    const n = obAdd(w.dex), m = OB_STEPS.find(([s])=>s === n);
    if(m) print(`<span class="good">📣 連鎖 ${n}！${esc(DEX[w.dex][0])} 的異色率提高到 ×${m[1]}</span>`);
  }
  return o.apply(t, a);
});
// 異色率：大量出現連鎖 × 閃耀護符 × 閃耀三明治
xwrap('shinyRate', (o, t, a)=> o.apply(t, a) * _shinyBoost * (hasCharm('shinycharm') ? 2 : 1) * (picnicOn('shiny') ? 2 : 1));
// 原本的「大量出現」每日事件是屬性偏向，改名避免和這裡的大量出現混淆
(function(){ const e = DAILY_EVENTS.find(x=>x.id === 'outbreak'); if(e) e.name = '🌀 屬性熱潮'; })();

function outbreakLines(){
  const list = outbreakList();
  if(!list.length) return ['<span class="sys">（還沒有去過的地區不會顯示）</span>'];
  return list.map(o=>{
    const n = obChain(o.dex), here = o.zone === state.zone;
    return `${here ? '📍 ' : ''}<b>${esc(ZONE_REGIONS[o.r][0])}</b>・${esc(zoneName(o.zone))}：${esc(DEX[o.dex][0])}${state.caught.has(o.dex) ? '' : ' ★'}${n ? `　<span class="sys">連鎖 ${n}</span>` : ''}`;
  });
}
function screenOutbreak(){
  clearLog(); renderBar();
  print('<span class="em">📣 今日大量出現</span>');
  print('<span class="sys">每個地區今天有一區會大量出現某種寶可夢（一半的遭遇會是牠）。今天連續打倒或捕捉同一種會累積連鎖：10 連鎖異色率 ×2、30 ×3、60 ×4。逃跑不會中斷。每天 0 點換。</span>');
  outbreakLines().forEach(t=>print(t));
  const opts = outbreakList().filter(o=>o.zone !== state.zone).map(o=>({label:`前往 ${zoneName(o.zone)}`, half:true, action:()=>setZone(o.zone)}));
  opts.push({label:'← 返回', action:screenFacility});
  setOptions(opts);
}

/* ========== 2. 圖鑑獎勵與護符 ========== */
const CHARMS = [
  {key:'catchcharm', label:'🎯 捕獲護符', pct:25, desc:'捕捉成功率 +5%'},
  {key:'shinycharm', label:'🌟 閃耀護符', pct:50, desc:'異色寶可夢的出現率 ×2'}
];
function caughtPct(){ let n = 0; NONLEG.forEach(i=>{ if(state.caught.has(i)) n++; }); return NONLEG.length ? 100*n/NONLEG.length : 0; }
function hasCharm(k){ const c = CHARMS.find(x=>x.key === k); return !!c && caughtPct() >= c.pct; }
function charmCheck(){   // 剛好達成就通知一次
  const got = xmeta('charms', {});
  CHARMS.forEach(c=>{ if(!got[c.key] && hasCharm(c.key)){ got[c.key] = 1; notify(`🎁 獲得 ${c.label}`); print(`<span class="boss">🎁 捕捉了 ${c.pct}% 的寶可夢，獲得【${c.label}】！${c.desc}。</span>`); } });
}
function catchBonus(){ return (daily('catch') ? 0.1 : 0) + (hasCharm('catchcharm') ? 0.05 : 0) + (picnicOn('catch') ? 0.1 : 0); }
xwrap('keyItemsHtml', (o, t, a)=> o.apply(t, a).concat(CHARMS.map(c=> hasCharm(c.key) ? `${c.label}　${c.desc}` : `<span class="sys">🔒 ${c.label.replace(/^\S+\s/, '')}　捕捉 ${c.pct}% 的寶可夢（神獸除外）後獲得（目前 ${caughtPct().toFixed(1)}%）</span>`)));
xwrap('tryCatch', (o, t, a)=>{ const r = o.apply(t, a); if(!state.battle) charmCheck(); return r; });

const DEX_RW = [   // [比例, 獎勵]
  [50,  {money:5000, items:{rarecandy:3, ultraball:10}}],
  [100, {money:20000, items:{masterball:1, abpatch:1, rarecandy:10}}]
];
function rwText(rw){ return [rw.money ? `💰${rw.money}` : '', ...Object.entries(rw.items||{}).map(([k, n])=>`${itemLabel(k)}×${n}`)].filter(Boolean).join('、'); }
function screenDexReward(msg){
  clearLog(); renderBar();
  const got = xmeta('dexrw', {});
  print('<span class="em">📕 圖鑑獎勵</span>');
  print('<span class="sys">各地區圖鑑捕捉到一半、全部時可以領獎勵（含神獸）。另外全國（神獸除外）捕捉 25% 送捕獲護符、50% 送閃耀護符。</span>');
  if(msg) print(msg);
  print(`全國捕捉進度：${caughtPct().toFixed(1)}%`);
  CHARMS.forEach(c=>print(`${hasCharm(c.key) ? '✅' : '⬜'} ${c.label}（${c.pct}%）　<span class="sys">${c.desc}</span>`));
  hr();
  const opts = [];
  DEX_REGIONS.forEach(([g, name])=>{
    const c = genCaught(g), tt = genSize(g), pct = tt ? 100*c/tt : 0;
    const parts = DEX_RW.map(([p, rw], j)=>{
      const k = g + '_' + j, done = got[k], ok = pct >= p;
      if(ok && !done) opts.push({label:`🎁 領 ${name} ${p}%`, half:true, cls:'primary', action:()=>{
        if(got[k]) return screenDexReward();
        got[k] = 1; if(rw.money) state.money += rw.money; Object.entries(rw.items||{}).forEach(([ik, n])=>giveItem(ik, n));
        saveGame(); screenDexReward(`<span class="good">領到了 ${name} ${p}% 獎勵：${rwText(rw)}</span>`);
      }});
      return `${done ? '✅' : ok ? '🎁' : '⬜'}${p}%`;
    });
    print(`<b>${esc(name)}</b> ${c}/${tt}　${parts.join(' ')}`);
  });
  print(`<span class="sys">50%：${rwText(DEX_RW[0][1])}　100%：${rwText(DEX_RW[1][1])}</span>`);
  charmCheck();
  opts.push({label:'← 返回', action:screenFacility});
  setOptions(opts);
}

/* ========== 3. NPC 交換所 ========== */
const TRADE_NPC = ['交換迷阿明','旅行家小雅','收藏家老陳','漁夫阿海','研究員小林','大小姐艾莉'];
// 通訊交換才會進化的（本傳），本作原本要用聯繫繩
const TRADE_EVO = {};
EVO_FIX.forEach(([a, b, c])=>{ if(c && c.item === 'linkingcord') (TRADE_EVO[a] = TRADE_EVO[a] || []).push(b); });
function tradeOffers(){
  const k = todayKey(), out = [];
  const pool = WILD_BY_STAGE[1].concat(WILD_BY_STAGE[2]);
  for(let i=0;i<3;i++){   // 只看日期決定，一整天都一樣
    const want = pool[hashStr('tw' + k + i) % pool.length];
    let give = pool[hashStr('tg' + k + i) % pool.length]; if(give === want) give = pool[(hashStr('tg' + k + i) + 1) % pool.length];
    out.push({i, want, give, npc: TRADE_NPC[hashStr('tn' + k + i) % TRADE_NPC.length]});
  }
  return out;
}
function tradeExpMul(p){ return p && p.ot ? 1.5 : 1; }
xwrap('expMulFor', (o, t, a)=> o.apply(t, a) * tradeExpMul(a[0]) * (picnicOn('exp') ? 1.5 : 1));

function screenTrade(msg){
  clearLog(); renderBar();
  const rec = dayRec('trade');
  print('<span class="em">🤝 交換所</span>');
  print('<span class="sys">今天的交換請求（每個一天一次）。換來的寶可夢能力點比較高，獲得的經驗值 ×1.5。也可以在這裡做「通訊交換進化」。</span>');
  if(msg) print(msg);
  const opts = [];
  tradeOffers().forEach(of=>{
    const done = rec.done.includes(of.i), have = ownedOf(of.want).length;
    print(`${done ? '✅' : '🔁'} <b>${esc(of.npc)}</b>：用 <b>${esc(DEX[of.want][0])}</b> 換 <b>${esc(DEX[of.give][0])}</b>${done ? '　<span class="sys">已交換</span>' : have ? `　<span class="good">你有 ${have} 隻</span>` : '　<span class="sys">你沒有</span>'}`);
    opts.push({label:`${DEX[of.want][0]} → ${DEX[of.give][0]}`, half:true, cls:(done || !have) ? 'off' : '', action:()=>{ if(!done && have) screenTradePick(of); }});
  });
  const evo = state.party.filter(m=>TRADE_EVO[m.dex]);
  opts.push({label:`🔗 通訊交換進化${evo.length ? `（${evo.length}）` : ''}`, cls:evo.length ? '' : 'off', action:()=>{ if(evo.length) screenTradeEvo(); }});
  opts.push({label:'← 返回', action:screenFacility});
  setOptions(opts);
}
function ownedOf(dex){
  const out = [];
  state.party.forEach((m, i)=>{ if(m.dex === dex) out.push({where:'party', i, m}); });
  state.box.forEach((m, i)=>{ if(m.dex === dex) out.push({where:'box', i, m}); });
  return out;
}
function screenTradePick(of){
  clearLog();
  print(`<span class="em">要交出哪一隻 ${esc(DEX[of.want][0])}？</span>`);
  const list = ownedOf(of.want);
  const opts = list.map(x=>{
    const last = x.where === 'party' && state.party.length <= 1;
    return {label:`${x.where === 'party' ? '👥' : '📦'} ${monName(x.m)} Lv.${x.m.level}${x.m.held ? ' 🎒' : ''}`, half:true, cls:last ? 'off' : '', action:()=>{ if(!last) screenTradeConfirm(of, x); }};
  });
  if(list.some(x=>x.where === 'party') && state.party.length <= 1) print('<span class="sys">隊伍只剩一隻時不能交出去。</span>');
  opts.push({label:'取消', action:()=>screenTrade()});
  setOptions(opts);
}
function screenTradeConfirm(of, x){
  clearLog();
  print(`<span class="em">確認交換</span>`);
  print(`交出 ${nm(x.m)}（Lv.${x.m.level}）${x.m.shiny ? '<span class="bad">　這隻是異色的！</span>' : ''}${x.m.held ? `<br><span class="sys">攜帶的 ${esc(itemLabel(x.m.held))} 會先放回背包</span>` : ''}`);
  print(`換來 <b>${esc(DEX[of.give][0])}</b>（Lv.${x.m.level}，原訓練家：${esc(of.npc)}）`);
  setOptions([
    {label:'✅ 確認交換', action:()=>doTrade(of, x)},
    {label:'取消', action:()=>screenTrade()}
  ]);
}
function doTrade(of, x){
  const rec = dayRec('trade');
  const arr = x.where === 'party' ? state.party : state.box;
  if(rec.done.includes(of.i) || arr[x.i] !== x.m) return screenTrade();
  if(x.m.held) giveItem(x.m.held, 1);
  const n = hardenFoe(makeMon(of.give, x.m.level), 45, false);
  n.ot = of.npc; n.ball = 'poke'; n.friend = 70;
  arr.splice(x.i, 1, n);
  rec.done.push(of.i);
  state.caught.add(of.give); state.seen.add(of.give); if(n.shiny) state.shinyCaught.add(of.give);
  bump('trades');
  clearLog();
  print(`<span class="good">🤝 和 ${esc(of.npc)} 交換了！${esc(x.m.name)} 換成了 ${nm(n)}。</span>`);
  charmCheck();
  saveGame();
  if(x.where === 'party') return runEvolutions(()=>screenTrade());
  screenTrade();
}
function screenTradeEvo(){
  clearLog();
  print('<span class="em">🔗 通訊交換進化</span>');
  print('<span class="sys">本傳要通訊交換才會進化的寶可夢，在這裡請人換過去再換回來就會進化（不用聯繫繩）。</span>');
  const opts = [];
  state.party.forEach(m=>{ (TRADE_EVO[m.dex]||[]).forEach(to=>{
    opts.push({label:`${monName(m)} → ${DEX[to][0]}`, half:true, action:()=>{
      clearLog(); print(`<span class="sys">${nm(m)} 被換了出去……又換了回來！</span>`);
      evolveTo(m, to); saveGame(); runEvolutions(()=>screenTrade());
    }});
  }); });
  opts.push({label:'← 返回', action:()=>screenTrade()});
  setOptions(opts);
}

/* ========== 4. 野餐（限時效果，以野外遭遇次數計） ========== */
const PICNIC_N = 30;
const PICNIC = [
  {id:'type',  label:'🥪 屬性三明治', price:1500, desc:'指定一種屬性，野外遇到牠的機率大增'},
  {id:'shiny', label:'✨ 閃耀三明治', price:8000, desc:'異色寶可夢的出現率 ×2'},
  {id:'catch', label:'🎯 捕獲三明治', price:2000, desc:'捕捉成功率 +10%'},
  {id:'exp',   label:'📚 經驗三明治', price:2500, desc:'獲得的經驗值 ×1.5'}
];
function picnicState(){ const p = state.meta.picnic; return (p && p.left > 0) ? p : null; }
function picnicOn(id){ const p = picnicState(); return !!p && p.id === id; }
function picnicTick(){ const p = picnicState(); if(!p) return; p.left--; if(p.left <= 0){ delete state.meta.picnic; print('<span class="sys">🧺 三明治的效果結束了。</span>'); } }
function picnicText(){ const p = picnicState(); if(!p) return '沒有'; const d = PICNIC.find(x=>x.id === p.id); return `${d ? d.label : ''}${p.type ? `（${p.type}）` : ''}　剩 ${p.left} 次遭遇`; }
xwrap('biasPool', (o, t, a)=>{
  const p = picnicState();
  if(p && p.id === 'type' && p.type && Math.random() < 0.6){
    const f = a[0].filter(i=>DEX[i][1] === p.type || DEX[i][2] === p.type);
    if(f.length) return f;
  }
  return o.apply(t, a);
});
function screenPicnic(msg){
  clearLog(); renderBar();
  print('<span class="em">🧺 野餐</span>');
  print(`<span class="sys">和隊伍一起吃三明治，效果持續 ${PICNIC_N} 次野外遭遇（同時只能有一種，吃新的會蓋掉舊的）。一起吃飯，隊伍的親密度 +3。</span>`);
  print(`目前效果：${picnicText()}`);
  if(msg) print(msg);
  PICNIC.forEach(d=>print(`<b>${d.label}</b>　💰${d.price}　<span class="sys">${d.desc}</span>`));
  const opts = PICNIC.map(d=>({label:`${d.label}`, half:true, cls:state.money >= d.price ? '' : 'off', action:()=>{
    if(state.money < d.price) return;
    if(d.id === 'type') return screenPicnicType(d);
    screenPicnicConfirm(d);
  }}));
  opts.push({label:'← 返回', action:screenFacility});
  setOptions(opts);
}
function screenPicnicType(d){
  clearLog();
  print('<span class="em">要做哪一種屬性的三明治？</span>');
  const opts = TYPE_LIST.map(ty=>({label:ty, html:`<span style="color:${TYPE_COLOR[ty]||'inherit'}">${ty}</span>`, row:'ty', action:()=>screenPicnicConfirm(d, ty)}));
  opts.push({label:'取消', action:()=>screenPicnic()});
  setOptions(opts);
}
function screenPicnicConfirm(d, ty){
  clearLog();
  print('<span class="em">確認</span>');
  print(`${d.label}${ty ? `（${ty}）` : ''}　💰${d.price}　<span class="sys">（目前 💰${state.money}）</span>`);
  print(`<span class="sys">${esc(d.desc)}，持續 ${PICNIC_N} 次野外遭遇。</span>`);
  if(picnicState()) print(`<span class="bad">目前的效果（${esc(picnicText())}）會被蓋掉。</span>`);
  setOptions([
    {label:`✅ 確認花 💰${d.price}`, action:()=>{
      if(state.money < d.price) return screenPicnic();
      state.money -= d.price;
      state.meta.picnic = {id:d.id, type:ty || '', left:PICNIC_N};
      state.party.forEach(m=>addFriend(m, 3));
      bump('picnics'); saveGame();
      screenPicnic(`<span class="good">🧺 大家一起吃了${d.label.replace(/^\S+\s/, '')}！</span>`);
    }},
    {label:'取消', action:()=>screenPicnic()}
  ]);
}

/* ========== 設施選單（野外的 🏕） ========== */
function screenFacility(){
  clearLog(); renderBar();
  print('<span class="em">🏕 設施</span>');
  const ob = outbreakHere();
  print(`📣 大量出現　${ob ? `這一區正在大量出現 <b>${esc(DEX[ob.dex][0])}</b>（連鎖 ${obChain(ob.dex)}）` : '<span class="sys">這一區今天沒有</span>'}`);
  print(`🤝 交換所　今天剩 ${3 - dayRec('trade').done.length} 個交換`);
  print(`🧺 野餐　目前效果：${esc(picnicText())}`);
  print(`📕 圖鑑獎勵　全國捕捉 ${caughtPct().toFixed(1)}%`);
  setOptions([
    {label:'📣 大量出現', half:true, action:screenOutbreak},
    {label:'🤝 交換所', half:true, action:()=>screenTrade()},
    {label:'🧺 野餐', half:true, action:()=>screenPicnic()},
    {label:'📕 圖鑑獎勵', half:true, action:()=>screenDexReward()},
    {label:'返回', action:toField}
  ]);
}
// 今日畫面也列出大量出現
xwrap('screenToday', (o, t, a)=>{
  const r = o.apply(t, a);
  hr(); print('<span class="em">📣 大量出現</span>'); outbreakLines().forEach(x=>print(x));
  if(picnicState()) print(`🧺 野餐效果：${esc(picnicText())}`);
  return r;
});

/* ========== 5. 團體戰（1 對 1 的強化頭目，有回合限制，贏了可以收服） ========== */
const RAID_TURNS = 10;
const RAID_HP = [2, 2.5, 3, 3.5, 4];
const RAID_LV = [15, 25, 35, 50, 65];
function raidMaxStar(){ return Math.min(5, 1 + Math.floor((state.meta.badges||0) / 3)); }
function raidDens(){
  const k = todayKey(), out = [], ms = raidMaxStar();
  for(let i=0;i<4;i++){
    const kind = i < 2 ? 'tera' : 'dmax';
    const star = Math.max(1, ms - (hashStr('rs' + k + i) % 2));
    const stg = star <= 2 ? (hashStr('rg' + k + i) % 2 ? 2 : 1) : star <= 4 ? (hashStr('rg' + k + i) % 2 ? 3 : 2) : 3;
    const pool = WILD_BY_STAGE[stg];
    const dex = pool[hashStr('rd' + k + i) % pool.length];
    const tera = TYPE_LIST[hashStr('rt' + k + i) % TYPE_LIST.length];
    out.push({i, kind, star, dex, tera});
  }
  return out;
}
function raidLocked(d){ return d.kind === 'tera' ? !hasKeyItem('teraorb') : !hasKeyItem('dmaxband'); }
function raidLevel(star){ return diffLv(Math.min(MAX_LEVEL, Math.max(RAID_LV[star-1], Math.round((state.maxZone||1) * 4 * (0.5 + star*0.08))))); }
function raidStars(n){ return '★'.repeat(n) + '☆'.repeat(5-n); }
function screenRaid(msg){
  clearLog(); renderBar();
  const rec = dayRec('raid');
  print('<span class="em">💠 團體戰</span>');
  print(`<span class="sys">和強化過的頭目 1 對 1 對戰，${RAID_TURNS} 回合內打倒就能收服（必定成功，有機會是隱藏特性），還能拿到道具。太晶團體戰要太晶珠、極巨團體戰要極巨腕帶。輸了或超過回合可以重來，打贏後今天就不能再打同一個巢穴。星數隨徽章增加（目前最高 ${raidMaxStar()}★）。</span>`);
  if(msg) print(msg);
  const opts = [];
  raidDens().forEach(d=>{
    const done = rec.done.includes(d.i), lock = raidLocked(d);
    const kn = d.kind === 'tera' ? `💎 太晶（${d.tera}）` : '🔴 極巨';
    print(`${done ? '✅' : lock ? '🔒' : '💠'} ${raidStars(d.star)} ${kn}：<b>${esc(DEX[d.dex][0])}</b> Lv.${raidLevel(d.star)}${done ? '　<span class="sys">已打倒</span>' : lock ? `　<span class="sys">要${d.kind === 'tera' ? '太晶珠' : '極巨腕帶'}</span>` : ''}`);
    opts.push({label:`${d.kind === 'tera' ? '💎' : '🔴'} ${d.star}★ ${DEX[d.dex][0]}`, half:true, cls:(done || lock) ? 'off' : '', action:()=>{ if(!done && !lock) startRaid(d); }});
  });
  opts.push({label:'返回對戰選單', action:screenBattleMenu});
  setOptions(opts);
}
function startRaid(d){
  if(noAlive()){ clearLog(); print('<span class="bad">你的隊伍已經沒有能戰鬥的寶可夢了，先去補給站治療吧。</span>'); return screenRaid(); }
  const lv = raidLevel(d.star);
  const w = makeMon(d.dex, lv, {abSlot: rollAbilitySlot(d.dex, 0.25)});
  hardenFoe(w, 30 + d.star*5, d.star >= 4);
  const mul = RAID_HP[d.star-1];
  w.maxhp = Math.round(w.maxhp * mul); w.hp = w.maxhp;
  if(d.kind === 'tera'){ w.tera = d.tera; w._ace = true; }
  else { w._raidName = w.name; w.name = w.name + '（極巨）'; w.moves = w.moves.map(m=>Object.assign({}, m, {power: m.power ? Math.round(m.power*1.2) : m.power})); }
  w._raidTag = d.kind;
  state.seen.add(d.dex);
  clearBattleModifiers();
  state.battle = {wild:w, playerIdx:firstAlive(), mode:'raid', raid:d, title:'團體戰頭目'};
  introLead = introLeadFor('big');
  clearLog();
  announceShiny(w);
  print(`<span class="boss">💠 ${raidStars(d.star)} ${d.kind === 'tera' ? '太晶' : '極巨'}團體戰！${nm(w)}（Lv.${w.level}）出現了！</span>`);
  print(`<span class="sys">（HP ×${mul}，${RAID_TURNS} 回合內打倒牠。不能逃跑、不能用球）</span>`);
  screenBattle(); battleIntro('big');
}
xwrap('screenBattle', (o, t, a)=>{
  const b = state.battle;
  if(b && b.mode === 'raid' && b.wild && b.wild.hp > 0){
    const turn = b.turn || 1;
    if(turn > RAID_TURNS) return raidTimeout();
    const w = b.wild;
    if(!b._shock && w.hp <= w.maxhp/2){   // 一半血時放出衝擊波：清掉我方能力提升，自己的防禦特防 +1
      b._shock = true;
      const p = state.party[b.playerIdx];
      print(`<span class="boss">⚡ ${nm(w)} 放出了衝擊波！</span>`);
      if(p) ['atkMul','defMul','spaMul','sdfMul','spdMul','accMul','evaMul'].forEach(k=>{ if(p[k] > 1) p[k] = 1; });
      print('<span class="sys">你的寶可夢能力提升被清除了。</span>');
      const t1 = statChange(w, 'd', 1, false, w), t2 = statChange(w, 'e', 1, false, w);
      if(t1) print(t1); if(t2) print(t2);
    }
    if(turn > 1) print(`<span class="sys">⏳ 剩 ${RAID_TURNS - turn + 1} 回合</span>`);
  }
  return o.apply(t, a);
});
function raidTimeout(){
  const b = state.battle;
  print(`<span class="bad">⏳ 時間到了……${nm(b.wild)} 的力量太強，你們被吹出了巢穴！</span>`);
  state.party.forEach(m=>{ if(m.hp <= 0) m.hp = 1; });
  state.battle = null; battleDone(); bump('raidFails');
  saveGame();
  setOptions([{label:'💠 回團體戰', action:()=>screenRaid()}, {label:'返回野外', action:toField}]);
}
const RAID_DROP = [['rarecandy', 1], ['ppup', 2], ['mint', 3], ['abcapsule', 3], ['abpatch', 5], ['ppmax', 5]];   // [道具, 最低星數]
xwrap('winBattle', (o, t, a)=>{
  const b = state.battle;
  if(!b || b.mode !== 'raid') return o.apply(t, a);
  const w = b.wild, d = b.raid, p = state.party[b.playerIdx];
  bump('wins'); bump('raids');
  state.party.forEach(m=>{ if(m.hp > 0) addFriend(m, m === p ? 3 : 1); });
  print(`<span class="good">打倒了團體戰頭目 ${nm(w)}！</span>`);
  if(p && p.hp > 0) grantExp(p, w.level, 1.5, '獲得');
  shareExp(p, w.level, 1.5);
  state.battle = null; battleDone();
  dayRec('raid').done.push(d.i);
  giveMoney(w.level * 20 * d.star);
  const drops = {rarecandy: d.star};
  RAID_DROP.filter(([k, s])=>d.star >= s && ITEMS[k] && Math.random() < 0.5).forEach(([k])=>{ drops[k] = (drops[k]||0) + 1; });
  Object.entries(drops).forEach(([k, n])=>giveItem(k, n));
  print(`<span class="good">獲得了 ${Object.entries(drops).map(([k, n])=>`${esc(itemLabel(k))}×${n}`).join('、')}！</span>`);
  saveGame();
  warnIfWiped();
  runEvolutions(()=>raidCatchAsk(w, d));
});
function raidCatchAsk(w, d){
  hr();
  print(`要收服 ${nm(w)} 嗎？　<span class="sys">特性：${esc(abName(w))}${w.abSlot === 2 ? '（隱藏特性）' : ''}${d.kind === 'tera' ? `　太晶屬性：${d.tera}` : ''}</span>`);
  setOptions([
    {label:'🎯 收服', action:()=>{
      const n = makeMon(w.dex, w.level, {shiny:w.shiny, iv:w.iv, ivCap:w.ivCap, nature:w.nature, abSlot:w.abSlot, gender:w.gender});
      if(d.kind === 'tera') n.tera = d.tera;
      n.ball = 'poke';
      state.caught.add(n.dex); state.seen.add(n.dex); if(n.shiny) state.shinyCaught.add(n.dex);
      bump('catches');
      clearLog();
      if(state.party.length < 6){ state.party.push(n); print(`<span class="good">收服了 ${nm(n)}！牠加入了你的隊伍。</span>`); }
      else { state.box.push(n); print(`<span class="good">收服了 ${nm(n)}！隊伍已滿，牠被送到了倉庫。</span>`); }
      charmCheck(); saveGame();
      setOptions([{label:'💠 回團體戰', action:()=>screenRaid()}, {label:'返回野外', action:toField}]);
    }},
    {label:'放走', action:()=>{ clearLog(); print(`${nm(w)} 回到了巢穴深處。`); setOptions([{label:'💠 回團體戰', action:()=>screenRaid()}, {label:'返回野外', action:toField}]); }}
  ]);
}
xwrap('loseBattle', (o, t, a)=>{
  const raid = state.battle && state.battle.mode === 'raid';
  const r = o.apply(t, a);
  if(raid){ setOptions([{label:'💠 回團體戰', action:()=>screenRaid()}, {label:'返回野外', action:toField}]); }
  return r;
});
xwrap('introLabel', (o, t, a)=>{
  const b = state.battle;
  if(b && b.mode === 'raid') return `<div class="vs">💠</div><div class="sub">${raidStars(b.raid.star)} 團體戰</div>`;
  if(b && b.btBoss && a[0] !== 'wild') return `<div class="vs">🏰</div><div class="sub">塔主</div>`;
  return o.apply(t, a);
});

/* doubles.js：雙打對戰引擎＋對戰塔（自己的隊伍統一 Lv.50，單打／雙打連勝）
   雙打的做法：沿用單打的出招程式（doAttack/useMove），每次出招前把 state.battle.wild／playerIdx
   暫時切成「這一招的攻擊方和目標」，所以招式、特性、道具的效果都照單打的規則算。
   簡化：雙打不能用道具、不能太晶化／極巨化／Mega／Z；吼叫、急速折返這類換人效果在雙打沒有作用；
   幫助、看我嘛這類雙打專用招本來就沒收錄。 */

// 打到多隻的招式：'foes' 對手兩隻、'all' 除了自己以外全部（包含隊友）
const SPREAD = {
  157:'foes', 257:'foes', 59:'foes', 330:'foes', 605:'foes', 304:'foes', 196:'foes', 527:'foes', 284:'foes', 523:'foes', 572:'foes', 445:'foes',
  89:'all', 57:'all', 435:'all', 153:'all', 120:'all', 586:'all', 222:'all'
};
const SPREAD_MUL = 0.75;
const DBL_TRAINER_RATE = 0.3;   // 路上訓練家有 2 隻以上時，變成雙打的機率

function isDbl(){ const b = state.battle; return !!b && b.mode === 'doubles'; }
function dbl(){ return state.battle.d; }
function dMine(){ const d = dbl(); return d.me.map(i=> i === null ? null : state.party[i]); }
function dFoes(){ const d = dbl(); return d.foe.map(i=> i === null ? null : d.team[i]); }
function aliveArr(a){ return a.filter(m=>m && m.hp > 0); }
function dSetCtx(mine, foe){   // 讓單打的程式以為現在是這兩隻在對打
  const b = state.battle, d = b.d;
  if(mine){ const i = state.party.indexOf(mine); if(i >= 0) b.playerIdx = i; }
  if(foe) b.wild = foe;
  else { const f = aliveArr(dFoes())[0] || d.team[0]; b.wild = f; }
}
function dClearFlags(){ const b = state.battle; if(!b) return; delete b._pivot; delete b._foePivot; delete b._ended; }

/* ---------- 開始 ---------- */
// foes：對手全部的寶可夢；opt：{sub:'trainer'|'btower', title, reward, btBoss}
function startDoubles(foes, opt){
  foes.forEach(f=>state.seen.add(f.dex));
  clearBattleModifiers();
  const mine = []; state.party.forEach((m, i)=>{ if(m.hp > 0 && mine.length < 2) mine.push(i); });
  while(mine.length < 2) mine.push(null);
  const team = foes.slice();
  const b = state.battle = Object.assign({
    mode:'doubles', wild:team[0], foes:team, playerIdx:mine[0], turn:1,
    d:{me:mine, foe:[0, team.length > 1 ? 1 : null], team, fainted:new Set()}
  }, opt);
  b._init = true;
  b.baseWeather = b.weather = opt.sub === 'trainer' ? fieldWeather() : 'none';
  [...state.party, ...team].forEach(resetBattleFlags);
  b._dEntry = true;   // 第一次畫面時處理出場特性
  return b;
}
function dEntry(m){
  const b = state.battle; ensureAbility(m);
  const mine = !isFoeMon(m);
  const opp = aliveArr(mine ? dFoes() : dMine())[0];
  if(mine) dSetCtx(m, opp); else dSetCtx(aliveArr(dMine())[0], m);
  if(!mine) print(`<span class="sys">${who(m)} 的特性：${esc(abName(m))}</span>`);
  onEntry(m, opp);
  // 威嚇對兩隻都有效
  if(hasAb(m, 'intimidate')){
    const o2 = aliveArr(mine ? dFoes() : dMine())[1];
    if(o2){ const bl = intimidateBlocked(o2); if(bl) print(bl); else { print(statChange(o2, 'a', -1, true, m)); herbCheck(o2); } }
  }
  entryHazards(m);
  if(mine){ const pu = state.stats.pu && typeof state.stats.pu === 'object' ? state.stats.pu : (state.stats.pu = {}); pu[m.dex] = (pu[m.dex]||0) + 1; }
  if(!mine) foeAceEntry(m);
  dClearFlags();
}

/* ---------- 畫面 ---------- */
function dCardHtml(m, side){
  if(!m) return `<div class="card ${side}" style="opacity:.25"><div class="r1"><span>—</span></div></div>`;
  const nmx = (m.shiny?'✨':'') + esc(m.name) + genderHtml(m) + (m._tera?' 💎':'');
  const hpt = side === 'me' ? `<div class="hpt">HP: ${Math.max(0,m.hp)}/${m.maxhp}</div>` : '';
  return `<div${monBgAttr(m, side, side === 'me' ? frameStyle(m) : '')}${m.hp <= 0 ? ' data-ko="1"' : ''}><div class="r1"><span>${nmx}</span><span>Lv.${m.level}</span></div><div class="r2">${m._tera?'💎':''}${esc(typesOf(m).filter(Boolean).join('／'))}${stChip(m)}</div><div class="bar${pctHp(m)<30?' low':''}"><i style="width:${pctHp(m)}%"></i></div>${hpt}</div>`;
}
function dStageHtml(){
  const b = state.battle;
  const info = `<div class="binfo"><span>雙打　第 <b>${b.turn||1}</b> 回合</span>${weatherChip() ? `<span>${weatherChip()}</span>` : ''}${fieldChip() ? `<span>${fieldChip()}</span>` : ''}</div>`;
  const row = (arr, side)=>`<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${arr.map(m=>dCardHtml(m, side)).join('')}</div>`;
  return info + row(dFoes(), 'foe') + row(dMine(), 'me');
}
xwrap('renderStage', (o, t, a)=>{
  if(!isDbl()) return o.apply(t, a);
  const at = a[0], b = state.battle;
  const apply = ()=>{ if(state.battle === b && isDbl()) stageEl.innerHTML = dStageHtml(); };
  if(!at || at <= 0 || !stageEl.innerHTML) apply(); else stageTimers.push(setTimeout(apply, at));
});
xwrap('who', (o, t, a)=> (isDbl() && isFoeMon(a[0])) ? '對手 ' + nm(a[0]) : o.apply(t, a));
xwrap('screenBattle', (o, t, a)=> isDbl() ? dblScreen() : o.apply(t, a));
xwrap('checkBattleEnd', (o, t, a)=> isDbl() ? false : o.apply(t, a));
xwrap('afterFaintCheck', (o, t, a)=> isDbl() ? false : o.apply(t, a));
xwrap('winBattle', (o, t, a)=> isDbl() ? undefined : o.apply(t, a));
xwrap('endOfTurn', (o, t, a)=> isDbl() ? undefined : o.apply(t, a));

function dblScreen(){
  const b = state.battle, d = b.d;
  renderBar();
  if(b._dEntry){
    delete b._dEntry;
    const f = aliveArr(dFoes()), m = aliveArr(dMine());
    print(`<span class="em">⚔️ 雙打對戰！${esc(b.title||'對手')} 派出了 ${f.map(nm).join(' 和 ')}！</span>`);
    print(`你派出了 ${m.map(nm).join(' 和 ')}！`);
    if(b.weather !== 'none') print(`<span class="sys">${WEATHER[b.weather].icon} ${WEATHER[b.weather].name}</span>`);
    [...f, ...m].forEach(dEntry);
    if(dCheckEnd()) return;
  }
  d.acts = {};
  renderStage(curDelay());
  if(b.turn === 1) print('<span class="sys">（雙打：不能用道具、不能太晶化／極巨化，地震、岩崩這類招式會同時打到兩隻，威力 ×0.75）</span>');
  dPickFor(0);
}
// 依序幫兩隻選行動
function dPickFor(slot){
  const b = state.battle, d = b.d;
  if(slot > 1) return dRunTurn();
  const m = dMine()[slot];
  if(!m || m.hp <= 0) return dPickFor(slot + 1);
  if(m._force || m._rch){ d.acts[slot] = {mv: m._force ? m._force.mv : (m.moves[0] || STRUGGLE), busy:true}; return dPickFor(slot + 1); }
  dSetCtx(m, null);
  print(`<span class="em">${nm(m)} 要做什麼？</span>`);
  const opts = [];
  if(usableMoves(m).length){
    m.moves.forEach((mv, i)=>{
      const why = moveBlockReason(m, mv), off = !!why;
      const sp = SPREAD[mv.id] ? '　◎範圍' : '';
      opts.push({label:`${mv.name}`, half:true, cls:'mv' + (off ? ' off' : ''),
        html:`<span class="mvn">${esc(mv.name)}</span><span class="mvt" style="background:${TYPE_COLOR[mv.type]||'#2b3a8c'}">${mv.type}</span><i class="mvbr"></i><span class="mvs">${mv.cls === 2 ? '變化' : '威力 ' + (mv.power||'—')}${sp}</span><span class="mvpp">PP ${mv.pp}/${mv.maxpp}</span>${why ? `<span class="mvp">🚫${esc(why)}</span>` : ''}`,
        action: off ? ()=>dPickFor(slot) : ()=>dPickTarget(slot, mv)});
    });
  } else opts.push({label:'掙扎', action:()=>{ d.acts[slot] = {mv:STRUGGLE}; dNext(slot); }});
  const bench = state.party.filter((x, i)=>x.hp > 0 && !d.me.includes(i) && !dSwitchTaken(i));
  if(bench.length && canEscape(m) && !abTrapped(m)) opts.push({ic:'🔄', label:'換上場', row:'act', action:()=>dPickSwitch(slot)});
  if(slot === 1 && d.acts[0] && dMine()[0] && dMine()[0].hp > 0 && !d.acts[0].busy) opts.push({ic:'↩', label:'重選上一隻', row:'act', action:()=>{ delete d.acts[0]; clearLog(); dPickFor(0); }});
  setOptions(opts, '選擇招式');
}
function dSwitchTaken(i){ const d = dbl(); return Object.values(d.acts||{}).some(x=>x && x.sw === i); }
function dNext(slot){ clearLog(); dPickFor(slot + 1); }
function dPickTarget(slot, mv){
  const d = dbl(), foes = dFoes();
  const alive = [0,1].filter(k=>foes[k] && foes[k].hp > 0);
  if(SPREAD[mv.id] || mv.cls === 2 || alive.length <= 1){ d.acts[slot] = {mv, tgt: alive[0] ?? 0}; return dNext(slot); }
  print(`<span class="sys">${esc(mv.name)} 要打哪一隻？</span>`);
  setOptions(alive.map(k=>({label:`🎯 ${monName(foes[k])}　HP ${pctHp(foes[k])}%`, half:true, action:()=>{ d.acts[slot] = {mv, tgt:k}; dNext(slot); }}))
    .concat([{label:'← 換招式', action:()=>{ clearLog(); dPickFor(slot); }}]), '選擇目標');
}
function dPickSwitch(slot){
  const d = dbl();
  clearLog(); print('<span class="em">要換上哪一隻？</span>');
  const opts = state.party.map((x, i)=>(x.hp > 0 && !d.me.includes(i) && !dSwitchTaken(i)) ? {label:`${monName(x)} Lv.${x.level} HP ${x.hp}/${x.maxhp}`, half:true, action:()=>{ d.acts[slot] = {sw:i}; dNext(slot); }} : null).filter(Boolean);
  opts.push({label:'← 返回', action:()=>{ clearLog(); dPickFor(slot); }});
  setOptions(opts, '選擇寶可夢');
}

/* ---------- 回合執行 ---------- */
function dRunTurn(){
  const b = state.battle, d = b.d;
  clearLog();
  const acts = [];
  dMine().forEach((m, s)=>{ const a = d.acts[s]; if(m && m.hp > 0 && a) acts.push(Object.assign({a:m, side:'me', slot:s}, a)); });
  dFoes().forEach((f, s)=>{
    if(!f || f.hp <= 0) return;
    const tg = aliveArr(dMine()); if(!tg.length) return;
    const t = tg[Math.floor(Math.random()*tg.length)];
    dSetCtx(t, f);
    acts.push({a:f, side:'foe', slot:s, mv:chooseFoeMove(f), tgtMon:t});
  });
  acts.forEach(x=>{
    if(x.sw !== undefined){ x.pri = 99; x.spd = 0; return; }
    const opp = x.side === 'me' ? (dFoes()[x.tgt] || aliveArr(dFoes())[0]) : x.tgtMon;
    x.pri = (x.mv.pri||0) + (opp ? abPriority(x.a, x.mv, opp) : 0) + abOrderBias(x.a, x.mv)*0.01;
    x.spd = effSpd(x.a);
    if(x.side === 'me' && (holds(x.a,'choicescarf') || hasAb(x.a,'gorillatactics')) && !x.mv.struggle && !x.a._lock) x.a._lock = x.mv.name;
    x.a._choice = x.mv;
  });
  const tr = bf().troom;
  acts.sort((p, q)=> q.pri - p.pri || (tr ? p.spd - q.spd : q.spd - p.spd) || (Math.random() - 0.5));
  for(const x of acts){
    if(!state.battle || !isDbl()) return;
    if(x.a.hp <= 0) continue;
    if(x.sw !== undefined){ dDoSwitch(x.slot, x.sw); continue; }
    if(!dActive(x.a)) continue;
    dDoMove(x);
    if(dCheckEnd()) return;
  }
  dEndTurn();
}
function dActive(m){ return dMine().includes(m) || dFoes().includes(m); }
function dDoSwitch(slot, i){
  const d = dbl(), old = dMine()[slot], nw = state.party[i];
  if(!nw || nw.hp <= 0 || d.me.includes(i)) return;
  d.me[slot] = i;
  if(old){ print(`收回了 ${nm(old)}，換上 ${nm(nw)}！`); switchOutFx(old); }
  else print(`派出了 ${nm(nw)}！`);
  dEntry(nw);
}
function dTargets(x){
  const mine = x.side === 'me';
  const opp = aliveArr(mine ? dFoes() : dMine());
  const kind = SPREAD[x.mv.id];
  if(kind === 'foes') return opp;
  if(kind === 'all'){ const ally = aliveArr(mine ? dMine() : dFoes()).filter(m=>m !== x.a); return opp.concat(ally); }
  if(mine){ const want = dFoes()[x.tgt]; return [want && want.hp > 0 ? want : opp[0]].filter(Boolean); }
  return [x.tgtMon && x.tgtMon.hp > 0 && dActive(x.tgtMon) ? x.tgtMon : opp[0]].filter(Boolean);
}
function dDoMove(x){
  const ts = dTargets(x);
  if(!ts.length) return;
  const multi = ts.length > 1 && x.mv.power > 0;
  const base = x.mv.power;
  ts.forEach((t, k)=>{
    if(x.a.hp <= 0 || t.hp <= 0) return;
    if(!state.battle || !isDbl()) return;
    const mine = !isFoeMon(x.a);
    if(mine) dSetCtx(x.a, isFoeMon(t) ? t : null); else dSetCtx(isFoeMon(t) ? aliveArr(dMine())[0] : t, x.a);
    if(ts.length > 1) print(`<span class="sys">→ ${isFoeMon(t) === isFoeMon(x.a) ? '打到隊友 ' : ''}${who(t)}</span>`);
    let mv = x.mv;
    if(k > 0) mv = Object.assign({}, x.mv);   // 第二個目標用複製的招式，不重複扣 PP
    if(multi) mv.power = Math.max(1, Math.round(base * SPREAD_MUL));
    try { doAttack(x.a, t, mv); }
    finally { if(k === 0) x.mv.power = base; }
    dClearFlags();
    dFaintCheck();
  });
}
function dFaintCheck(){
  const b = state.battle, d = b.d;
  [...dMine(), ...dFoes()].forEach(m=>{
    if(!m || m.hp > 0 || d.fainted.has(m)) return;
    d.fainted.add(m); m.hp = 0;
    if(isFoeMon(m)){
      print(`<span class="good">${who(m)} 倒下了！</span>`);
      if(b.sub !== 'btower'){
        const act = aliveArr(dMine());
        act.forEach(p=>grantExp(p, m.level, 1, '獲得'));
        const others = state.party.filter(p=>p.hp > 0 && !act.includes(p) && p.level < MAX_LEVEL);
        others.forEach(p=>grantExp(p, m.level, SHARE_EXP, '分到', true));
        if(others.length) print(`<span class="good">隊伍中其他 ${others.length} 隻寶可夢也分到了經驗值。</span>`);
      }
    } else print(`<span class="bad">${nm(m)} 倒下了！</span>`);
  });
}
function dCheckEnd(){
  const b = state.battle; if(!b || !isDbl()) return true;
  dFaintCheck();
  const foeLeft = b.d.team.some(m=>m.hp > 0), meLeft = state.party.some(m=>m.hp > 0);
  if(!foeLeft){ dWin(); return true; }
  if(!meLeft){ dLose(); return true; }
  return false;
}
function dEndTurn(){
  const b = state.battle;
  const all = [...dMine(), ...dFoes()].filter(m=>m && m.hp > 0);
  all.forEach(m=>{
    if(m.hp <= 0) return;
    if(isFoeMon(m)) dSetCtx(aliveArr(dMine())[0], m); else dSetCtx(m, null);
    const t = tickStatus(m); if(t) print(t);
    endTurnFx(m); moveEndTurn(m);
    dClearFlags();
  });
  fieldEndTurn();
  weatherTick();
  dClearFlags();
  if(dCheckEnd()) return;
  dRefill();
}
// 倒下的位置補人：對手自動派下一隻，我方自己選
function dRefill(){
  const b = state.battle, d = b.d;
  [0,1].forEach(s=>{
    const f = dFoes()[s];
    if(f && f.hp > 0) return;
    const nx = d.team.findIndex((m, i)=>m.hp > 0 && !d.foe.includes(i));
    if(nx >= 0){ d.foe[s] = nx; print(`<span class="em">${esc(b.title||'對手')} 派出了 ${nm(d.team[nx])}（Lv.${d.team[nx].level}）！</span>`); dEntry(d.team[nx]); }
    else d.foe[s] = null;
  });
  if(dCheckEnd()) return;
  dRefillMine(0);
}
function dRefillMine(s){
  const b = state.battle, d = b.d;
  if(s > 1){ b.turn = (b.turn||1) + 1; return dblScreen(); }
  const m = dMine()[s];
  const bench = state.party.map((x, i)=>i).filter(i=>state.party[i].hp > 0 && !d.me.includes(i));
  if((m && m.hp > 0) || !bench.length){ if(!(m && m.hp > 0)) d.me[s] = null; return dRefillMine(s + 1); }
  if(bench.length === 1){ d.me[s] = null; dDoSwitch(s, bench[0]); return dRefillMine(s + 1); }
  hr(); print('<span class="em">要派出哪一隻？</span>');
  setOptions(bench.map(i=>({label:`${monName(state.party[i])} Lv.${state.party[i].level} HP ${state.party[i].hp}/${state.party[i].maxhp}`, half:true, action:()=>{ clearLog(); d.me[s] = null; dDoSwitch(s, i); dRefillMine(s + 1); }})), '選擇寶可夢');
}
function dWin(){
  const b = state.battle;
  koFx();
  if(b.sub === 'btower') return btWin(b);
  bump('wins'); bump('trainers'); bump('dblWins');
  state.party.forEach(m=>{ if(m.hp > 0) addFriend(m, 1); });
  print(`<span class="good">打贏了雙打對戰！</span>`);
  if(b.sub === 'trainer') addZoneWin();
  state.battle = null; battleDone();
  giveMoney(b.reward || 0);
  warnIfWiped();
  runEvolutions(()=>screenField());
}
function dLose(){
  const b = state.battle;
  if(b.sub === 'btower'){ state.battle = null; battleDone(); return btEnd(true); }
  b.mode = 'trainer';
  loseBattle();
}

/* ---------- 路上的訓練家有機會變雙打 ---------- */
xwrap('startMultiBattle', (o, t, a)=>{
  const [mode, foes, title, extra] = a;
  if(mode === 'trainer' && foes.length >= 2 && state.party.filter(m=>m.hp > 0).length >= 2 && Math.random() < DBL_TRAINER_RATE){
    const b = startDoubles(foes, Object.assign({sub:'trainer', title}, extra));
    return b.d.team[0];
  }
  return o.apply(t, a);
});

/* ========== 對戰塔 ========== */
let bt = null;   // {backup, fmt:'single'|'double', streak, pick}
const BT_NEED = {single:3, double:4};
function btMeta(){ const m = facMeta(); if(!m.btBest || typeof m.btBest !== 'object') m.btBest = {single:0, double:0}; return m; }
function screenBTower(msg){
  clearLog(); renderBar();
  const meta = btMeta();
  print('<span class="em">🏰 對戰塔</span>');
  print('<span class="sys">用自己隊伍裡的寶可夢挑戰連勝。等級統一變成 Lv.50（只在塔裡，出來就恢復），不能用道具，每贏一場全隊回滿。單打選 3 隻、雙打選 4 隻，每 7 連勝會遇到塔主。BP 和對戰工廠共用。</span>');
  print(`BP ${meta.bp}　單打最高 ${meta.btBest.single} 連勝　雙打最高 ${meta.btBest.double} 連勝`);
  if(msg) print(msg);
  const n = state.party.length;
  setOptions([
    {label:'⚔️ 單打（3 隻）', half:true, cls:n >= 3 ? '' : 'off', action:()=>{ if(n >= 3) btPickStart('single'); }},
    {label:'⚔️⚔️ 雙打（4 隻）', half:true, cls:n >= 4 ? '' : 'off', action:()=>{ if(n >= 4) btPickStart('double'); }},
    {label:'🛒 BP 交換所', half:true, action:()=>screenBpShop()},
    {label:'返回', half:true, action:screenBattleMenu}
  ]);
}
function btPickStart(fmt){ bt = {fmt, streak:0, pick:[]}; screenBtPick(); }
function screenBtPick(){
  const need = BT_NEED[bt.fmt];
  clearLog();
  print(`<span class="em">選 ${need} 隻參賽</span>　<span class="sys">（照點的順序出場，點一下選／取消）</span>`);
  state.party.forEach((m, i)=>{ const k = bt.pick.indexOf(i); print(`${k >= 0 ? `[${k+1}]` : '⬜'} <b>${esc(monName(m))}</b>　${esc(typeStr(m))}　<span class="sys">${m.moves.map(x=>esc(x.name)).join('／')}</span>`); });
  const opts = state.party.map((m, i)=>({label:`${bt.pick.includes(i) ? `${bt.pick.indexOf(i)+1}. ` : ''}${m.name}`, half:true, action:()=>{
    const j = bt.pick.indexOf(i); if(j >= 0) bt.pick.splice(j, 1); else if(bt.pick.length < need) bt.pick.push(i); screenBtPick();
  }}));
  opts.push({label:`✔ 出發（${bt.pick.length}/${need}）`, cls:bt.pick.length === need ? '' : 'off', action:()=>{
    if(bt.pick.length !== need) return;
    bt.backup = state.party;
    state.party = bt.pick.map(i=>btClone(bt.backup[i]));
    saveGame();
    btNext();
  }});
  opts.push({label:'取消', action:()=>{ bt = null; screenBTower(); }});
  setOptions(opts);
}
function btClone(m){
  const c = JSON.parse(JSON.stringify(m));
  delete c.boost; c.level = 50; c.exp = 0;
  const st = monStats(c); c.maxhp = st.hp; c.hp = st.hp; setNonHpStats(c, st);
  c.status = null; restorePP(c); c._bt = true;
  return c;
}
function btNext(){
  const n = bt.streak + 1, boss = n % 7 === 0, cnt = BT_NEED[bt.fmt];
  const lo = boss ? 60 : Math.min(58, 35 + bt.streak*2);
  const foes = Array.from({length:cnt}, ()=>facRental(lo));
  foes.forEach(f=>{ f.level = 50; const st = monStats(f); f.maxhp = f.hp = st.hp; setNonHpStats(f, st); });
  if(boss || bt.streak >= 14){ const pool = FOE_HELD.filter(k=>HELD[k]); foes.forEach(m=>{ if(boss || Math.random() < 0.5) m.held = pool[Math.floor(Math.random()*pool.length)]; }); }
  if(boss) foes[foes.length-1]._ace = true;
  const title = boss ? '塔主' : `第 ${n} 戰的訓練家`;
  state.party.forEach(m=>{ m.hp = m.maxhp; m.status = null; restorePP(m); resetBattleFlags(m); });
  introLead = introLeadFor(boss ? 'big' : 'trainer');
  clearLog();
  print(`<span class="${boss ? 'boss' : 'em'}">🏰 ${esc(title)}向你挑戰！（${bt.fmt === 'double' ? '雙打' : '單打'}・連勝 ${bt.streak}）</span>`);
  if(bt.fmt === 'double'){
    startDoubles(foes, {sub:'btower', title, btBoss:boss});
  } else {
    const first = startMultiBattle('btower', foes, title, {btBoss:boss});
    print(`對手派出了 ${nm(first)}（Lv.${first.level}）！`);
  }
  screenBattle(); battleIntro(boss ? 'big' : 'trainer');
}
// 單打：打倒一隻後照訓練家的流程派下一隻（不拿經驗），全倒就結算
xwrap('winBattle', (o, t, a)=>{
  const b = state.battle;
  if(!b || b.mode !== 'btower') return o.apply(t, a);
  const w = b.wild;
  print(`<span class="good">擊敗了 ${nm(w)}！</span>`);
  if(b.foes && b.foes.length){
    (b.foeFainted = b.foeFainted || []).push(w);
    const nx = b.foes[0], cur = state.party[b.playerIdx];
    if(cur.hp <= 0){ b.foes.shift(); b.wild = nx; print(`<span class="em">對手派出了 ${nm(nx)}（Lv.${nx.level}）！</span>`); return afterFaintCheck(cur); }
    return askShiftBeforeFoe(nx);
  }
  btWin(b);
});
xwrap('loseBattle', (o, t, a)=>{
  const b = state.battle;
  if(b && b.mode === 'btower'){ state.battle = null; battleDone(); return btEnd(true); }
  return o.apply(t, a);
});
function btWin(b){
  state.battle = null; battleDone();
  bt.streak++;
  const meta = btMeta(), boss = b.btBoss;
  const got = 1 + Math.floor(bt.streak/7) + (boss ? 5 : 0) + (bt.fmt === 'double' ? 1 : 0);
  meta.bp += got;
  if(bt.streak > meta.btBest[bt.fmt]) meta.btBest[bt.fmt] = bt.streak;
  bump('btWins');
  print(`<span class="good">贏了！連勝 ${bt.streak}，獲得 BP ${got}（目前 ${meta.bp}）</span>`);
  if(bt.streak % 7 === 6) print('<span class="boss">下一戰是塔主！</span>');
  saveGame();
  setOptions([
    {label:'▶ 下一戰', action:btNext},
    {label:'🏳 結束挑戰', action:()=>btEnd(false)}
  ]);
}
function btEnd(lost){
  const r = bt; if(!r) return screenBTower();
  state.battle = null;
  if(r.backup) state.party = r.backup;
  bt = null;
  saveGame();
  clearLog(); renderBar();
  print(lost ? '<span class="bad">全隊倒下了……對戰塔挑戰結束。</span>' : '<span class="sys">結束了這次挑戰。</span>');
  print(`<span class="em">本次連勝：${r.streak}</span>${r.streak && r.streak >= btMeta().btBest[r.fmt] ? ' <span class="boss">🏆 新紀錄！</span>' : ''}`);
  setOptions([{label:'🏰 再挑戰一次', action:()=>screenBTower()}, {label:'返回對戰選單', action:screenBattleMenu}]);
}
// 對戰塔裡不能用道具
xwrap('screenItemSelect', (o, t, a)=>{
  const b = state.battle;
  if(b && b.mode === 'btower'){ clearLog(); print('<span class="sys">對戰塔裡不能用道具。</span>'); return screenBattle(); }
  return o.apply(t, a);
});

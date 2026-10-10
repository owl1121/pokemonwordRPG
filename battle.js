/* =====================================================
   battle.js — 對戰相關程式碼（從 index.html 拆出）
   內容：屬性相剋、狀態效果、對戰卡片畫面、戰鬥流程
        （攻擊、捕捉、道具、換人、進化、經驗、勝敗結算）
   載入順序：data.js → battle.js → index.html 內的主程式
   注意：這些函式會用到主程式的 state、print、setOptions 等，
        只在被呼叫時才用到，所以可以先載入。
   ===================================================== */

/* ---------- 屬性相剋 ---------- */
function eff(atkType, defTypes){
  let m = 1;
  const c = CHART[atkType];
  if(!c) return m;
  for(const t of defTypes){
    if(!t) continue;
    if(c.n && c.n.includes(t)) return 0;
    if(c.s.includes(t)) m *= 2;
    if(c.w.includes(t)) m *= 0.5;
  }
  return m;
}

/* ---------- 狀態效果（灼傷／中毒／麻痺） ---------- */
function applyMoveEffect(atkMon, defMon, move){
  const fx = STATUS_FX[move.type];
  if(!fx || Math.random() > fx.chance) return '';
  switch(fx.kind){
    case 'burn': if(defMon.status) return ''; defMon.status='burn'; return `<span class="bad">${nm(defMon)} 陷入了灼傷！</span>`;
    case 'poison': if(defMon.status) return ''; defMon.status='poison'; return `<span class="bad">${nm(defMon)} 中毒了！</span>`;
    case 'paralyze': if(defMon.status) return ''; defMon.status='paralyze'; return `<span class="bad">${nm(defMon)} 被麻痺了！</span>`;
    case 'atkDown': defMon.atkMul = Math.max(0.4, (defMon.atkMul||1)*0.75); return `<span class="bad">${nm(defMon)} 的攻擊下降了！</span>`;
    case 'defDown': defMon.defMul = Math.max(0.4, (defMon.defMul||1)*0.75); return `<span class="bad">${nm(defMon)} 的防禦下降了！</span>`;
    case 'selfDefUp': atkMon.defMul = Math.min(2, (atkMon.defMul||1)*1.3); return `<span class="good">${nm(atkMon)} 的防禦提升了！</span>`;
  }
  return '';
}
function tickStatus(mon){
  if(!mon.status || mon.hp<=0) return '';
  if(mon.status==='poison'){ const d=Math.max(1,Math.floor(mon.maxhp/8)); mon.hp=Math.max(0,mon.hp-d); return `<span class="bad">${nm(mon)} 因中毒損失了 ${d} 點HP。</span>`; }
  if(mon.status==='burn'){ const d=Math.max(1,Math.floor(mon.maxhp/16)); mon.hp=Math.max(0,mon.hp-d); return `<span class="bad">${nm(mon)} 因灼傷損失了 ${d} 點HP。</span>`; }
  return '';
}

/* ---------- 對戰卡片畫面 ---------- */
function pctHp(m){ return Math.max(0, Math.round(100*m.hp/m.maxhp)); }
function stChip(m){ const t={burn:'🔥灼傷',poison:'☠️中毒',paralyze:'⚡麻痺'}[m.status]; return t ? ' · '+t : ''; }
// 對戰卡片：at = 幾毫秒後才更新（讓血條跟著文字一起變），換了寶可夢則立即更新
let stageTimers = [], stageLatest = null, stageKey = null;
function flushStage(){ stageTimers.forEach(clearTimeout); stageTimers = []; if(stageLatest){ stageLatest(); stageLatest = null; } }
/* ---------- 對戰邊框：精靈球／超級球／高級球／大師球配色 ---------- */
const FRAME_NAMES = {poke:'精靈球', great:'超級球', ultra:'高級球', master:'大師球'};
const BALL_TO_FRAME = {pokeball:'poke', greatball:'great', ultraball:'ultra', masterball:'master'};
// 邊框解鎖條件：用該種球抓到的寶可夢數（精靈球預設解鎖；大師球也可以靠降服神獸解鎖）
const FRAME_UNLOCK = {
  poke:   {need:0,  text:'預設解鎖'},
  great:  {need:20, key:'cb_great',  text:'用超級球抓 20 隻寶可夢'},
  ultra:  {need:30, key:'cb_ultra',  text:'用高級球抓 30 隻寶可夢'},
  master: {need:1,  key:'cb_master', text:'用大師球抓 1 隻寶可夢，或降服 1 隻神獸'}
};
function frameProgress(k){                       // 回傳 [目前進度, 需要數量]
  const u = FRAME_UNLOCK[k]; if(!u || !u.key) return [0, 0];
  let n = (state.stats && state.stats[u.key]) || 0;
  if(k === 'master' && state.tower && state.tower.legendaryPtr > 0) n = Math.max(n, 1);
  return [Math.min(n, u.need), u.need];
}
function frameUnlocked(k){ const [n, need] = frameProgress(k); return !!FRAME_UNLOCK[k] && n >= need; }
// 個人檔案選了固定邊框（且已解鎖）就用它；選「依捕捉的球」（auto）則用這隻寶可夢被抓時用的球；
// 沒有紀錄（御三家、舊存檔）或那種邊框還沒解鎖的，都當精靈球
function frameKey(m){
  const f = state.profile && state.profile.frame;
  if(f && f !== 'auto' && FRAME_NAMES[f] && frameUnlocked(f)) return f;
  return (m && FRAME_NAMES[m.ball] && frameUnlocked(m.ball)) ? m.ball : 'poke';
}
function frameClass(m){ return 'fr-' + frameKey(m); }
function renderStage(at, hit, power){   // hit：'foe' 或 'me'，該張卡片會左右晃一下；power：'strong'／'weak'
  const b=state.battle, p=state.party[b.playerIdx], w=b.wild;
  const nmx = m => (m.shiny?'✨':'')+esc(m.name);
  const xp = p.level>=MAX_LEVEL ? 100 : Math.min(100, Math.round(100*p.exp/p.expNext));
  const html =
    `<div class="card foe"><div class="r1"><span>${nmx(w)}</span><span>Lv.${w.level}</span></div><div class="r2">#${dexNo(w.dex)} · ${esc(typeStr(w))}${stChip(w)}${b.foes&&b.foes.length?` · 還有 ${b.foes.length} 隻`:''}</div><div class="bar${pctHp(w)<30?' low':''}"><i style="width:${pctHp(w)}%"></i></div></div>`+
    `<div class="card me ${frameClass(p)}"><div class="r1"><span>${nmx(p)}</span><span>Lv.${p.level}</span></div><div class="r2">${esc(typeStr(p))} · 速度 ${p.spd}${stChip(p)}</div><div class="bar${pctHp(p)<30?' low':''}"><i style="width:${pctHp(p)}%"></i></div><div class="hpt">HP: ${p.hp}/${p.maxhp}</div><div class="xp"><i style="width:${xp}%"></i></div></div>`;
  const turnHtml = `<div>回合<br><b>${b.turn||1}</b></div><div>狀態<br><b>${b.phase||'選擇行動'}</b></div>`;
  const apply = ()=>{
    stageEl.innerHTML = html; turnEl.innerHTML = turnHtml;
    if(hit){ const c = stageEl.querySelector('.card.'+hit); if(c){ c.classList.add('hit'); if(power) c.classList.add(power); } }
    if(stageLatest===apply) stageLatest=null;
  };
  const fresh = stageKey && (stageKey[0]!==w || stageKey[1]!==p);
  stageKey = [w,p];
  if(!at || at<=0 || fresh || !stageEl.innerHTML){ apply(); return; }
  stageLatest = apply;
  stageTimers.push(setTimeout(apply, at));
}
function syncBattleUI(phase){
  const b=state.battle;
  if(b && state.party[b.playerIdx]){ if(phase) b.phase=phase; appEl.classList.add('battle'); renderStage(curDelay()); }
  else appEl.classList.remove('battle');
}

/* ---------- BATTLE ---------- */
function statusTag(m){
  if(!m.status) return '';
  const tag = {burn:'🔥灼傷', poison:'☠️中毒', paralyze:'⚡麻痺'}[m.status] || '';
  return tag ? ` <span class="bad">[${tag}]</span>` : '';
}
function who(m){
  const b = state.battle;
  if(b && m === b.wild) return (b.mode==='wild' ? '野生的 ' : '對手 ') + nm(m);
  return nm(m);
}
function screenBattle(){
  const b = state.battle, p = state.party[b.playerIdx];
  renderBar();
  const FX={burn:'灼傷',poison:'中毒',paralyze:'麻痺',drain:'吸血',atkDown:'降攻',defDown:'降防',selfDefUp:'升防'};
  const mk = (mv,i)=>{
    const off = !mv.struggle && !(mv.pp>0), fx = STATUS_FX[mv.type];
    const ppTxt = mv.struggle ? 'PP ∞' : `PP ${mv.pp}/${mv.maxpp}`;
    const ppCls = mv.struggle ? '' : (mv.pp<=0 ? ' zero' : mv.pp <= Math.ceil(mv.maxpp/4) ? ' low' : '');
    const sub = `威力 ${mv.power}` + (fx?` · ✦${FX[fx.kind]}`:'') + (mv.recoil?' · ⚠反作用力':'');
    return { label:`${mv.name}（${mv.type}／威力${mv.power}／${ppTxt}）`, half:!mv.struggle, cls:'mv'+(off?' off':''),
      html:`<span class="mvn">${esc(mv.name)}</span><span class="mvt" style="background:${TYPE_COLOR[mv.type]||'#2b3a8c'}">${mv.type}</span><span class="mvpp${ppCls}">${ppTxt}</span><span class="mvp">${sub}</span>`,
      action: off ? ()=>screenBattle() : ()=>playerMove(i) };
  };
  let opts;
  if(p.moves.some(m=>m.pp>0)) opts = p.moves.map(mk);
  else { print('<span class="bad">所有招式的 PP 都用完了！只能使用「掙扎」（會受到反作用力）。</span>'); opts = [mk(STRUGGLE,-1)]; }
  if(b.mode !== 'run') opts.push({label:'🎒 道具', cls:'q', action:screenItemSelect});   // 連戰試煉不能用道具
  if(state.party.filter(m=>m.hp>0).length>1) opts.push({label:'🔄 換上場', cls:'q', action:screenSwitch});
  if(b.mode==='wild'){
    opts.push({label:'🎯 捕捉', cls:'q', action:screenBallSelect});
    opts.push({label:'🏃 逃跑', cls:'q', action:tryFlee});
  }
  if(b.mode==='legendary') print('<span class="sys">（神獸戰無法逃跑，也無法用精靈球——擊敗牠就能收服）</span>');
  else if(b.mode==='trainer' || b.mode==='gym') print('<span class="sys">（訓練家對戰不能逃跑，也不能捕捉）</span>');
  else if(b.mode==='tower') print('<span class="sys">（塔內不能捕捉也不能逃跑，輸了會被送出塔外）</span>');
  else if(b.mode==='run') print('<span class="sys">（連戰試煉：不能用道具、不能逃跑、不能捕捉，全隊倒下就結束）</span>');
  setOptions(opts,'選擇招式');
}

function screenBallSelect(){
  const b = state.battle;
  clearLog(); renderBar();
  const opts = BALL_KEYS.filter(k=>state.bag[k]>0).map(k=>({label:`${ITEMS[k].label} ×${state.bag[k]}`, half:true, html:`${esc(ITEMS[k].label)} ×${state.bag[k]}<span class="sub">${esc(ITEMS[k].desc)}</span>`, action:()=>tryCatch(k)}));
  if(!opts.length) print('<span class="bad">你沒有任何精靈球了！去商店買吧。</span>');
  opts.push({label:'← 返回', action:toBattle});
  setOptions(opts,'選擇球種');
}
function screenMoveSelect(){ screenBattle(); }

function hpBars(){ /* 改由 renderStage() 畫對戰卡片 */ }

function normalizeLegend(w){
  if(!w.legend) return;
  const fresh = makeMon(w.dex, w.level, {shiny:w.shiny});
  Object.assign(w, {maxhp:fresh.maxhp, hp:fresh.maxhp, atk:fresh.atk, def:fresh.def, spd:fresh.spd, moves:fresh.moves, exp:0, expNext:fresh.expNext});
  delete w.legend;
}
function randomWildMove(w){
  // 傳說寶可夢：有 55% 機率挑「威力 × 屬性相剋 × 本系加成」最高的招，其餘隨機
  if(w.legend && state.battle){
    const p = state.party[state.battle.playerIdx];
    if(p && Math.random() < 0.55){
      let best = null, bs = -1;
      w.moves.forEach(m=>{
        const s = (m.power||0) * moveEff(m, p) * ((m.type===w.t1 || m.type===w.t2) ? 1.2 : 1);
        if(s > bs){ bs = s; best = m; }
      });
      if(best) return best;
    }
  }
  return w.moves[Math.floor(Math.random()*w.moves.length)];
}
function clearBattleModifiers(){ state.party.forEach(m=>{ m.status=null; m.atkMul=1; m.defMul=1; }); }
function effText(mult){
  if(mult === 0) return ' <span class="bad">沒有效果……</span>';
  if(mult >= 2) return ' <span class="good">效果絕佳！</span>';
  if(mult < 1) return ' <span class="bad">效果不好...</span>';
  return '';
}
function dmg(atkMon, defMon, move){
  const stab = typesOf(atkMon).includes(move.type) ? 1.3 : 1.0;
  const e = moveEff(move, defMon);
  if(e === 0) return 0;
  const variance = 0.85 + Math.random()*0.3;
  const atkStat = atkMon.atk * (atkMon.atkMul||1);
  const defStat = Math.max(1, defMon.def * (defMon.defMul||1));
  const raw = ((2*atkMon.level/5+2)*move.power*(atkStat/defStat)/50 + 2);
  return Math.max(1, Math.floor(raw*stab*e*variance));
}
function moveEff(move, defMon){ return move.struggle ? 1 : eff(move.type, typesOf(defMon)); }
function effSpd(m){ return m.spd * (m.status==='paralyze' ? 0.5 : 1); }
// 單次出招：處理麻痺、傷害、反作用力、吸血、附加效果
function doAttack(att, def, move){
  const t0 = curDelay(), hpBefore = def.hp;
  const target = (state.battle && def === state.battle.wild) ? 'foe' : 'me';
  attackCore(att, def, move);
  const mult = moveEff(move, def);
  if(state.battle) renderStage(t0 || 1, def.hp < hpBefore ? target : null, mult >= 2 ? 'strong' : (mult < 1 ? 'weak' : null));
  gap(ATTACK_GAP);
}
function attackCore(att, def, move){
  if(att.status==='paralyze' && Math.random()<0.25){
    print(`<span class="bad">${who(att)} 因麻痺而無法動彈！</span>`);
    return;
  }
  if(att !== state.battle.wild && move.maxpp !== undefined) move.pp = Math.max(0, move.pp - 1);
  const isEnemy = att === state.battle.wild;
  const e = moveEff(move, def);
  if(e === 0){
    print(`${who(att)} 使用了 ${esc(move.name)}！但是對 ${who(def)} 沒有效果……`);
    return;
  }
  const d = dmg(att, def, move);
  def.hp = Math.max(0, def.hp - d);
  print(`${who(att)} 使用了 ${esc(move.name)}！造成 <span class="${isEnemy?'bad':'em'}">${d}</span> 點傷害。${effText(e)}`);
  if(move.recoil){
    const rec = Math.max(1, Math.floor(d*move.recoil));
    att.hp = Math.max(0, att.hp-rec);
    print(`<span class="bad">${who(att)} 因反作用力受到了 ${rec} 點傷害！</span>`);
  }
  const fx = STATUS_FX[move.type];
  if(fx && fx.kind==='drain'){
    const heal = Math.floor(d*0.5);
    if(heal>0 && att.hp>0 && att.hp<att.maxhp){ att.hp=Math.min(att.maxhp, att.hp+heal); print(`<span class="good">${who(att)} 吸取了 ${heal} 點 HP！</span>`); }
  } else if(def.hp>0 || (fx && fx.kind==='selfDefUp')){
    const msg = applyMoveEffect(att, def, move);
    if(msg) print(msg);
  }
}
// 回傳 true 代表戰鬥已結束或已切換畫面
function checkBattleEnd(){
  const b = state.battle; const p = state.party[b.playerIdx]; const w = b.wild;
  if(w.hp<=0){
    if(p.hp<=0) print(`<span class="bad">${nm(p)} 也在同一擊中倒下了！</span>`);
    winBattle(); return true;
  }
  if(p.hp<=0){ afterFaintCheck(p); return true; }
  return false;
}
function enemyTurn(){
  const b = state.battle;
  doAttack(b.wild, state.party[b.playerIdx], randomWildMove(b.wild));
  return checkBattleEnd();
}
function endOfTurn(){
  const b = state.battle; const p = state.party[b.playerIdx]; const w = b.wild;
  const tW = tickStatus(w); if(tW) print(tW);
  if(w.hp<=0){ return winBattle(); }
  const tP = tickStatus(p); if(tP) print(tP);
  if(afterFaintCheck(p)) return;
  b.turn = (b.turn||1) + 1;
  screenBattle();
}
function playerMove(moveIdx){
  const b = state.battle; const p = state.party[b.playerIdx]; const w = b.wild;
  clearLog();
  if(moveIdx>=0 && !(p.moves[moveIdx].pp>0)) return screenMoveSelect();
  const pm = moveIdx<0 ? STRUGGLE : p.moves[moveIdx], wm = randomWildMove(w);
  const ps = effSpd(p), ws = effSpd(w);
  const playerFirst = ps > ws || (ps === ws && Math.random() < 0.5);
  const order = playerFirst ? [[p,w,pm],[w,p,wm]] : [[w,p,wm],[p,w,pm]];
  for(const [a,d,m] of order){
    if(a.hp<=0 || d.hp<=0) continue;
    doAttack(a, d, m);
    if(checkBattleEnd()) return;
  }
  endOfTurn();
}
function tryCatch(ballKey){
  if(typeof ballKey !== 'string') ballKey = 'pokeball';
  const b = state.battle; const w = b.wild; const ball = ITEMS[ballKey];
  clearLog();
  if(!(state.bag[ballKey]>0)){
    print(`<span class="bad">${ball.label}用完了！去商店補貨吧。</span>`);
    return screenBattle();
  }
  state.bag[ballKey]--;
  const hpRatio = w.hp/w.maxhp;
  const chance = ball.master ? 1 : Math.min(0.97, (1-hpRatio)*0.75 + 0.15 + ball.ball);
  print(`你對 ${nm(w)} 丟出了${ball.label}……`);
  if(Math.random() < chance){
    unboostMon(w); w.status = null; w.atkMul = 1; w.defMul = 1; bump('catches'); battleDone();
    w.ball = BALL_TO_FRAME[ballKey] || 'poke';   // 記住被哪種球抓到（決定邊框）
    { if([w.t1,w.t2].some(x=>x==='幽靈'||x==='惡')) bump('ghostCatch');   // 節日活動任務用
      const fk = w.ball, was = frameUnlocked(fk); bump('cb_' + fk);
      if(!was && frameUnlocked(fk)) notify('🎴 解鎖新邊框：' + FRAME_NAMES[fk] + '！（到個人檔案裡設定）'); }

    state.caught.add(w.dex);
    if(w.shiny) state.shinyCaught.add(w.dex);
    print(`<span class="good">抓到了！${nm(w)} 已加入圖鑑！</span>`);
    if(state.party.length<6){ state.party.push(w); print('它加入了你的隊伍！'); }
    else { state.box.push(w); print('隊伍已滿，它被送到了倉庫。'); }
    const activeMon = state.party[b.playerIdx];
    if(activeMon && activeMon.hp>0 && activeMon!==w) grantExp(activeMon, w.level, 0.5, '因為成功捕捉獲得');
    state.battle=null;
    return runEvolutions(()=>screenField());
  }
  print('<span class="bad">牠掙脫了！</span>');
  if(enemyTurn()) return;
  endOfTurn();
}
function screenItemSelect(){
  const b = state.battle; const p = state.party[b.playerIdx];
  clearLog(); renderBar(); hpBars(p, b.wild);
  print('選擇要使用的道具：');
  const opts = [];
  Object.keys(ITEMS).forEach(kind=>{
    const it = ITEMS[kind];
    if(it.ball!==undefined || it.stone || !(state.bag[kind] > 0)) return;
    const relevant = it.pp ? p.moves.some(m=>m.pp<m.maxpp) : it.heal ? p.hp < p.maxhp : p.status === it.cure;
    if(relevant) opts.push({label:`${it.label}：${it.desc}（剩 ${state.bag[kind]}）`, action:()=>useItem(kind)});
  });
  if(opts.length===0) print('<span class="sys">（目前沒有能用的道具）</span>');
  opts.push({label:'← 返回', action:toBattle});
  setOptions(opts,'選擇道具');
}
function useItem(kind){
  const b = state.battle; const p = state.party[b.playerIdx];
  const it = ITEMS[kind];
  clearLog();
  if(!it || !(state.bag[kind]>0)){ print('<span class="bad">道具用完了！</span>'); return screenBattle(); }
  state.bag[kind]--;
  if(it.pp){
    restorePP(p);
    print(`<span class="good">使用了${it.label}，${nm(p)} 的全部招式 PP 恢復了！</span>`);
  } else if(it.heal){
    const before = p.hp;
    p.hp = Math.min(p.maxhp, p.hp + it.heal);
    print(`<span class="good">使用了${it.label}，${nm(p)} 回復了 ${p.hp-before} 點 HP。</span>`);
  } else {
    p.status = null;
    print(`<span class="good">使用了${it.label}，${nm(p)} 的異常狀態治好了！</span>`);
  }
  if(enemyTurn()) return;
  endOfTurn();
}
function tryFlee(){
  clearLog();
  if(Math.random()<0.75){
    print('你成功逃跑了。');
    state.battle=null;
    return screenField();
  }
  print('<span class="bad">沒能逃脫！</span>');
  if(enemyTurn()) return;
  endOfTurn();
}
function screenSwitch(){
  const b = state.battle;
  clearLog();
  print('<span class="em">選擇要換上場的寶可夢：</span>');
  const opts = state.party.map((m,i)=>{
    const tag = i===b.playerIdx ? '（目前上場）' : (m.hp<=0 ? '（已無法戰鬥）' : `HP ${m.hp}/${m.maxhp}`);
    const usable = i!==b.playerIdx && m.hp>0;
    return { label:`${monName(m)} Lv.${m.level} ${tag}`, half:true, action: usable ? ()=>doSwitch(i) : screenSwitch };
  });
  opts.push({label:'取消，返回戰鬥', action:toBattle});
  setOptions(opts,'選擇寶可夢');
}
function doSwitch(idx){
  const b = state.battle;
  const old = state.party[b.playerIdx];
  b.playerIdx = idx;
  clearLog();
  print(`收回了 ${nm(old)}，換上 ${nm(state.party[idx])}！`);
  if(enemyTurn()) return;
  endOfTurn();
}
/* ---------- 進化：先詢問玩家，同意後才進化 ---------- */
const evoSkip = new WeakMap();   // 玩家選了「不進化」：同一等級不再詢問（重新整理頁面後會再問一次）
let evoQueue = [];
function evoTarget(p){           // 回傳進化後的圖鑑索引；現在還不能進化則回傳 null
  const te = TIME_EVO[p.dex];
  if(te){
    if(p.level < te.lvl) return null;
    const h = nowFn().getHours();
    return (h>=6 && h<18) ? te.day : te.night;
  }
  const rule = EVO[p.dex];
  if(!rule) return null;
  const [toIdx, lvl] = rule;
  if(p.level < lvl) return null;
  return Array.isArray(toIdx) ? toIdx[Math.floor(Math.random()*toIdx.length)] : toIdx; // 多分支：隨機
}
function queueEvolution(p){      // 達成進化條件就排進詢問佇列
  if(evoSkip.get(p) === p.level) return;
  if(evoTarget(p) === null) return;
  if(!evoQueue.includes(p)) evoQueue.push(p);
}
function evolveTo(p, toIdx){
  const oldName = esc(monName(p));
  const e = DEX[toIdx];
  p.dex = toIdx; p.name = e[0]; p.t1 = e[1]; p.t2 = e[2]; p.tier = e[3];
  const st = statsFor(e, p.level);
  const hpGain = st.hp - p.maxhp;
  p.maxhp = st.hp; p.hp = Math.max(1, Math.min(p.maxhp, p.hp + hpGain));
  p.atk = st.atk; p.def = st.def; p.spd = st.spd;
  p.moves = buildMoves(e);
  state.caught.add(toIdx); state.seen.add(toIdx);
  if(p.shiny) state.shinyCaught.add(toIdx);
  print(`<span class="em">「${oldName}」正在進化…</span>`);
  print(`<span class="em">✦ 「${oldName}」進化成了「${esc(monName(p))}」！</span>`);
  bump('evolves');
  return true;
}
// 戰鬥／捕捉結束後呼叫：有寶可夢可以進化就逐隻詢問，全部處理完才執行 next()
function runEvolutions(next){
  state.party.forEach(queueEvolution);
  evoQueue = evoQueue.filter(p => state.party.includes(p) && evoSkip.get(p) !== p.level && evoTarget(p) !== null);
  if(!evoQueue.length) return next();
  const p = evoQueue[0], n = esc(monName(p));
  print(`<span class="em">咦……？「${n}」的樣子……！</span>`);
  print(`要讓「${n}」進化嗎？`);
  setOptions([
    {label:'✔ 進化', action:()=>{
      evoQueue.shift();
      const to = evoTarget(p);
      if(to !== null) evolveTo(p, to);
      saveGame();
      runEvolutions(next);
    }},
    {label:'✖ 不進化', action:()=>{
      evoQueue.shift();
      evoSkip.set(p, p.level);
      print(`<span class="sys">「${n}」停止了進化。</span>`);
      runEvolutions(next);
    }}
  ]);
}
function grantExp(p, oppLevel, mult, verb, quiet){
  if(p.level >= MAX_LEVEL){
    p.exp = 0;
    queueEvolution(p); // 滿級才抓到、或舊存檔中尚未進化的寶可夢，也能進化
    if(!quiet) print(`<span class="sys">${nm(p)} 已經是 Lv.${MAX_LEVEL}，經驗值無法再增加。</span>`);
    return;
  }
  const gained = Math.max(1, Math.floor((10 + oppLevel*4) * mult));
  p.exp += gained;
  if(!quiet) print(`<span class="good">${nm(p)} ${verb} ${gained} 經驗值。</span>`);
  while(p.level < MAX_LEVEL && p.exp >= p.expNext){
    p.exp -= p.expNext; p.level++; p.expNext = 18 + p.level*9;
    const st = statsFor(DEX[p.dex], p.level);
    const gainHp = st.hp-p.maxhp;
    p.maxhp=st.hp; p.hp=Math.min(p.hp+gainHp, p.maxhp); p.atk=st.atk; p.def=st.def; p.spd=st.spd;
    print(`<span class="em">${nm(p)} 升到了 Lv.${p.level}！</span>`);
    queueEvolution(p);
  }
  if(p.level >= MAX_LEVEL){ p.exp = 0; print(`<span class="em">${nm(p)} 達到等級上限 Lv.${MAX_LEVEL}！</span>`); }
}
// 沒出場但還能戰鬥的隊員分到部分經驗（倒下的不算）
const SHARE_EXP = 0.3;
function shareExp(active, oppLevel, mult){
  const others = state.party.filter(m=>m!==active && m.hp>0 && m.level<MAX_LEVEL);
  if(!others.length) return;
  const gained = Math.max(1, Math.floor((10 + oppLevel*4) * mult * SHARE_EXP));
  print(`<span class="good">隊伍中其他 ${others.length} 隻寶可夢各分到 ${gained} 經驗值。</span>`);
  others.forEach(m=>grantExp(m, oppLevel, mult*SHARE_EXP, '分到', true));
}
function giveMoney(amount){
  state.money += amount;
  print(`<span class="good">獲得了 💰 ${amount}！（目前 ${state.money}）</span>`);
}
function warnIfWiped(){
  if(noAlive()) print('<span class="bad">你的隊伍已經沒有能戰鬥的寶可夢了！請先回補給站治療。</span>');
}
function winBattle(){
  if(state.battle && state.battle.mode === 'run') return svWin();   // 連戰試煉有自己的結算
  const b = state.battle; const p = state.party[b.playerIdx]; const w = b.wild;
  const mode = b.mode;
  bump('wins'); if(mode==='tower'){ bump('floors'); if(b.boss) bump('bosses'); }
  print(`<span class="good">擊敗了${mode==='wild'?'野生的 ':' '}${nm(w)}！</span>`);
  const expMul = (mode==='tower') ? TOWER_EXP_MUL : 1;
  if(p.hp>0) grantExp(p, w.level, expMul, '獲得');
  shareExp(p, w.level, expMul);
  if(b.foes && b.foes.length){
    const nx = b.foes.shift(); b.wild = nx;
    print(`<span class="em">${esc(b.title)} 派出了 ${nm(nx)}（Lv.${nx.level}）！</span>`);
    const cur = state.party[b.playerIdx];
    return runEvolutions(()=> cur.hp<=0 ? afterFaintCheck(cur) : screenBattle());
  }
  state.battle=null;
  battleDone();

  if(mode==='trainer'){
    giveMoney(b.reward); bump('trainers'); warnIfWiped(); return runEvolutions(()=>screenField());
  }
  if(mode==='gym'){
    giveMoney(b.reward); state.meta.badges++; bump('gyms');
    { const sk = STONE_KEYS[Math.floor(Math.random()*STONE_KEYS.length)]; state.bag[sk] = (state.bag[sk]||0) + 1; print(`<span class="good">館主另外送了你一顆 ${ITEMS[sk].label}！</span>`); }
    print(`<span class="boss">🏅 獲得了【${esc(GYMS[b.gymIdx][1])}】的徽章！（${state.meta.badges}/${GYMS.length}）</span>`);
    warnIfWiped(); return runEvolutions(()=>screenGym(true));
  }
  if(mode==='tower'){
    const t = state.tower;
    giveMoney(w.level * 10 * (b.boss ? 3 : 1));
    let gotCoin = true;
    if(b.endless){
      t.coins++;
      t.endlessPtr++;
      if(t.endlessPtr >= BOSSES.length){ t.endlessPtr = 0; t.loop++; print(`<span class="boss">第 ${t.loop+1} 輪小魔王全數擊破！下一輪再度強化。</span>`); }
    } else {
      gotCoin = !isCleared(t.floorPtr);       // 只有第一次通過的樓層才有硬幣
      if(gotCoin){ t.coins++; markCleared(t.floorPtr); }
      t.floorPtr++;
      if(clearedCount() === NONLEG.length) t.floorPtr = NONLEG.length;                       // 全部通過 → 進入第二輪小魔王
      else if(t.floorPtr >= NONLEG.length) t.floorPtr = segmentStart(firstUncleared());      // 跳著打到最後一層：回頭找還沒通過的
    }
    if(gotCoin) print(`<span class="good">🪙 ${b.boss?'小魔王擊破':'樓層突破'}！獲得 1 枚硬幣（目前 ${t.coins} 枚）</span>`);
    else print(`<span class="sys">${b.boss?'小魔王擊破':'樓層突破'}！這層已經領過硬幣了，不會重複獲得（目前 ${t.coins} 枚）</span>`);
    if(b.boss){
      fullHeal();
      print('<span class="good">小魔王倒下時留下了一道光，你的隊伍全部回滿了！現在可以返回地面。</span>');
    }
    if(!b.endless && gotCoin && t.floorPtr === NONLEG.length){
      print(`<span class="boss">塔內 ${NONLEG.length} 層全數突破！接下來進入第二輪小魔王（HP、能力大幅強化）。</span>`);
    }
    warnIfWiped();
    return runEvolutions(()=>screenTower(true));
  }
  if(mode==='legendary'){
    giveMoney(w.level * 20);
    normalizeLegend(w);   // 降服後強化消失，數值與招式恢復成一般的神獸
    w.ball = 'master';    // 靠實力降服的神獸，邊框是大師球
    const wasMaster = frameUnlocked('master');
    w.hp = w.maxhp; w.status=null; w.atkMul=1; w.defMul=1;
    state.caught.add(w.dex); state.seen.add(w.dex);
    if(w.shiny) state.shinyCaught.add(w.dex);
    if(state.party.length<6){ state.party.push(w); print(`<span class="good">✦ ${nm(w)} 被你的實力降服，加入了隊伍！</span>`); }
    else { state.box.push(w); print(`<span class="good">✦ ${nm(w)} 被降服，送往了倉庫！</span>`); }
    state.tower.legendaryPtr++;
    if(!wasMaster && frameUnlocked('master')) notify('🎴 解鎖新邊框：大師球！（到個人檔案裡設定）');
    warnIfWiped();
    return runEvolutions(()=>screenTower(true));
  }
  giveMoney(w.level * 10);
  warnIfWiped();
  runEvolutions(()=>screenField());
}
function loseBattle(){
  if(state.battle && state.battle.mode === 'run') return svEnd();   // 連戰試煉：全隊倒下＝挑戰結束
  print('<span class="bad">你的隊伍全部失去戰鬥能力了……你被送回了補給站。</span>');
  state.party.forEach(m=>{ m.hp=Math.max(1, Math.floor(m.maxhp*0.5)); m.status=null; restorePP(m); });
  const mode = state.battle && state.battle.mode;
  state.battle=null;
  battleDone();
  if(mode==='trainer' || mode==='gym'){ const lost = Math.floor(state.money*0.1); state.money -= lost; print(`<span class="bad">你輸給了對手，賠了 💰 ${lost}。</span>`); }
  if(mode==='tower' || mode==='legendary') return kickOutOfTower();
  screenField();
}


/* ---------- 對戰前轉場動畫（用文字符號畫的全螢幕效果） ---------- */
// kind：wild（旋渦）、trainer（橫條＋VS）、big（道館／小魔王／傳說：三閃＋橫條＋大字）
const INTRO = {
  wild:    {flash:2, flashMs:60, close:380, hold:60,  open:260, style:'spiral'},
  trainer: {flash:2, flashMs:60, close:380, hold:360, open:280, style:'stripes'},
  big:     {flash:3, flashMs:60, close:400, hold:520, open:320, style:'stripes'}
};
function introReduced(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
// 從動畫開始到「開始掀開畫面」的時間；戰鬥文字會等這麼久才開始出現
function introLeadFor(kind){
  const c = INTRO[kind];
  return (!c || introReduced()) ? 0 : c.flash*c.flashMs*2 + c.close + c.hold;
}
function introSpiral(rows, cols){
  const o = []; let t=0, b=rows-1, l=0, r=cols-1;
  while(t<=b && l<=r){
    for(let c=l;c<=r;c++) o.push([t,c]); t++;
    for(let i=t;i<=b;i++) o.push([i,r]); r--;
    if(t<=b){ for(let c=r;c>=l;c--) o.push([b,c]); b--; }
    if(l<=r){ for(let i=b;i>=t;i--) o.push([i,l]); l++; }
  }
  return o;
}
function introLabel(kind){
  const b = state.battle; if(!b || kind==='wild') return '';
  if(kind==='trainer') return `<div class="vs">VS</div><div class="sub">${esc(b.title||'')}</div>`;
  if(b.mode==='gym')       return `<div class="vs">🏛</div><div class="sub">${esc(b.title||'')}</div>`;
  if(b.mode==='legendary') return `<div class="vs">✦</div><div class="sub">傳說的 ${esc(monName(b.wild))}</div>`;
  return `<div class="vs">💀</div><div class="sub">小魔王 ${esc(monName(b.wild))}</div>`;
}
let introEl = null, introRaf = 0;
function battleIntro(kind){
  const cfg = INTRO[kind];
  if(!cfg || introReduced()) return;
  if(introEl){ cancelAnimationFrame(introRaf); introEl.remove(); introEl = null; }
  // 只蓋在上方的對戰畫面（兩張寶可夢卡片那一塊），不是全螢幕
  const rect = stageEl.getBoundingClientRect();
  const W = Math.round(rect.width), H = Math.round(rect.height);
  if(W < 40 || H < 40) return;
  const el = document.createElement('div'); el.id = 'introFx';
  el.style.left = rect.left+'px'; el.style.top = rect.top+'px'; el.style.width = W+'px'; el.style.height = H+'px';
  const pre = document.createElement('pre'); el.appendChild(pre);
  const lab = document.createElement('div'); lab.className = 'introTxt'; lab.innerHTML = introLabel(kind); el.appendChild(lab);
  document.body.appendChild(el); introEl = el;
  pre.textContent = '█'.repeat(20);
  const pr = pre.getBoundingClientRect();
  const cw = (pr.width/20) || 8.4, ch = pr.height || 14;
  const cols = Math.ceil(W/cw)+1, rows = Math.ceil(H/ch)+1, cx = cols/2;
  const order = cfg.style==='spiral' ? introSpiral(rows, cols) : null;
  const tF = cfg.flash*cfg.flashMs*2, tC = tF + cfg.close, tH = tC + cfg.hold, tEnd = tH + cfg.open;
  const hw = document.documentElement.getAttribute('data-fest') === 'halloween';   // 節日主題：換成紫橘配色
  const PAL = hw ? {onBg:'#1a0a24', offBg:'#0d0614', on:'#ffd9a0', off:'#4a2266', closeBg:'#0d0614', close:'#d9701a', cover:'#2a1040'}
                 : {onBg:'#0b1410', offBg:'#060907', on:'#d8ffe9', off:'#1d3a2b', closeBg:'#060907', close:'#2a8a5c', cover:'#0f2c1e'};
  const COVER = PAL.cover;
  const render = grid => { pre.textContent = grid.map(r=>r.join('')).join('\n'); };
  const blank = ch1 => Array.from({length:rows}, ()=>Array(cols).fill(ch1));
  const t0 = performance.now();
  function frame(){
    const t = performance.now() - t0;
    if(t >= tEnd){ el.remove(); if(introEl===el) introEl = null; return; }
    if(t < tF){                                   // 1. 閃光
      const on = Math.floor(t/cfg.flashMs) % 2 === 0;
      el.style.background = on ? PAL.onBg : PAL.offBg;
      pre.style.color = on ? PAL.on : PAL.off;
      render(blank(on ? '█' : '░'));
    } else if(t < tC){                            // 2. 蓋住畫面
      const p = (t - tF) / cfg.close;
      el.style.background = PAL.closeBg; pre.style.color = PAL.close;
      const g = blank(' ');
      if(order){                                  // 旋渦：由外圈往中心
        const n = Math.floor(p*order.length), edge = Math.ceil(cols*0.6);
        for(let i=0;i<n;i++) g[order[i][0]][order[i][1]] = '█';
        for(let i=n;i<Math.min(order.length, n+edge);i++) g[order[i][0]][order[i][1]] = i-n < edge/2 ? '▓' : '▒';
      } else {                                    // 橫條：奇偶列由左右兩邊對衝
        const len = Math.round(p*(cols+4));
        for(let r=0;r<rows;r++){
          const rev = Math.floor(r/2)%2 === 1;
          for(let k=0;k<Math.min(len,cols);k++){
            const c = rev ? cols-1-k : k, d = len-k;
            g[r][c] = d>3 ? '█' : d>2 ? '▓' : d>1 ? '▒' : '░';
          }
        }
      }
      render(g);
    } else if(t < tH){                            // 3. 全蓋住：顯示字樣
      el.style.background = COVER; pre.style.color = COVER; render(blank('█'));
      lab.style.display = 'block';
    } else {                                      // 4. 兩邊往外掀開
      const p = (t - tH) / cfg.open;
      el.style.background = 'transparent'; pre.style.color = COVER; lab.style.display = 'none';
      const g = blank(' '), half = cx*(1-p);
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        const d = Math.abs(c-cx) - (cx-half);     // 離開口邊緣的距離（>0 代表仍被蓋住）
        g[r][c] = d>2 ? '█' : d>1 ? '▓' : d>0 ? '▒' : d>-1 ? '░' : ' ';
      }
      render(g);
    }
    introRaf = requestAnimationFrame(frame);
  }
  frame();
}


/* =====================================================
   🔥 連戰試煉（生存模式）
   只能用「複製一份」的現有隊伍，一關一隻，打到全隊倒下為止。
   每過一關：三選一強化（攻擊／防禦／速度／血量 +1~3%）或回血、復活；每 5 關有寶箱，越後面越豐厚。
   進度不存檔：中途關掉頁面就當作結束（原本的隊伍完全不受影響，已拿到的獎勵也都保留）。
   ===================================================== */
let svRun = null;
const SV_STATS = [
  {k:'atk', name:'攻擊', icon:'⚔️'}, {k:'def', name:'防禦', icon:'🛡️'},
  {k:'spd', name:'速度', icon:'💨'}, {k:'hp',  name:'血量上限', icon:'❤️'}
];
const SV_HEAL_PCT = 35, SV_REVIVE_PCT = 50;
function svRoll3(){
  const pool = SV_STATS.slice().sort(()=>Math.random()-0.5).slice(0,3);
  const cards = pool.map(s=>{
    const r = Math.random(), pct = r<0.60 ? 1 : r<0.90 ? 2 : 3;     // 60% +1%、30% +2%、10% +3%
    return {kind:'stat', k:s.k, pct, label:`${s.icon} ${s.name} +${pct}%　${'★'.repeat(pct)}`};
  });
  if(Math.random() < 0.15){                                          // 15% 機率其中一張變成稀有的「全能強化」
    cards[Math.floor(Math.random()*3)] = {kind:'all', pct:2, label:'🌟 全能強化：攻擊／防禦／速度／血量 各 +2%　✦'};
  }
  return cards;
}
function svPerkLine(){
  const p = svRun.perks;
  return SV_STATS.map(s=>`${s.icon}${s.name} +${p[s.k]}%`).join('　');
}
function svApply(){            // 依目前的強化重算整隊的數值（以複製當下的原始數值為基準）
  const p = svRun.perks;
  state.party.forEach(m=>{
    const b0 = m._b; if(!b0) return;
    m.atk = Math.round(b0.atk*(1+p.atk/100)); m.def = Math.round(b0.def*(1+p.def/100)); m.spd = Math.round(b0.spd*(1+p.spd/100));
    const nmax = Math.round(b0.maxhp*(1+p.hp/100)), gain = nmax - m.maxhp;
    m.maxhp = nmax; if(m.hp>0 && gain>0) m.hp = Math.min(nmax, m.hp + gain);
    if(m.hp>m.maxhp) m.hp = m.maxhp;
  });
}
function svMilestone(s){       // 每 5 關的寶箱
  const stone = ()=>STONE_KEYS[Math.floor(Math.random()*STONE_KEYS.length)];
  const T = {
    5:  {money:1000,  items:{superpotion:3, greatball:5}},
    10: {money:2500,  items:{greatball:10, ether:5, maxpotion:2}},
    15: {money:4000,  items:{ultraball:10, maxpotion:3}},
    20: {money:6000,  items:{ultraball:15, maxpotion:5, ether:8}},
    25: {money:9000,  items:{masterball:1}},
    30: {money:13000, items:{masterball:1, ultraball:20, maxpotion:8}}
  };
  const r = T[s] ? {money:T[s].money, items:Object.assign({}, T[s].items)}
                 : {money:s*500, items:Object.assign({ultraball:20, maxpotion:8}, s%10===0 ? {masterball:1} : {})};
  if(s >= 15){ const k = stone(); r.items[k] = (r.items[k]||0) + (s>=25 ? 3 : 2); }   // 15 關起附贈進化石
  return r;
}
function svGive(reward){        // 發獎勵並累計到本次結算
  giveReward(reward);
  const t = svRun.total;
  t.money += reward.money||0;
  Object.entries(reward.items||{}).forEach(([k,n])=>{ t.items[k] = (t.items[k]||0) + n; });
}
function svEnemy(s){
  const avg = Math.round(state.party.reduce((a,m)=>a+m.level,0) / state.party.length);
  const boss = s % 10 === 0;
  let dex;
  if(boss){ const pool = BOSSES.filter(i=>DEX[i][3] >= 3); dex = pool[Math.floor(Math.random()*pool.length)]; }
  else dex = pickWildIndex(25);
  const lv = Math.max(2, Math.min(MAX_LEVEL, Math.round(avg*0.85 + s*1.0)));
  const e = makeMon(dex, lv, {shiny:false});
  const hpS = 1 + 0.04*(s-1) + (boss ? 0.30 : 0), atkS = 1 + 0.02*(s-1) + (boss ? 0.25 : 0);
  e.maxhp = Math.round(e.maxhp*hpS); e.hp = e.maxhp;
  e.atk = Math.round(e.atk*atkS); e.def = Math.round(e.def*(1 + 0.012*(s-1) + (boss?0.1:0)));
  e.spd = Math.round(e.spd*(1 + 0.01*(s-1)));
  return e;
}
function screenSurvival(){
  clearLog(); renderBar();
  const best = state.stats.runBest || 0;
  print('<span class="em">🔥 連戰試煉</span>');
  print('只能使用你現在的隊伍（會複製一份，原本的隊伍和 HP 完全不受影響）。一關一隻對手，一直打到全隊倒下為止。');
  print(`每過一關可以<b>三選一強化</b>（攻擊／防禦／速度／血量 +1~3%），或選擇<b>回血 ${SV_HEAL_PCT}%</b>、<b>復活</b>一隻；PP 每關自動補滿。`);
  print('每 5 關有寶箱（越後面越豐厚，還會給進化石和大師球），每 10 關是魔王。不能用道具、逃跑和捕捉。');
  print(best ? `<span class="good">個人最高紀錄：第 ${best} 關</span>` : '<span class="sys">還沒有挑戰紀錄</span>');
  setOptions([
    {label:`▶ 開始挑戰（隊伍 ${state.party.length} 隻）`, action:svStart},
    {label:"返回", action:screenBattleMenu}
  ]);
}
function svStart(){
  if(!state.party.length) return screenSurvival();
  const backup = state.party;
  const team = JSON.parse(JSON.stringify(backup)).map(m=>{
    m.hp = m.maxhp; m.status = null; m.atkMul = 1; m.defMul = 1; restorePP(m);
    m._b = {maxhp:m.maxhp, atk:m.atk, def:m.def, spd:m.spd};
    return m;
  });
  svRun = {backup, stage:0, cleared:0, perks:{atk:0,def:0,spd:0,hp:0}, total:{money:0, items:{}}};
  state.party = team;
  svNextStage();
}
function svNextStage(){
  if(firstAlive() < 0) return svEnd();   // 保險：全隊倒光就直接結算，避免後面讀到空的出戰寶可夢
  const r = svRun; r.stage++;
  const s = r.stage, e = svEnemy(s), boss = s % 10 === 0;
  clearBattleModifiers(); state.party.forEach(restorePP);
  state.battle = {wild:e, foes:[], playerIdx:firstAlive(), mode:'run', title:`連戰試煉 第 ${s} 關`, stageNo:s, boss};
  const kind = boss ? 'big' : 'wild';
  introLead = introLeadFor(kind);
  clearLog();
  print(`<span class="${boss?'boss':'em'}">🔥 連戰試煉　第 ${s} 關${boss?'　💀 魔王關！':''}</span>`);
  print(`${boss?'魔王 ':'對手 '}${nm(e)}（Lv.${e.level}）出現了！`);
  screenBattle(); battleIntro(kind);
}
function svWin(){
  const r = svRun, b = state.battle, s = b.stageNo;
  print(`<span class="good">擊敗了 ${nm(b.wild)}！（第 ${s} 關通過）</span>`);
  state.battle = null;
  r.cleared = s;
  state.stats.runBest = Math.max(state.stats.runBest||0, s);
  const gold = 80 + s*20 + (b.boss ? 300 : 0);
  svGive({money:gold}); print(`<span class="good">獲得了 💰 ${gold}</span>`);
  if(s % 5 === 0){
    const box = svMilestone(s);
    svGive(box);
    print(`<span class="boss">🎁 第 ${s} 關寶箱！獲得 ${esc(rewardText(box))}</span>`);
  }
  saveGame();                 // 獎勵先存起來，就算之後關掉頁面也不會丟
  svPerkScreen();
}
function svPerkScreen(){
  const r = svRun;
  hr();
  print(`<span class="em">選擇一項強化：</span>`);
  print(`<span class="sys">目前累計　${svPerkLine()}</span>`);
  const cards = svRoll3();
  const allDead = firstAlive() < 0;       // 打贏的同時最後一隻也倒了（反作用力等）：只能選復活
  const opts = allDead ? [] : cards.map(c=>({label:c.label, action:()=>svPick(c)}));
  if(!allDead) opts.push({label:`💚 回血：全隊回復 ${SV_HEAL_PCT}% HP`, action:svHeal});
  if(state.party.some(m=>m.hp<=0)) opts.push({label:`✨ 復活：復活一隻倒下的寶可夢（HP ${SV_REVIVE_PCT}%）`, action:svRevive});
  setOptions(opts, '選擇強化');
}
function svPick(c){
  const p = svRun.perks;
  if(c.kind === 'all') SV_STATS.forEach(s=>{ p[s.k] += c.pct; }); else p[c.k] += c.pct;
  svApply();
  state.party.forEach(m=>{ m.status = null; });
  svNextStageWithMsg(`<span class="good">獲得強化：${esc(c.label.replace(/　[★✦]+$/,''))}</span>`);
}
function svHeal(){
  state.party.forEach(m=>{ if(m.hp>0) m.hp = Math.min(m.maxhp, m.hp + Math.ceil(m.maxhp*SV_HEAL_PCT/100)); });
  svNextStageWithMsg(`<span class="good">💚 全隊回復了 ${SV_HEAL_PCT}% 的 HP！</span>`);
}
function svRevive(){
  const dead = state.party.filter(m=>m.hp<=0).sort((a,b)=>b.level-a.level)[0];
  if(!dead) return svHeal();
  dead.hp = Math.max(1, Math.ceil(dead.maxhp*SV_REVIVE_PCT/100)); dead.status = null;
  svNextStageWithMsg(`<span class="good">✨ ${nm(dead)} 復活了！（HP ${SV_REVIVE_PCT}%）</span>`);
}
function svNextStageWithMsg(msg){
  const m0 = msg;
  svNextStage();                 // 會清畫面，所以選擇的結果補印在新關卡的開頭
  print(m0);
}
function svEnd(){
  const r = svRun;
  state.battle = null;
  state.party = r.backup;        // 換回原本的隊伍（原本的隊伍完全沒被動過）
  svRun = null;
  saveGame();
  clearLog(); renderBar();
  const reached = r.cleared, best = state.stats.runBest || 0;
  print('<span class="bad">全隊倒下了……連戰試煉結束。</span>');
  print(`<span class="em">本次到達：第 ${reached} 關</span>${reached && reached >= best ? ' <span class="boss">🏆 新紀錄！</span>' : ''}`);
  print(`<span class="sys">個人最高紀錄：第 ${best} 關</span>`);
  if(r.perks && (r.perks.atk||r.perks.def||r.perks.spd||r.perks.hp)) print(`<span class="sys">最終強化　${svPerkLineOf(r.perks)}</span>`);
  const t = r.total;
  if(t.money || Object.keys(t.items).length){
    print(`<span class="good">本次獲得：${esc(rewardText({money:t.money, items:t.items}))}</span>`);
  } else print('<span class="sys">這次沒有拿到獎勵，下次再來！</span>');
  setOptions([
    {label:"🔥 再挑戰一次", action:screenSurvival},
    {label:"返回對戰選單", action:screenBattleMenu}
  ]);
}
function svPerkLineOf(p){ return SV_STATS.map(s=>`${s.icon}${s.name} +${p[s.k]}%`).join('　'); }

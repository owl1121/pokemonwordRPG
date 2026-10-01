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
function renderStage(at, hit, power){   // hit：'foe' 或 'me'，該張卡片會左右晃一下；power：'strong'／'weak'
  const b=state.battle, p=state.party[b.playerIdx], w=b.wild;
  const nmx = m => (m.shiny?'✨':'')+esc(m.name);
  const xp = p.level>=MAX_LEVEL ? 100 : Math.min(100, Math.round(100*p.exp/p.expNext));
  const html =
    `<div class="card foe"><div class="r1"><span>${nmx(w)}</span><span>Lv.${w.level}</span></div><div class="r2">#${String(w.dex+1).padStart(4,'0')} · ${esc(typeStr(w))}${stChip(w)}${b.foes&&b.foes.length?` · 還有 ${b.foes.length} 隻`:''}</div><div class="bar${pctHp(w)<30?' low':''}"><i style="width:${pctHp(w)}%"></i></div></div>`+
    `<div class="card me"><div class="r1"><span>${nmx(p)}</span><span>Lv.${p.level}</span></div><div class="r2">${esc(typeStr(p))} · 速度 ${p.spd}${stChip(p)}</div><div class="bar${pctHp(p)<30?' low':''}"><i style="width:${pctHp(p)}%"></i></div><div class="hpt">HP: ${p.hp}/${p.maxhp}</div><div class="xp"><i style="width:${xp}%"></i></div></div>`;
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
  opts.push({label:'🎒 道具', cls:'q', action:screenItemSelect});
  if(state.party.filter(m=>m.hp>0).length>1) opts.push({label:'🔄 換上場', cls:'q', action:screenSwitch});
  if(b.mode==='wild'){
    opts.push({label:'🎯 捕捉', cls:'q', action:screenBallSelect});
    opts.push({label:'🏃 逃跑', cls:'q', action:tryFlee});
  }
  if(b.mode==='legendary') print('<span class="sys">（神獸戰無法逃跑，也無法用精靈球——擊敗牠就能收服）</span>');
  else if(b.mode==='trainer' || b.mode==='gym') print('<span class="sys">（訓練家對戰不能逃跑，也不能捕捉）</span>');
  else if(b.mode==='tower') print('<span class="sys">（塔內不能捕捉也不能逃跑，輸了會被送出塔外）</span>');
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

function randomWildMove(w){ return w.moves[Math.floor(Math.random()*w.moves.length)]; }
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
    w.status = null; w.atkMul = 1; w.defMul = 1; bump('catches'); battleDone();
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
      gotCoin = t.floorPtr >= (t.coinPtr||0); // 只有第一次通過的樓層才有硬幣
      if(gotCoin){ t.coins++; t.coinPtr = t.floorPtr+1; }
      t.floorPtr++;
    }
    if(gotCoin) print(`<span class="good">🪙 ${b.boss?'小魔王擊破':'樓層突破'}！獲得 1 枚硬幣（目前 ${t.coins} 枚）</span>`);
    else print(`<span class="sys">${b.boss?'小魔王擊破':'樓層突破'}！這層已經領過硬幣了，不會重複獲得（目前 ${t.coins} 枚）</span>`);
    if(b.boss){
      fullHeal();
      print('<span class="good">小魔王倒下時留下了一道光，你的隊伍全部回滿了！現在可以返回地面。</span>');
    }
    if(!b.endless && t.floorPtr === NONLEG.length){
      print(`<span class="boss">塔內 ${NONLEG.length} 層全數突破！接下來進入第二輪小魔王（HP、能力大幅強化）。</span>`);
    }
    warnIfWiped();
    return runEvolutions(()=>screenTower(true));
  }
  if(mode==='legendary'){
    giveMoney(w.level * 20);
    w.hp = w.maxhp; w.status=null; w.atkMul=1; w.defMul=1;
    state.caught.add(w.dex); state.seen.add(w.dex);
    if(w.shiny) state.shinyCaught.add(w.dex);
    if(state.party.length<6){ state.party.push(w); print(`<span class="good">✦ ${nm(w)} 被你的實力降服，加入了隊伍！</span>`); }
    else { state.box.push(w); print(`<span class="good">✦ ${nm(w)} 被降服，送往了倉庫！</span>`); }
    state.tower.legendaryPtr++;
    warnIfWiped();
    return runEvolutions(()=>screenTower(true));
  }
  giveMoney(w.level * 10);
  warnIfWiped();
  runEvolutions(()=>screenField());
}
function loseBattle(){
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
  const COVER = '#0f2c1e';
  const render = grid => { pre.textContent = grid.map(r=>r.join('')).join('\n'); };
  const blank = ch1 => Array.from({length:rows}, ()=>Array(cols).fill(ch1));
  const t0 = performance.now();
  function frame(){
    const t = performance.now() - t0;
    if(t >= tEnd){ el.remove(); if(introEl===el) introEl = null; return; }
    if(t < tF){                                   // 1. 閃光
      const on = Math.floor(t/cfg.flashMs) % 2 === 0;
      el.style.background = on ? '#0b1410' : '#060907';
      pre.style.color = on ? '#d8ffe9' : '#1d3a2b';
      render(blank(on ? '█' : '░'));
    } else if(t < tC){                            // 2. 蓋住畫面
      const p = (t - tF) / cfg.close;
      el.style.background = '#060907'; pre.style.color = '#2a8a5c';
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

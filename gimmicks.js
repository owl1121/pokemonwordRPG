/* ========== 對戰中一次性的強化：太晶化、Z 招式、極巨化（和 Mega 進化共用，每場對戰只能用其中一種一次） ========== */
const TYPE_LIST = ['一般','格鬥','飛行','毒','地面','岩石','蟲','幽靈','鋼','火','水','草','電','超能力','冰','龍','惡','妖精'];
function gimmickFree(){ const b = state.battle; return !!b && !b.megaUsed && !b.gimmick && b.mode !== 'run'; }

/* ---------- 太晶化 ---------- */
// 每隻有自己的太晶屬性 m.tera（預設第一屬性，可以在隊伍頁花錢改）
function teraOf(m){ if(!m.tera || !TYPE_LIST.includes(m.tera)) m.tera = m.t1; return m.tera; }
function origTypes(m){ return (m._types || [m.t1, m.t2]).filter(Boolean); }
function canTera(p){ return gimmickFree() && !p._tera && !p._dmax; }
function doTera(){
  const b = state.battle, p = state.party[b.playerIdx];
  if(!canTera(p)) return screenBattle();
  clearLog();
  p._tera = teraOf(p); b.gimmick = 'tera';
  print(`<span class="em">💎 ${nm(p)} 太晶化成了${p._tera}屬性！</span>`);
  if(typeof SFX !== 'undefined') SFX.play('mega');
  screenBattle();
}
// 本系加成：原本的屬性 1.3，太晶屬性也是原本屬性就 1.6（適應力再提高）
function stabMul(att, mv){
  const orig = origTypes(att), ad = hasAb(att,'adaptability'), t = mv.type;
  if(att._tera && t === att._tera) return orig.includes(t) ? (ad ? 2 : 1.6) : (ad ? 1.6 : 1.3);
  return orig.includes(t) ? (ad ? 1.6 : 1.3) : 1;
}
const TERA_BLAST = 851;

/* ---------- Z 招式 ---------- */
const Z_KEY = {一般:'normaliumz',格鬥:'fightiniumz',飛行:'flyiniumz',毒:'poisoniumz',地面:'groundiumz',岩石:'rockiumz',蟲:'buginiumz',幽靈:'ghostiumz',鋼:'steeliumz',火:'firiumz',水:'wateriumz',草:'grassiumz',電:'electriumz',超能力:'psychiumz',冰:'iciumz',龍:'dragoniumz',惡:'darkiniumz',妖精:'fairiumz'};
(function(){
  TYPE_LIST.forEach(t=>{ HELD[Z_KEY[t]] = {cat:'z', label:`${t}Ｚ`, price:6000, z:t, desc:`讓${t}屬性的攻擊招式變成 Z 招式（每場對戰一次）`}; });
  if(!HELD_CATS.some(c=>c[0] === 'z')) HELD_CATS.push(['z', '💠 Z 純晶']);
  HELD_KEYS.length = 0; Object.keys(HELD).forEach(k=>HELD_KEYS.push(k));
})();
function zPower(p){ return p <= 55 ? 100 : p <= 65 ? 120 : p <= 75 ? 140 : p <= 85 ? 160 : p <= 95 ? 175 : p <= 100 ? 180 : p <= 110 ? 185 : p <= 125 ? 190 : p <= 130 ? 195 : 200; }
function zCrystalType(m){ const it = heldIt(m); return it && it.z; }
function zMoves(p){ const t = zCrystalType(p); return t ? (p.moves||[]).map((mv,i)=>[mv,i]).filter(([mv])=>mv.cls !== 2 && mv.type === t && !moveBlockReason(p, mv)) : []; }
function zMoveOf(mv){
  return Object.assign({}, mv, {name:Z_MOVE_NAME[mv.type] || 'Z 招式', power:zPower(mv.power||0), acc:0, pri:0, fx:'', _z:true, _base:mv});
}
function canZ(p){ return gimmickFree() && !p._dmax && zMoves(p).length > 0; }
function screenZ(){
  const b = state.battle, p = state.party[b.playerIdx];
  if(!canZ(p)) return screenBattle();
  clearLog();
  print(`<span class="em">⚡ 要用哪一招發動 Z 招式？</span>　<span class="sys">（${esc(heldName(p))}，每場一次）</span>`);
  const opts = zMoves(p).map(([mv,i])=>({label:`${mv.name} → ${Z_MOVE_NAME[mv.type]}（威力 ${zPower(mv.power||0)}）`, action:()=>{ b.gimmick = 'z'; print(`<span class="em">${nm(p)} 全身充滿了 Z 力量！</span>`); playerMove(i, {z:true}); }}));
  opts.push({label:'← 返回', action:toBattle});
  setOptions(opts, '選擇 Z 招式');
}

/* ---------- 極巨化 ---------- */
const DMAX_TURNS = 3, DMAX_HP = 1.5;
const MAX_FX = {一般:'sfs-1_100',格鬥:'sua1_100',飛行:'sus1_100',毒:'suc1_100',地面:'sue1_100',岩石:'wx:sand',蟲:'sfc-1_100',幽靈:'sfd-1_100',鋼:'sud1_100',
  火:'wx:sun',水:'wx:rain',草:'tr:g',電:'tr:e',超能力:'tr:p',冰:'wx:snow',龍:'sfa-1_100',惡:'sfe-1_100',妖精:'tr:m'};
function maxPower(mv){
  const p = mv.power || 0, low = mv.type === '格鬥' || mv.type === '毒';
  const t = p <= 40 ? 0 : p <= 50 ? 1 : p <= 60 ? 2 : p <= 70 ? 3 : p <= 100 ? 4 : p <= 140 ? 5 : 6;
  return (low ? [70,75,80,85,90,95,100] : [90,100,110,120,130,140,150])[t];
}
function maxMoveOf(mv){
  if(!mv || mv.struggle) return mv;
  if(mv.cls === 2) return Object.assign({}, mv, {name:MAX_MOVE_NAME._guard, type:'一般', fx:'prot', self:true, pri:4, acc:0, power:0, flags:0, _max:true, _base:mv});
  return Object.assign({}, mv, {name:MAX_MOVE_NAME[mv.type] || '極巨招式', power:maxPower(mv), acc:0, pri:0, fx:MAX_FX[mv.type] || '', flags:0, _max:true, _base:mv});
}
function canDmax(p){ return gimmickFree() && !p._mega && !p._tera; }
function doDmax(){
  const b = state.battle, p = state.party[b.playerIdx];
  if(!canDmax(p)) return screenBattle();
  clearLog();
  b.gimmick = 'dmax';
  p._dmax = DMAX_TURNS; p._dmaxBase = p.maxhp;
  p.maxhp = Math.round(p.maxhp*DMAX_HP); p.hp = Math.round(p.hp*DMAX_HP);
  print(`<span class="em">🔴 ${nm(p)} 極巨化了！</span>`);
  if(typeof SFX !== 'undefined') SFX.play('mega');
  screenBattle();
}
function endDmax(m, quiet){
  if(!m || m._dmaxBase === undefined) return;
  const base = m._dmaxBase || Math.round(m.maxhp/DMAX_HP);
  m.hp = m.hp > 0 ? Math.max(1, Math.min(base, Math.ceil(m.hp/DMAX_HP))) : 0; m.maxhp = base;
  delete m._dmax; delete m._dmaxBase;
  if(!quiet) print(`<span class="sys">${nm(m)} 恢復了原本的大小。</span>`);
}
function dmaxTick(m){ if(m && m._dmax && m.hp > 0 && --m._dmax <= 0) endDmax(m); }
// 戰鬥按鈕：極巨化中顯示極巨招式
function shownMove(p, mv){ return p._dmax ? maxMoveOf(mv) : mv; }
// 對戰結束：清掉太晶化、極巨化
function clearGimmick(m){ if(!m) return; endDmax(m, true); delete m._tera; }

/* ---------- 隊伍頁：改太晶屬性 ---------- */
const TERA_PRICE = 3000;
function screenTeraPick(i, back){
  const m = state.party[i]; if(!m) return screenParty(back);
  clearLog();
  print(`<span class="em">💎 ${nm(m)} 的太晶屬性：${teraOf(m)}</span>`);
  print(`<span class="sys">對戰中太晶化會變成這個屬性（招式威力也有加成）。換一個要 💰 ${TERA_PRICE}（目前 💰 ${state.money}）。</span>`);
  const opts = TYPE_LIST.map(t=>({label:(t === m.tera ? '✔ ' : '') + t, half:true, cls:(t === m.tera || state.money < TERA_PRICE) ? 'off' : '', action:()=>{
    if(t === m.tera || state.money < TERA_PRICE) return;
    state.money -= TERA_PRICE; m.tera = t; saveGame(); screenMember(i, back); print(`<span class="good">${nm(m)} 的太晶屬性變成了${t}！</span>`);
  }}));
  opts.push({label:'← 返回', action:()=>screenMember(i, back)});
  setOptions(opts);
}

/* ---------- 難度：對手的聰明程度、訓練家／館主／小魔王的強化 ---------- */
// 對手挑「估算最好的招」的機率（其餘從有用的招裡隨機）
function aiSmart(w){
  const b = state.battle; if(!b) return 0.4;
  if(w.legend) return 0.9;
  return {wild:0.4, trainer:0.7, gym:Math.min(0.9, 0.55 + (b.gymIdx||0)*0.02), tower:b.boss ? 0.95 : 0.85, mega:0.85, run:0.85, legendary:0.9}[b.mode] ?? 0.6;
}
const FOE_HELD = ['leftovers','lifeorb','focussash','choicescarf','expertbelt','muscleband','wiseglasses','sitrusberry','lumberry','assaultvest','rockyhelmet','scopelens','shellbell','whiteherb'];
// 訓練家：能力點至少 lo；館主、小魔王再加攜帶道具
function hardenFoe(m, lo, held){
  ensureIv(m);
  IV_KEYS.forEach(k=>{ m.iv[k] = Math.max(m.iv[k], lo + Math.floor(Math.random()*(IV_MAX - lo + 1))); });
  m.ivCap = ivSum(m.iv);
  const ratio = m.hp/m.maxhp, st = monStats(m);
  m.maxhp = st.hp; m.hp = Math.max(1, Math.round(st.hp*ratio)); setNonHpStats(m, st);
  if(held){ const pool = FOE_HELD.filter(k=>HELD[k]); if(pool.length) m.held = pool[Math.floor(Math.random()*pool.length)]; }
  return m;
}
// 館主的王牌、小魔王：出場時太晶化（太晶屬性＝第一屬性，本系加成變強）
function foeAceEntry(w){
  const b = state.battle;
  if(!b || !w._ace || w._tera || b.foeGimmick) return;
  b.foeGimmick = true; w._tera = teraOf(w);
  print(`<span class="boss">💎 ${who(w)} 太晶化成了${w._tera}屬性！</span>`);
}

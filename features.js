// features.js — 性格、特性、攜帶道具、天氣、每日事件
// 載入順序：data.js → battle.js → features.js → 主程式。這裡的函式只在執行時用到 state，載入時不碰 state。

/* ---------- 共用：用日期當種子的雜湊（同一天、同一時段結果固定） ---------- */
function hashStr(s){ let h = 2166136261; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function todayKey(){ const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
const FX_STAT_NAMES = {atk:'攻擊', def:'防禦', spa:'特攻', sdf:'特防', spd:'速度'};

/* ========== 1. 性格：一項能力 ×1.1、一項 ×0.9（五種沒有影響） ========== */
const NATURES = [
  {n:'勤奮'}, {n:'怕寂寞',up:'atk',dn:'def'}, {n:'勇敢',up:'atk',dn:'spd'}, {n:'固執',up:'atk',dn:'spa'}, {n:'頑皮',up:'atk',dn:'sdf'},
  {n:'大膽',up:'def',dn:'atk'}, {n:'坦率'}, {n:'悠閒',up:'def',dn:'spd'}, {n:'淘氣',up:'def',dn:'spa'}, {n:'樂天',up:'def',dn:'sdf'},
  {n:'膽小',up:'spd',dn:'atk'}, {n:'急躁',up:'spd',dn:'def'}, {n:'認真'}, {n:'爽朗',up:'spd',dn:'spa'}, {n:'天真',up:'spd',dn:'sdf'},
  {n:'內斂',up:'spa',dn:'atk'}, {n:'慢吞吞',up:'spa',dn:'def'}, {n:'冷靜',up:'spa',dn:'spd'}, {n:'害羞'}, {n:'馬虎',up:'spa',dn:'sdf'},
  {n:'溫和',up:'sdf',dn:'atk'}, {n:'溫順',up:'sdf',dn:'def'}, {n:'自大',up:'sdf',dn:'spd'}, {n:'慎重',up:'sdf',dn:'spa'}, {n:'浮躁'}
];
function rollNature(){ return Math.floor(Math.random()*NATURES.length); }
function ensureNature(m){ if(!(m.nature >= 0 && m.nature < NATURES.length)) m.nature = rollNature(); return m.nature; }
function natureStats(st, n){
  const N = NATURES[n]; if(!N || !N.up) return st;
  const out = Object.assign({}, st);
  out[N.up] = Math.floor(out[N.up]*1.1); out[N.dn] = Math.floor(out[N.dn]*0.9);
  return out;
}
function natureText(m){
  const N = NATURES[ensureNature(m)];
  return N.up ? `${N.n}（${FX_STAT_NAMES[N.up]}↑ ${FX_STAT_NAMES[N.dn]}↓）` : `${N.n}（無影響）`;
}

/* ========== 5. 特性：依屬性隨機分配，遇到時決定，敵我都有 ========== */
const ABILITIES = {
  blaze:       {name:'猛火',     desc:'HP 剩 1/3 以下時，火屬性招式威力 ×1.5'},
  torrent:     {name:'激流',     desc:'HP 剩 1/3 以下時，水屬性招式威力 ×1.5'},
  overgrow:    {name:'茂盛',     desc:'HP 剩 1/3 以下時，草屬性招式威力 ×1.5'},
  swarm:       {name:'蟲之預感', desc:'HP 剩 1/3 以下時，蟲屬性招式威力 ×1.5'},
  intimidate:  {name:'威嚇',     desc:'出場時讓對手的攻擊下降'},
  drought:     {name:'乾旱',     desc:'出場時天氣變成大晴天'},
  drizzle:     {name:'降雨',     desc:'出場時天氣變成下雨'},
  sandstream:  {name:'揚沙',     desc:'出場時天氣變成沙暴'},
  snowwarning: {name:'降雪',     desc:'出場時天氣變成下雪'},
  static:      {name:'靜電',     desc:'被攻擊時，30% 讓對手麻痺'},
  flamebody:   {name:'火焰之軀', desc:'被攻擊時，30% 讓對手灼傷'},
  poisonpoint: {name:'毒刺',     desc:'被攻擊時，30% 讓對手中毒'},
  levitate:    {name:'飄浮',     desc:'地面屬性招式無效'},
  thickfat:    {name:'厚脂肪',   desc:'受到火、冰屬性招式的傷害減半'},
  speedboost:  {name:'加速',     desc:'每回合結束時速度提升'},
  sturdy:      {name:'結實',     desc:'HP 全滿時，不會被一擊打倒（每場一次）'},
  regenerator: {name:'再生力',   desc:'換下場時回復 1/3 HP'},
  technician:  {name:'技術高手', desc:'威力 60 以下的招式威力 ×1.5'},
  adaptability:{name:'適應力',   desc:'本系招式加成從 ×1.3 變成 ×1.6'},
  moxie:       {name:'自信過度', desc:'打倒對手時攻擊提升'},
  rockhead:    {name:'堅硬腦袋', desc:'不會受到反作用力傷害'},
  guts:        {name:'毅力',     desc:'陷入異常狀態時，招式威力 ×1.5'},
  magicguard:  {name:'魔法防守', desc:'只會受到招式的直接傷害（中毒、灼傷、天氣、反作用力都無效）'},
  chlorophyll: {name:'葉綠素',   desc:'大晴天時速度 ×2'},
  swiftswim:   {name:'悠游自如', desc:'下雨時速度 ×2'},
  sandrush:    {name:'撥沙',     desc:'沙暴時速度 ×2'},
  slushrush:   {name:'撥雪',     desc:'下雪時速度 ×2'},
  immunity:    {name:'免疫',     desc:'不會中毒'},
  limber:      {name:'柔軟',     desc:'不會麻痺'},
  waterveil:   {name:'水幕',     desc:'不會灼傷'},
  shielddust:  {name:'鱗粉',     desc:'不會受到對手招式的附加效果'},
  multiscale:  {name:'多重鱗片', desc:'HP 全滿時，受到的傷害減半'},
  voltabsorb:  {name:'蓄電',     desc:'電屬性招式無效，並回復 1/4 HP'},
  waterabsorb: {name:'儲水',     desc:'水屬性招式無效，並回復 1/4 HP'},
  sapsipper:   {name:'食草',     desc:'草屬性招式無效，並回復 1/4 HP'},
  flashfire:   {name:'引火',     desc:'火屬性招式無效，之後自己的火屬性招式威力 ×1.5'},
  insomnia:    {name:'不眠',     desc:'不會睡著（煩惱種子給的）'},
  simple:      {name:'單純',     desc:'能力變化加倍（單純光束給的）'},
  sheerforce:  {name:'強行',     desc:'有附加效果的招式威力 ×1.3，但不會觸發附加效果'}
};
const AB_POOL = {
  一般:['intimidate','technician','immunity','thickfat','guts','adaptability'],
  火:['blaze','flamebody','flashfire','drought'],
  水:['torrent','swiftswim','waterabsorb','drizzle','waterveil','regenerator'],
  電:['static','voltabsorb','limber'],
  草:['overgrow','chlorophyll','sapsipper','regenerator'],
  冰:['thickfat','slushrush','snowwarning'],
  格鬥:['guts','technician','sheerforce'],
  毒:['poisonpoint','levitate','immunity'],
  地面:['sandrush','sandstream','sheerforce'],
  飛行:['speedboost','moxie','technician'],
  超能力:['magicguard','levitate','regenerator'],
  蟲:['swarm','shielddust','speedboost','poisonpoint'],
  岩石:['sturdy','rockhead','sandstream'],
  幽靈:['levitate','moxie'],
  龍:['multiscale','moxie','intimidate'],
  惡:['intimidate','moxie'],
  鋼:['sturdy','technician'],
  妖精:['magicguard','limber']
};
const PINCH_AB = {blaze:'火', torrent:'水', overgrow:'草', swarm:'蟲'};
function abPoolFor(t1, t2){ return [...new Set([...(AB_POOL[t1]||[]), ...(AB_POOL[t2]||[])])]; }
function rollAbility(entry){ const pool = abPoolFor(entry[1], entry[2]); return pool.length ? pool[Math.floor(Math.random()*pool.length)] : 'technician'; }
function ensureAbility(m){ if(!m.ab || !ABILITIES[m.ab]) m.ab = rollAbility(DEX[m.dex] || ['', '一般', null, 1]); return m.ab; }
function abName(m){ return m && ABILITIES[m.ab] ? ABILITIES[m.ab].name : '—'; }
function hasAb(m, k){ return !!m && !m._noab && m.ab === k; }   // _noab：被胃液封住
function abTag(m){ return `<span class="ab">〔${esc(abName(m))}〕</span>`; }

/* ========== 3. 攜帶道具：一隻帶一個，從背包裝上／卸下（道具名稱、效果參考寶可夢冠軍） ==========
   樹果、氣勢披帶這類「一次性」的道具：每場對戰用一次，對戰結束不會消失。 */
const HELD_CATS = [['battle','⚔️ 戰鬥道具'], ['type','🔥 屬性強化'], ['resist','🛡 抗性樹果'], ['berry','🍒 其他樹果'], ['weather','🌦 天氣岩石']];
const HELD = {
  // 戰鬥道具
  leftovers:  {cat:'battle', label:'吃剩的東西', price:4000, desc:'每回合結束時回復 1/16 HP'},
  lifeorb:    {cat:'battle', label:'生命寶珠',   price:5000, desc:'招式威力 ×1.3，但每次攻擊損失 1/10 HP'},
  focussash:  {cat:'battle', label:'氣勢披帶',   price:3000, desc:'HP 全滿時，不會被一擊打倒（每場一次）'},
  focusband:  {cat:'battle', label:'氣勢頭帶',   price:2500, desc:'受到致命傷害時，10% 機率以 1 HP 撐住'},
  choicescarf:{cat:'battle', label:'講究圍巾',   price:5000, desc:'速度 ×1.5，但只能一直使用第一個選的招式，換下場才解除'},
  quickclaw:  {cat:'battle', label:'先制之爪',   price:2500, desc:'20% 機率搶先行動'},
  kingsrock:  {cat:'battle', label:'王者之證',   price:3000, desc:'攻擊時 10% 機率讓對手畏縮（先出手才有效）'},
  scopelens:  {cat:'battle', label:'焦點鏡',     price:4000, desc:'容易打出會心一擊'},
  expertbelt: {cat:'battle', label:'達人帶',     price:3500, desc:'效果絕佳的招式威力 ×1.2'},
  muscleband: {cat:'battle', label:'力量頭帶',   price:3000, desc:'物理招式威力 ×1.1'},
  wiseglasses:{cat:'battle', label:'博識眼鏡',   price:3000, desc:'特殊招式威力 ×1.1'},
  metronome:  {cat:'battle', label:'節拍器',     price:3500, desc:'連續使用同一招，威力每次 +20%，最高 ×2'},
  normalgem:  {cat:'battle', label:'一般寶石',   price:1500, desc:'第一次使用一般屬性招式時威力 ×1.3（每場一次）'},
  shellbell:  {cat:'battle', label:'貝殼之鈴',   price:3000, desc:'回復造成傷害的 1/8'},
  bigroot:    {cat:'battle', label:'大根莖',     price:2500, desc:'吸取 HP 的回復量 ×1.3'},
  rockyhelmet:{cat:'battle', label:'凸凸頭盔',   price:3000, desc:'被攻擊時，對手損失 1/6 HP'},
  airballoon: {cat:'battle', label:'氣球',       price:2500, desc:'地面屬性招式無效，被攻擊打中就會破掉（每場一次）'},
  whiteherb:  {cat:'battle', label:'白色香草',   price:2500, desc:'能力被降低時馬上恢復（每場一次）'},
  assaultvest:{cat:'battle', label:'突擊背心',   price:4000, desc:'特防 ×1.5'},
  eviolite:   {cat:'battle', label:'進化奇石',   price:4000, desc:'還能進化的寶可夢，防禦和特防 ×1.5'},
  lightball:  {cat:'battle', label:'電氣球',     price:4000, desc:'皮卡丘攜帶時，攻擊和特攻 ×2'},
  luckyegg:   {cat:'battle', label:'幸運蛋',     price:5000, desc:'攜帶者獲得的經驗值 ×1.5'},
  amuletcoin: {cat:'battle', label:'護符金幣',   price:6000, desc:'隊伍裡有人攜帶時，對戰獲得的金錢 ×1.5'},
  // 天氣岩石
  heatrock:   {cat:'weather', label:'熾熱岩石', price:2000, wx:'sun',  desc:'自己造成的大晴天從 5 回合延長到 8 回合'},
  damprock:   {cat:'weather', label:'潮濕岩石', price:2000, wx:'rain', desc:'自己造成的下雨從 5 回合延長到 8 回合'},
  smoothrock: {cat:'weather', label:'沙沙岩石', price:2000, wx:'sand', desc:'自己造成的沙暴從 5 回合延長到 8 回合'},
  icyrock:    {cat:'weather', label:'冰冷岩石', price:2000, wx:'snow', desc:'自己造成的下雪從 5 回合延長到 8 回合'},
  // 其他樹果（每場一次）
  lumberry:   {cat:'berry', label:'木子果', price:1500, desc:'陷入任何異常狀態時馬上治好'},
  cheriberry: {cat:'berry', label:'櫻子果', price:800,  cure:'paralyze', desc:'被麻痺時馬上治好'},
  pechaberry: {cat:'berry', label:'桃桃果', price:800,  cure:'poison',   desc:'中毒時馬上治好'},
  rawstberry: {cat:'berry', label:'莓莓果', price:800,  cure:'burn',     desc:'灼傷時馬上治好'},
  oranberry:  {cat:'berry', label:'橙橙果', price:800,  desc:'HP 剩一半以下時，回復 1/10 HP'},
  sitrusberry:{cat:'berry', label:'文柚果', price:1500, desc:'HP 剩一半以下時，回復 1/4 HP'},
  leppaberry: {cat:'berry', label:'蘋野果', price:1000, desc:'招式的 PP 用完時，回復 10 PP'},
  liechiberry:{cat:'berry', label:'枝荔果', price:1500, pinch:'atk', desc:'HP 剩 1/4 以下時，攻擊提升'},
  ganlonberry:{cat:'berry', label:'龍睛果', price:1500, pinch:'def', desc:'HP 剩 1/4 以下時，防禦提升'},
  salacberry: {cat:'berry', label:'沙鱗果', price:1500, pinch:'spd', desc:'HP 剩 1/4 以下時，速度提升'}
};
// 屬性強化道具：該屬性招式威力 ×1.2
[['silkscarf','絲綢圍巾','一般'],['charcoal','木炭','火'],['mysticwater','神秘水滴','水'],['magnet','磁鐵','電'],['miracleseed','奇跡種子','草'],
 ['nevermeltice','不融冰','冰'],['blackbelt','黑帶','格鬥'],['poisonbarb','毒針','毒'],['softsand','柔軟沙子','地面'],['sharpbeak','銳利鳥嘴','飛行'],
 ['twistedspoon','彎曲的湯匙','超能力'],['silverpowder','銀粉','蟲'],['hardstone','硬石頭','岩石'],['spelltag','詛咒之符','幽靈'],['dragonfang','龍之牙','龍'],
 ['blackglasses','黑色眼鏡','惡'],['metalcoat','金屬膜','鋼'],['fairyfeather','妖精之羽','妖精']]
 .forEach(([k,label,t])=>{ HELD[k] = {cat:'type', label, price:2000, boost:t, desc:`${t}屬性招式威力 ×1.2`}; });
// 抗性樹果：受到效果絕佳的該屬性招式時傷害減半（燈漿果是一般屬性，不用效果絕佳）
[['occaberry','巧可果','火'],['passhoberry','千香果','水'],['wacanberry','燭木果','電'],['rindoberry','羅子果','草'],['yacheberry','番荔果','冰'],
 ['chopleberry','蓮蒲果','格鬥'],['kebiaberry','通通果','毒'],['shucaberry','腰木果','地面'],['cobaberry','稜瓜果','飛行'],['payapaberry','福祿果','超能力'],
 ['tangaberry','扁櫻果','蟲'],['chartiberry','草蠶果','岩石'],['kasibberry','佛柑果','幽靈'],['habanberry','莓榴果','龍'],['colburberry','刺耳果','惡'],
 ['babiriberry','霹霹果','鋼'],['roseliberry','洛玫果','妖精'],['chilanberry','燈漿果','一般']]
 .forEach(([k,label,t])=>{ HELD[k] = {cat:'resist', label, price:1000, resist:t, desc: t==='一般' ? '受到一般屬性招式時，傷害減半（每場一次）' : `受到效果絕佳的${t}屬性招式時，傷害減半（每場一次）`}; });
const HELD_KEYS = Object.keys(HELD);
function heldOn(m){ return !!m && !m._knock && !m._emb && !(state.battle && state.battle.field && state.battle.field.mroom); }   // 被打落、查封、魔法空間時道具沒效果
function holds(m, k){ return heldOn(m) && m.held === k; }
function heldName(m){ return m && HELD[m.held] ? HELD[m.held].label : '無'; }
function heldIt(m){ return heldOn(m) && HELD[m.held]; }

/* ========== 7. 每日隨機事件（以日期決定，同一天大家都一樣） ========== */
const DAILY_EVENTS = [
  {id:'shiny',    name:'✨ 閃光日',   desc:'色違寶可夢的出現率 ×3'},
  {id:'exp',      name:'📚 修行日',   desc:'獲得的經驗值 ×1.5'},
  {id:'money',    name:'💰 豐收日',   desc:'對戰獲得的金錢 ×1.5'},
  {id:'catch',    name:'🎯 捕獲日',   desc:'捕捉成功率 +10%'},
  {id:'outbreak', name:'🌀 大量出現', desc:''},
  {id:'item',     name:'🎁 尋寶日',   desc:'在草叢裡撿到道具的機率加倍'},
  {id:'sale',     name:'🏷 特價日',   desc:'商店（含攜帶道具）全面 8 折'},
  {id:'nurse',    name:'💊 義診日',   desc:'補給站不用等，隨時都能用'},
  {id:'weather',  name:'🌦 異常氣象', desc:''}
];
let _daily = null;
function dailyEvent(){
  const k = todayKey();
  let force = null; try{ force = new URLSearchParams(location.search).get('event'); }catch(e){}
  const ck = k + '|' + (force||'');
  if(_daily && _daily.ck === ck) return _daily;
  let ev = DAILY_EVENTS.find(e=>e.id===force) || DAILY_EVENTS[hashStr('ev'+k) % DAILY_EVENTS.length];
  const out = Object.assign({ck}, ev);
  if(ev.id === 'outbreak'){ out.type = TYPES[hashStr('ty'+k) % TYPES.length]; out.desc = `今天「${out.type}」屬性的寶可夢特別常出現`; }
  if(ev.id === 'weather'){ out.weather = ['sun','rain','sand','snow'][hashStr('wx'+k) % 4]; out.desc = `今天每個地區都是${WEATHER[out.weather].icon}${WEATHER[out.weather].name}`; }
  return (_daily = out);
}
function daily(id){ return dailyEvent().id === id; }
function shinyRate(){ return SHINY_RATE * (daily('shiny') ? 3 : 1); }
function priceOf(k){ const it = ITEMS[k] || HELD[k]; const p = it ? it.price : 0; return daily('sale') ? Math.ceil(p*0.8) : p; }
function moneyMul(){ return (daily('money') ? 1.5 : 1) * ((state.party||[]).some(m=>holds(m,'amuletcoin')) ? 1.5 : 1); }
function expMulFor(p){ return (daily('exp') ? 1.5 : 1) * (holds(p,'luckyegg') ? 1.5 : 1); }

/* ========== 4. 天氣：每個地區每 3 小時換一次；對戰中特性也能改天氣 ========== */
const WEATHER = {
  none:{name:'平穩',   icon:'🌤', desc:'沒有特別的天氣效果'},
  sun: {name:'大晴天', icon:'☀️', desc:'火屬性招式威力 ×1.5、水屬性 ×0.5；火、草屬性較常出現', types:['火','草']},
  rain:{name:'下雨',   icon:'🌧', desc:'水屬性招式威力 ×1.5、火屬性 ×0.5；水、電屬性較常出現', types:['水','電']},
  sand:{name:'沙暴',   icon:'🌪', desc:'每回合結束時，岩石／地面／鋼以外的寶可夢損失 1/16 HP；岩石屬性特防 ×1.5；岩石、地面、鋼屬性較常出現', types:['岩石','地面','鋼']},
  snow:{name:'下雪',   icon:'❄️', desc:'冰屬性的防禦 ×1.5；冰屬性較常出現', types:['冰']}
};
function fieldWeather(zone){
  zone = zone || state.zone;
  const de = dailyEvent(); if(de.id === 'weather') return de.weather;
  const slot = Math.floor(new Date().getHours()/3);
  const h = hashStr(`wx${todayKey()}-${slot}-${zone}`) % 100;
  return h < 50 ? 'none' : h < 65 ? 'sun' : h < 80 ? 'rain' : h < 90 ? 'sand' : 'snow';
}
function battleWeather(){ return (state.battle && state.battle.weather) || 'none'; }
function weatherChip(){ const w = battleWeather(); return w === 'none' ? '' : `${WEATHER[w].icon}${WEATHER[w].name}`; }
// 遭遇偏向：天氣相關屬性 30%、大量出現的屬性 30%
function biasPool(pool){
  let types = null;
  const wx = WEATHER[fieldWeather()];
  if(wx.types && Math.random() < 0.3) types = wx.types;
  else { const de = dailyEvent(); if(de.id === 'outbreak' && Math.random() < 0.3) types = [de.type]; }
  if(!types) return pool;
  const f = pool.filter(i=>types.includes(DEX[i][1]) || types.includes(DEX[i][2]));
  return f.length ? f : pool;
}

/* ========== 對戰中的效果 ========== */
function resetBattleFlags(m){
  if(!m) return;
  ['_bSash','_bSturdy','_bBerry','_bFF','_bGem','_bBalloon','_bHerb','_lock','_metro','_flinch','_rfist'].forEach(k=>{ delete m[k]; });
  if(typeof clearVolatile === 'function') clearVolatile(m); else m.spdMul = 1;   // 招式造成的暫時狀態、能力變化（moves.js）
}
let fxNotes = [];   // 傷害計算中產生的訊息（會心一擊、抗性樹果……），印在攻擊訊息後面
function flushFxNotes(){ fxNotes.forEach(t=>print(t)); fxNotes = []; }
const WX_TURNS = 5, WX_TURNS_ROCK = 8;
// 對戰開始、換人、對手派出新寶可夢時呼叫（screenBattle 開頭會自動呼叫，重複呼叫沒關係）
function entryCheck(){
  const b = state.battle; if(!b) return;
  const p = state.party[b.playerIdx], w = b.wild;
  if(!b._init){
    b._init = true;
    b.baseWeather = b.weather = (b.mode === 'wild' || b.mode === 'trainer') ? fieldWeather() : 'none';
    [...state.party, w, ...(b.foes||[])].forEach(resetBattleFlags);
    if(b.weather !== 'none') print(`<span class="sys">${WEATHER[b.weather].icon} ${WEATHER[b.weather].name}</span>`);
  }
  if(w && w.hp > 0 && b._foeIn !== w){
    b._foeIn = w; ensureAbility(w);
    print(`<span class="sys">${who(w)} 的特性：${esc(abName(w))}</span>`);
    onEntry(w, p);
    entryHazards(w);
  }
  if(p && p.hp > 0 && b._meIn !== p){
    b._meIn = p; ensureAbility(p); onEntry(p, w);
    const pu = state.stats.pu && typeof state.stats.pu === 'object' ? state.stats.pu : (state.stats.pu = {}); pu[p.dex] = (pu[p.dex]||0) + 1;   // 統計：上場次數
    entryHazards(p);
  }
}
function onEntry(m, foe){
  const b = state.battle;
  if(holds(m,'airballoon') && !m._bBalloon) print(`<span class="sys">${who(m)} 靠著氣球浮在空中。</span>`);
  if(hasAb(m,'intimidate') && foe && foe.hp > 0){
    foe.atkMul = Math.max(0.4, (foe.atkMul||1)*0.75);
    print(`${abTag(m)}${who(m)} 威嚇了對方，<span class="bad">${who(foe)} 的攻擊下降了！</span>`);
    herbCheck(foe);
  }
  const setW = {drought:'sun', drizzle:'rain', sandstream:'sand', snowwarning:'snow'}[m.ab];
  if(setW && b.weather !== setW){
    const rock = heldIt(m) && heldIt(m).wx === setW;
    b.weather = setW; b.weatherTurns = rock ? WX_TURNS_ROCK : WX_TURNS;
    print(`${abTag(m)}<span class="em">${WEATHER[setW].icon} 天氣變成了${WEATHER[setW].name}！</span>`);
  }
}
// 每回合結束一次：特性造成的天氣倒數，結束後回到原本的天氣
function weatherTick(){
  const b = state.battle; if(!b || !b.weatherTurns) return;
  if(--b.weatherTurns > 0) return;
  b.weatherTurns = 0;
  const was = b.weather; b.weather = b.baseWeather || 'none';
  if(was !== b.weather) print(`<span class="sys">${WEATHER[was].icon} ${WEATHER[was].name}結束了。</span>`);
}
const SPD_AB_WEATHER = {chlorophyll:'sun', swiftswim:'rain', sandrush:'sand', slushrush:'snow'};
function fxSpd(m){
  return (m.spdMul||1) * (SPD_AB_WEATHER[m.ab] && SPD_AB_WEATHER[m.ab] === battleWeather() ? 2 : 1) * (holds(m,'choicescarf') ? 1.5 : 1);
}
// 防禦方的能力倍率（phys＝物理招式）
function fxDefStat(def, phys){
  let k = 1; const w = battleWeather(), t = typesOf(def);
  if(w === 'sand' && !phys && t.includes('岩石')) k *= 1.5;
  if(w === 'snow' && phys && t.includes('冰')) k *= 1.5;
  if(!phys && holds(def,'assaultvest')) k *= 1.5;
  if(holds(def,'eviolite') && !isFinalForm(def.dex)) k *= 1.5;
  return k;
}
const PIKACHU = 24;
// 傷害倍率：天氣、特性、道具、會心一擊（只在真正出招時呼叫一次，會消耗一次性道具）
function fxDmgMul(att, def, move, e){
  let k = 1; const w = battleWeather(), t = move.type, phys = isPhys(move);
  if(w === 'sun'){ if(t === '火') k *= 1.5; else if(t === '水') k *= 0.5; }
  if(w === 'rain'){ if(t === '水') k *= 1.5; else if(t === '火') k *= 0.5; }
  if(PINCH_AB[att.ab] === t && att.hp*3 <= att.maxhp) k *= 1.5;
  if(hasAb(att,'technician') && move.power <= 60) k *= 1.5;
  if(hasAb(att,'guts') && att.status) k *= 1.5;
  if(hasAb(att,'sheerforce') && hasSecondary(move)) k *= 1.3;
  if(att._bFF && t === '火') k *= 1.5;
  if(hasAb(def,'thickfat') && (t === '火' || t === '冰')) k *= 0.5;
  if(hasAb(def,'multiscale') && def.hp >= def.maxhp) k *= 0.5;
  // 攻擊方道具
  const it = heldIt(att);
  if(it){
    if(it.boost === t && !move.struggle) k *= 1.2;
    if(att.held === 'lifeorb') k *= 1.3;
    if(att.held === 'expertbelt' && e >= 2) k *= 1.2;
    if(att.held === 'muscleband' && phys) k *= 1.1;
    if(att.held === 'wiseglasses' && !phys) k *= 1.1;
    if(att.held === 'lightball' && att.dex === PIKACHU) k *= 2;
    if(att.held === 'metronome' && att._metro && att._metro.name === move.name) k *= Math.min(2, 1 + 0.2*att._metro.n);
    if(att.held === 'normalgem' && t === '一般' && !att._bGem && !move.struggle){ att._bGem = true; k *= 1.3; fxNotes.push(`<span class="good">〔一般寶石〕${who(att)} 的招式威力提升了！</span>`); }
  }
  // 會心一擊：等級 0 1/24、1 1/8、2 1/2、3 必定（招式、聚氣、焦點鏡、親密度；幸運咒語擋下）；calcHit 會先算好 move._crit
  const cs = move._crit === undefined ? (holds(att,'scopelens') ? 1 : 0) : move._crit;
  if(cs >= 0 && Math.random() < [1/24, 1/8, 1/2, 1][Math.min(3, cs)]){
    k *= 1.5; move._didCrit = true; fxNotes.push('<span class="em">會心一擊！</span>');
    if(state.battle && att !== state.battle.wild) bump('crits');
  }
  // 防禦方抗性樹果
  const di = heldIt(def);
  if(di && di.resist === t && !def._bBerry && !move.struggle && (t === '一般' || e >= 2)){
    def._bBerry = true; k *= 0.5;
    fxNotes.push(`<span class="good">〔${di.label}〕${who(def)} 減弱了這一擊的傷害！</span>`);
  }
  return k;
}
function hasSecondary(move){ return !move.struggle && move.cls !== 2 && fxList(move).some(c=>/^a[a-z]{3}\d|^fl\d|^sf/.test(c) || (/^su/.test(c) && !/_100$/.test(c))); }   // 強行會吃掉的附加效果
// 出招前：畏縮、節拍器計數
function beforeMoveFx(att, move){
  if(att._flinch){ att._flinch = false; print(`<span class="bad">${who(att)} 畏縮了，無法行動！</span>`); return false; }
  if(holds(att,'metronome')){
    att._metro = (att._metro && att._metro.name === move.name) ? {name:move.name, n:att._metro.n+1} : {name:move.name, n:0};
  }
  return true;
}
// 吸收型特性、氣球：招式無效（回傳訊息，沒觸發回傳空字串）
function absorbCheck(att, def, move){
  if(move.struggle) return '';
  const t = move.type;
  if(hasAb(def,'levitate') && t === '地面') return `${abTag(def)}${who(def)} 浮在空中，地面屬性招式沒有效果！`;
  if(t === '地面' && holds(def,'airballoon') && !def._bBalloon) return `〔氣球〕${who(def)} 浮在空中，地面屬性招式沒有效果！`;
  const heal = {voltabsorb:'電', waterabsorb:'水', sapsipper:'草'}[def.ab];
  if(heal && heal === t){
    const h = Math.max(1, Math.floor(def.maxhp/4)), before = def.hp;
    def.hp = Math.min(def.maxhp, def.hp + h);
    return `${abTag(def)}${who(def)} 吸收了招式${def.hp > before ? `，回復了 ${def.hp-before} 點 HP` : ''}！`;
  }
  if(hasAb(def,'flashfire') && t === '火'){ def._bFF = true; return `${abTag(def)}${who(def)} 吸收了火焰，火屬性招式的威力提升了！`; }
  return '';
}
// 氣勢披帶／結實／氣勢頭帶：撐住一擊。回傳 [調整後的傷害, 要在攻擊訊息後面印的字]
function endureCheck(def, d){
  if(d < def.hp || def.hp <= 1) return [d, ''];
  const full = def.hp >= def.maxhp;
  if(full && holds(def,'focussash') && !def._bSash){ def._bSash = true; return [def.hp - 1, `<span class="good">〔氣勢披帶〕${who(def)} 撐住了這一擊！</span>`]; }
  if(full && hasAb(def,'sturdy') && !def._bSturdy){ def._bSturdy = true; return [def.hp - 1, `${abTag(def)}<span class="good">${who(def)} 撐住了這一擊！</span>`]; }
  if(holds(def,'focusband') && Math.random() < 0.1) return [def.hp - 1, `<span class="good">〔氣勢頭帶〕${who(def)} 撐住了這一擊！</span>`];
  if(def._endure) return [def.hp - 1, `<span class="good">${who(def)} 挺住了這一擊！</span>`];
  if(state.battle && def !== state.battle.wild && (def.friend||0) >= 200 && Math.random() < 0.1) return [def.hp - 1, `<span class="good">${who(def)} 為了不讓你難過，撐住了這一擊！</span>`];   // 親密度
  return [d, ''];
}
function statusImmune(m, kind){
  return (kind === 'poison' && hasAb(m,'immunity')) || (kind === 'paralyze' && hasAb(m,'limber')) || (kind === 'burn' && hasAb(m,'waterveil'));
}
// 狀態樹果：木子果治全部、櫻子果／桃桃果／莓莓果治對應狀態
function lumCheck(m){
  const it = heldIt(m);
  if(!m.status || !it || m._bBerry || !(m.held === 'lumberry' || statusMatch(m.status, it.cure))) return;
  m._bBerry = true; m.status = null;
  print(`<span class="good">〔${it.label}〕${who(m)} 的異常狀態治好了！</span>`);
}
// 白色香草：能力被降低時恢復
function herbCheck(m){
  const ks = ['atkMul','defMul','spaMul','sdfMul','spdMul','accMul','evaMul'];
  if(!holds(m,'whiteherb') || m._bHerb || !ks.some(k=>(m[k]||1) < 1)) return;
  m._bHerb = true; ks.forEach(k=>{ if((m[k]||1) < 1) m[k] = 1; });
  print(`<span class="good">〔白色香草〕${who(m)} 降低的能力恢復了！</span>`);
}
// HP 下降後：文柚果、橙橙果、枝荔果、龍睛果、沙鱗果
const PINCH_NAME = {atk:'攻擊', def:'防禦', spd:'速度'};
function hpBerryCheck(m){
  const it = heldIt(m);
  if(!it || m._bBerry || m.hp <= 0) return;
  if((m.held === 'sitrusberry' || m.held === 'oranberry') && m.hp*2 <= m.maxhp){
    const h = Math.max(1, Math.floor(m.maxhp / (m.held === 'sitrusberry' ? 4 : 10)));
    m._bBerry = true; m.hp = Math.min(m.maxhp, m.hp + h);
    print(`<span class="good">〔${it.label}〕${who(m)} 回復了 ${h} 點 HP！</span>`);
  } else if(it.pinch && m.hp*4 <= m.maxhp){
    m._bBerry = true;
    if(it.pinch === 'atk') m.atkMul = Math.min(2.5, (m.atkMul||1)*1.5);
    if(it.pinch === 'def') m.defMul = Math.min(2.5, (m.defMul||1)*1.5);
    if(it.pinch === 'spd') m.spdMul = Math.min(4, (m.spdMul||1)*1.5);
    print(`<span class="good">〔${it.label}〕${who(m)} 的${PINCH_NAME[it.pinch]}提升了！</span>`);
  }
}
// 蘋野果：某一招 PP 用完時回復 10
function leppaCheck(m, move){
  if(!holds(m,'leppaberry') || m._bBerry || !move || move.maxpp === undefined || move.pp > 0) return;
  m._bBerry = true; move.pp = Math.min(move.maxpp, 10);
  print(`<span class="good">〔蘋野果〕${who(m)} 的 ${esc(move.name)} 回復了 PP！</span>`);
}
const STATUS_WORD = {burn:'陷入了灼傷', poison:'中毒了', toxic:'中了劇毒', paralyze:'被麻痺了', sleep:'睡著了', freeze:'被凍住了'};
// 攻擊命中後：氣球、王者之證、生命寶珠、貝殼之鈴、凸凸頭盔、接觸型特性、自信過度、HP 樹果
function afterHitFx(att, def, move, d){
  if(d <= 0) return;
  if(holds(def,'airballoon') && !def._bBalloon){ def._bBalloon = true; print(`<span class="sys">${who(def)} 的氣球破掉了！</span>`); }
  if(holds(att,'kingsrock') && def.hp > 0 && Math.random() < 0.1) def._flinch = true;
  if(holds(att,'shellbell') && att.hp > 0 && att.hp < att.maxhp){
    const h = Math.max(1, Math.floor(d/8)); att.hp = Math.min(att.maxhp, att.hp + h);
    print(`<span class="good">〔貝殼之鈴〕${who(att)} 回復了 ${h} 點 HP。</span>`);
  }
  if(holds(att,'lifeorb') && att.hp > 0 && !hasAb(att,'magicguard')){
    const l = Math.max(1, Math.floor(att.maxhp/10)); att.hp = Math.max(0, att.hp - l);
    print(`<span class="bad">〔生命寶珠〕${who(att)} 損失了 ${l} 點 HP。</span>`);
  }
  if(holds(def,'rockyhelmet') && isPhys(move) && att.hp > 0 && !hasAb(att,'magicguard')){
    const l = Math.max(1, Math.floor(att.maxhp/6)); att.hp = Math.max(0, att.hp - l);
    print(`<span class="bad">〔凸凸頭盔〕${who(att)} 受到了 ${l} 點傷害！</span>`);
  }
  const contact = {static:'paralyze', flamebody:'burn', poisonpoint:'poison'}[def.ab];
  if(contact && isPhys(move) && att.hp > 0 && !att.status && !statusImmune(att, contact) && Math.random() < 0.3){
    att.status = contact;
    print(`${abTag(def)}<span class="bad">${who(att)} ${STATUS_WORD[contact]}！</span>`);
    lumCheck(att);
  }
  if(def.hp <= 0 && hasAb(att,'moxie') && att.hp > 0){
    att.atkMul = Math.min(2.5, (att.atkMul||1)*1.25);
    print(`${abTag(att)}<span class="good">${who(att)} 的攻擊提升了！</span>`);
  }
  hpBerryCheck(def); hpBerryCheck(att);
}
// 回合結束：沙暴、吃剩的東西、加速、畏縮解除（直接印出）
function endTurnFx(m){
  if(!m) return;
  m._flinch = false;
  if(m.hp <= 0) return;
  const w = battleWeather(), t = typesOf(m);
  if(w === 'sand' && !t.some(x=>x==='岩石'||x==='地面'||x==='鋼') && !hasAb(m,'magicguard')){
    const l = Math.max(1, Math.floor(m.maxhp/16)); m.hp = Math.max(0, m.hp - l);
    print(`<span class="bad">🌪 沙暴襲擊了 ${who(m)}，損失 ${l} 點 HP。</span>`);
    if(m.hp <= 0) return;
  }
  if(holds(m,'leftovers') && m.hp < m.maxhp){
    const h = Math.max(1, Math.floor(m.maxhp/16)); m.hp = Math.min(m.maxhp, m.hp + h);
    print(`<span class="good">〔吃剩的東西〕${who(m)} 回復了 ${h} 點 HP。</span>`);
  }
  if(hasAb(m,'speedboost') && (m.spdMul||1) < 4){
    m.spdMul = Math.min(4, (m.spdMul||1)*1.5);
    print(`${abTag(m)}<span class="good">${who(m)} 的速度提升了！</span>`);
  }
  hpBerryCheck(m);
}
function switchOutFx(m){
  if(!m) return;
  delete m._lock; delete m._metro;   // 講究圍巾、節拍器：換下場就重新計算
  clearVolatile(m);                  // 能力變化、混亂、寄生種子等只在場上有效的狀態（moves.js）
  if(m.hp > 0 && hasAb(m,'regenerator') && m.hp < m.maxhp){
    const h = Math.max(1, Math.floor(m.maxhp/3)); m.hp = Math.min(m.maxhp, m.hp + h);
    print(`${abTag(m)}<span class="good">${nm(m)} 回復了 ${h} 點 HP。</span>`);
  }
}

/* ========== 畫面：今日資訊、攜帶道具 ========== */
function screenToday(){
  clearLog(); renderBar();
  const de = dailyEvent(), wx = WEATHER[fieldWeather()];
  print('<span class="em">📅 今日事件</span>');
  print(`<b>${de.name}</b>　${esc(de.desc)}`);
  hr();
  print(`<span class="em">${wx.icon} ${esc(zoneName(state.zone))}：${wx.name}</span>`);
  print(esc(wx.desc));
  hr();
  print('<span class="sys">事件每天 0 點換。天氣每 3 小時換一次，每個地區不同，只影響野外和路上的訓練家。</span>');
  setOptions([{label:'返回', action:toField}]);
}
function heldOwnedCount(k){ return (state.bag[k]||0) + [...state.party, ...state.box].filter(m=>m.held===k).length; }
function heldCatOf(k){ return HELD[k].cat; }
// 分頁：一頁 PAGE_N 個按鈕，畫面上方才看得到說明
const PAGE_N = 12;
function pageSlice(list, page){ const pages = Math.max(1, Math.ceil(list.length/PAGE_N)); page = Math.max(0, Math.min(pages-1, page||0)); return {items:list.slice(page*PAGE_N, page*PAGE_N+PAGE_N), page, pages}; }
function pageNav(opts, pg, go){
  if(pg.pages <= 1) return;
  print(`<span class="sys">第 ${pg.page+1} / ${pg.pages} 頁</span>`);
  if(pg.page > 0) opts.push({label:'◀ 上一頁', half:true, action:()=>go(pg.page-1)});
  if(pg.page < pg.pages-1) opts.push({label:'下一頁 ▶', half:true, action:()=>go(pg.page+1)});
}
// 裝備：分類 → 道具列表 → 點道具看說明再帶上
function screenHeld(i, back, msg, cat, page){
  const m = state.party[i]; if(!m) return screenParty(back);
  clearLog();
  print(`<span class="em">🧷 ${nm(m)} 的攜帶道具</span>`);
  print(`目前：<b>${esc(heldName(m))}</b>${heldIt(m) ? `　<span class="sys">${esc(heldIt(m).desc)}</span>` : ''}`);
  if(msg) print(msg);
  const own = HELD_KEYS.filter(k=>state.bag[k] > 0);
  const opts = [];
  if(!cat){
    if(!own.length) print('<span class="sys">背包裡沒有攜帶道具，到商店的「🧷 攜帶道具」可以買。</span>');
    HELD_CATS.forEach(([c, name])=>{ if(own.some(k=>heldCatOf(k)===c)) opts.push({label:name, half:true, action:()=>screenHeld(i, back, null, c)}); });
    if(m.held) opts.push({label:'卸下', half:true, action:()=>unequipHeld(i, back)});
    opts.push({label:'← 返回', action:()=>screenMember(i, back)});
  } else {
    print('<span class="sys">點道具看說明。</span>');
    const pg = pageSlice(own.filter(k=>heldCatOf(k)===cat), page);
    pg.items.forEach(k=>opts.push({label:HELD[k].label, half:true, action:()=>screenHeldPick(i, back, k, cat, pg.page)}));
    pageNav(opts, pg, p=>screenHeld(i, back, null, cat, p));
    opts.push({label:'← 返回', action:()=>screenHeld(i, back)});
  }
  setOptions(opts);
}
function screenHeldPick(i, back, k, cat, page){
  const m = state.party[i]; if(!m) return screenParty(back);
  clearLog();
  print(`<span class="em">${esc(HELD[k].label)}</span>　×${state.bag[k]||0}`);
  print(esc(HELD[k].desc));
  setOptions([
    {label:`讓 ${monName(m)} 帶上`, action:()=>equipHeld(i, k, back)},
    {label:'← 返回', action:()=>screenHeld(i, back, null, cat, page)}
  ]);
}
function equipHeld(i, k, back){
  const m = state.party[i]; if(!m || !(state.bag[k] > 0)) return screenHeld(i, back);
  if(m.held) state.bag[m.held] = (state.bag[m.held]||0) + 1;
  state.bag[k]--; m.held = k; saveGame();
  screenHeld(i, back, `<span class="good">${nm(m)} 帶上了${HELD[k].label}！</span>`);
}
function unequipHeld(i, back){
  const m = state.party[i]; if(!m || !m.held) return screenHeld(i, back);
  const k = m.held; state.bag[k] = (state.bag[k]||0) + 1; delete m.held; saveGame();
  screenHeld(i, back, `<span class="good">${HELD[k] ? HELD[k].label : '道具'} 收回背包了。</span>`);
}
// 商店：分類 → 道具列表 → 點道具看說明再買
let heldShopCat = null, heldShopPage = 0;
function screenHeldShop(msg, cat, page){
  if(cat !== undefined){ heldShopCat = cat; heldShopPage = 0; }
  if(page !== undefined) heldShopPage = page;
  clearLog(); renderBar();
  print(`<span class="em">🧷 攜帶道具</span>　💰 ${state.money}${daily('sale') ? '　<span class="good">🏷 8 折</span>' : ''}`);
  if(msg) print(msg);
  const opts = [];
  if(!heldShopCat){
    print('<span class="sys">買了之後到「隊伍」點寶可夢就能帶上，一隻帶一個。樹果這類一次性道具每場可以用一次，不會消失。</span>');
    HELD_CATS.forEach(([c, name])=>opts.push({label:name, half:true, action:()=>screenHeldShop(null, c)}));
    opts.push({label:'← 返回商店', action:()=>{ heldShopCat = null; screenShop(); }});
  } else {
    print(`${HELD_CATS.find(c=>c[0]===heldShopCat)[1]}　<span class="sys">點道具看說明。</span>`);
    const pg = pageSlice(HELD_KEYS.filter(k=>heldCatOf(k)===heldShopCat), heldShopPage);
    heldShopPage = pg.page;
    pg.items.forEach(k=>opts.push({label:`${HELD[k].label} $${priceOf(k)}`, half:true, action:()=>screenHeldBuy(k)}));
    pageNav(opts, pg, p=>screenHeldShop(null, undefined, p));
    opts.push({label:'← 返回', action:()=>screenHeldShop(null, null)});
  }
  setOptions(opts);
}
function screenHeldBuy(k, msg){
  clearLog(); renderBar();
  print(`<span class="em">${esc(HELD[k].label)}</span>　$${priceOf(k)}　<span class="sys">持有 ${heldOwnedCount(k)}　💰 ${state.money}</span>`);
  print(esc(HELD[k].desc));
  if(msg) print(msg);
  setOptions([
    {label:`購買 $${priceOf(k)}`, action:()=>screenHeldConfirm(k)},
    {label:'← 返回', action:()=>screenHeldShop()}
  ]);
}
// 確認頁：按「確認購買」才會扣錢
function screenHeldConfirm(k){
  const p = priceOf(k);
  clearLog(); renderBar();
  print(`<span class="em">確認購買</span>`);
  print(`${esc(HELD[k].label)}　💰 ${p}　<span class="sys">（目前 💰 ${state.money}）</span>`);
  if(state.money < p) print(`<span class="bad">錢不夠，還差 💰 ${p-state.money}。</span>`);
  const opts = [];
  if(state.money >= p) opts.push({label:`✅ 確認購買 $${p}`, action:()=>buyHeld(k)});
  opts.push({label:'取消', action:()=>screenHeldBuy(k)});
  setOptions(opts);
}
function buyHeld(k){
  const p = priceOf(k);
  if(state.money < p) return screenHeldBuy(k, `<span class="bad">錢不夠！還差 💰 ${p-state.money}。</span>`);
  state.money -= p; state.bag[k] = (state.bag[k]||0) + 1; saveGame();
  screenHeldBuy(k, `<span class="good">買了 ${HELD[k].label}！</span>`);
}

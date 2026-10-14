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
function hasAb(m, k){ return !!m && m.ab === k; }
function abTag(m){ return `<span class="ab">〔${esc(abName(m))}〕</span>`; }

/* ========== 3. 攜帶道具：一隻帶一個，從背包裝上／卸下 ========== */
const HELD = {
  leftovers:  {label:'吃剩的東西', price:4000, desc:'每回合結束時回復 1/16 HP'},
  lifeorb:    {label:'生命寶珠',   price:5000, desc:'招式威力 ×1.3，但每次攻擊損失 1/10 HP'},
  focussash:  {label:'氣勢披帶',   price:3000, desc:'HP 全滿時，不會被一擊打倒（每場一次）'},
  quickclaw:  {label:'先制之爪',   price:2500, desc:'20% 機率搶先行動'},
  expertbelt: {label:'達人帶',     price:3500, desc:'效果絕佳的招式威力 ×1.2'},
  shellbell:  {label:'貝殼之鈴',   price:3000, desc:'回復造成傷害的 1/8'},
  rockyhelmet:{label:'凸凸頭盔',   price:3000, desc:'被攻擊時，對手損失 1/8 HP'},
  assaultvest:{label:'突擊背心',   price:4000, desc:'特防 ×1.5'},
  eviolite:   {label:'進化奇石',   price:4000, desc:'還能進化的寶可夢，防禦和特防 ×1.5'},
  lumberry:   {label:'木子果',     price:1500, desc:'陷入異常狀態時馬上治好（每場一次）'},
  luckyegg:   {label:'幸運蛋',     price:5000, desc:'攜帶者獲得的經驗值 ×1.5'},
  amuletcoin: {label:'護符金幣',   price:6000, desc:'隊伍裡有人攜帶時，對戰獲得的金錢 ×1.5'}
};
const HELD_KEYS = Object.keys(HELD);
function holds(m, k){ return !!m && m.held === k; }
function heldName(m){ return m && HELD[m.held] ? HELD[m.held].label : '無'; }

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
function resetBattleFlags(m){ if(!m) return; m.spdMul = 1; delete m._bSash; delete m._bSturdy; delete m._bLum; delete m._bFF; }
// 對戰開始、換人、對手派出新寶可夢時呼叫（screenBattle 開頭會自動呼叫，重複呼叫沒關係）
function entryCheck(){
  const b = state.battle; if(!b) return;
  const p = state.party[b.playerIdx], w = b.wild;
  if(!b._init){
    b._init = true;
    b.weather = (b.mode === 'wild' || b.mode === 'trainer') ? fieldWeather() : 'none';
    [...state.party, w, ...(b.foes||[])].forEach(resetBattleFlags);
    if(b.weather !== 'none') print(`<span class="sys">${WEATHER[b.weather].icon} 天氣：${WEATHER[b.weather].name}（${WEATHER[b.weather].desc.split('；')[0]}）</span>`);
  }
  if(w && w.hp > 0 && b._foeIn !== w){
    b._foeIn = w; ensureAbility(w);
    print(`<span class="sys">${who(w)} 的特性：${esc(abName(w))}——${esc(ABILITIES[w.ab].desc)}</span>`);
    onEntry(w, p);
  }
  if(p && p.hp > 0 && b._meIn !== p){ b._meIn = p; ensureAbility(p); onEntry(p, w); }
}
function onEntry(m, foe){
  const b = state.battle;
  if(hasAb(m,'intimidate') && foe && foe.hp > 0){
    foe.atkMul = Math.max(0.4, (foe.atkMul||1)*0.75);
    print(`${abTag(m)}${who(m)} 威嚇了對方，<span class="bad">${who(foe)} 的攻擊下降了！</span>`);
  }
  const setW = {drought:'sun', drizzle:'rain', sandstream:'sand', snowwarning:'snow'}[m.ab];
  if(setW && b.weather !== setW){
    b.weather = setW;
    print(`${abTag(m)}<span class="em">${WEATHER[setW].icon} 天氣變成了${WEATHER[setW].name}！</span>`);
  }
}
const SPD_AB_WEATHER = {chlorophyll:'sun', swiftswim:'rain', sandrush:'sand', slushrush:'snow'};
function fxSpd(m){ return (m.spdMul||1) * (SPD_AB_WEATHER[m.ab] && SPD_AB_WEATHER[m.ab] === battleWeather() ? 2 : 1); }
// 防禦方的能力倍率（phys＝物理招式）
function fxDefStat(def, phys){
  let k = 1; const w = battleWeather(), t = typesOf(def);
  if(w === 'sand' && !phys && t.includes('岩石')) k *= 1.5;
  if(w === 'snow' && phys && t.includes('冰')) k *= 1.5;
  if(!phys && holds(def,'assaultvest')) k *= 1.5;
  if(holds(def,'eviolite') && !isFinalForm(def.dex)) k *= 1.5;
  return k;
}
// 傷害倍率：天氣、特性、道具
function fxDmgMul(att, def, move, e){
  let k = 1; const w = battleWeather(), t = move.type;
  if(w === 'sun'){ if(t === '火') k *= 1.5; else if(t === '水') k *= 0.5; }
  if(w === 'rain'){ if(t === '水') k *= 1.5; else if(t === '火') k *= 0.5; }
  if(PINCH_AB[att.ab] === t && att.hp*3 <= att.maxhp) k *= 1.5;
  if(hasAb(att,'technician') && move.power <= 60) k *= 1.5;
  if(hasAb(att,'guts') && att.status) k *= 1.5;
  if(hasAb(att,'sheerforce') && hasSecondary(move)) k *= 1.3;
  if(att._bFF && t === '火') k *= 1.5;
  if(hasAb(def,'thickfat') && (t === '火' || t === '冰')) k *= 0.5;
  if(hasAb(def,'multiscale') && def.hp >= def.maxhp) k *= 0.5;
  if(holds(att,'lifeorb')) k *= 1.3;
  if(holds(att,'expertbelt') && e >= 2) k *= 1.2;
  return k;
}
function hasSecondary(move){ const fx = !move.struggle && STATUS_FX[move.type]; return !!fx && fx.kind !== 'drain' && fx.kind !== 'selfDefUp'; }
// 吸收型特性：招式無效（回傳訊息，沒觸發回傳空字串）
function absorbCheck(att, def, move){
  if(move.struggle) return '';
  const t = move.type;
  if(hasAb(def,'levitate') && t === '地面') return `${abTag(def)}${who(def)} 浮在空中，地面屬性招式沒有效果！`;
  const heal = {voltabsorb:'電', waterabsorb:'水', sapsipper:'草'}[def.ab];
  if(heal && heal === t){
    const h = Math.max(1, Math.floor(def.maxhp/4)), before = def.hp;
    def.hp = Math.min(def.maxhp, def.hp + h);
    return `${abTag(def)}${who(def)} 吸收了招式${def.hp > before ? `，回復了 ${def.hp-before} 點 HP` : ''}！`;
  }
  if(hasAb(def,'flashfire') && t === '火'){ def._bFF = true; return `${abTag(def)}${who(def)} 吸收了火焰，火屬性招式的威力提升了！`; }
  return '';
}
// 氣勢披帶／結實：HP 全滿時撐住一擊。回傳 [調整後的傷害, 要在攻擊訊息後面印的字]
function endureCheck(def, d){
  if(d < def.hp || def.hp < def.maxhp || def.maxhp <= 1) return [d, ''];
  if(holds(def,'focussash') && !def._bSash){ def._bSash = true; return [def.hp - 1, `<span class="good">〔氣勢披帶〕${who(def)} 撐住了這一擊！</span>`]; }
  if(hasAb(def,'sturdy') && !def._bSturdy){ def._bSturdy = true; return [def.hp - 1, `${abTag(def)}<span class="good">${who(def)} 撐住了這一擊！</span>`]; }
  return [d, ''];
}
function statusImmune(m, kind){
  return (kind === 'poison' && hasAb(m,'immunity')) || (kind === 'paralyze' && hasAb(m,'limber')) || (kind === 'burn' && hasAb(m,'waterveil'));
}
function lumCheck(m){
  if(m.status && holds(m,'lumberry') && !m._bLum){ m._bLum = true; m.status = null; print(`<span class="good">〔木子果〕${who(m)} 的異常狀態治好了！</span>`); }
}
const STATUS_WORD = {burn:'陷入了灼傷', poison:'中毒了', paralyze:'被麻痺了'};
// 攻擊命中後：生命寶珠、貝殼之鈴、凸凸頭盔、接觸型特性、自信過度
function afterHitFx(att, def, move, d){
  if(d <= 0) return;
  if(holds(att,'shellbell') && att.hp > 0 && att.hp < att.maxhp){
    const h = Math.max(1, Math.floor(d/8)); att.hp = Math.min(att.maxhp, att.hp + h);
    print(`<span class="good">〔貝殼之鈴〕${who(att)} 回復了 ${h} 點 HP。</span>`);
  }
  if(holds(att,'lifeorb') && att.hp > 0 && !hasAb(att,'magicguard')){
    const l = Math.max(1, Math.floor(att.maxhp/10)); att.hp = Math.max(0, att.hp - l);
    print(`<span class="bad">〔生命寶珠〕${who(att)} 損失了 ${l} 點 HP。</span>`);
  }
  if(holds(def,'rockyhelmet') && att.hp > 0 && !hasAb(att,'magicguard')){
    const l = Math.max(1, Math.floor(att.maxhp/8)); att.hp = Math.max(0, att.hp - l);
    print(`<span class="bad">〔凸凸頭盔〕${who(att)} 受到了 ${l} 點傷害！</span>`);
  }
  const contact = {static:'paralyze', flamebody:'burn', poisonpoint:'poison'}[def.ab];
  if(contact && att.hp > 0 && !att.status && !statusImmune(att, contact) && Math.random() < 0.3){
    att.status = contact;
    print(`${abTag(def)}<span class="bad">${who(att)} ${STATUS_WORD[contact]}！</span>`);
    lumCheck(att);
  }
  if(def.hp <= 0 && hasAb(att,'moxie') && att.hp > 0){
    att.atkMul = Math.min(2.5, (att.atkMul||1)*1.25);
    print(`${abTag(att)}<span class="good">${who(att)} 的攻擊提升了！</span>`);
  }
}
// 回合結束：沙暴、吃剩的東西、加速（直接印出）
function endTurnFx(m){
  if(!m || m.hp <= 0) return;
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
}
function switchOutFx(m){
  if(m && m.hp > 0 && hasAb(m,'regenerator') && m.hp < m.maxhp){
    const h = Math.max(1, Math.floor(m.maxhp/3)); m.hp = Math.min(m.maxhp, m.hp + h);
    print(`${abTag(m)}<span class="good">${nm(m)} 回復了 ${h} 點 HP。</span>`);
  }
}

/* ========== 畫面：今日資訊、攜帶道具 ========== */
function screenToday(){
  clearLog(); renderBar();
  const de = dailyEvent(), wk = fieldWeather(), wx = WEATHER[wk];
  print('<span class="em">📅 今日事件</span>');
  print(`<b>${de.name}</b>：${esc(de.desc)}`);
  print('<span class="sys">每天 0 點換一次。</span>');
  hr();
  print(`<span class="em">${wx.icon} ${esc(zoneName(state.zone))}的天氣：${wx.name}</span>`);
  print(esc(wx.desc));
  print('<span class="sys">天氣只影響野外的寶可夢和路上的訓練家，每 3 小時變一次，每個地區不同。特性「乾旱／降雨／揚沙／降雪」在任何對戰中都能改變天氣。</span>');
  setOptions([{label:'返回', action:toField}]);
}
function screenHeld(i, back, msg){
  const m = state.party[i]; if(!m) return screenParty(back);
  clearLog();
  print(`<span class="em">🧷 ${nm(m)} 的攜帶道具</span>`);
  print(`目前攜帶：<b>${esc(heldName(m))}</b>${m.held && HELD[m.held] ? `　${esc(HELD[m.held].desc)}` : ''}`);
  if(msg) print(msg);
  const opts = [];
  HELD_KEYS.filter(k=>state.bag[k] > 0).forEach(k=>{
    const it = HELD[k];
    opts.push({label:it.label, half:true, html:`${esc(it.label)} ×${state.bag[k]}<span class="sub">${esc(it.desc)}</span>`, action:()=>equipHeld(i, k, back)});
  });
  if(!opts.length) print('<span class="sys">背包裡沒有攜帶道具，可以到商店的「🧷 攜帶道具」購買。</span>');
  if(m.held) opts.push({label:`卸下${heldName(m)}`, half:true, action:()=>unequipHeld(i, back)});
  opts.push({label:'← 返回', action:()=>screenMember(i, back)});
  setOptions(opts);
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
function screenHeldShop(msg){
  clearLog(); renderBar();
  print('<span class="em">— 🧷 攜帶道具 —</span>');
  print(`你的錢包：💰 ${state.money}${daily('sale') ? '　<span class="good">🏷 特價日 8 折中</span>' : ''}`);
  print('<span class="sys">買了之後到「隊伍」點寶可夢，就能讓牠帶上。一隻只能帶一個。</span>');
  if(msg) print(msg);
  const opts = HELD_KEYS.map(k=>{
    const it = HELD[k], have = (state.bag[k]||0) + [...state.party, ...state.box].filter(m=>m.held===k).length;
    return {label:it.label, half:true, html:`${esc(it.label)} $${priceOf(k)}<span class="sub">${esc(it.desc)}｜持有 ${have}</span>`, action:()=>buyHeld(k)};
  });
  opts.push({label:'← 返回商店', action:()=>screenShop()});
  setOptions(opts);
}
function buyHeld(k){
  const p = priceOf(k);
  if(state.money < p) return screenHeldShop(`<span class="bad">錢不夠！還差 💰 ${p-state.money}。</span>`);
  state.money -= p; state.bag[k] = (state.bag[k]||0) + 1; saveGame();
  screenHeldShop(`<span class="good">買了 ${HELD[k].label}，花費 💰 ${p}。</span>`);
}

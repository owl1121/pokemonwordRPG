/* ========== 特性（本傳每隻自己的特性 1~2 個＋隱藏特性） ==========
   名稱和官方說明在 poke-data.js 的 AB_TEXT，每隻有哪些特性在 ABIL / MEGA_ABIL。
   key＝英文代號去掉 -（例如 swift-swim → swiftswim）。效果分散在各個掛勾函式：
   abOnEntry 出場、abPowerMul 攻擊威力、abDefMul 受到傷害、abStatMul 能力值、abSpdMul 速度、abPriority 先制度、abAccMul 命中、
   abImmune 招式無效、abStatusBlock 異常免疫、abStatChange 能力變化、abAfterHit 被打到之後、abOnKo 打倒對手、abEndTurn 回合結束、abSwitchOut 換下場。
   只在本傳野外有用的（撿拾、採蜜…）或雙打才有用的，說明後面標「本作沒有效果」。 */

const AB_IMPL = new Set(('blaze torrent overgrow swarm intimidate drought drizzle sandstream snowwarning static flamebody poisonpoint levitate thickfat speedboost sturdy regenerator technician adaptability moxie rockhead guts magicguard chlorophyll swiftswim sandrush slushrush immunity limber waterveil shielddust multiscale voltabsorb waterabsorb sapsipper flashfire sheerforce '
 + 'keeneye innerfocus owntempo oblivious scrappy insomnia vitalspirit sweetveil magmaarmor leafguard comatose purifyingsalt pastelveil flowerveil waterbubble thermalexchange '
 + 'hugepower purepower hustle ironfist strongjaw megalauncher toughclaws reckless sniper tintedlens analytic sandforce solarpower toxicboost flareboost aerilate pixilate refrigerate galvanize dragonize normalize liquidvoice '
 + 'steelworker transistor dragonsmaw rockypayload sharpness punkrock gorillatactics defeatist slowstart stakeout supremeoverlord rivalry fairyaura darkaura aurabreak steelyspirit '
 + 'protosynthesis quarkdrive orichalcumpulse hadronengine tabletsofruin swordofruin vesselofruin beadsofruin megasol '
 + 'filter solidrock prismarmor shadowshield fluffy furcoat icescales heatproof dryskin marvelscale grasspelt wonderguard bulletproof soundproof overcoat battlearmor shellarmor damp disguise iceface unaware '
 + 'armortail queenlymajesty dazzling goodasgold magicbounce clearbody whitesmoke fullmetalbody hypercutter bigpecks mirrorarmor guarddog suctioncups stickyhold contrary simple '
 + 'defiant competitive justified rattled stamina weakarmor watercompaction steamengine angershell berserk angerpoint cottondown sandspit seedsower toxicdebris windpower electromorphosis windrider '
 + 'lightningrod stormdrain motordrive wellbakedbody eartheater roughskin ironbarbs aftermath innardsout perishbody mummy lingeringaroma wanderingspirit cursedbody gooey tanglinghair effectspore cutecharm poisontouch toxicchain stench pickpocket magician '
 + 'beastboost soulheart chillingneigh grimneigh asoneglastrier asonespectrier '
 + 'quickfeet surgesurfer unburden sandveil snowcloak tangledfeet wonderskin compoundeyes victorystar noguard superluck merciless skilllink serenegrace parentalbond '
 + 'prankster galewings triage quickdraw stall myceliummight '
 + 'shedskin hydration naturalcure poisonheal raindish icebody heavymetal lightmetal pressure truant unnerve klutz synchronize download intrepidsword dauntlessshield trace imposter screencleaner supersweetsyrup '
 + 'anticipation forewarn frisk moldbreaker teravolt turboblaze neutralizinggas airlock cloudnine electricsurge grassysurge mistysurge psychicsurge moody harvest cudchew ripen cheekpouch gluttony liquidooze '
 + 'runaway shadowtag arenatrap magnetpull steadfast aromaveil opportunist libero protean colorchange mimicry emergencyexit wimpout infiltrator longreach unseenfist').split(' '));
const ABILITIES = {};
(function(){
  for(const k in AB_TEXT){ const [n, d] = AB_TEXT[k]; ABILITIES[k] = {name:n, desc:d + (AB_IMPL.has(k) ? '' : '（本作沒有效果）')}; }
})();

/* ---------- 每隻的特性 ---------- */
function abSlotsOf(dex){ return (typeof ABIL !== 'undefined' && ABIL[dex]) || ['', '', '']; }
// 野生：一般特性隨機一個，5% 是隱藏特性（slot 0/1/2）
function rollAbilitySlot(dex, hiddenRate){
  const s = abSlotsOf(dex);
  if(s[2] && Math.random() < (hiddenRate ?? 0.05)) return 2;
  return (s[1] && Math.random() < 0.5) ? 1 : 0;
}
function abilityAt(dex, slot){ const s = abSlotsOf(dex); return s[slot] || s[0] || ''; }
function rollAbility(dex){ return abilityAt(dex, rollAbilitySlot(dex)); }
// 舊存檔或特性不是這隻會的：換成這隻的特性（保留 abSlot）
function ensureAbility(m){
  const s = abSlotsOf(m.dex);
  if(!(m.abSlot >= 0 && m.abSlot <= 2) || !s[m.abSlot]){ const i = s.indexOf(m.ab); m.abSlot = i >= 0 ? i : rollAbilitySlot(m.dex); }
  if(!m._mega && !('_abOrig' in m) && s.indexOf(m.ab) < 0) m.ab = abilityAt(m.dex, m.abSlot);
  if(!m.ab || !ABILITIES[m.ab]) m.ab = abilityAt(m.dex, m.abSlot);
  return m.ab;
}
function abName(m){ return m && ABILITIES[m.ab] ? ABILITIES[m.ab].name : '—'; }

/* ---------- 共用 ---------- */
const MV_FLAG = {contact:1, punch:2, sound:4, bite:8, pulse:16, ball:32, powder:64, slice:128, wind:256, dance:512, heal:1024};
function mvFlag(mv, f){ return !!mv && !!((mv.flags||0) & MV_FLAG[f]); }
function isContact(att, mv){ return mvFlag(mv,'contact') && !hasAb(att,'longreach') && !holds(att,'protectivepads'); }
// 破格類：無視對方會擋招的特性
function moldBreaks(att){ return hasAb(att,'moldbreaker') || hasAb(att,'teravolt') || hasAb(att,'turboblaze'); }
function dAb(att, def, k){ return hasAb(def, k) && !(att && att !== def && moldBreaks(att)); }
function genderOpp(a, b){ return a.gender && b.gender && a.gender !== b.gender; }
function onField(){ const b = state.battle; return b ? [b.wild, state.party[b.playerIdx]].filter(x=>x && x.hp > 0) : []; }
function fieldHasAb(k, except){ return onField().some(m=>m !== except && hasAb(m, k)); }
function abSay(m, t){ print(`${abTag(m)}${t}`); }
const ATE = {aerilate:'飛行', pixilate:'妖精', refrigerate:'冰', galvanize:'電', dragonize:'龍'};

/* ---------- 出場 ---------- */
function abOnEntry(m, foe){
  const b = state.battle; if(!b || !m || m.hp <= 0) return;
  const k = m.ab; if(!k || m._noab) return;
  const terr = {electricsurge:'e', grassysurge:'g', mistysurge:'m', psychicsurge:'p', hadronengine:'e'}[k];
  if(terr && terrain() !== terr){ const f = bf(); f.terrain = terr; f.terrTurns = holds(m,'terrainextender') ? 8 : 5; abSay(m, `<span class="em">腳下變成了${TERRAIN_NAME[terr]}！</span>`); }
  if(k === 'orichalcumpulse' && b.weather !== 'sun'){ b.weather = 'sun'; b.weatherTurns = WX_TURNS; abSay(m, `<span class="em">${WEATHER.sun.icon} 陽光變強了！</span>`); }
  if(!foe || foe.hp <= 0) return;
  if(k === 'pressure') abSay(m, `<span class="sys">${who(m)} 散發出壓迫感！</span>`);
  if(k === 'unnerve' || k === 'asoneglastrier' || k === 'asonespectrier') abSay(m, `<span class="sys">${who(foe)} 緊張得吃不下樹果！</span>`);
  if(moldBreaks(m)) abSay(m, `<span class="sys">${who(m)} 打破了常規！</span>`);
  if(k === 'airlock' || k === 'cloudnine') abSay(m, '<span class="sys">天氣的影響消失了。</span>');
  if(k === 'neutralizinggas') abSay(m, '<span class="sys">周圍充滿了化學變化氣體！</span>');
  if(k === 'frisk' && foe.held && HELD[foe.held]) abSay(m, `<span class="sys">察覺到 ${who(foe)} 帶著${esc(HELD[foe.held].label)}。</span>`);
  if(k === 'anticipation' && (foe.moves||[]).some(mv=>mv.cls !== 2 && moveEff(mv, m) >= 2)) abSay(m, `<span class="sys">${who(m)} 打了個寒顫！</span>`);
  if(k === 'forewarn'){ const mv = (foe.moves||[]).slice().sort((a,b)=>(b.power||0)-(a.power||0))[0]; if(mv) abSay(m, `<span class="sys">${who(m)} 預知了 ${esc(mv.name)}！</span>`); }
  if(k === 'download') print(statChange(m, (foe.def*(foe.defMul||1)) < (foe.sdf*(foe.sdfMul||1)) ? 'a' : 'c', 1));
  if(k === 'intrepidsword' && !m._bSword){ m._bSword = true; print(statChange(m, 'a', 1)); }
  if(k === 'dauntlessshield' && !m._bShield){ m._bShield = true; print(statChange(m, 'd', 1)); }
  if(k === 'supersweetsyrup' && !m._bSyrup){ m._bSyrup = true; print(statChange(foe, 'v', -1, true)); }
  if(k === 'screencleaner'){ const s = sides(); [s.me, s.foe].forEach(x=>{ x.scrP = x.scrS = x.scrA = 0; }); abSay(m, '<span class="sys">光牆和反射壁都消失了！</span>'); }
  if(k === 'trace' && foe.ab && !['trace','imposter','multitype','rkssystem','stancechange','schooling','disguise','iceface','commander','zerotohero'].includes(foe.ab)){ saveAb(m); m.ab = foe.ab; abSay(m, `<span class="sys">${who(m)} 複製了 ${who(foe)} 的特性：${esc(abName(m))}！</span>`); abOnEntry(m, foe); }
  if(k === 'imposter' && !m._tf){ runFx(m, foe, {fx:'transform', cls:2}, ['transform'], {status:true}); }
  if(k === 'mimicry'){ const t = {e:'電', g:'草', m:'妖精', p:'超能力'}[terrain()]; if(t){ m._types = [t]; abSay(m, `<span class="sys">${who(m)} 變成了${t}屬性！</span>`); } }
  if(k === 'windrider' && sideOf(m).tailw) print(statChange(m, 'a', 1));
}
// 威嚇（原本在 onEntry）：被擋下的特性
function intimidateBlocked(foe){
  if(['innerfocus','owntempo','oblivious','scrappy'].some(k=>hasAb(foe,k))) return `${abTag(foe)}<span class="sys">${who(foe)} 不受威嚇影響！</span>`;
  if(hasAb(foe,'guarddog')){ return statChange(foe, 'a', 1); }
  return '';
}

/* ---------- 能力值、速度 ---------- */
// 攻擊方／防禦方的能力倍率（k：atk/def/spa/sdf）
function abStatMul(m, k, foe){
  let x = 1;
  if(!m || m._noab) return 1;
  const w = battleWeather(), t = terrain(), hpLow = m.hp*2 <= m.maxhp;
  if(k === 'atk'){
    if(hasAb(m,'hugepower') || hasAb(m,'purepower')) x *= 2;
    if(hasAb(m,'hustle')) x *= 1.5;
    if(hasAb(m,'gorillatactics')) x *= 1.5;
    if(hasAb(m,'defeatist') && hpLow) x *= 0.5;
    if(hasAb(m,'slowstart') && (m._turnsIn||0) < 5) x *= 0.5;
    if(hasAb(m,'orichalcumpulse') && w === 'sun') x *= 4/3;
    if(hasAb(m,'flowergift') && w === 'sun') x *= 1.5;
    if(fieldHasAb('tabletsofruin', m)) x *= 0.75;
  }
  if(k === 'spa'){
    if(hasAb(m,'solarpower') && w === 'sun') x *= 1.5;
    if(hasAb(m,'defeatist') && hpLow) x *= 0.5;
    if(hasAb(m,'hadronengine') && t === 'e') x *= 4/3;
    if(fieldHasAb('vesselofruin', m)) x *= 0.75;
  }
  if(k === 'def'){
    if(hasAb(m,'marvelscale') && m.status) x *= 1.5;
    if(hasAb(m,'grasspelt') && t === 'g') x *= 1.5;
    if(hasAb(m,'furcoat')) x *= 2;
    if(fieldHasAb('swordofruin', m)) x *= 0.75;
  }
  if(k === 'sdf'){
    if(fieldHasAb('beadsofruin', m)) x *= 0.75;
    if(hasAb(m,'flowergift') && w === 'sun') x *= 1.5;
  }
  const best = protoStat(m);
  if(best && best === k) x *= 1.3;
  return x;
}
// 古代活性／夸克充能：大晴天／電氣場地時，最高的能力提高
function protoStat(m){
  if(!((hasAb(m,'protosynthesis') && battleWeather() === 'sun') || (hasAb(m,'quarkdrive') && terrain() === 'e'))) return '';
  const ks = ['atk','def','spa','sdf','spd']; let b = 'atk';
  ks.forEach(k=>{ if((m[k]||0) > (m[b]||0)) b = k; });
  return b;
}
function abSpdMul(m){
  if(!m || m._noab) return 1;
  let x = 1;
  if(hasAb(m,'quickfeet') && m.status) x *= 1.5;
  if(hasAb(m,'surgesurfer') && terrain() === 'e') x *= 2;
  if(hasAb(m,'unburden') && m.held && (m._bBerry || m._bSash || m._bGem || m._bHerb || m._bBalloon || m._knock)) x *= 2;
  if(hasAb(m,'slowstart') && (m._turnsIn||0) < 5) x *= 0.5;
  if(protoStat(m) === 'spd') x *= 1.5;
  return x;
}

/* ---------- 先制度 ---------- */
function abPriority(m, mv, foe){
  if(!m || !mv || m._noab) return 0;
  if(hasAb(m,'prankster') && mv.cls === 2) return 1;
  if(hasAb(m,'galewings') && mv.type === '飛行' && m.hp >= m.maxhp) return 1;
  if(hasAb(m,'triage') && (mvFlag(mv,'heal') || fxList(mv).some(c=>/^dr\d/.test(c)))) return 3;
  return 0;
}
// 同一先制度裡：慢出／菌絲之力最後、速擊 30% 先動
function abOrderBias(m, mv){
  if(!m || m._noab) return 0;
  if(hasAb(m,'stall') || (hasAb(m,'myceliummight') && mv && mv.cls === 2)) return -1;
  if(hasAb(m,'quickdraw') && mv && mv.cls !== 2 && Math.random() < 0.3){ abSay(m, `<span class="good">${who(m)} 搶先行動了！</span>`); return 1; }
  return 0;
}

/* ---------- 命中、迴避 ---------- */
function abAccMul(att, def, mv){
  let x = 1;
  if(hasAb(att,'compoundeyes')) x *= 1.3;
  if(hasAb(att,'victorystar')) x *= 1.1;
  if(hasAb(att,'hustle') && mv.cls === 0) x *= 0.8;
  const w = battleWeather();
  if(dAb(att, def,'sandveil') && w === 'sand') x /= 1.25;
  if(dAb(att, def,'snowcloak') && w === 'snow') x /= 1.25;
  if(dAb(att, def,'tangledfeet') && def._cnf > 0) x /= 2;
  return x;
}
function abNoGuard(att, def){ return hasAb(att,'noguard') || hasAb(def,'noguard'); }

/* ---------- 招式無效（吸收、浮游、隔音……）回傳訊息 ---------- */
function abImmune(att, def, mv){
  if(!def || att === def || mv.struggle) return '';
  const t = mv.type, tag = abTag(def);
  const up = (k, n, txt) => { const s = statChange(def, k, n); return `${tag}${who(def)} ${txt}！` + (s ? '<br>' + s : ''); };
  const heal = (n, txt) => { const h = Math.min(def.maxhp - def.hp, Math.max(1, Math.floor(def.maxhp*n))); def.hp += h; return `${tag}${who(def)} ${txt}${h > 0 ? `，回復了 ${h} 點 HP` : ''}！`; };
  if(dAb(att, def,'wonderguard') && mv.cls !== 2 && moveEff(mv, def) < 2) return `${tag}${who(def)} 的神奇守護擋下了招式！`;
  if(dAb(att, def,'soundproof') && mvFlag(mv,'sound')) return `${tag}${who(def)} 聽不到聲音！`;
  if(dAb(att, def,'bulletproof') && mvFlag(mv,'ball')) return `${tag}${who(def)} 擋下了球彈類招式！`;
  if(dAb(att, def,'overcoat') && mvFlag(mv,'powder')) return `${tag}${who(def)} 擋下了粉末！`;
  if((dAb(att, def,'goodasgold')) && mv.cls === 2 && !mv.self) return `${tag}${who(def)} 的黃金之軀擋下了變化招！`;
  if((dAb(att, def,'armortail') || dAb(att, def,'queenlymajesty') || dAb(att, def,'dazzling')) && (mv._pri ?? mv.pri) > 0 && !mv.self) return `${tag}${who(def)} 讓對方無法使出先制招！`;
  if(mv.cls === 2) return '';
  if(t === '電'){
    if(dAb(att, def,'voltabsorb')) return heal(1/4, '吸收了電');
    if(dAb(att, def,'lightningrod')) return up('c', 1, '把電引過來了');
    if(dAb(att, def,'motordrive')) return up('s', 1, '把電轉成了動力');
  }
  if(t === '水'){
    if(dAb(att, def,'waterabsorb') || dAb(att, def,'dryskin')) return heal(1/4, '吸收了水');
    if(dAb(att, def,'stormdrain')) return up('c', 1, '把水引過來了');
  }
  if(t === '草' && dAb(att, def,'sapsipper')) return up('a', 1, '吃下了草');
  if(t === '火'){
    if(dAb(att, def,'flashfire')){ def._bFF = true; return `${tag}${who(def)} 吸收了火焰，火屬性招式的威力提升了！`; }
    if(dAb(att, def,'wellbakedbody')) return up('d', 2, '被烤得更硬了');
  }
  if(t === '地面' && dAb(att, def,'eartheater')) return heal(1/4, '吃下了泥土');
  if(t === '地面' && dAb(att, def,'levitate') && !bf().grav) return `${tag}${who(def)} 浮在空中，地面屬性招式沒有效果！`;
  if(dAb(att, def,'windrider') && mvFlag(mv,'wind')) return up('a', 1, '乘著風');
  return '';
}
function abStatusMoveImmune(att, def, mv){
  if(!def || att === def || mv.self) return '';
  if(dAb(att, def,'magicbounce') && !def._bounced){ return 'bounce'; }
  if(hasAb(att,'prankster') && typesOf(def).includes('惡')) return `對 ${who(def)} 沒有效果……`;
  if(dAb(att, def,'aromaveil') && fxList(mv).some(c=>['taunt','encore','disable','torment','hblock','attract'].includes(c))) return `${abTag(def)}${who(def)} 受到芳香幕保護！`;
  if(dAb(att, def,'oblivious') && fxList(mv).some(c=>['taunt','attract'].includes(c))) return `${abTag(def)}${who(def)} 沒有注意到！`;
  if((dAb(att, def,'suctioncups') || dAb(att, def,'guarddog')) && hasFx(mv,'roar')) return `${abTag(def)}${who(def)} 緊緊吸住了地面！`;
  if(dAb(att, def,'stickyhold') && fxList(mv).some(c=>['trick','knock'].includes(c))) return `${abTag(def)}${who(def)} 的道具黏得緊緊的！`;
  return '';
}

/* ---------- 異常狀態免疫 ---------- */
function abStatusBlock(m, kind, src){
  if(!m || m._noab) return false;
  const at = src && src !== m ? src : null;
  const h = k => at ? dAb(at, m, k) : hasAb(m, k);
  if(h('comatose') || h('purifyingsalt')) return true;
  if(h('leafguard') && battleWeather() === 'sun') return true;
  if(h('flowerveil') && typesOf(m).includes('草')) return true;
  if(kind === 'sleep' && (h('insomnia') || h('vitalspirit') || h('sweetveil'))) return true;
  if(kind === 'paralyze' && h('limber')) return true;
  if((kind === 'poison' || kind === 'toxic') && (h('immunity') || h('pastelveil'))) return true;
  if(kind === 'burn' && (h('waterveil') || h('waterbubble') || h('thermalexchange'))) return true;
  if(kind === 'freeze' && h('magmaarmor')) return true;
  return false;
}
// 同步：被對手弄成灼傷／中毒／麻痺，對手也一樣
function abOnStatus(m, kind, src){
  if(hasAb(m,'synchronize') && src && src !== m && ['burn','poison','toxic','paralyze'].includes(kind) && !src.status){
    const r = setStatus(src, kind === 'toxic' ? 'toxic' : kind, m, true); if(r) print(`${abTag(m)}${r}`);
  }
}

/* ---------- 能力變化：唱反調、單純、恆淨之軀……；被對手降能力時的不服輸、好勝 ---------- */
// 回傳 [調整後的 n, 擋下的訊息]
function abStatChange(m, k, n, byFoe, src){
  if(!m || m._noab) return [n, ''];
  const at = (byFoe && src) ? src : null;
  const h = key => at ? dAb(at, m, key) : hasAb(m, key);
  if(h('contrary')) n = -n;
  if(h('simple')) n *= 2;
  if(n < 0 && byFoe){
    if(h('clearbody') || h('whitesmoke') || h('fullmetalbody')) return [0, `${abTag(m)}<span class="sys">${who(m)} 的能力不會被降低！</span>`];
    if(k === 'a' && h('hypercutter')) return [0, `${abTag(m)}<span class="sys">${who(m)} 的攻擊不會被降低！</span>`];
    if(k === 'd' && h('bigpecks')) return [0, `${abTag(m)}<span class="sys">${who(m)} 的防禦不會被降低！</span>`];
    if(k === 'h' && h('keeneye')) return [0, `${abTag(m)}<span class="sys">${who(m)} 的命中率不會被降低！</span>`];
    if(h('mirrorarmor') && src && src !== m){ const t = statChange(src, k, n, false); return [0, `${abTag(m)}<span class="sys">${who(m)} 把能力變化反彈回去了！</span>` + (t ? '<br>' + t : '')]; }
  }
  return [n, ''];
}
function abAfterDrop(m, byFoe){
  if(!byFoe || !m || m.hp <= 0) return '';
  if(hasAb(m,'defiant')) return abTag(m) + statChange(m, 'a', 2);
  if(hasAb(m,'competitive')) return abTag(m) + statChange(m, 'c', 2);
  return '';
}

/* ---------- 攻擊威力 ---------- */
const SLICE_OK = mv => mvFlag(mv,'slice');
function abPowerMul(att, def, mv, e){
  let k = 1; const t = mv.type, phys = isPhys(mv);
  if(att && !att._noab){
    if(hasAb(att,'ironfist') && mvFlag(mv,'punch')) k *= 1.2;
    if(hasAb(att,'strongjaw') && mvFlag(mv,'bite')) k *= 1.5;
    if(hasAb(att,'megalauncher') && mvFlag(mv,'pulse')) k *= 1.5;
    if(hasAb(att,'sharpness') && SLICE_OK(mv)) k *= 1.5;
    if(hasAb(att,'toughclaws') && isContact(att, mv)) k *= 1.3;
    if(hasAb(att,'punkrock') && mvFlag(mv,'sound')) k *= 1.3;
    if(hasAb(att,'reckless') && (mv.recoil || fxList(mv).some(c=>/^rc\d/.test(c)))) k *= 1.2;
    if(hasAb(att,'tintedlens') && e < 1) k *= 2;
    if(hasAb(att,'analytic') && def && def._moved) k *= 1.3;
    if(hasAb(att,'sandforce') && battleWeather() === 'sand' && ['岩石','地面','鋼'].includes(t)) k *= 1.3;
    if(hasAb(att,'toxicboost') && phys && (att.status === 'poison' || att.status === 'toxic')) k *= 1.5;
    if(hasAb(att,'flareboost') && !phys && att.status === 'burn') k *= 1.5;
    if(mv._ate) k *= 1.2;
    if(hasAb(att,'steelworker') && t === '鋼') k *= 1.5;
    if(hasAb(att,'transistor') && t === '電') k *= 1.3;
    if(hasAb(att,'dragonsmaw') && t === '龍') k *= 1.5;
    if(hasAb(att,'rockypayload') && t === '岩石') k *= 1.5;
    if(hasAb(att,'waterbubble') && t === '水') k *= 2;
    if(hasAb(att,'steelyspirit') && t === '鋼') k *= 1.5;
    if(hasAb(att,'liquidvoice') && mvFlag(mv,'sound')) { /* 屬性已在 abMoveType 改成水 */ }
    if(hasAb(att,'stakeout') && def && (def._turnsIn||0) === 0) k *= 2;
    if(hasAb(att,'rivalry') && def && att.gender && def.gender) k *= att.gender === def.gender ? 1.25 : 0.75;
    if(hasAb(att,'supremeoverlord')){ const f = isFoeMon(att) ? (state.battle.foeFainted||[]).length : state.party.filter(x=>x.hp<=0).length; k *= 1 + 0.1*Math.min(5, f); }
    if(hasAb(att,'sniper') && mv._didCrit) k *= 1.5;
    if(att._charge && t === '電'){ k *= 2; delete att._charge; }
  }
  const aura = (ab, ty) => fieldHasAb(ab) && t === ty ? (fieldHasAb('aurabreak') ? 0.75 : 4/3) : 1;
  k *= aura('fairyaura', '妖精') * aura('darkaura', '惡');
  if(def && !(att && moldBreaks(att))){
    if((hasAb(def,'filter') || hasAb(def,'solidrock') || hasAb(def,'prismarmor')) && e >= 2) k *= 0.75;
    if(hasAb(def,'shadowshield') && def.hp >= def.maxhp) k *= 0.5;
    if(hasAb(def,'fluffy')){ if(isContact(att, mv)) k *= 0.5; if(t === '火') k *= 2; }
    if(hasAb(def,'icescales') && !phys) k *= 0.5;
    if(hasAb(def,'heatproof') && t === '火') k *= 0.5;
    if(hasAb(def,'waterbubble') && t === '火') k *= 0.5;
    if(hasAb(def,'dryskin') && t === '火') k *= 1.25;
    if(hasAb(def,'purifyingsalt') && t === '幽靈') k *= 0.5;
    if(hasAb(def,'punkrock') && mvFlag(mv,'sound')) k *= 0.5;
  }
  return k;
}
// 招式屬性改變（妖精皮膚類、一般皮膚、濕潤之聲）
function abMoveType(att, mv){
  if(!att || att._noab || mv.struggle || mv.cls === 2 && !hasAb(att,'normalize')) return null;
  for(const k in ATE) if(hasAb(att, k) && mv.type === '一般') return {type:ATE[k], ate:true};
  if(hasAb(att,'normalize')) return {type:'一般', ate:true};
  if(hasAb(att,'liquidvoice') && mvFlag(mv,'sound')) return {type:'水'};
  return null;
}
// 變幻自如／自由者：出招前變成招式的屬性（每次上場一次）
function abBeforeMove(att, mv){
  if((hasAb(att,'protean') || hasAb(att,'libero')) && !att._protean && !mv.struggle){
    const t = typesOf(att).filter(Boolean);
    if(!(t.length === 1 && t[0] === mv.type)){ att._types = [mv.type]; att._protean = true; abSay(att, `<span class="sys">${who(att)} 變成了${mv.type}屬性！</span>`); }
  }
  if(hasAb(att,'truant')){
    if(att._truant){ att._truant = false; abSay(att, `<span class="bad">${who(att)} 正在偷懶！</span>`); return false; }
    att._truant = true;
  }
  return true;
}

/* ---------- 會心一擊 ---------- */
function abCritStage(att, def, mv){
  let s = 0;
  if(hasAb(att,'superluck')) s++;
  if(hasAb(att,'merciless') && (def.status === 'poison' || def.status === 'toxic')) s = 3;
  return s;
}
function abCritBlocked(att, def){ return dAb(att, def,'battlearmor') || dAb(att, def,'shellarmor'); }

/* ---------- 打到之後（接觸類、被打的反應） ---------- */
function abAfterHit(att, def, mv, d, wasCrit){
  if(!att || !def || d <= 0) return;
  const contact = isContact(att, mv), dTag = abTag(def), aTag = abTag(att);
  const roll = p => Math.random() < p;
  // 被打的那一方
  if(def.hp > 0 && !def._noab){
    if(hasAb(def,'justified') && mv.type === '惡') print(dTag + statChange(def, 'a', 1));
    if(hasAb(def,'rattled') && ['蟲','幽靈','惡'].includes(mv.type)) print(dTag + statChange(def, 's', 1));
    if(hasAb(def,'stamina')) print(dTag + statChange(def, 'd', 1));
    if(hasAb(def,'weakarmor') && mv.cls === 0){ print(dTag + statChange(def, 'd', -1)); print(statChange(def, 's', 2)); }
    if(hasAb(def,'watercompaction') && mv.type === '水') print(dTag + statChange(def, 'd', 2));
    if(hasAb(def,'steamengine') && (mv.type === '水' || mv.type === '火')) print(dTag + statChange(def, 's', 6));
    if(hasAb(def,'thermalexchange') && mv.type === '火') print(dTag + statChange(def, 'a', 1));
    if(hasAb(def,'angerpoint') && wasCrit){ def.atkMul = mulOf(6); abSay(def, `<span class="good">${who(def)} 的攻擊提升到最高了！</span>`); }
    const crossed = def.hp*2 <= def.maxhp && def.hp + d > def.maxhp/2;
    if(crossed && hasAb(def,'berserk')) print(dTag + statChange(def, 'c', 1));
    if(crossed && hasAb(def,'angershell')){ ['a','c','s'].forEach(k=>print(statChange(def, k, 1))); ['d','e'].forEach(k=>print(statChange(def, k, -1))); }
    if(crossed && (hasAb(def,'emergencyexit') || hasAb(def,'wimpout'))){
      abSay(def, `<span class="sys">${who(def)} 想要逃回去！</span>`);
      const b = state.battle;
      if(isFoeMon(def) && (b.mode === 'wild' || b.mode === 'mega')) endEarly(`${who(def)} 逃走了！`);
      else if(hasBench(def)) pivotOut(def, 'pivot');
    }
    if(hasAb(def,'cottondown')) print(dTag + statChange(att, 's', -1, true));
    if(hasAb(def,'sandspit') && battleWeather() !== 'sand'){ const b = state.battle; b.weather = 'sand'; b.weatherTurns = WX_TURNS; abSay(def, `<span class="em">${WEATHER.sand.icon} 刮起了沙暴！</span>`); }
    if(hasAb(def,'seedsower') && terrain() !== 'g'){ const f = bf(); f.terrain = 'g'; f.terrTurns = 5; abSay(def, `<span class="em">腳下變成了${TERRAIN_NAME.g}！</span>`); }
    if(hasAb(def,'toxicdebris') && mv.cls === 0){ const hz = oppSide(def).hz; if((hz.tsp||0) < 2){ hz.tsp = (hz.tsp||0) + 1; abSay(def, '<span class="em">毒菱散落在對手腳下！</span>'); } }
    if((hasAb(def,'windpower') && mvFlag(mv,'wind')) || hasAb(def,'electromorphosis')){ def._charge = true; abSay(def, `<span class="good">${who(def)} 充電了！</span>`); }
    if(hasAb(def,'colorchange') && !typesOf(def).includes(mv.type)){ def._types = [mv.type]; abSay(def, `<span class="sys">${who(def)} 變成了${mv.type}屬性！</span>`); }
    if(hasAb(def,'cursedbody') && roll(0.3) && !att._dis && att.hp > 0){ att._dis = {name:mv.name, n:4}; abSay(def, `<span class="bad">${who(att)} 的 ${esc(mv.name)} 被封住了！</span>`); }
  }
  if(contact && att.hp > 0 && !def._noab){
    if((hasAb(def,'roughskin') || hasAb(def,'ironbarbs')) && !hasAb(att,'magicguard')){ const l = Math.max(1, Math.floor(att.maxhp/8)); att.hp = Math.max(0, att.hp - l); abSay(def, `<span class="bad">${who(att)} 受到了 ${l} 點傷害！</span>`); }
    if((hasAb(def,'gooey') || hasAb(def,'tanglinghair'))) print(dTag + statChange(att, 's', -1, true));
    if(hasAb(def,'effectspore') && roll(0.3) && !typesOf(att).includes('草') && !hasAb(att,'overcoat')){ const r = setStatus(att, ['poison','paralyze','sleep'][Math.floor(Math.random()*3)], def, true); if(r) print(dTag + r); }
    if(hasAb(def,'cutecharm') && roll(0.3) && genderOpp(att, def) && !att._attr){ att._attr = def; abSay(def, `<span class="bad">${who(att)} 著迷了！</span>`); }
    if(hasAb(def,'perishbody') && !att._perish){ att._perish = 4; if(!def._perish) def._perish = 4; abSay(def, '<span class="bad">雙方都聽到了滅亡之歌！</span>'); }
    if((hasAb(def,'mummy') || hasAb(def,'lingeringaroma')) && att.ab !== def.ab){ saveAb(att); att.ab = def.ab; abSay(def, `<span class="sys">${who(att)} 的特性變成了 ${esc(abName(att))}！</span>`); }
    if(hasAb(def,'wanderingspirit')){ saveAb(att); saveAb(def); const t = att.ab; att.ab = def.ab; def.ab = t; abSay(att, `<span class="sys">${who(att)} 和 ${who(def)} 交換了特性！</span>`); }
    if(hasAb(def,'pickpocket') && !def.held && att.held && !hasAb(att,'stickyhold')){ saveHeld(att); saveHeld(def); def.held = att.held; att.held = null; abSay(def, `<span class="sys">${who(def)} 偷走了 ${who(att)} 的道具！</span>`); }
  }
  // 攻擊的那一方
  if(att.hp > 0 && !att._noab && def.hp > 0){
    if(contact && hasAb(att,'poisontouch') && roll(0.3)){ const r = setStatus(def, 'poison', att, true); if(r) print(aTag + r); }
    if(hasAb(att,'toxicchain') && roll(0.3)){ const r = setStatus(def, 'toxic', att, true); if(r) print(aTag + r); }
    if(hasAb(att,'stench') && roll(0.1) && !def._moved) def._flinch = true;
    if(hasAb(att,'magician') && !att.held && def.held && !hasAb(def,'stickyhold')){ saveHeld(att); saveHeld(def); att.held = def.held; def.held = null; abSay(att, `<span class="sys">${who(att)} 偷走了 ${who(def)} 的道具！</span>`); }
  }
  // 打倒的時候
  if(def.hp <= 0 && contact && att.hp > 0 && hasAb(def,'aftermath') && !hasAb(att,'magicguard') && !fieldHasAb('damp')){ const l = Math.max(1, Math.floor(att.maxhp/4)); att.hp = Math.max(0, att.hp - l); abSay(def, `<span class="bad">${who(att)} 被爆炸波及，受到 ${l} 點傷害！</span>`); }
  if(def.hp <= 0 && hasAb(def,'innardsout') && att.hp > 0){ const l = Math.min(att.hp, d); att.hp -= l; abSay(def, `<span class="bad">${who(att)} 受到了 ${l} 點傷害！</span>`); }
}
function abOnKo(att, def){
  if(!att || att.hp <= 0 || att._noab) return;
  if(hasAb(att,'beastboost')){ const ks = [['atk','a'],['def','d'],['spa','c'],['sdf','e'],['spd','s']]; let b = ks[0]; ks.forEach(x=>{ if((att[x[0]]||0) > (att[b[0]]||0)) b = x; }); print(abTag(att) + statChange(att, b[1], 1)); }
  if(hasAb(att,'chillingneigh') || hasAb(att,'asoneglastrier')) print(abTag(att) + statChange(att, 'a', 1));
  if(hasAb(att,'grimneigh') || hasAb(att,'asonespectrier')) print(abTag(att) + statChange(att, 'c', 1));
  onField().forEach(m=>{ if(m !== def && hasAb(m,'soulheart')) print(abTag(m) + statChange(m, 'c', 1)); });
}

/* ---------- 回合結束 ---------- */
function abEndTurn(m){
  if(!m || m.hp <= 0 || m._noab || !state.battle) return;
  const w = battleWeather(), heal = (n, t) => { if(m.hp >= m.maxhp || m._hblk) return; const h = Math.min(m.maxhp - m.hp, Math.max(1, Math.floor(m.maxhp*n))); m.hp += h; abSay(m, `<span class="good">${t}（+${h}）</span>`); };
  const lose = (n, t) => { if(hasAb(m,'magicguard')) return; const l = Math.max(1, Math.floor(m.maxhp*n)); m.hp = Math.max(0, m.hp - l); abSay(m, `<span class="bad">${t}（-${l}）</span>`); };
  if(hasAb(m,'shedskin') && m.status && Math.random() < 1/3){ m.status = null; abSay(m, `<span class="good">${who(m)} 蛻皮治好了異常狀態！</span>`); }
  if(hasAb(m,'hydration') && m.status && w === 'rain'){ m.status = null; abSay(m, `<span class="good">${who(m)} 被雨水治好了異常狀態！</span>`); }
  if(hasAb(m,'raindish') && w === 'rain') heal(1/16, `${who(m)} 被雨水滋潤了。`);
  if(hasAb(m,'icebody') && w === 'snow') heal(1/16, `${who(m)} 吸收了冰雪。`);
  if(hasAb(m,'dryskin')){ if(w === 'rain') heal(1/8, `${who(m)} 被雨水滋潤了。`); else if(w === 'sun') lose(1/8, `${who(m)} 被太陽曬傷了。`); }
  if(hasAb(m,'solarpower') && w === 'sun') lose(1/8, `${who(m)} 被太陽曬傷了。`);
  if(hasAb(m,'moody')){
    const ks = ['a','d','c','e','s'], up = ks.filter(k=>stageOf(m[ST_KEY[k]]) < 6);
    if(up.length){ const u = up[Math.floor(Math.random()*up.length)]; print(abTag(m) + statChange(m, u, 2)); const dn = ks.filter(k=>k !== u && stageOf(m[ST_KEY[k]]) > -6); if(dn.length) print(statChange(m, dn[Math.floor(Math.random()*dn.length)], -1)); }
  }
  if((hasAb(m,'harvest') && (w === 'sun' || Math.random() < 0.5)) || (hasAb(m,'cudchew') && m._bBerry && !m._cud)){
    if(m._bBerry && heldIt(m) && heldIt(m).cat === 'berry'){ delete m._bBerry; if(hasAb(m,'cudchew')) m._cud = true; abSay(m, `<span class="good">${who(m)} 的${esc(heldName(m))}又長回來了！</span>`); }
  }
  const foe = activeFoeOf(m);
  if(hasAb(m,'baddreams') && foe && foe.status === 'sleep') { const l = Math.max(1, Math.floor(foe.maxhp/8)); foe.hp = Math.max(0, foe.hp - l); abSay(m, `<span class="bad">${who(foe)} 被惡夢折磨！（-${l}）</span>`); }
}
// 中毒療癒：中毒時回血而不是扣血（tickStatus 呼叫）
function abPoisonHeal(m){
  if(!hasAb(m,'poisonheal') || !(m.status === 'poison' || m.status === 'toxic')) return '';
  if(m.hp >= m.maxhp || m._hblk) return ' ';
  const h = Math.min(m.maxhp - m.hp, Math.max(1, Math.floor(m.maxhp/8))); m.hp += h;
  return `${abTag(m)}<span class="good">${nm(m)} 靠毒回復了 ${h} 點 HP。</span>`;
}
function abSwitchOut(m){
  if(!m || m._noab) return;
  if(hasAb(m,'naturalcure') && m.status){ m.status = null; print(`${abTag(m)}<span class="good">${nm(m)} 的異常狀態治好了。</span>`); }
}
// 換人、逃跑：踩影、沙穴、磁力
function abTrapped(m){
  const foe = state.battle && activeFoeOf(m);
  if(!foe || foe.hp <= 0 || typesOf(m).includes('幽靈') || hasAb(m,'runaway')) return '';
  if(hasAb(foe,'shadowtag') && !hasAb(m,'shadowtag')) return '被踩住影子';
  if(hasAb(foe,'arenatrap') && grounded(m)) return '陷進沙穴';
  if(hasAb(foe,'magnetpull') && typesOf(m).includes('鋼')) return '被磁力吸住';
  return '';
}
// 畫皮／結凍頭：第一次被打不受傷
function abDisguise(att, def, mv, d){
  if(d <= 0 || def._noab || (att && moldBreaks(att))) return [d, ''];
  if(hasAb(def,'disguise') && !def._bDisguise){ def._bDisguise = true; const l = Math.floor(def.maxhp/8); def.hp = Math.max(1, def.hp - l); return [0, `${abTag(def)}<span class="sys">${who(def)} 的畫皮被拆穿了！</span>`]; }
  if(hasAb(def,'iceface') && !def._bIce && mv.cls === 0){ def._bIce = true; return [0, `${abTag(def)}<span class="sys">${who(def)} 的冰臉碎掉了！</span>`]; }
  return [d, ''];
}
// 緊張感：對手不能吃樹果
function berryBlocked(m){ const foe = state.battle && activeFoeOf(m); return !!foe && foe.hp > 0 && (hasAb(foe,'unnerve') || hasAb(foe,'asoneglastrier') || hasAb(foe,'asonespectrier')); }
// 化學變化氣體：場上有的話其他特性都沒效
function abSuppressed(m){
  const b = state.battle; if(!b || m.ab === 'neutralizinggas') return false;
  const o = m === b.wild ? state.party[b.playerIdx] : (m === state.party[b.playerIdx] ? b.wild : null);
  return !!o && o.hp > 0 && !o._noab && o.ab === 'neutralizinggas';
}

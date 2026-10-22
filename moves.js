/* ========== 招式系統（本傳招式、學習表、招式效果、場地狀態） ==========
   資料在 moves-data.js（MOVE_DB / LEARNSET / TM_LIST / DEX_WEIGHT，自動產生）。
   寶可夢身上：m.moves = 上場的 4 招（招式物件），m.xm = 額外學會的招式 id（招式學習器、進化前的招式、寫生），
   升級學會的招式不另外存，依等級從學習表算（knownMoves）。
   招式物件：{id, name, type, cls(0物理 1特殊 2變化), power, pp, maxpp, acc(0=必中), pri, fx(效果碼), self(不會被守住擋)}
   效果碼說明見產生腳本，各效果的處理在本檔 runFx / dmgPower / 各個 case。 */

const MV_CLS_NAME = ['物理', '特殊', '變化'];
function makeMove(id, ppUp){
  const d = MOVE_DB[id]; if(!d) return null;
  const mx = d[4] + Math.floor(d[4]*(ppUp||0)/5);   // PP 提升劑
  const o = {id:+id, name:d[0], type:d[1], cls:d[2], power:d[3], pp:mx, maxpp:mx, acc:d[5], pri:d[6], fx:d[7]||'', self:!!d[8], flags:d[9]||0};
  if(ppUp) o.ppUp = ppUp;
  return o;
}
// 存檔讀回來時：用最新資料重建，PP 保留
function refreshMove(mv){
  if(!mv || !mv.id || !MOVE_DB[mv.id]) return mv;
  const n = makeMove(mv.id, mv.ppUp);
  if(typeof mv.pp === 'number') n.pp = Math.max(0, Math.min(n.maxpp, mv.pp));
  return n;
}
const fxList = mv => (mv && mv.fx) ? mv.fx.split(',') : [];
function hasFx(mv, code){ return !!mv && !!mv.fx && fxList(mv).includes(code); }
function fxStart(mv, pre){ return fxList(mv).find(x=>x.startsWith(pre)) || ''; }
function isPhys(mv){ return mv ? (mv.cls === 0 || (mv.cls === undefined && PHYS_MOVES.has(mv.name))) : false; }
function isStatusMove(mv){ return !!mv && mv.cls === 2; }

/* ---------- 學習表 ---------- */
const _lsCache = {};
function learnset(dex){
  if(_lsCache[dex]) return _lsCache[dex];
  const raw = (typeof LEARNSET !== 'undefined' && LEARNSET[dex]) || '';
  const [lv, tm] = raw.split('|');
  const list = (lv || '').split(' ').filter(Boolean).map(s=>{ const [l, m] = s.split('.'); return [parseInt(l,36), parseInt(m,36)]; }).filter(([l,m])=>MOVE_DB[m]);
  return (_lsCache[dex] = {lv:list, tm:tm||''});
}
function tmCompat(dex, tmIdx){ const h = learnset(dex).tm, c = h[tmIdx>>2]; return c ? ((parseInt(c,16) >> (tmIdx&3)) & 1) === 1 : false; }
function levelMoves(dex, level){
  const out = [];
  learnset(dex).lv.forEach(([l, id])=>{ if(l <= level && !out.includes(id)) out.push(id); });
  return out;
}
function knownMoves(m){
  const out = levelMoves(m.dex, m.level);
  (m.xm||[]).forEach(id=>{ if(MOVE_DB[id] && !out.includes(id)) out.push(id); });
  (m.moves||[]).forEach(mv=>{ if(mv && mv.id && !out.includes(mv.id)) out.push(mv.id); });
  return out;
}
// 預設招式：學習表裡目前等級最後學會的 4 招（跟本傳一樣），但至少放 2 招攻擊招；進化招式一定排進去
function defaultMoveIds(dex, level){
  const all = [];
  // 進化時學的招（等級 0，常常是專屬招）當成最新學會的
  learnset(dex).lv.slice().sort((a,b)=>(a[0]||999)-(b[0]||999)).forEach(([l,id])=>{ if(l <= level){ const i = all.indexOf(id); if(i >= 0) all.splice(i,1); all.push(id); } });
  let pick = all.slice(-4);
  const atk = id => MOVE_DB[id][2] !== 2;
  let need = Math.min(2, all.filter(atk).length) - pick.filter(atk).length;
  if(need > 0){
    const extra = all.filter(id=>atk(id) && !pick.includes(id)).slice(-need);
    extra.forEach(id=>{ const j = pick.findIndex(x=>!atk(x)); if(j >= 0) pick[j] = id; });
  }
  if(!pick.length) pick = [33];   // 學習表是空的（不應該發生）：撞擊
  return pick;
}
function defaultMoves(dex, level){ return defaultMoveIds(dex, level).map(makeMove).filter(Boolean); }
// 升級時學會新招（印出訊息；招式不滿 4 招就直接放上去）
function learnOnLevel(p, quiet){
  const ids = learnset(p.dex).lv.filter(([l])=>l === p.level).map(([,id])=>id);
  learnNew(p, ids, quiet);
}
function learnNew(p, ids, quiet){
  const have = new Set((p.moves||[]).map(mv=>mv.id));
  [...new Set(ids)].forEach(id=>{
    if(have.has(id) || !MOVE_DB[id]) return;
    const name = MOVE_DB[id][0];
    if(p.moves.length < 4){ p.moves.push(makeMove(id)); have.add(id); if(!quiet) print(`<span class="good">${nm(p)} 學會了「${esc(name)}」！</span>`); }
    else if(!quiet) print(`<span class="good">${nm(p)} 學會了「${esc(name)}」！</span><span class="sys">（招式已滿 4 招，可到隊伍 → 寶可夢 → ⚔️ 招式 換上）</span>`);
  });
}
// 進化：舊形態學得會、新形態學習表沒有的招式記到 xm，再學新形態的進化招式（等級 0）
function learnOnEvolve(p, oldDex){
  const keep = levelMoves(oldDex, p.level).filter(id=>!levelMoves(p.dex, p.level).includes(id));
  p.xm = [...new Set([...(p.xm||[]), ...keep])];
  learnNew(p, learnset(p.dex).lv.filter(([l])=>l === 0 || l === p.level).map(([,id])=>id));
}
// 舊存檔：招式沒有 id 的，換成這隻目前等級的預設招式
function migrateMoves(m){
  if(!Array.isArray(m.moves) || !m.moves.length || m.moves.some(mv=>!mv || !mv.id)){
    m.moves = defaultMoves(m.dex, m.level);
  } else m.moves = m.moves.map(refreshMove).filter(Boolean).slice(0, 4);
  if(!Array.isArray(m.xm)) m.xm = [];
  m.xm = m.xm.filter(id=>MOVE_DB[id]);
  if(!(m.friend >= 0)) m.friend = 70;
}

/* ---------- 招式說明 ---------- */
const ST_KEY = {a:'atkMul', d:'defMul', c:'spaMul', e:'sdfMul', s:'spdMul', h:'accMul', v:'evaMul'};
const ST_NAME = {a:'攻擊', d:'防禦', c:'特攻', e:'特防', s:'速度', h:'命中率', v:'閃避率'};
const AIL_NAME = {par:'麻痺', brn:'灼傷', psn:'中毒', tox:'劇毒', slp:'睡眠', frz:'冰凍', cnf:'混亂', tri:'灼傷／麻痺／冰凍', rnd:'中毒／麻痺／睡眠'};
const SP_DESC = {
  'wx:sun':'天氣變成大晴天（5 回合）', 'wx:rain':'天氣變成下雨（5 回合）', 'wx:sand':'天氣變成沙暴（5 回合）', 'wx:snow':'天氣變成下雪（5 回合）',
  'tr:e':'電氣場地（5 回合，電招 ×1.3、不會睡著）', 'tr:g':'青草場地（5 回合，草招 ×1.3、每回合回血）', 'tr:m':'薄霧場地（5 回合，龍招減半、不會異常）', 'tr:p':'精神場地（5 回合，超能力招 ×1.3、擋先制招）',
  troom:'戲法空間：5 回合內速度慢的先動', mroom:'魔法空間：5 回合內攜帶道具沒有效果', wroom:'奇妙空間：5 回合內防禦和特防對調', grav:'重力：5 回合內命中率提高、飛行的也打得到地面招',
  'scr:p':'反射壁：5 回合內我方受到的物理傷害減半', 'scr:s':'光牆：5 回合內我方受到的特殊傷害減半', 'scr:a':'極光幕：下雪時才能用，5 回合內物理特殊傷害都減半',
  mist:'白霧：5 回合內能力不會被降低', safeg:'神秘守護：5 回合內不會陷入異常狀態', tailw:'順風：4 回合內我方速度 ×2', luck:'幸運咒語：5 回合內對方打不出會心一擊', court:'對調雙方場地上的效果',
  'hz:spk':'撒菱：對方換上場時受到傷害（最多 3 層）', 'hz:tsp':'毒菱：對方換上場時中毒（2 層變劇毒）', 'hz:rock':'隱形岩：對方換上場時受到岩石傷害', 'hz:web':'黏黏網：對方換上場時速度下降',
  defog:'清除雙方的撒菱類、對方的光牆反射壁', tidy:'清除雙方的撒菱類和替身', spin:'清除我方的撒菱類、束縛、寄生種子',
  prot:'這回合不會受到攻擊（連續使用容易失敗）', 'prot:kng':'守住；碰到的物理攻擊者攻擊下降', 'prot:spk':'守住；碰到的物理攻擊者受到傷害', 'prot:bnk':'守住；碰到的物理攻擊者中毒',
  'prot:obs':'守住；碰到的物理攻擊者防禦大幅下降', 'prot:brn':'守住；碰到的物理攻擊者灼傷', 'prot:slk':'守住；碰到的物理攻擊者速度下降', 'prot:mat':'出場第一回合才能用，擋下攻擊招',
  'prot:cft':'擋下對方的變化招', 'prot:qck':'擋下對方的先制招', endure:'這回合至少留下 1 HP',
  sub:'用 1/4 HP 做出替身', shedtail:'用一半 HP 做出替身，換下場把替身交給下一隻', baton:'換下場，能力變化交給下一隻', tport:'野生戰逃走；否則換下場', roar:'把對方吹走（野生戰會結束對戰）',
  pivot:'攻擊後換下場', drag:'攻擊後把對方換掉（野生戰會結束對戰）',
  seed:'寄生種子：每回合吸取對方 1/8 HP', nmare:'睡著的對方每回合損失 1/4 HP', curse:'幽靈：用一半 HP 詛咒對方；其他：速度↓ 攻擊↑ 防禦↑', perish:'聽到的雙方 3 回合後倒下',
  dbond:'下次行動前倒下的話，打倒自己的也一起倒下', yawn:'下回合結束時對方睡著', grudge:'被打倒時，對方那招 PP 歸零', ingrain:'每回合回 1/16 HP，不能換下場', aring:'每回合回 1/16 HP',
  wish:'下回合結束時回復一半 HP', hwish:'自己倒下，下一隻上場的回滿 HP 和狀態', attract:'讓對方著迷，一半機率無法行動', saltcure:'對方每回合損失 1/8 HP（水、鋼 1/4）',
  block:'對方不能逃走或換下場', octo:'對方不能逃走，每回合防禦和特防下降', noflee:'自己不能逃走或換下場',
  ssap:'回復對方攻擊數值的 HP，再讓對方攻擊下降', purify:'治好對方的異常狀態，自己回復一半 HP', psplit:'雙方 HP 平分', revive:'讓一隻倒下的隊員復活（一半 HP）', cure:'治好自己的異常狀態', pcure:'治好全隊的異常狀態',
  haze:'雙方能力變化全部歸零', psychup:'複製對方的能力變化', 'swp:ac':'和對方交換攻擊、特攻的變化', 'swp:de':'和對方交換防禦、特防的變化', 'swp:s':'和對方交換速度數值', 'swp:all':'和對方交換所有能力變化',
  'split:de':'和對方平分防禦、特防', 'split:ac':'和對方平分攻擊、特攻', ptrick:'攻擊和防禦數值對調', invert:'對方的能力變化正負顛倒', acup:'隨機一項能力大幅提升',
  bdrum:'用一半 HP，攻擊提升到最高', focus:'接下來容易打出會心一擊', lfocus:'下一招必定會心一擊', lockon:'下一招必定命中', fillet:'用一半 HP，攻擊、特攻、速度大幅提升',
  stock:'蓄力（最多 3 次），防禦、特防提升', spit:'放出蓄力，蓄越多越強', swallow:'吞下蓄力回復 HP', memento:'自己倒下，對方攻擊、特攻大幅下降', foresight:'一般、格鬥招打得到幽靈',
  splash:'什麼也不會發生', fshield:'場上草屬性寶可夢防禦提升', 'sport:電':'5 回合內電招威力變弱', 'sport:火':'5 回合內火招威力變弱', hlfoe50:'讓對方回復一半 HP',
  disable:'對方上一招 4 回合內不能用', spite:'對方上一招 PP 減 4', encore:'對方 3 回合只能用上一招', taunt:'對方 3 回合不能用變化招', torment:'對方不能連續用同一招', imprison:'自己會的招，對方都不能用',
  hblock:'對方 5 回合不能回復 HP', embargo:'對方 5 回合不能用攜帶道具', gastro:'對方的特性失效', 'ab:insomnia':'對方的特性變成不眠', 'ab:simple':'對方的特性變成單純', abgive:'把自己的特性給對方',
  abswap:'和對方交換特性', abcopy:'複製對方的特性', trick:'和對方交換攜帶道具（對戰結束還原）', bestow:'把攜帶道具交給對方（對戰結束還原）', recycle:'用掉的道具效果可以再用一次', teatime:'雙方吃下樹果',
  knock:'打落對方的攜帶道具（對戰中失效）', mrise:'5 回合不會被地面招打中', tkin:'對方 3 回合浮起來、招式必中', 'type:水':'對方變成水屬性', 'type:超能力':'對方變成超能力屬性',
  'addtype:草':'對方多一個草屬性', 'addtype:幽靈':'對方多一個幽靈屬性', conv:'自己變成第一招的屬性', conv2:'變成能抵抗對方上一招的屬性', camo:'依場地改變自己的屬性', rtype:'變成跟對方一樣的屬性',
  electrify:'對方這回合的招式變成電屬性', ion:'這回合一般招變成電屬性', powder:'對方這回合用火招會爆炸', pshift:'把自己的異常狀態轉給對方', mcoat:'把對方的變化招反彈回去', snatch:'搶走對方提升自己的變化招',
  transform:'變身成對方', mimic:'學對方上一招（對戰中）', sketch:'永久學會對方上一招', metro:'隨機使出一招', mirror:'使出對方上一招', copycat:'使出場上最後一招', stalk:'睡著時隨機使出自己的招',
  assist:'使出隊友的一招', npower:'依場地使出不同的招', mefirst:'搶先使出對方要用的攻擊招（威力 ×1.5）',
  'fix:20':'固定 20 點傷害', 'fix:40':'固定 40 點傷害', lvl:'傷害等於自己的等級', psywave:'傷害為等級的 0.5~1.5 倍', half:'讓對方 HP 減半', endeavor:'讓對方 HP 變得跟自己一樣', gambit:'用自己全部 HP 當傷害，自己倒下',
  wt:'對方越重威力越大', wtr:'自己比對方越重威力越大', flail:'自己 HP 越少威力越大', ret:'親密度越高威力越大', frus:'親密度越低威力越大', present:'隨機威力，也可能幫對方回血', magn:'隨機威力 10~150',
  gyro:'自己比對方越慢威力越大', eball:'自己比對方越快威力越大', trump:'PP 越少威力越大', wring:'對方 HP 越多威力越大', hpress:'對方 HP 越多威力越大', punish:'對方能力提升越多威力越大', beatup:'隊上每隻能戰鬥的都打一次',
  counter:'把這回合受到的物理傷害加倍奉還', mcoat2:'把這回合受到的特殊傷害加倍奉還', mburst:'把這回合受到的傷害 1.5 倍奉還', bide:'忍耐 2 回合，把受到的傷害加倍奉還', ragefist:'被打越多次威力越大', lastresp:'倒下的隊友越多威力越大',
  ohko:'一擊必殺（等級比對方低就沒用）', boom:'使用後自己倒下', chg:'第一回合蓄力，第二回合攻擊', solar:'大晴天時不用蓄力', rch:'下回合無法行動', future:'2 回合後才打中',
  bind:'束縛對方 4~5 回合，每回合造成傷害', brkscr:'打破對方的光牆和反射壁', psyshock:'用對方的防禦計算傷害', foul:'用對方的攻擊計算傷害', bpress:'用自己的防禦計算傷害', fswipe:'至少會讓對方留下 1 HP',
  facade:'自己異常時威力 ×2', brine:'對方 HP 一半以下時威力 ×2', hex:'對方異常時威力 ×2', hexpsn:'對方中毒時威力 ×2', sucker:'對方要用攻擊招才會成功（先制）', fakeout:'出場第一回合才能用，讓對方畏縮', fakeout0:'出場第一回合才能用',
  fpunch:'這回合被打到就會失敗', revenge:'這回合被打過威力 ×2', payback:'比對方晚行動威力 ×2', stpow:'自己能力提升越多威力越大', erupt:'自己 HP 越多威力越大', wball:'依天氣改變屬性，威力 ×2', acro:'沒帶道具時威力 ×2',
  dreameat:'只對睡著的對方有效', snore:'只能在睡著時使用', cr:'容易會心一擊', cr2:'必定會心一擊', norep:'不能連續使用', fickle:'三成機率威力 ×2', selfdmg50:'自己損失一半 HP', clrterr:'清除場地', losetype:'使用後失去電屬性',
  rest:'睡 2 回合，回滿 HP 和狀態',
};
function fxDesc(code){
  if(SP_DESC[code]) return SP_DESC[code];
  let m;
  if((m = code.match(/^h(\d+)-(\d+)$/))) return m[1] === m[2] ? `連續攻擊 ${m[1]} 次` : `連續攻擊 ${m[1]}~${m[2]} 次`;
  if((m = code.match(/^dr(\d+)$/))) return `吸取造成傷害的 ${m[1]}%`;
  if((m = code.match(/^rc(\d+)$/))) return `受到傷害的 ${m[1]}% 反作用力`;
  if((m = code.match(/^hl(\d+)$/))) return `回復最大 HP 的 ${m[1]}%`;
  if((m = code.match(/^fl(\d+)$/))) return `${m[1]}% 讓對方畏縮`;
  if((m = code.match(/^a([a-z]{3})(\d+)$/))) return (m[2] === '100' ? '讓對方' : `${m[2]}% 讓對方`) + AIL_NAME[m[1]];
  if((m = code.match(/^s([uf])([adcesvh])(-?\d+)_(\d+)$/))){
    const n = +m[3], who = m[1] === 'u' ? '自己' : '對方', amt = Math.abs(n) >= 2 ? '大幅' : '';
    return (m[4] === '100' ? '' : `${m[4]}% `) + `${who}${ST_NAME[m[2]]}${amt}${n > 0 ? '提升' : '下降'}`;
  }
  return '';
}
function moveDesc(mv){
  const parts = fxList(mv).map(fxDesc).filter(Boolean);
  if(mv.recoil) parts.push('有反作用力');
  if(mv.pri > 0) parts.push(`先制 +${mv.pri}`); else if(mv.pri < 0) parts.push(`後手 ${mv.pri}`);
  return [...new Set(parts)].join('、');
}
function moveShort(mv){   // 戰鬥按鈕上的一行小字
  const pw = mv.cls === 2 ? '變化' : (mv.power > 1 ? `威力 ${mv.power}` : '威力 —');
  const acc = mv.acc ? ` · 命中 ${mv.acc}` : '';
  const d = fxList(mv).map(fxDesc).filter(Boolean)[0];
  return `${pw}${acc}` + (d ? ` · ✦${d.length > 10 ? d.slice(0,10)+'…' : d}` : '') + (mv.recoil ? ' · ⚠反作用力' : '');
}
function moveLine(mv){   // 招式頁的完整說明
  const d = moveDesc(mv);
  return `<b>${esc(mv.name)}</b>　<span class="mvt" style="background:${TYPE_COLOR[mv.type]||'#2b3a8c'}">${mv.type}</span> ${MV_CLS_NAME[mv.cls] || ''}　` +
    `${mv.cls === 2 ? '' : `威力 ${mv.power > 1 ? mv.power : '—'}　`}命中 ${mv.acc || '必中'}　PP ${mv.maxpp}` + (d ? `<br><span class="sys">${esc(d)}</span>` : '');
}

/* ---------- 對戰中的場地／我方場地 ---------- */
function bf(){ const b = state.battle; return b ? (b.field || (b.field = {})) : {}; }
function sides(){ const b = state.battle; if(!b.side) b.side = {me:{hz:{}}, foe:{hz:{}}}; return b.side; }
function isFoeMon(m){ const b = state.battle; return !!b && (m === b.wild || (b.foes||[]).includes(m)); }
function sideOf(m){ return isFoeMon(m) ? sides().foe : sides().me; }
function oppSide(m){ return isFoeMon(m) ? sides().me : sides().foe; }
function activeFoeOf(m){ const b = state.battle; return isFoeMon(m) ? state.party[b.playerIdx] : b.wild; }
function terrain(){ return bf().terrain || ''; }
const TERRAIN_NAME = {e:'⚡電氣場地', g:'🌿青草場地', m:'🌸薄霧場地', p:'🔮精神場地'};
function grounded(m){
  if(bf().grav) return true;
  return !(typesOf(m).includes('飛行') || hasAb(m,'levitate') || (holds(m,'airballoon') && !m._bBalloon) || m._mrise || m._tkin);
}
function fieldChip(){
  const f = bf(), out = [];
  if(f.terrain) out.push(TERRAIN_NAME[f.terrain]);
  if(f.troom) out.push('戲法空間'); if(f.mroom) out.push('魔法空間'); if(f.wroom) out.push('奇妙空間'); if(f.grav) out.push('重力');
  return out.join(' ');
}
function sideChip(m){
  if(!state.battle || !state.battle.side) return '';
  const x = sideOf(m), t = [];
  if(x.scrP) t.push('反射壁'); if(x.scrS) t.push('光牆'); if(x.scrA) t.push('極光幕'); if(x.tailw) t.push('順風'); if(x.safeg) t.push('神秘守護'); if(x.mist) t.push('白霧');
  const hz = x.hz || {};
  if(hz.spk) t.push('撒菱×'+hz.spk); if(hz.tsp) t.push('毒菱×'+hz.tsp); if(hz.rock) t.push('隱形岩'); if(hz.web) t.push('黏黏網');
  return t.length ? ' · ' + t.join(' ') : '';
}
function stageOf(mul, acc){ const b = acc ? 3 : 2; mul = mul || 1; return mul >= 1 ? Math.round((mul-1)*b) : -Math.round((1/mul-1)*b); }
function mulOf(st, acc){ const b = acc ? 3 : 2; return st >= 0 ? (b+st)/b : b/(b-st); }
function stagesChip(m){
  const t = [];
  ['a','d','c','e','s','h','v'].forEach(k=>{ const s = stageOf(m[ST_KEY[k]], k==='h'||k==='v'); if(s) t.push(`${ST_NAME[k].replace('率','')}${s>0?'+':''}${s}`); });
  if(m._sub > 0) t.push('替身'); if(m._cnf > 0) t.push('混亂'); if(m._seed) t.push('寄生'); if(m._perish) t.push('滅亡' + (m._perish-1));
  return t.length ? ' · ' + t.join(' ') : '';
}
// 能力變化：k = a/d/c/e/s/h/v，n = 等級（±）；byFoe = 是對方造成的（白霧擋得住）
function statChange(m, k, n, byFoe, src){
  if(!m || m.hp <= 0 || !n) return '';
  if(byFoe && !src && state.battle) src = activeFoeOf(m);
  const [n2, blocked] = abStatChange(m, k, n, byFoe, src);   // 唱反調、單純、恆淨之軀……（abilities.js）
  if(blocked) return blocked;
  n = n2; if(!n) return '';
  if(n < 0 && byFoe && sideOf(m).mist && !(src && hasAb(src,'infiltrator'))) return `<span class="sys">${who(m)} 受到白霧保護！</span>`;
  const key = ST_KEY[k], acc = (k === 'h' || k === 'v');
  const cur = stageOf(m[key], acc), nx = Math.max(-6, Math.min(6, cur + n));
  if(nx === cur) return `<span class="sys">${who(m)} 的${ST_NAME[k]}已經無法再${n > 0 ? '提升' : '降低'}了！</span>`;
  m[key] = mulOf(nx, acc);
  const amt = Math.abs(nx - cur) >= 3 ? '極大幅' : Math.abs(nx - cur) === 2 ? '大幅' : '';
  const out = `<span class="${n > 0 ? 'good' : 'bad'}">${who(m)} 的${ST_NAME[k]}${amt}${n > 0 ? '提升' : '下降'}了！</span>`;
  if(n < 0 && byFoe){ const x = abAfterDrop(m, byFoe); return out + (x ? '<br>' + x : ''); }   // 不服輸、好勝
  if(n > 0 && !byFoe && state.battle && !m._opp){ const o = activeFoeOf(m); if(o && o !== m && hasAb(o,'opportunist') && o.hp > 0){ o._opp = true; const t = statChange(o, k, nx - cur); delete o._opp; return out + (t ? '<br>' + abTag(o) + t : ''); } }   // 跟風
  return out;
}
function resetStages(m){ Object.values(ST_KEY).forEach(k=>{ m[k] = 1; }); }

/* ---------- 異常狀態 ---------- */
const STATUS_NAME = {burn:'灼傷', poison:'中毒', toxic:'劇毒', paralyze:'麻痺', sleep:'睡眠', freeze:'冰凍'};
const AIL_KIND = {par:'paralyze', brn:'burn', psn:'poison', tox:'toxic', slp:'sleep', frz:'freeze'};
function statusMatch(st, cure){ return !!st && (st === cure || cure === 'any' || (cure === 'poison' && st === 'toxic')); }
// 嘗試讓 m 陷入 kind，成功回傳訊息；src 是造成的寶可夢（判斷神秘守護、替身）
function setStatus(m, kind, src, quiet){
  if(!m || m.hp <= 0) return '';
  const fail = t => quiet ? '' : `<span class="sys">${t}</span>`;
  if(m.status) return fail(`${who(m)} 已經處於異常狀態了。`);
  const t = typesOf(m);
  if((kind === 'burn' && t.includes('火')) || (kind === 'paralyze' && t.includes('電')) || ((kind === 'poison' || kind === 'toxic') && (t.includes('毒') || t.includes('鋼')) && !(src && hasAb(src,'corrosion'))) || (kind === 'freeze' && t.includes('冰')))
    return fail(`對 ${who(m)} 好像沒有效果……`);
  if(statusImmune(m, kind, src)) return fail(`${who(m)} 的特性讓牠不會${STATUS_NAME[kind]}。`);
  if(src && src !== m && sideOf(m).safeg) return fail(`${who(m)} 受到神秘守護的保護！`);
  if(grounded(m) && terrain() === 'm') return fail(`${who(m)} 受到薄霧場地的保護！`);
  if(kind === 'sleep' && grounded(m) && terrain() === 'e') return fail(`${who(m)} 在電氣場地上睡不著！`);
  m.status = kind;
  if(kind === 'sleep') m._slp = 2 + Math.floor(Math.random()*3);   // 1~3 回合不能動（行動時先減 1，減到 0 才醒）
  if(kind === 'toxic') m._tox = 1;
  const msg = {burn:'陷入了灼傷', poison:'中毒了', toxic:'中了劇毒', paralyze:'被麻痺了', sleep:'睡著了', freeze:'被凍住了'}[kind];
  const out = `<span class="bad">${who(m)} ${msg}！</span>`;
  if(quiet){ if(src && src !== m) setTimeout0(()=>abOnStatus(m, kind, src)); return out; }
  print(out); lumCheck(m); abOnStatus(m, kind, src);
  return '';
}
function setTimeout0(f){ f(); }
function setConfuse(m, src){
  if(!m || m.hp <= 0) return;
  if(hasAb(m,'owntempo') && !(src && src !== m && moldBreaks(src))) return print(`${abTag(m)}<span class="sys">${who(m)} 不會混亂！</span>`);
  if(m._cnf > 0) return print(`<span class="sys">${who(m)} 已經混亂了。</span>`);
  if(grounded(m) && terrain() === 'm') return print(`<span class="sys">${who(m)} 受到薄霧場地的保護！</span>`);
  if(src && src !== m && sideOf(m).safeg) return print(`<span class="sys">${who(m)} 受到神秘守護的保護！</span>`);
  m._cnf = 2 + Math.floor(Math.random()*4);
  print(`<span class="bad">${who(m)} 混亂了！</span>`);
}

/* ---------- 能不能用這招（PP、挑釁、定身、再來一次、無理取鬧、封印、回復封鎖、講究圍巾） ---------- */
function moveBlockReason(m, mv){
  if(!mv || mv.struggle) return '';
  if(!(mv.pp > 0)) return 'PP 用完了';
  if(m._enc && m._enc.name !== mv.name) return '被再來一次';
  if(m._taunt && mv.cls === 2) return '被挑釁';
  if(m._dis && m._dis.name === mv.name) return '被定身';
  if(m._torment && m._last === mv.name) return '被無理取鬧';
  if(hasFx(mv,'norep') && m._last === mv.name) return '不能連續用';
  if(m._hblk && fxList(mv).some(x=>/^hl|^dr/.test(x))) return '被回復封鎖';
  const foe = state.battle && activeFoeOf(m);
  if(foe && foe._impr && (foe.moves||[]).some(x=>x.name === mv.name)) return '被封印';
  if(hasFx(mv,'snore') && m.status !== 'sleep') return '沒睡著';
  if((holds(m,'choicescarf') || hasAb(m,'gorillatactics')) && m._lock && mv.name !== m._lock && !m._dmax) return holds(m,'choicescarf') ? '講究圍巾' : '一猩一意';
  return '';
}
function usableMoves(m){ return (m.moves||[]).filter(mv=>!moveBlockReason(m, mv)); }

/* ---------- 對手的選招：先排除明顯沒用的變化招 ---------- */
function moveUseless(a, d, mv){
  const L = fxList(mv), s = sideOf(a), o = oppSide(a), f = bf();
  if(mv.cls !== 2){
    if(L.includes('dreameat') && d.status !== 'sleep') return true;
    if((L.includes('fakeout') || L.includes('fakeout0')) && (a._turnsIn||0) > 0) return true;
    if(L.includes('ohko') && d.level > a.level) return true;
    return false;
  }
  for(const c of L){
    let m;
    if((m = c.match(/^a([a-z]{3})100$/))){ if(m[1] === 'cnf' ? d._cnf > 0 : d.status) return true; continue; }
    if((m = c.match(/^su([adcesvh])(-?\d+)/))){ if(+m[2] > 0 && stageOf(a[ST_KEY[m[1]]], 'hv'.includes(m[1])) >= 6) return true; continue; }
    if((m = c.match(/^sf([adcesvh])(-?\d+)/))){ if(+m[2] < 0 && stageOf(d[ST_KEY[m[1]]], 'hv'.includes(m[1])) <= -6) return true; continue; }
    if(/^hl\d/.test(c) && a.hp >= a.maxhp) return true;
    if(c.startsWith('wx:') && battleWeather() === c.slice(3)) return true;
    if(c.startsWith('tr:') && terrain() === c.slice(3)) return true;
    if((c === 'scr:p' && s.scrP) || (c === 'scr:s' && s.scrS) || (c === 'scr:a' && (s.scrA || battleWeather() !== 'snow'))) return true;
    if((c === 'mist' && s.mist) || (c === 'safeg' && s.safeg) || (c === 'tailw' && s.tailw) || (c === 'luck' && s.luck)) return true;
    if((c === 'hz:spk' && o.hz.spk >= 3) || (c === 'hz:tsp' && o.hz.tsp >= 2) || (c === 'hz:rock' && o.hz.rock) || (c === 'hz:web' && o.hz.web)) return true;
    if((c === 'sub' || c === 'shedtail') && (a._sub > 0 || a.hp <= a.maxhp/4)) return true;
    if(c === 'seed' && (d._seed || typesOf(d).includes('草'))) return true;
    if((c.startsWith('prot') || c === 'endure') && (a._protN||0) > 0) return true;
    if((c === 'taunt' && d._taunt) || (c === 'encore' && (d._enc || !d._last)) || (c === 'perish' && a._perish) || (c === 'yawn' && (d.status || d._yawn))) return true;
    if((c === 'stock' && (a._stock||0) >= 3) || ((c === 'spit' || c === 'swallow') && !a._stock) || (c === 'bdrum' && a.hp <= a.maxhp/2) || (c === 'fillet' && a.hp <= a.maxhp/2)) return true;
    if(['splash','court','bestow','trick','recycle','teatime','hlfoe50','mimic','sketch','transform','snatch','mcoat','imprison','grudge','dbond','lockon','focus','lfocus','psychup','haze','fshield','foresight'].includes(c)) return true;
    if(c === 'rest' && (a.hp >= a.maxhp || a.status === 'sleep')) return true;
    if((c === 'ingrain' && a._ingrain) || (c === 'aring' && a._aring) || (c === 'wish' && s.wish) || (c === 'curse' && typesOf(a).includes('幽靈') && d._curse) || (c === 'nmare' && (d.status !== 'sleep' || d._nmare))) return true;
    if((c === 'stalk' && a.status !== 'sleep') || (c === 'troom' && f.troom) || (c === 'grav' && f.grav)) return true;
    if((c === 'block' || c === 'octo') && d._trap) return true;
    if(c === 'attract' && d._attr) return true;
    if((c === 'disable' && (d._dis || !d._last)) || (c === 'torment' && d._torment) || (c === 'hblock' && d._hblk) || (c === 'embargo' && d._emb) || (c === 'gastro' && d._noab)) return true;
    if((c === 'roar' || c === 'tport') && state.battle.mode !== 'wild') return state.battle.foes && state.battle.foes.length ? false : true;
  }
  return false;
}
// 對手的選招：估算每一招的價值，依「聰明程度」挑最好的那招，不然就從有用的招裡隨機（難度設定見 gimmicks.js 的 aiSmart）
function estDamage(a, d, mv){
  if(mv.cls === 2 || moveEff(mv, d) === 0) return 0;
  const L = fxList(mv);
  let pw = mv.power > 1 ? mv.power : 60;
  if(L.some(c=>/^fix:|^lvl$/.test(c))) return a.level;
  if(L.includes('half')) return Math.floor(d.hp/2);
  if(L.includes('ohko')) return d.level > a.level ? 0 : d.hp*0.3;
  const hm = L.find(x=>/^h\d+-\d+$/.test(x)); if(hm){ const [lo, hi] = hm.slice(1).split('-').map(Number); pw *= lo === hi ? lo : 3; }
  const phys = isPhys(mv), A = phys ? a.atk*(a.atkMul||1) : (a.spa??a.atk)*(a.spaMul||1), D = Math.max(1, phys ? d.def*(d.defMul||1) : (d.sdf??d.def)*(d.sdfMul||1));
  let x = ((2*a.level/5+2)*pw*A/D/50 + 2) * moveEff(mv, d) * stabMul(a, mv) * ((mv.acc||100)/100);
  if(L.includes('chg') && !(L.includes('solar') && battleWeather() === 'sun')) x *= 0.5;
  if(L.includes('rch')) x *= 0.7;
  if(abImmuneQuiet(a, d, mv)) x = 0;
  return x;
}
function abImmuneQuiet(a, d, mv){   // 不觸發效果的「會不會被特性吸收」判斷
  const t = mv.type;
  return (t === '電' && ['voltabsorb','lightningrod','motordrive'].some(k=>dAb(a, d, k))) || (t === '水' && ['waterabsorb','stormdrain','dryskin'].some(k=>dAb(a, d, k)))
    || (t === '草' && dAb(a, d,'sapsipper')) || (t === '火' && (dAb(a, d,'flashfire') || dAb(a, d,'wellbakedbody'))) || (t === '地面' && (dAb(a, d,'levitate') || dAb(a, d,'eartheater') || (holds(d,'airballoon') && !d._bBalloon)))
    || (dAb(a, d,'wonderguard') && moveEff(mv, d) < 2) || (dAb(a, d,'soundproof') && mvFlag(mv,'sound')) || (dAb(a, d,'bulletproof') && mvFlag(mv,'ball'));
}
function moveScore(w, p, mv, best){
  if(mv.cls !== 2){
    let x = estDamage(w, p, mv);
    if(x >= p.hp) x = p.hp * 1.5 + (mv.pri > 0 ? 50 : 0);   // 打得倒：優先，先制招更好
    return x;
  }
  if(moveUseless(w, p, mv)) return 0;
  const L = fxList(mv), hpR = w.hp/w.maxhp, foeR = p.hp/p.maxhp;
  if(L.some(c=>/^hl\d/.test(c)) || L.includes('ssap') || L.includes('wish')) return hpR < 0.45 ? best*1.3 + 1 : 0;
  if(L.some(c=>/^su/.test(c)) || ['bdrum','fillet','focus','stock','sub'].some(c=>L.includes(c))) return hpR > 0.6 && foeR > 0.3 ? best*0.8 : best*0.15;
  if(L.some(c=>/^a(par|slp|brn|tox|psn|frz)100$/.test(c))) return !p.status && foeR > 0.4 ? best*0.85 : 0;
  if(L.some(c=>/^(prot|endure)/.test(c))) return best*0.1;
  if(L.some(c=>c.startsWith('hz:') || c.startsWith('scr:') || c.startsWith('wx:') || c.startsWith('tr:'))) return hpR > 0.5 ? best*0.6 : best*0.1;
  return best*0.35;
}
function chooseFoeMove(w){
  if(w._force) return w._force.mv;
  const p = state.party[state.battle.playerIdx];
  let ok = usableMoves(w);
  if(!ok.length) return STRUGGLE;
  const smart = aiSmart(w);
  if(p && Math.random() < smart){
    const best = Math.max(1, ...ok.map(m=>m.cls !== 2 ? estDamage(w, p, m) : 0));
    let pick = null, bs = -1;
    ok.forEach(m=>{ const s = moveScore(w, p, m, best) * (0.9 + Math.random()*0.2); if(s > bs){ bs = s; pick = m; } });
    if(pick && bs > 0) return pick;
  }
  const useful = ok.filter(m=>!moveUseless(w, p, m));
  if(useful.length) ok = useful;
  const atk = ok.filter(m=>m.cls !== 2 && moveEff(m, p) > 0), sts = ok.filter(m=>m.cls === 2);
  const pool = (atk.length && (!sts.length || Math.random() < 0.7)) ? atk : (sts.length ? sts : ok);
  return pool[Math.floor(Math.random()*pool.length)];
}

/* ---------- 出招 ---------- */
function moveTypeNow(att, mv){
  let t = mv.type;
  if(mv.id === TERA_BLAST && att._tera) t = att._tera;
  const ab = abMoveType(att, mv); if(ab){ t = ab.type; if(ab.ate) mv._ate = true; }
  if(hasFx(mv,'wball')){ t = {sun:'火', rain:'水', sand:'岩石', snow:'冰'}[battleWeather()] || t; }
  if(att._elec) t = '電';
  else if(t === '一般' && state.battle && state.battle._ion) t = '電';
  return t;
}
// 行動前：睡眠、冰凍、需要休息、混亂、著迷（回傳 false＝這回合不能動）
function preMoveChecks(att, def, mv){
  att._moved = true;
  if(att._rch){ delete att._rch; print(`<span class="bad">${who(att)} 需要休息，無法行動！</span>`); return false; }
  if(att.status === 'sleep'){
    att._slp = (att._slp || 1) - (hasAb(att,'earlybird') ? 2 : 1);   // 早起：醒得比較快
    if(att._slp <= 0){ att.status = null; delete att._slp; delete att._nmare; print(`<span class="good">${who(att)} 醒過來了！</span>`); }
    else if(!(hasFx(mv,'snore') || hasFx(mv,'stalk'))){ print(`<span class="sys">${who(att)} 正在呼呼大睡。</span>`); return false; }
  }
  if(att.status === 'freeze'){
    if(Math.random() < 0.2 || [172,221,394,503,592,682,780,815,902].includes(mv.id)){   // 20% 解凍；這幾招火招會自己解凍
      att.status = null; print(`<span class="good">${who(att)} 的冰融化了！</span>`); }
    else { print(`<span class="bad">${who(att)} 被凍住了，無法行動！</span>`); return false; }
  }
  if(att._cnf > 0){
    att._cnf--;
    if(att._cnf <= 0){ print(`<span class="good">${who(att)} 的混亂解除了！</span>`); }
    else {
      print(`<span class="sys">${who(att)} 混亂了！</span>`);
      if(Math.random() < 1/3){
        const d = Math.max(1, Math.floor(((2*att.level/5+2)*40*(att.atk*(att.atkMul||1))/Math.max(1, att.def*(att.defMul||1))/50 + 2)));
        att.hp = Math.max(0, att.hp - d);
        print(`<span class="bad">${who(att)} 在混亂中攻擊了自己，受到 ${d} 點傷害！</span>`);
        return false;
      }
    }
  }
  if(att._attr){
    if(def.hp <= 0 || def !== att._attr){ delete att._attr; }
    else if(Math.random() < 0.5){ print(`<span class="bad">${who(att)} 對 ${who(def)} 著迷了，無法行動！</span>`); return false; }
  }
  if(att.status === 'paralyze' && Math.random() < 0.25){ print(`<span class="bad">${who(att)} 因麻痺而無法動彈！</span>`); return false; }
  const why = (!att._force && !mv.struggle) ? moveBlockReason(att, mv) : '';
  if(why && why !== 'PP 用完了' && why !== '講究圍巾'){ print(`<span class="bad">${who(att)} ${why}，無法使出 ${esc(mv.name)}！</span>`); return false; }
  return true;
}
// 招式失敗訊息
function moveFail(t){ print(`<span class="sys">${t || '但是失敗了！'}</span>`); }
// 命中判定
function hitCheck(att, def, mv){
  if(mv.self || !mv.acc) return true;
  if(att._lockon === def || def._tkin || abNoGuard(att, def)){ return true; }
  let acc = mv.acc;
  if(mv.cls === 2 && dAb(att, def,'wonderskin')) acc = Math.min(acc, 50);
  const w = battleWeather();
  if(w === 'rain' && (mv.id === 87 || mv.id === 542)) return true;   // 打雷、暴風
  if(w === 'snow' && mv.id === 59) return true;                       // 暴風雪
  if(w === 'sun' && (mv.id === 87 || mv.id === 542)) acc = 50;
  if(hasFx(mv,'ohko')){ if(def.level > att.level) return false; return Math.random()*100 < 30 + att.level - def.level; }
  const ev = (def._foresight || hasAb(att,'keeneye') || hasAb(att,'unaware')) ? Math.min(1, def.evaMul||1) : (def.evaMul||1);
  acc = acc * (dAb(att, def,'unaware') ? 1 : (att.accMul||1)) / ev * (bf().grav ? 5/3 : 1) * abAccMul(att, def, mv);
  return Math.random()*100 < acc;
}
// 主要入口（battle.js 的 attackCore 呼叫）
function useMove(att, def, mv, opt){
  opt = opt || {};
  const b = state.battle;
  if(!opt.called){
    const forced = !!(att._force && att._force.mv === mv);
    if(!preMoveChecks(att, def, mv)){ clearForce(att); delete att._bide; return; }
    const ppm = mv._base || mv;   // Z 招式、極巨招式扣原本那招的 PP
    if(!forced && !isFoeMon(att) && ppm.maxpp !== undefined && !mv.struggle){ ppm.pp = Math.max(0, ppm.pp - 1); if(hasAb(def,'pressure') && def !== att) ppm.pp = Math.max(0, ppm.pp - 1); leppaCheck(att, ppm); }
    if(!abBeforeMove(att, mv)){ clearForce(att); return; }   // 懶惰、變幻自如
    if(!isFoeMon(att) && !forced) bump('movesUsed');
  }
  if(!(hasFx(mv,'prot') || fxList(mv).some(x=>x.startsWith('prot:')) || hasFx(mv,'endure'))) att._protN = 0;
  // 蓄力招
  if(hasFx(mv,'chg') && !opt.charged){
    if(!(att._force && att._force.mv === mv && att._force.charge)){
      if(hasFx(mv,'solar') && battleWeather() === 'sun'){ /* 大晴天不用蓄力 */ }
      else {
        print(`${who(att)} 使用了 ${esc(mv.name)}！<span class="sys">正在蓄力……</span>`);
        att._force = {mv, charge:true};
        if(hasFx(mv,'suc1_100')) print(statChange(att, 'c', 1));
        return;
      }
    } else { clearForce(att); opt = Object.assign({}, opt, {charged:true}); }
  }
  // 忍耐
  if(hasFx(mv,'bide')) return doBide(att, def, mv);
  if(!opt.called){ att._last = (mv._base || mv).name; att._lastMv = mv._base || mv; }
  if(hasFx(mv,'boom') && fieldHasAb('damp')){ print(`${who(att)} 使用了 ${esc(mv.name)}！`); return moveFail('因為濕氣，爆炸不起來！'); }
  b._lastMove = mv;
  // 叫出別的招式
  const call = callMove(att, def, mv);
  if(call !== undefined){
    print(`${who(att)} 使用了 ${esc(mv.name)}！`);
    if(!call){ moveFail(); return; }
    print(`<span class="sys">→ 變成了 ${esc(call.name)}！</span>`);
    return useMove(att, def, call, {called:true});
  }
  delete mv._ate;
  const type = moveTypeNow(att, mv);
  let m = (type === mv.type) ? mv : Object.assign({}, mv, {type});
  if(mv.id === TERA_BLAST && att._tera && (att.atk*(att.atkMul||1)) > (att.spa*(att.spaMul||1))) m = Object.assign({}, m, {cls:0});
  att._lastType = type;
  // 粉塵：用火招就爆炸
  if(att._powder && m.type === '火' && m.cls !== 2){
    print(`${who(att)} 使用了 ${esc(mv.name)}！`);
    const l = Math.max(1, Math.floor(att.maxhp/4)); att.hp = Math.max(0, att.hp - l);
    return print(`<span class="bad">粉塵爆炸了！${who(att)} 受到 ${l} 點傷害！</span>`);
  }
  if(m.cls === 2) return useStatusMove(att, def, m);
  return useDamageMove(att, def, m, opt);
}
function clearForce(m){ delete m._force; }

/* ---------- 守住、魔法反射 ---------- */
function protectedFrom(att, def, mv){
  if(mv.self || !def._prot || att === def) return false;
  const v = def._prot;
  if(hasAb(att,'unseenfist') && isContact(att, mv) && v !== 'cft' && v !== 'qck') return false;   // 無形拳
  if((mv._z || mv._max) && mv.cls !== 2 && v !== 'cft' && v !== 'qck'){ print(`<span class="sys">${who(def)} 沒能完全守住！</span>`); mv._zprot = true; return false; }
  if(v === 'cft' && mv.cls !== 2) return false;
  if(v === 'qck' && !((mv._pri ?? mv.pri) > 0)) return false;
  if(v === 'mat' && mv.cls === 2) return false;
  print(`<span class="sys">${who(def)} 守住了攻擊！</span>`);
  if(mv.cls === 0 && att.hp > 0){
    if(v === 'kng') print(statChange(att, 'a', -1, true));
    if(v === 'obs') print(statChange(att, 'd', -2, true));
    if(v === 'slk') print(statChange(att, 's', -1, true));
    if(v === 'spk'){ const l = Math.max(1, Math.floor(att.maxhp/8)); att.hp = Math.max(0, att.hp - l); print(`<span class="bad">${who(att)} 被尖刺刺傷，受到 ${l} 點傷害！</span>`); }
    if(v === 'bnk' || v === 'brn'){ const r = setStatus(att, v === 'bnk' ? 'poison' : 'burn', def, true); if(r) print(r); }
  }
  return true;
}
function protectChance(att){ return Math.pow(1/3, att._protN || 0); }

/* ---------- 變化招 ---------- */
function useStatusMove(att, def, mv){
  print(`${who(att)} 使用了 ${esc(mv.name)}！`);
  // 魔法反射：把對方的變化招彈回去
  const abm = abStatusMoveImmune(att, def, mv);
  if((!mv.self && def._mcoat && att !== def) || abm === 'bounce'){ print(`<span class="sys">${abm === 'bounce' ? abTag(def) : ''}${who(def)} 把招式反彈回去了！</span>`); const t = att; att = def; def = t; def._bounced = true; }
  else if(abm) return moveFail(abm);
  // 搶奪：搶走對自己有利的變化招
  else if(mv.self && def._snatch && att !== def && def.hp > 0){ delete def._snatch; print(`<span class="sys">${who(def)} 搶走了效果！</span>`); att = def; def = activeFoeOf(def); }
  if(protectedFrom(att, def, mv)) return;
  if(!mv.self){
    if(mv.id === 86 && typesOf(def).includes('地面')) return moveFail(`對 ${who(def)} 沒有效果……`);   // 電磁波
    if([147,79,78,77].includes(mv.id) && typesOf(def).includes('草')) return moveFail(`對 ${who(def)} 沒有效果……`);   // 粉末類
    if(terrain() === 'p' && mv.pri > 0 && grounded(def)) return moveFail(`${who(def)} 受到精神場地的保護！`);
    if(def.hp <= 0) return moveFail();
    const im = abImmune(att, def, mv); if(im){ delete def._bounced; return print(im); }
    if(!hitCheck(att, def, mv)) return moveFail(`${who(def)} 躲開了！`);
    const blockSub = def._sub > 0 && !fxList(mv).some(c=>['roar','perish','haze','psychup','transform','imprison','foresight','mcoat','snatch','court','tr:e','tr:g','tr:m','tr:p','grav','troom','mroom','wroom'].includes(c) || c.startsWith('hz:') || c.startsWith('wx:'));
    if(blockSub && !hasAb(att,'infiltrator') && !mvFlag(mv,'sound')) return moveFail(`被 ${who(def)} 的替身擋下了！`);
  }
  const ok = runFx(att, def, mv, fxList(mv), {status:true});
  delete att._bounced; delete def._bounced;
  if(ok === false) moveFail();
}

/* ---------- 攻擊招 ---------- */
function useDamageMove(att, def, mv, opt){
  const b = state.battle, L = fxList(mv);
  const said = () => `${who(att)} 使用了 ${esc(mv.name)}！`;
  // 使用條件
  if((L.includes('fakeout') || L.includes('fakeout0')) && (att._turnsIn||0) > 0){ print(said()); return moveFail(); }
  if(L.includes('fpunch') && att._hitThisTurn){ print(said()); return moveFail(`${who(att)} 分心了，招式失敗了！`); }
  if(L.includes('sucker') && (def._moved || !def._choice || def._choice.cls === 2)){ print(said()); return moveFail(); }
  if(L.includes('dreameat') && def.status !== 'sleep'){ print(said()); return moveFail(`${who(def)} 沒有睡著……`); }
  if(L.includes('spit') && !att._stock){ print(said()); return moveFail(); }
  if(L.includes('endeavor') && def.hp <= att.hp){ print(said()); return moveFail(); }
  if(def._dmax && (L.includes('wt') || L.includes('wtr') || L.includes('ohko'))){ print(said()); return moveFail(`${who(def)} 極巨化中，沒有效果……`); }
  if(def.hp <= 0){ print(said()); return moveFail(); }
  if(protectedFrom(att, def, mv)){ return; }
  if(L.includes('future')){
    const d = calcHit(att, def, mv, mv.power, true);
    oppSide(att).future = {n:3, d, by:who(att), name:mv.name};
    print(said()); print(`<span class="sys">${who(att)} 預知了未來的攻擊！</span>`);
    return;
  }
  const e = moveEff(mv, def);
  if(e === 0){ print(`${said()}但是對 ${who(def)} 沒有效果……`); return; }
  if(terrain() === 'p' && mv.pri > 0 && grounded(def)){ print(said()); return moveFail(`${who(def)} 受到精神場地的保護！`); }
  if(!hitCheck(att, def, mv)){ print(said()); if(L.includes('ohko') && def.level > att.level) return moveFail('等級太低，沒有效果……'); return moveFail(`${who(att)} 的攻擊沒有命中！`); }
  const absorbed = absorbCheck(att, def, mv);   // 飄浮、蓄電、儲水、食草、引火
  if(absorbed){ print(said()); print(absorbed); return; }
  if(L.includes('brkscr')){ const s = oppSide(att); if(s.scrP || s.scrS || s.scrA){ s.scrP = s.scrS = s.scrA = 0; print(said()); print('<span class="em">打破了光牆和反射壁！</span>'); } }
  // 連續攻擊次數
  let hits = 1;
  const hm = L.find(x=>/^h\d+-\d+$/.test(x));
  if(hm){ const [lo, hi] = hm.slice(1).split('-').map(Number); hits = (lo === hi || hasAb(att,'skilllink')) ? hi : (lo === 2 && hi === 5 ? [2,2,2,3,3,3,4,5][Math.floor(Math.random()*8)] : lo + Math.floor(Math.random()*(hi-lo+1))); }
  let pbond = hits === 1 && hasAb(att,'parentalbond') && !mv._z && !mv._max && !L.some(c=>/^fix:|^lvl$|^half$|^ohko$|^endeavor$|^gambit$|^psywave$/.test(c));   // 親子愛：打兩下，第二下 1/4
  if(pbond) hits = 2;
  if(L.includes('beatup')) hits = Math.max(1, (isFoeMon(att) ? [att, ...(b.foes||[])] : state.party).filter(x=>x.hp>0 && !x.status).length);
  fxNotes = [];
  let total = 0, n = 0, subHit = false, endureMsg = '';
  for(let i=0; i<hits && def.hp > 0 && att.hp > 0; i++){
    let d = fixedDamage(att, def, mv);
    const fixed = d !== null;
    if(!fixed) d = calcHit(att, def, mv, Math.max(1, Math.floor(dmgPower(att, def, mv) * (pbond && i === 1 ? 0.25 : 1))), false);
    if(L.includes('present') && d < 0){ const h = Math.min(def.maxhp - def.hp, -d); def.hp += h; print(`${said()}<span class="sys">${who(def)} 回復了 ${h} 點 HP！</span>`); return; }
    if(def._sub > 0 && !mvFlag(mv,'sound') && !hasAb(att,'infiltrator')){
      const s = Math.min(def._sub, d); def._sub -= s; total += s; n++; subHit = true;
      if(def._sub <= 0){ delete def._sub; fxNotes.push(`<span class="sys">${who(def)} 的替身消失了！</span>`); }
      continue;
    }
    if(L.includes('fswipe')) d = Math.min(d, def.hp - 1);
    let msg = '';
    { const r = abDisguise(att, def, mv, d); if(r[1]){ d = r[0]; fxNotes.push(r[1]); } }   // 畫皮、結凍頭
    [d, msg] = endureCheck(def, d);   // 氣勢披帶／結實／氣勢頭帶／挺住／親密度
    if(msg) endureMsg = msg;
    def.hp = Math.max(0, def.hp - d); total += d; n++;
    noteHit(att, def, mv, d);
    if(def._bide) def._bide.d += d;
  }
  if(!isFoeMon(att)){ trackDmg(att, total); if(total > (state.stats.maxHit||0)){ state.stats.maxHit = total; state.stats.maxHitBy = att.name; } }
  print(`${said()}${hits > 1 ? `命中 ${n} 次，` : ''}造成 <span class="${isFoeMon(att)?'bad':'em'}">${total}</span> 點傷害。${subHit ? '<span class="sys">（打在替身上）</span>' : ''}${effText(e)}`);
  flushFxNotes();   // 會心一擊、抗性樹果、一般寶石
  if(endureMsg) print(endureMsg);
  // 反作用力、吸血
  const rc = L.find(x=>/^rc\d+$/.test(x)), rcv = rc ? (+rc.slice(2))/100 : (mv.recoil || 0);
  if(rcv && total > 0 && (mv.struggle || !(hasAb(att,'rockhead') || hasAb(att,'magicguard')))){
    const r = mv.struggle ? Math.max(1, Math.floor(att.maxhp/4)) : Math.max(1, Math.floor(total*rcv));
    att.hp = Math.max(0, att.hp - r);
    print(`<span class="bad">${who(att)} 因反作用力受到了 ${r} 點傷害！</span>`);
  }
  const dr = L.find(x=>/^dr\d+$/.test(x));
  if(dr && total > 0 && att.hp > 0 && !subHit && dAb(att, def,'liquidooze')){
    const l = Math.max(1, Math.floor(total*(+dr.slice(2))/100)); att.hp = Math.max(0, att.hp - l); print(`${abTag(def)}<span class="bad">${who(att)} 吸到了污泥漿，受到 ${l} 點傷害！</span>`);
  } else if(dr && total > 0 && att.hp > 0 && att.hp < att.maxhp && !att._hblk){
    const h = Math.max(1, Math.floor(total*(+dr.slice(2))/100*(holds(att,'bigroot') ? 1.3 : 1)));
    att.hp = Math.min(att.maxhp, att.hp + h); print(`<span class="good">${who(att)} 吸取了 ${h} 點 HP！</span>`);
  }
  if(L.includes('selfdmg50') && att.hp > 0){ const l = Math.ceil(att.maxhp/2); att.hp = Math.max(0, att.hp - l); print(`<span class="bad">${who(att)} 損失了 ${l} 點 HP！</span>`); }
  if(L.includes('boom') || L.includes('gambit')){ att.hp = 0; }
  if(L.includes('rch')) att._rch = true;
  if(L.includes('losetype')){ att._types = typesOf(att).filter(t=>t !== '電'); if(!att._types.length) att._types = ['一般']; print(`<span class="sys">${who(att)} 的電力用光了！</span>`); }
  if(L.includes('spit')) { unstock(att); }
  if(L.includes('knock') && def.held && !def._knock && total > 0 && !subHit && !dAb(att, def,'stickyhold')){ def._knock = true; print(`<span class="sys">${who(def)} 的${esc(heldName(def))}被打落了！</span>`); }
  // 附加效果（打到替身不算）
  if(!subHit) runFx(att, def, mv, L, {damage:true, dealt:total});
  else runFx(att, def, mv, L.filter(x=>x.startsWith('su') || x === 'pivot' || x === 'spin' || x.startsWith('hz:')), {damage:true, dealt:total});
  if(def.hp <= 0) onKo(att, def, mv);
  afterHitFx(att, def, mv, subHit ? 0 : total);   // 生命寶珠、貝殼之鈴、凸凸頭盔、靜電等、自信過度
}
function noteHit(att, def, mv, d){
  def._hitThisTurn = true;
  def._lastHit = {d, cls:mv.cls, by:att};
  def._rfist = (def._rfist||0) + 1;
  if(def.status === 'freeze' && mv.type === '火' && def.hp > 0){ def.status = null; print(`<span class="good">${who(def)} 的冰融化了！</span>`); }
}
function onKo(att, def, mv){
  if(def._dbond && att.hp > 0 && att !== def){ att.hp = 0; print(`<span class="bad">${who(def)} 和 ${who(att)} 同歸於盡了！</span>`); }
  if(def._grudge && mv.maxpp !== undefined){ mv.pp = 0; print(`<span class="bad">${who(att)} 的 ${esc(mv.name)} 因怨念 PP 歸零了！</span>`); }
}
// 固定傷害的招（回傳 null＝一般計算）
function fixedDamage(att, def, mv){
  const L = fxList(mv); let m;
  for(const c of L){
    if((m = c.match(/^fix:(\d+)$/))) return +m[1];
    if(c === 'lvl') return att.level;
    if(c === 'psywave') return Math.max(1, Math.floor(att.level*(0.5 + Math.random())));
    if(c === 'half') return Math.max(1, Math.floor(def.hp/2));
    if(c === 'endeavor') return Math.max(0, def.hp - att.hp);
    if(c === 'gambit') return att.hp;
    if(c === 'ohko'){ if(hasAb(def,'sturdy')){ fxNotes.push(`${abTag(def)}<span class="good">${who(def)} 撐住了！</span>`); return 0; } fxNotes.push('<span class="em">一擊必殺！</span>'); return def.hp; }
    if(c === 'counter' || c === 'mcoat2' || c === 'mburst'){
      const h = att._lastHit;
      if(!h || h.by !== def || (c === 'counter' && h.cls !== 0) || (c === 'mcoat2' && h.cls !== 1)) return 0;
      return Math.max(1, Math.floor(h.d * (c === 'mburst' ? 1.5 : 2)));
    }
    if(c === 'present'){ const r = Math.random(); if(r < 0.2) return -Math.floor(def.maxhp/4); return null; }
  }
  return null;
}
// 變動威力
function dmgPower(att, def, mv){
  const L = fxList(mv); let p = mv.power || 0;
  const w = m => ((typeof DEX_WEIGHT !== 'undefined' && DEX_WEIGHT[m.dex]) || 100) * (hasAb(m,'heavymetal') ? 2 : hasAb(m,'lightmetal') ? 0.5 : 1);
  const spd = m => effSpd(m);
  for(const c of L){
    switch(c){
      case 'wt': { const x = w(def); p = x < 100 ? 20 : x < 250 ? 40 : x < 500 ? 60 : x < 1000 ? 80 : x < 2000 ? 100 : 120; break; }
      case 'wtr': { const r = w(att)/Math.max(1, w(def)); p = r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40; break; }
      case 'flail': { const r = att.hp*48/att.maxhp; p = r < 2 ? 200 : r < 5 ? 150 : r < 10 ? 100 : r < 17 ? 80 : r < 33 ? 40 : 20; break; }
      case 'ret': p = Math.max(1, Math.floor((att.friend ?? 70)/2.5)); break;
      case 'frus': p = Math.max(1, Math.floor((255 - (att.friend ?? 70))/2.5)); break;
      case 'present': { const r = Math.random(); p = r < 0.5 ? 40 : r < 0.8 ? 80 : 120; break; }
      case 'magn': { const r = Math.random()*100; p = r < 5 ? 10 : r < 15 ? 30 : r < 35 ? 50 : r < 65 ? 70 : r < 85 ? 90 : r < 95 ? 110 : 150; break; }
      case 'gyro': p = Math.min(150, Math.floor(25*spd(def)/Math.max(1, spd(att))) + 1); break;
      case 'eball': { const r = spd(att)/Math.max(1, spd(def)); p = r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40; break; }
      case 'trump': { const n = mv.pp; p = n <= 0 ? 200 : n === 1 ? 80 : n === 2 ? 60 : n === 3 ? 50 : 40; break; }
      case 'wring': p = Math.max(1, Math.floor(120*def.hp/def.maxhp)); break;
      case 'hpress': p = Math.max(1, Math.floor(100*def.hp/def.maxhp)); break;
      case 'punish': { let s = 0; Object.keys(ST_KEY).forEach(k=>{ s += Math.max(0, stageOf(def[ST_KEY[k]], 'hv'.includes(k))); }); p = Math.min(200, 60 + 20*s); break; }
      case 'stpow': { let s = 0; Object.keys(ST_KEY).forEach(k=>{ s += Math.max(0, stageOf(att[ST_KEY[k]], 'hv'.includes(k))); }); p = 20 + 20*s; break; }
      case 'beatup': p = 20; break;
      case 'spit': p = 100*(att._stock||1); break;
      case 'ragefist': p = Math.min(350, 50 + 50*(att._rfist||0)); break;
      case 'lastresp': { const f = isFoeMon(att) ? (state.battle.foeFainted||[]).length : state.party.filter(x=>x.hp<=0).length; p = Math.min(5050, 50 + 50*f); break; }
      case 'erupt': p = Math.max(1, Math.floor(150*att.hp/att.maxhp)); break;
      case 'facade': if(att.status && att.status !== 'sleep' && att.status !== 'freeze') p *= 2; break;
      case 'hex': if(def.status) p *= 2; break;
      case 'hexpsn': if(def.status === 'poison' || def.status === 'toxic') p *= 2; break;
      case 'brine': if(def.hp*2 <= def.maxhp) p *= 2; break;
      case 'knock': if(def.held && !def._knock) p = Math.floor(p*1.5); break;
      case 'acro': if(!att.held || att._knock) p *= 2; break;
      case 'revenge': if(att._hitThisTurn) p *= 2; break;
      case 'payback': if(def._moved) p *= 2; break;
      case 'wball': if(battleWeather() !== 'none') p *= 2; break;
      case 'fickle': if(Math.random() < 0.3){ p *= 2; fxNotes.push('<span class="em">威力變成兩倍了！</span>'); } break;
    }
  }
  if(L.includes('solar') && ['rain','sand','snow'].includes(battleWeather())) p = Math.floor(p/2);
  if(att._tera && mv.type === att._tera && p < 60 && !L.some(c=>/^h\d/.test(c)) && !(mv.pri > 0)) p = 60;   // 太晶：同屬性的弱招至少 60
  if(mv.type === '電' && bf().sport && bf().sport['電']) p = Math.floor(p/3);
  if(mv.type === '火' && bf().sport && bf().sport['火']) p = Math.floor(p/3);
  return Math.max(1, p);
}
// 一下的傷害（noFx＝預知未來先算好，不消耗道具）
function calcHit(att, def, mv, power, noFx){
  const m = Object.assign({}, mv, {power});
  const L = fxList(mv);
  m._crit = (L.includes('cr') ? 1 : 0) + (att._focus ? 2 : 0) + (holds(att,'scopelens') ? 1 : 0) + ((att.friend||0) >= 200 && !isFoeMon(att) ? 1 : 0) + abCritStage(att, def, mv);
  if(L.includes('cr2') || att._lfocus) m._crit = 3;
  if(sideOf(def).luck) m._crit = -1;
  if(att._lfocus && !noFx) delete att._lfocus;
  if(noFx){ const save = fxNotes; const d = dmg(att, def, m); fxNotes = save; return d; }
  return dmg(att, def, m);
}
// 傷害額外倍率：光牆反射壁、場地（dmg 最後乘上）
function fieldDmgMul(att, def, mv){
  let k = 1; const t = terrain(), s = sideOf(def);
  if(mv._zprot) k *= 0.25;
  if(!mv._didCrit && !hasFx(mv,'brkscr') && !hasAb(att,'infiltrator')){
    if(s.scrA || (mv.cls === 0 && s.scrP) || (mv.cls === 1 && s.scrS)) k *= 0.5;
  }
  if(t && grounded(att)){
    if(t === 'e' && mv.type === '電') k *= 1.3;
    if(t === 'g' && mv.type === '草') k *= 1.3;
    if(t === 'p' && mv.type === '超能力') k *= 1.3;
  }
  if(t === 'm' && mv.type === '龍' && grounded(def)) k *= 0.5;
  if(t === 'g' && [89, 222, 523].includes(mv.id)) k *= 0.5;   // 地震、震級、重踏
  return k;
}

/* ---------- 效果碼執行（變化招全部；攻擊招的附加效果） ---------- */
function runFx(att, def, mv, L, o){
  const b = state.battle, dmgMove = !!o.damage;
  const foeAlive = def && def.hp > 0;
  const sec = dmgMove && !hasAb(def,'shielddust') && !(hasAb(att,'sheerforce'));
  let did = !dmgMove ? false : true;
  const say = t => { if(t){ print(t); did = true; } };
  const roll = c => Math.random()*100 < c * (hasAb(att,'serenegrace') ? 2 : 1);
  for(const c of L){
    let m;
    // 異常狀態
    if((m = c.match(/^a([a-z]{3})(\d+)$/))){
      const ch = +m[2]; if(dmgMove && (!sec || !foeAlive)) continue;
      if(!roll(ch)) continue;
      let k = m[1];
      if(k === 'tri') k = ['brn','par','frz'][Math.floor(Math.random()*3)];
      if(k === 'rnd') k = ['psn','par','slp'][Math.floor(Math.random()*3)];
      if(k === 'cnf'){ setConfuse(def, att); did = true; continue; }
      const r = setStatus(def, AIL_KIND[k], att, dmgMove);
      if(dmgMove){ if(r){ print(r); lumCheck(def); } } else did = true;
      continue;
    }
    if((m = c.match(/^fl(\d+)$/))){ if(sec && foeAlive && !def._moved && !def._dmax && roll(+m[1])) def._flinch = true; continue; }
    if((m = c.match(/^s([uf])([adcesvh])(-?\d+)_(\d+)$/))){
      const tgt = m[1] === 'u' ? att : def, n = +m[3], ch = +m[4];
      if(m[1] === 'f' && dmgMove && (!sec || !foeAlive)) continue;
      if(m[1] === 'u' && dmgMove && hasAb(att,'sheerforce') && ch < 100) continue;
      if(ch < 100 && !roll(ch)) continue;
      say(statChange(tgt, m[2], n, m[1] === 'f', att));
      if(m[1] === 'f' && n < 0) herbCheck(tgt);
      continue;
    }
    if((m = c.match(/^hl(\d+)$/))){
      if(att._hblk){ say(`<span class="bad">${who(att)} 被回復封鎖，無法回復！</span>`); continue; }
      if(att.hp >= att.maxhp){ if(!L.includes('rest') && !L.includes('cure')) return false; continue; }
      let pct = +m[1];
      if([234,235,236].includes(mv.id)) pct = battleWeather() === 'sun' ? 67 : battleWeather() === 'none' ? 50 : 25;   // 晨光、光合作用、月光
      if(L.includes('rest')){ if(hasAb(att,'insomnia') || (grounded(att) && terrain() === 'e')) return false; att.status = 'sleep'; att._slp = 3; say(`<span class="sys">${who(att)} 睡著了，</span>`); }
      const h = Math.min(att.maxhp - att.hp, Math.max(1, Math.floor(att.maxhp*pct/100))); att.hp += h;
      say(`<span class="good">${who(att)} 回復了 ${h} 點 HP！</span>`);
      continue;
    }
    if(/^h\d+-\d+$|^dr\d+$|^rc\d+$|^cr2?$|^chg$|^rch$|^boom$|^ohko$|^solar$|^fix:|^lvl$|^half$|^psywave$|^endeavor$|^gambit$/.test(c)) continue;
    const r = specialFx(att, def, mv, c, o);
    if(r === false && !dmgMove) return false;
    if(r) did = true;
  }
  if(!dmgMove && !did) return false;
  return true;
}
const notGhost = m => !typesOf(m).includes('幽靈');
function canEscape(m){
  if(!m || typesOf(m).includes('幽靈')) return true;
  const foe = state.battle && activeFoeOf(m);
  if(m._trap && foe && foe.hp > 0 && m._trap === foe) return false;
  if(m._bind && m._bind.n > 0) return false;
  if(m._ingrain || m._trapSelf) return false;
  return true;
}
// 特殊效果（回傳 false＝失敗、true＝有作用、undefined＝沒事）
function specialFx(att, def, mv, c, o){
  const b = state.battle, f = bf(), my = sideOf(att), op = oppSide(att), dmgMove = !!o.damage;
  const P = t => { print(t); return true; };
  const weatherSet = w => {
    if(battleWeather() === w) return false;
    const rock = heldIt(att) && heldIt(att).wx === w;
    b.weather = w; b.weatherTurns = rock ? WX_TURNS_ROCK : WX_TURNS;
    return P(`<span class="em">${WEATHER[w].icon} 天氣變成了${WEATHER[w].name}！</span>`);
  };
  const turns = (obj, key, n, txt) => { if(obj[key]) return false; obj[key] = n; return P(`<span class="em">${txt}</span>`); };
  const fieldToggle = (key, txt, endTxt) => { if(f[key]){ f[key] = 0; return P(`<span class="sys">${endTxt}</span>`); } f[key] = 5; return P(`<span class="em">${txt}</span>`); };
  let m;
  if((m = c.match(/^wx:(\w+)$/))) return weatherSet(m[1]);
  if((m = c.match(/^tr:(\w)$/))){ if(f.terrain === m[1]) return false; f.terrain = m[1]; f.terrTurns = 5; return P(`<span class="em">腳下變成了${TERRAIN_NAME[m[1]]}！</span>`); }
  if((m = c.match(/^type:(.+)$/))){ if(typesOf(def).length === 1 && typesOf(def)[0] === m[1]) return false; def._types = [m[1]]; return P(`<span class="sys">${who(def)} 變成了${m[1]}屬性！</span>`); }
  if((m = c.match(/^addtype:(.+)$/))){ if(typesOf(def).includes(m[1])) return false; def._types = [...typesOf(def).filter(Boolean), m[1]]; return P(`<span class="sys">${who(def)} 多了${m[1]}屬性！</span>`); }
  if((m = c.match(/^sport:(.+)$/))){ f.sport = f.sport || {}; if(f.sport[m[1]]) return false; f.sport[m[1]] = 5; return P(`<span class="sys">${m[1]}屬性招式的威力變弱了！</span>`); }
  if((m = c.match(/^ab:(\w+)$/))){ if(def.ab === m[1]) return false; saveAb(def); def.ab = m[1]; delete def._noab; return P(`<span class="sys">${who(def)} 的特性變成了${ABILITIES[m[1]] ? ABILITIES[m[1]].name : m[1]}！</span>`); }
  if((m = c.match(/^scr:(\w)$/))){
    const key = {p:'scrP', s:'scrS', a:'scrA'}[m[1]];
    if(m[1] === 'a' && battleWeather() !== 'snow') return false;
    const n = holds(att,'lightclay') ? 8 : 5;
    return turns(my, key, n, {p:'反射壁', s:'光牆', a:'極光幕'}[m[1]] + '保護了' + (isFoeMon(att) ? '對方' : '我方') + '！');
  }
  if((m = c.match(/^hz:(\w+)$/))){
    const hz = op.hz;
    if(m[1] === 'spk'){ if(hz.spk >= 3) return dmgMove ? undefined : false; hz.spk = (hz.spk||0) + 1; return P(`<span class="em">${isFoeMon(att) ? '我方' : '對方'}腳下散落著撒菱！</span>`); }
    if(m[1] === 'tsp'){ if(hz.tsp >= 2) return false; hz.tsp = (hz.tsp||0) + 1; return P(`<span class="em">${isFoeMon(att) ? '我方' : '對方'}腳下散落著毒菱！</span>`); }
    if(m[1] === 'rock'){ if(hz.rock) return dmgMove ? undefined : false; hz.rock = true; return P(`<span class="em">${isFoeMon(att) ? '我方' : '對方'}周圍浮著尖銳的岩石！</span>`); }
    if(m[1] === 'web'){ if(hz.web) return false; hz.web = true; return P(`<span class="em">${isFoeMon(att) ? '我方' : '對方'}腳下佈滿了黏黏網！</span>`); }
  }
  if((m = c.match(/^prot(?::(\w+))?$/))){
    const v = m[1] || 'std';
    if(v === 'mat' && (att._turnsIn||0) > 0) return false;
    if(Math.random() >= protectChance(att)){ att._protN = 0; return false; }
    att._protN = (att._protN||0) + 1; att._prot = v;
    return P(`<span class="good">${who(att)} 擺出了防守的架式！</span>`);
  }
  if((m = c.match(/^swp:(\w+)$/))){
    const ks = {ac:['a','c'], de:['d','e'], all:['a','d','c','e','s','h','v']}[m[1]];
    if(m[1] === 's'){ const t = att.spd; att.spd = def.spd; def.spd = t; return P(`<span class="sys">${who(att)} 和 ${who(def)} 交換了速度！</span>`); }
    ks.forEach(k=>{ const key = ST_KEY[k], t = att[key]; att[key] = def[key]; def[key] = t; });
    return P(`<span class="sys">${who(att)} 和 ${who(def)} 交換了能力變化！</span>`);
  }
  if((m = c.match(/^split:(\w+)$/))){
    const ks = m[1] === 'ac' ? ['atk','spa'] : ['def','sdf'];
    ks.forEach(k=>{ const v = Math.floor(((att[k]||0) + (def[k]||0))/2); saveStats(att); saveStats(def); att[k] = v; def[k] = v; });
    return P(`<span class="sys">${who(att)} 和 ${who(def)} 平分了能力！</span>`);
  }
  switch(c){
    case 'troom': return fieldToggle('troom', '空間扭曲了！速度慢的會先行動！', '扭曲的空間恢復原狀了。');
    case 'mroom': return fieldToggle('mroom', '攜帶道具失去了效果！', '攜帶道具恢復了效果。');
    case 'wroom': return fieldToggle('wroom', '防禦和特防對調了！', '防禦和特防恢復了。');
    case 'grav': { if(f.grav) return false; f.grav = 5; [att, def].forEach(x=>{ delete x._mrise; delete x._tkin; }); return P('<span class="em">重力變強了！</span>'); }
    case 'mist': return turns(my, 'mist', 5, '白霧籠罩了' + (isFoeMon(att) ? '對方' : '我方') + '！');
    case 'safeg': return turns(my, 'safeg', 5, (isFoeMon(att) ? '對方' : '我方') + '受到神秘守護的保護！');
    case 'tailw': return turns(my, 'tailw', 4, '吹起了順風！');
    case 'luck': return turns(my, 'luck', 5, '幸運咒語保護了' + (isFoeMon(att) ? '對方' : '我方') + '！');
    case 'court': { const s = sides(), t = s.me; s.me = s.foe; s.foe = t; return P('<span class="sys">雙方場地的效果對調了！</span>'); }
    case 'defog': { [my, op].forEach(s=>{ s.hz = {}; }); op.scrP = op.scrS = op.scrA = 0; op.safeg = op.mist = 0; if(f.terrain){ f.terrain = ''; } return P('<span class="sys">吹散了場上的東西！</span>'); }
    case 'tidy': { [my, op].forEach(s=>{ s.hz = {}; }); [att, def].forEach(x=>{ delete x._sub; }); return P('<span class="sys">把場地整理乾淨了！</span>'); }
    case 'spin': { if(att.hp <= 0) return; my.hz = {}; delete att._seed; delete att._bind; return; }
    case 'clrterr': { if(f.terrain){ f.terrain = ''; return P('<span class="sys">場地消失了。</span>'); } return; }
    case 'endure': { if(Math.random() >= protectChance(att)){ att._protN = 0; return false; } att._protN = (att._protN||0) + 1; att._endure = true; return P(`<span class="good">${who(att)} 擺出了挺住的架式！</span>`); }
    case 'sub': {
      if(att._sub > 0) return P(`<span class="sys">${who(att)} 已經有替身了。</span>`) && false;
      const cost = Math.floor(att.maxhp/4); if(att.hp <= cost) return P('<span class="sys">HP 不夠，做不出替身！</span>') && false;
      att.hp -= cost; att._sub = cost; return P(`<span class="good">${who(att)} 做出了替身！</span>`);
    }
    case 'shedtail': {
      const cost = Math.ceil(att.maxhp/2); if(att.hp <= cost || !hasBench(att)) return false;
      att.hp -= cost; att._sub = Math.floor(att.maxhp/4); P(`<span class="good">${who(att)} 斷下尾巴做出了替身！</span>`);
      return pivotOut(att, 'shed');
    }
    case 'baton': return hasBench(att) ? pivotOut(att, 'baton') : false;
    case 'pivot': { if(att.hp <= 0 || (dmgMove && o.dealt <= 0 && !mv.self && mv.cls !== 2)) return; if(!hasBench(att)) return dmgMove ? undefined : false; return pivotOut(att, 'pivot'); }
    case 'tport': {
      if(b.mode === 'wild' || b.mode === 'mega'){ return endEarly(isFoeMon(att) ? `${who(att)} 瞬間移動逃走了！` : `${who(att)} 瞬間移動，你們離開了戰鬥！`); }
      return hasBench(att) ? pivotOut(att, 'pivot') : false;
    }
    case 'roar': case 'drag': {
      if(c === 'drag' && (def.hp <= 0 || o.dealt <= 0)) return;
      if(def._ingrain) return c === 'roar' ? P(`<span class="sys">${who(def)} 紮了根，不為所動！</span>`) && false : undefined;
      if(def._sub > 0 && c === 'drag') return;
      return forceOut(att, def, c);
    }
    case 'seed': { if(def._seed || typesOf(def).includes('草')) return false; def._seed = true; return P(`<span class="bad">${who(def)} 被種下了種子！</span>`); }
    case 'nmare': { if(def.status !== 'sleep' || def._nmare) return false; def._nmare = true; return P(`<span class="bad">${who(def)} 開始做惡夢了！</span>`); }
    case 'curse': {
      if(typesOf(att).includes('幽靈')){
        if(def._curse) return false;
        const l = Math.floor(att.maxhp/2); att.hp = Math.max(0, att.hp - l); def._curse = true;
        return P(`<span class="bad">${who(att)} 削減了自己的 HP，詛咒了 ${who(def)}！</span>`);
      }
      print(statChange(att, 's', -1)); print(statChange(att, 'a', 1)); print(statChange(att, 'd', 1)); return true;
    }
    case 'perish': { if(att._perish && def._perish) return false; [att, def].forEach(x=>{ if(!x._perish && x.hp > 0) x._perish = 4; }); return P('<span class="bad">聽到滅亡之歌的寶可夢會在 3 回合後倒下！</span>'); }
    case 'dbond': { att._dbond = true; return P(`<span class="sys">${who(att)} 想和對手同歸於盡。</span>`); }
    case 'grudge': { att._grudge = true; return P(`<span class="sys">${who(att)} 想向對手報仇。</span>`); }
    case 'yawn': { if(def.status || def._yawn) return false; def._yawn = 2; return P(`<span class="sys">${who(def)} 開始打哈欠了……</span>`); }
    case 'ingrain': { if(att._ingrain) return false; att._ingrain = true; return P(`<span class="good">${who(att)} 紮下了根！</span>`); }
    case 'aring': { if(att._aring) return false; att._aring = true; return P(`<span class="good">${who(att)} 被水流環包住了！</span>`); }
    case 'wish': { if(my.wish) return false; my.wish = {n:2, hp:Math.floor(att.maxhp/2), by:att.name}; return P(`<span class="good">${who(att)} 許下了願望。</span>`); }
    case 'hwish': { if(!hasBench(att)) return false; my.hwish = true; att.hp = 0; return P(`<span class="sys">${who(att)} 倒下了，願望交給了下一隻。</span>`); }
    case 'memento': { att.hp = 0; print(statChange(def, 'a', -2, true)); print(statChange(def, 'c', -2, true)); return true; }
    case 'attract': { if(def._attr) return false; def._attr = att; return P(`<span class="bad">${who(def)} 對 ${who(att)} 著迷了！</span>`); }
    case 'saltcure': { if(def.hp > 0 && !def._salt){ def._salt = true; return P(`<span class="bad">${who(def)} 被鹽醃了！</span>`); } return; }
    case 'block': { if(def._trap) return false; def._trap = att; return P(`<span class="bad">${who(def)} 不能逃走了！</span>`); }
    case 'octo': { if(def._trap) return false; def._trap = att; def._octo = att; return P(`<span class="bad">${who(def)} 被章魚纏住了！</span>`); }
    case 'noflee': { att._trapSelf = true; return; }
    case 'bind': { if(def.hp > 0 && !def._bind){ def._bind = {n:4 + Math.floor(Math.random()*2), by:att}; return P(`<span class="bad">${who(def)} 被束縛住了！</span>`); } return; }
    case 'ssap': {
      if(stageOf(def.atkMul) <= -6) return false;
      const h = Math.min(att.maxhp - att.hp, Math.floor(def.atk*(def.atkMul||1)));
      if(!att._hblk && h > 0){ att.hp += h; print(`<span class="good">${who(att)} 回復了 ${h} 點 HP！</span>`); }
      print(statChange(def, 'a', -1, true)); return true;
    }
    case 'purify': { if(!def.status) return false; def.status = null; print(`<span class="good">${who(def)} 的異常狀態治好了！</span>`); const h = Math.min(att.maxhp - att.hp, Math.floor(att.maxhp/2)); if(h > 0){ att.hp += h; print(`<span class="good">${who(att)} 回復了 ${h} 點 HP！</span>`); } return true; }
    case 'hlfoe50': { if(def.hp >= def.maxhp) return false; const h = Math.min(def.maxhp - def.hp, Math.floor(def.maxhp/2)); def.hp += h; return P(`<span class="sys">${who(def)} 回復了 ${h} 點 HP。</span>`); }
    case 'psplit': { const v = Math.floor((att.hp + def.hp)/2); att.hp = Math.min(att.maxhp, v); def.hp = Math.min(def.maxhp, v); return P('<span class="sys">雙方平分了 HP！</span>'); }
    case 'cure': { if(!att.status) return; att.status = null; delete att._slp; delete att._tox; return P(`<span class="good">${who(att)} 的異常狀態治好了！</span>`); }
    case 'pcure': { const team = isFoeMon(att) ? [att, ...(b.foes||[])] : state.party; team.forEach(x=>{ x.status = null; }); return P('<span class="good">全隊的異常狀態都治好了！</span>'); }
    case 'revive': {
      if(isFoeMon(att)) return false;
      const t = state.party.find(x=>x.hp <= 0); if(!t) return false;
      t.hp = Math.max(1, Math.floor(t.maxhp/2)); t.status = null; return P(`<span class="good">${nm(t)} 復活了！</span>`);
    }
    case 'haze': { [att, def].forEach(resetStages); return P('<span class="sys">雙方的能力變化都恢復原狀了！</span>'); }
    case 'psychup': { Object.values(ST_KEY).forEach(k=>{ att[k] = def[k] || 1; }); return P(`<span class="sys">${who(att)} 複製了 ${who(def)} 的能力變化！</span>`); }
    case 'ptrick': { saveStats(att); const t = att.atk; att.atk = att.def; att.def = t; return P(`<span class="sys">${who(att)} 的攻擊和防禦對調了！</span>`); }
    case 'invert': { Object.values(ST_KEY).forEach(k=>{ def[k] = 1/(def[k]||1); }); return P(`<span class="sys">${who(def)} 的能力變化顛倒了！</span>`); }
    case 'acup': { const ks = Object.keys(ST_KEY).filter(k=>stageOf(att[ST_KEY[k]], 'hv'.includes(k)) < 6); if(!ks.length) return false; print(statChange(att, ks[Math.floor(Math.random()*ks.length)], 2)); return true; }
    case 'bdrum': { if(att.hp <= att.maxhp/2 || stageOf(att.atkMul) >= 6) return false; att.hp -= Math.floor(att.maxhp/2); att.atkMul = mulOf(6); return P(`<span class="good">${who(att)} 削減了 HP，攻擊提升到最高！</span>`); }
    case 'fillet': { if(att.hp <= att.maxhp/2) return false; att.hp -= Math.floor(att.maxhp/2); ['a','c','s'].forEach(k=>print(statChange(att, k, 2))); return true; }
    case 'focus': { if(att._focus) return false; att._focus = true; return P(`<span class="good">${who(att)} 提起了幹勁！</span>`); }
    case 'lfocus': { att._lfocus = true; return P(`<span class="good">${who(att)} 集中了精神！</span>`); }
    case 'lockon': { att._lockon = def; return P(`<span class="sys">${who(att)} 鎖定了 ${who(def)}！</span>`); }
    case 'stock': { if((att._stock||0) >= 3) return false; att._stock = (att._stock||0) + 1; print(`<span class="good">${who(att)} 蓄力了 ${att._stock} 次！</span>`); print(statChange(att, 'd', 1)); print(statChange(att, 'e', 1)); return true; }
    case 'swallow': { if(!att._stock) return false; const pct = [0,25,50,100][att._stock]; const h = Math.min(att.maxhp - att.hp, Math.floor(att.maxhp*pct/100)); unstock(att); if(h <= 0) return false; att.hp += h; return P(`<span class="good">${who(att)} 回復了 ${h} 點 HP！</span>`); }
    case 'foresight': { def._foresight = true; def.evaMul = 1; return P(`<span class="sys">${who(att)} 看穿了 ${who(def)}！</span>`); }
    case 'splash': return P('<span class="sys">但是什麼也沒有發生……</span>');
    case 'fshield': { let any = false; [att, def].forEach(x=>{ if(typesOf(x).includes('草')){ print(statChange(x, 'd', 1)); any = true; } }); return any ? true : false; }
    case 'disable': { if(!def._last || def._dis) return false; def._dis = {name:def._last, n:4}; return P(`<span class="bad">${who(def)} 的 ${esc(def._last)} 被封住了！</span>`); }
    case 'spite': { const t = (def.moves||[]).find(x=>x.name === def._last); if(!t || !(t.pp > 0)) return false; t.pp = Math.max(0, t.pp - 4); return P(`<span class="bad">${who(def)} 的 ${esc(t.name)} 的 PP 減少了！</span>`); }
    case 'encore': { if(!def._last || def._enc || ['再來一次','變身','模仿','寫生','揮指','鸚鵡學舌'].includes(def._last)) return false; def._enc = {name:def._last, n:3}; return P(`<span class="bad">${who(def)} 被迫再來一次！</span>`); }
    case 'taunt': { if(def._taunt) return false; def._taunt = 3; return P(`<span class="bad">${who(def)} 被挑釁了！</span>`); }
    case 'torment': { if(def._torment) return false; def._torment = true; return P(`<span class="bad">${who(def)} 被無理取鬧了！</span>`); }
    case 'imprison': { if(att._impr) return false; att._impr = true; return P(`<span class="sys">${who(att)} 封印了對手的招式！</span>`); }
    case 'hblock': { if(def.hp <= 0 || def._hblk) return dmgMove ? undefined : false; def._hblk = 5; return P(`<span class="bad">${who(def)} 不能回復 HP 了！</span>`); }
    case 'embargo': { if(def._emb) return false; def._emb = 5; return P(`<span class="bad">${who(def)} 不能使用攜帶道具了！</span>`); }
    case 'gastro': { if(def._noab) return false; def._noab = true; return P(`<span class="bad">${who(def)} 的特性失效了！</span>`); }
    case 'abgive': { if(!att.ab || def.ab === att.ab) return false; saveAb(def); def.ab = att.ab; delete def._noab; return P(`<span class="sys">${who(def)} 的特性變成了 ${esc(abName(att))}！</span>`); }
    case 'abswap': { saveAb(att); saveAb(def); const t = att.ab; att.ab = def.ab; def.ab = t; return P(`<span class="sys">${who(att)} 和 ${who(def)} 交換了特性！</span>`); }
    case 'abcopy': { if(!def.ab || att.ab === def.ab) return false; saveAb(att); att.ab = def.ab; return P(`<span class="sys">${who(att)} 複製了 ${who(def)} 的特性：${esc(abName(def))}！</span>`); }
    case 'trick': { if(!att.held && !def.held) return false; saveHeld(att); saveHeld(def); const t = att.held; att.held = def.held; def.held = t; return P(`<span class="sys">${who(att)} 和 ${who(def)} 交換了攜帶道具！</span>`); }
    case 'bestow': { if(!att.held || def.held) return false; saveHeld(att); saveHeld(def); def.held = att.held; att.held = null; return P(`<span class="sys">${who(att)} 把道具交給了 ${who(def)}！</span>`); }
    case 'recycle': { if(!att.held) return false; ['_bBerry','_bSash','_bGem','_bHerb','_bBalloon','_bSturdy'].forEach(k=>delete att[k]); return P(`<span class="good">${who(att)} 的${esc(heldName(att))}可以再用一次了！</span>`); }
    case 'teatime': { [att, def].forEach(x=>{ if(heldIt(x) && heldIt(x).cat === 'berry'){ delete x._bBerry; hpBerryCheck(x, true); lumCheck(x); } }); return P('<span class="sys">大家開了茶會！</span>'); }
    case 'mrise': { if(att._mrise) return false; att._mrise = 5; return P(`<span class="good">${who(att)} 用電磁力浮了起來！</span>`); }
    case 'tkin': { if(def._tkin || f.grav) return false; def._tkin = 3; return P(`<span class="sys">${who(def)} 被念力浮了起來！</span>`); }
    case 'conv': { const t = (att.moves||[])[0] && att.moves[0].type; if(!t || (typesOf(att).length === 1 && typesOf(att)[0] === t)) return false; att._types = [t]; return P(`<span class="sys">${who(att)} 變成了${t}屬性！</span>`); }
    case 'conv2': {
      const lt = def._lastType; if(!lt) return false;
      const opts = Object.keys(CHART).filter(t=>eff(lt, [t]) < 1); if(!opts.length) return false;
      const t = opts[Math.floor(Math.random()*opts.length)]; att._types = [t]; return P(`<span class="sys">${who(att)} 變成了${t}屬性！</span>`);
    }
    case 'camo': { const t = {e:'電', g:'草', m:'妖精', p:'超能力'}[terrain()] || '一般'; att._types = [t]; return P(`<span class="sys">${who(att)} 變成了${t}屬性！</span>`); }
    case 'rtype': { att._types = typesOf(def).filter(Boolean).slice(); return P(`<span class="sys">${who(att)} 變成了跟 ${who(def)} 一樣的屬性！</span>`); }
    case 'electrify': { if(def._moved) return false; def._elec = true; return P(`<span class="sys">${who(def)} 的招式變成電屬性了！</span>`); }
    case 'ion': { b._ion = true; return P('<span class="sys">場上充滿了電離子！</span>'); }
    case 'powder': { if(def._moved) return false; def._powder = true; return P(`<span class="sys">${who(def)} 身上沾滿了粉塵！</span>`); }
    case 'pshift': { if(!att.status || def.status) return false; const s = att.status; const r = setStatus(def, s, att, true); if(!r) return false; print(r); att.status = null; return true; }
    case 'mcoat': { att._mcoat = true; return P(`<span class="sys">${who(att)} 張開了魔法反射！</span>`); }
    case 'snatch': { att._snatch = true; return P(`<span class="sys">${who(att)} 等待著搶奪的機會！</span>`); }
    case 'transform': {
      if(att._tf || def._tf) return false;
      att._tf = {atk:att.atk, def:att.def, spa:att.spa, sdf:att.sdf, spd:att.spd, moves:att.moves, types:att._types};
      ['atk','def','spa','sdf','spd'].forEach(k=>{ att[k] = def[k]; });
      Object.values(ST_KEY).forEach(k=>{ att[k] = def[k] || 1; });
      att._types = typesOf(def).filter(Boolean).slice();
      att.moves = (def.moves||[]).map(x=>Object.assign({}, x, {pp:5, maxpp:5}));
      return P(`<span class="em">${who(att)} 變身成了 ${who(def)}！</span>`);
    }
    case 'mimic': case 'sketch': {
      const src = (def.moves||[]).find(x=>x.name === def._last) || (def._last && Object.values(MOVE_DB).find(x=>x[0] === def._last) && makeMove(+Object.keys(MOVE_DB).find(k=>MOVE_DB[k][0] === def._last)));
      if(!src || !src.id || (att.moves||[]).some(x=>x.id === src.id)) return false;
      const i = att.moves.indexOf(mv); if(i < 0) return false;
      if(c === 'sketch' && !isFoeMon(att)){
        att.moves[i] = makeMove(src.id); att.xm = [...new Set([...(att.xm||[]), src.id])];
        return P(`<span class="em">${who(att)} 永久學會了「${esc(src.name)}」！</span>`);
      }
      att._mimic = att._mimic || {i, mv}; att.moves[i] = Object.assign(makeMove(src.id), {pp:5, maxpp:5});
      return P(`<span class="good">${who(att)} 學會了「${esc(src.name)}」！</span>`);
    }
    case 'knock': { if(!dmgMove){ if(!def.held || def._knock) return false; def._knock = true; return P(`<span class="sys">${who(def)} 的${esc(heldName(def))}失去了效果！</span>`); } return; }
  }
  return undefined;
}
function unstock(m){ const n = m._stock||0; if(!n) return; m.defMul = mulOf(stageOf(m.defMul) - n); m.sdfMul = mulOf(stageOf(m.sdfMul) - n); delete m._stock; }
function saveAb(m){ if(!('_abOrig' in m)) m._abOrig = m.ab; }
function saveHeld(m){ if(!('_heldOrig' in m)) m._heldOrig = m.held || null; }
function saveStats(m){ if(!m._statOrig) m._statOrig = {atk:m.atk, def:m.def, spa:m.spa, sdf:m.sdf, spd:m.spd}; }

/* ---------- 叫出別的招 ---------- */
const NO_CALL = new Set(['metro','mirror','copycat','stalk','assist','npower','mefirst','transform','mimic','sketch','sub','dbond','counter','mcoat2','mburst','snatch','mcoat','trick','bestow','fpunch','bide','endure','shedtail','baton','chg','roar','tport']);
function callable(mv){ return mv && !fxList(mv).some(c=>NO_CALL.has(c) || c.startsWith('prot')); }
let _metroPool = null;
function callMove(att, def, mv){
  const L = fxList(mv);
  if(L.includes('metro')){
    if(!_metroPool) _metroPool = Object.keys(MOVE_DB).map(Number).filter(id=>callable(makeMove(id)));
    return makeMove(_metroPool[Math.floor(Math.random()*_metroPool.length)]);
  }
  if(L.includes('mirror')){ const t = def._lastMv; return t && !t.self && callable(t) ? Object.assign({}, t) : null; }
  if(L.includes('copycat')){ const t = state.battle._lastMove; return t && t !== mv && callable(t) ? Object.assign({}, t) : null; }
  if(L.includes('stalk')){ if(att.status !== 'sleep') return null; const c = (att.moves||[]).filter(x=>x !== mv && callable(x)); return c.length ? Object.assign({}, c[Math.floor(Math.random()*c.length)]) : null; }
  if(L.includes('assist')){
    const team = isFoeMon(att) ? (state.battle.foes||[]) : state.party.filter(x=>x !== att);
    const c = [].concat(...team.map(x=>x.moves||[])).filter(callable);
    return c.length ? Object.assign({}, c[Math.floor(Math.random()*c.length)]) : null;
  }
  if(L.includes('npower')) return makeMove({e:85, g:412, m:585, p:94}[terrain()] || 161);
  if(L.includes('mefirst')){
    const t = def._choice; if(!t || t.cls === 2 || def._moved || !callable(t)) return null;
    return Object.assign({}, t, {power:Math.floor((t.power||0)*1.5)});
  }
  return undefined;
}

/* ---------- 忍耐 ---------- */
function doBide(att, def, mv){
  if(!att._bide){ att._bide = {n:2, d:0}; att._force = {mv}; print(`${who(att)} 使用了 ${esc(mv.name)}！<span class="sys">開始忍耐……</span>`); return; }
  att._bide.n--;
  if(att._bide.n > 0){ print(`<span class="sys">${who(att)} 正在忍耐……</span>`); return; }
  const d = att._bide.d * 2; delete att._bide; clearForce(att);
  print(`${who(att)} 的忍耐解除了！`);
  if(!d || def.hp <= 0) return moveFail();
  if(!typesOf(def).includes('幽靈') || def._foresight){ const x = Math.min(def.hp, d); def.hp -= x; print(`<span class="${isFoeMon(att)?'bad':'em'}">對 ${who(def)} 造成 ${x} 點傷害！</span>`); }
  else moveFail(`對 ${who(def)} 沒有效果……`);
}

/* ---------- 換人：換下場（急速折返、接棒、斷尾）、強制換人（吼叫、龍尾） ---------- */
function hasBench(m){
  const b = state.battle;
  if(isFoeMon(m)) return (b.foes||[]).some(x=>x.hp > 0);
  return state.party.some((x,i)=>i !== b.playerIdx && x.hp > 0);
}
function pivotOut(att, kind){
  const b = state.battle;
  if(isFoeMon(att)) b._foePivot = kind; else b._pivot = kind;
  return true;
}
function batonCopy(from, to, kind){
  if(kind === 'baton'){ Object.values(ST_KEY).forEach(k=>{ to[k] = from[k] || 1; }); ['_sub','_focus','_seed','_curse','_perish','_ingrain','_aring','_mrise'].forEach(k=>{ if(from[k] !== undefined) to[k] = from[k]; }); }
  if(kind === 'shed' && from._sub > 0) to._sub = from._sub;
}
function forceOut(att, def, c){
  const b = state.battle;
  if(def._dmax) return c === 'roar' ? false : undefined;
  if(dAb(att, def,'suctioncups') || dAb(att, def,'guarddog')) return c === 'roar' ? false : undefined;
  if(b.mode === 'wild' || b.mode === 'mega'){
    if(b.mode === 'legendary') return false;
    return endEarly(isFoeMon(def) ? `${who(def)} 被吹走了！` : `${who(def)} 被吹走了，戰鬥結束了！`);
  }
  if(isFoeMon(def)){
    const list = (b.foes||[]).map((x,i)=>[x,i]).filter(([x])=>x.hp > 0);
    if(!list.length) return c === 'roar' ? false : undefined;
    const [nx, i] = list[Math.floor(Math.random()*list.length)];
    switchOutFx(def); b.foes[i] = def; b.wild = nx;
    print(`<span class="em">${who(def)} 被換下場，${esc(b.title||'對手')} 派出了 ${nm(nx)}！</span>`);
    entryCheck(); return true;
  }
  const list = state.party.map((x,i)=>[x,i]).filter(([x,i])=>x.hp > 0 && i !== b.playerIdx);
  if(!list.length) return c === 'roar' ? false : undefined;
  const [nx, i] = list[Math.floor(Math.random()*list.length)];
  switchOutFx(def); b.playerIdx = i;
  print(`<span class="bad">${nm(def)} 被換下場，${nm(nx)} 被拉了出來！</span>`);
  entryCheck(); return true;
}
// 對戰提前結束（被吹走、瞬間移動）
function endEarly(msg){ state.battle._ended = msg; return true; }
function finishEarly(){
  const b = state.battle, msg = b._ended;
  print(`<span class="em">${msg}</span>`);
  state.battle = null; megaRevertAll(); state.party.forEach(resetBattleFlags);
  setOptions([{label:'繼續', action:toField}]);
  return true;
}
// 回合結束：我方用了急速折返之類的，選下一隻（不消耗回合）
function screenPivot(){
  const b = state.battle, kind = b._pivot; delete b._pivot;
  const old = state.party[b.playerIdx];
  if(!hasBench(old)) return screenBattle();
  hr();
  print(`<span class="em">${nm(old)} 要換下場了，選擇下一隻：</span>`);
  const opts = state.party.map((m,i)=> (m.hp > 0 && i !== b.playerIdx) ? {label:`${monName(m)} Lv.${m.level} HP ${m.hp}/${m.maxhp}`, half:true, action:()=>{
    clearLog(); batonCopy(old, m, kind); switchOutFx(old); b.playerIdx = i;
    if(kind === 'baton' || kind === 'shed'){ /* 接棒：上面複製過的保留 */ }
    print(`收回了 ${nm(old)}，換上 ${nm(m)}！`);
    b.turn = (b.turn||1) + 1; screenBattle();
  }} : null).filter(Boolean);
  setOptions(opts, '選擇下一隻');
}
function doFoePivot(){
  const b = state.battle, kind = b._foePivot; delete b._foePivot;
  const w = b.wild, list = (b.foes||[]).map((x,i)=>[x,i]).filter(([x])=>x.hp > 0);
  if(!list.length || w.hp <= 0) return;
  const [nx, i] = list[Math.floor(Math.random()*list.length)];
  batonCopy(w, nx, kind); switchOutFx(w); b.foes[i] = w; b.wild = nx;
  print(`<span class="em">${esc(b.title||'對手')} 收回了 ${nm(w)}，派出了 ${nm(nx)}！</span>`);
}

/* ---------- 換上場時：撒菱類、治癒之願 ---------- */
function entryHazards(m){
  if(!m || m.hp <= 0 || !state.battle) return;
  m._turnsIn = 0;
  const s = sideOf(m), hz = s.hz || {};
  if(s.hwish){ delete s.hwish; m.hp = m.maxhp; m.status = null; print(`<span class="good">${who(m)} 被願望治癒了！</span>`); }
  if(holds(m,'heavydutyboots')) return;
  if(hz.rock){ const l = Math.max(1, Math.floor(m.maxhp/8*eff('岩石', typesOf(m)))); m.hp = Math.max(0, m.hp - l); print(`<span class="bad">尖銳的岩石刺進了 ${who(m)}！（-${l}）</span>`); }
  if(grounded(m)){
    if(hz.spk && m.hp > 0){ const l = Math.max(1, Math.floor(m.maxhp*[0,1/8,1/6,1/4][hz.spk])); m.hp = Math.max(0, m.hp - l); print(`<span class="bad">${who(m)} 被撒菱刺傷了！（-${l}）</span>`); }
    if(hz.tsp && m.hp > 0){
      if(typesOf(m).includes('毒')){ delete hz.tsp; print(`<span class="sys">${who(m)} 把毒菱吸收掉了！</span>`); }
      else { const r = setStatus(m, hz.tsp >= 2 ? 'toxic' : 'poison', null, true); if(r) print(r); }
    }
    if(hz.web && m.hp > 0){ print(`<span class="sys">${who(m)} 被黏黏網纏住了！</span>`); print(statChange(m, 's', -1, true)); }
  }
}

/* ---------- 每回合結束 ---------- */
function moveEndTurn(m){
  if(!m || m.hp <= 0 || !state.battle) return;
  const foe = activeFoeOf(m);
  const lose = (n, t) => { if(m.hp <= 0 || hasAb(m,'magicguard')) return; const l = Math.max(1, Math.floor(m.maxhp*n)); m.hp = Math.max(0, m.hp - l); print(`<span class="bad">${t}（-${l}）</span>`); };
  const gain = (n, t) => { if(m.hp <= 0 || m.hp >= m.maxhp || m._hblk) return; const h = Math.min(m.maxhp - m.hp, Math.max(1, Math.floor(m.maxhp*n))); m.hp += h; print(`<span class="good">${t}（+${h}）</span>`); };
  if(m._ingrain) gain(1/16, `${who(m)} 從根部吸收了養分。`);
  if(m._aring) gain(1/16, `${who(m)} 被水流環治癒了。`);
  if(terrain() === 'g' && grounded(m)) gain(1/16, `${who(m)} 被青草場地治癒了。`);
  if(m._seed && foe && foe.hp > 0){ const l = Math.max(1, Math.floor(m.maxhp/8)), x = Math.min(m.hp, l); m.hp -= x; print(`<span class="bad">寄生種子吸取了 ${who(m)} 的 HP！（-${x}）</span>`);
    if(hasAb(m,'liquidooze')){ foe.hp = Math.max(0, foe.hp - x); print(`${abTag(m)}<span class="bad">${who(foe)} 吸到了污泥漿！（-${x}）</span>`); }
    else if(!foe._hblk && foe.hp < foe.maxhp) foe.hp = Math.min(foe.maxhp, foe.hp + x); }
  if(m._nmare){ if(m.status === 'sleep') lose(1/4, `${who(m)} 正在做惡夢……`); else delete m._nmare; }
  if(m._curse) lose(1/4, `${who(m)} 受到詛咒！`);
  if(m._salt) lose((typesOf(m).includes('水') || typesOf(m).includes('鋼')) ? 1/4 : 1/8, `${who(m)} 被鹽醃著！`);
  if(m._bind){ if(!m._bind.by || m._bind.by.hp <= 0 || --m._bind.n <= 0){ delete m._bind; print(`<span class="sys">${who(m)} 掙脫了束縛！</span>`); } else lose(holds(m._bind.by,'bindingband') ? 1/6 : 1/8, `${who(m)} 受到束縛的傷害！`); }
  if(m._octo && m.hp > 0){ if(m._octo.hp > 0 && m._octo === foe){ print(statChange(m, 'd', -1, true)); print(statChange(m, 'e', -1, true)); } else delete m._octo; }
  if(m._yawn && --m._yawn <= 0){ delete m._yawn; const r = setStatus(m, 'sleep', null, true); if(r) print(r); }
  if(m._perish){ m._perish--; if(m._perish <= 0){ m.hp = 0; print(`<span class="bad">${who(m)} 的滅亡計數歸零，倒下了！</span>`); } else print(`<span class="sys">${who(m)} 的滅亡計數：${m._perish}</span>`); }
  ['_taunt','_hblk','_emb','_mrise','_tkin'].forEach(k=>{ if(m[k] > 0 && --m[k] <= 0) delete m[k]; });
  if(m._enc && --m._enc.n <= 0) delete m._enc;
  if(m._dis && --m._dis.n <= 0){ delete m._dis; }
  if(m._enc && !(m.moves||[]).some(x=>x.name === m._enc.name && x.pp > 0)) delete m._enc;
  // 親密度：偶爾自己甩掉異常狀態
  if(!isFoeMon(m) && (m.friend||0) >= 200 && m.status && Math.random() < 0.1){ m.status = null; print(`<span class="good">${who(m)} 為了不讓你擔心，治好了異常狀態！</span>`); }
  m._turnsIn = (m._turnsIn||0) + 1;
}
function fieldEndTurn(){
  const b = state.battle; if(!b) return;
  const f = bf(), p = state.party[b.playerIdx], w = b.wild;
  ['me','foe'].forEach(k=>{
    const s = sides()[k], mon = k === 'me' ? p : w;
    if(s.wish && --s.wish.n <= 0){ if(mon && mon.hp > 0 && mon.hp < mon.maxhp && !mon._hblk){ const h = Math.min(mon.maxhp - mon.hp, s.wish.hp); mon.hp += h; print(`<span class="good">${esc(s.wish.by)} 的願望實現了！${who(mon)} 回復了 ${h} 點 HP。</span>`); } delete s.wish; }
    if(s.future && --s.future.n <= 0){ const x = s.future; delete s.future; if(mon && mon.hp > 0){ const d = Math.min(mon.hp, x.d); mon.hp -= d; print(`<span class="bad">${x.by} 的${esc(x.name)}打中了 ${who(mon)}！（-${d}）</span>`); } }
    [['scrP','反射壁'],['scrS','光牆'],['scrA','極光幕'],['mist','白霧'],['safeg','神秘守護'],['tailw','順風'],['luck','幸運咒語']].forEach(([key, n])=>{
      if(s[key] > 0 && --s[key] <= 0){ s[key] = 0; print(`<span class="sys">${k === 'me' ? '我方' : '對方'}的${n}消失了。</span>`); }
    });
  });
  if(f.terrain && --f.terrTurns <= 0){ print(`<span class="sys">${TERRAIN_NAME[f.terrain]}消失了。</span>`); f.terrain = ''; }
  [['troom','扭曲的空間恢復原狀了。'],['mroom','攜帶道具恢復了效果。'],['wroom','防禦和特防恢復了。'],['grav','重力恢復正常了。']].forEach(([k,t])=>{ if(f[k] > 0 && --f[k] <= 0){ f[k] = 0; print(`<span class="sys">${t}</span>`); } });
  if(f.sport) Object.keys(f.sport).forEach(t=>{ if(--f.sport[t] <= 0) delete f.sport[t]; });
  // 每回合的暫時狀態
  [p, w].forEach(m=>{ if(!m) return; ['_prot','_endure','_moved','_hitThisTurn','_lastHit','_mcoat','_snatch','_elec','_powder','_choice'].forEach(k=>delete m[k]); });
  delete b._ion;
}

/* ---------- 換下場：清掉只在場上有效的狀態 ---------- */
const VOLATILE = ['_cnf','_seed','_curse','_perish','_taunt','_enc','_dis','_torment','_sub','_bind','_yawn','_nmare','_attr','_ingrain','_aring','_force','_rch','_bide','_stock',
  '_foresight','_mrise','_tkin','_hblk','_emb','_impr','_lockon','_focus','_lfocus','_dbond','_grudge','_last','_lastMv','_lastType','_trap','_octo','_trapSelf','_salt','_turnsIn','_protN','_prot','_endure',
  '_types','_noab','_choice','_moved','_rfistX','_protean','_truant','_charge','_bounced','_ate',
  '_lastHit','_hitThisTurn','_mcoat','_snatch','_elec','_powder'];   // _lastHit.by 指向對手，對戰在回合中途結束時沒清掉會讓存檔 JSON 循環參照而存不進去
function clearVolatile(m){
  if(!m) return;
  VOLATILE.forEach(k=>{ delete m[k]; });
  restoreTemp(m);
  resetStages(m);
  const b = state.battle;
  if(b){ [b.wild, state.party[b.playerIdx]].forEach(x=>{ if(x && x._trap === m) delete x._trap; if(x && x._bind && x._bind.by === m) delete x._bind; if(x && x._attr === m) delete x._attr; }); }
}
// 對戰中暫時改掉的東西還原（變身、模仿、交換道具、特性、能力數值）
function restoreTemp(m){
  if(m._tf){ const t = m._tf; ['atk','def','spa','sdf','spd'].forEach(k=>{ m[k] = t[k]; }); m.moves = t.moves; delete m._tf; }
  if(m._mimic){ if(m.moves && m.moves[m._mimic.i]) m.moves[m._mimic.i] = m._mimic.mv; delete m._mimic; }
  if('_heldOrig' in m){ m.held = m._heldOrig || undefined; if(!m.held) delete m.held; delete m._heldOrig; }
  if('_abOrig' in m){ m.ab = m._abOrig; delete m._abOrig; }
  if(m._statOrig){ Object.assign(m, m._statOrig); delete m._statOrig; }
  delete m._knock; delete m._types; delete m._noab;
}

/* ---------- 招式學習器 ---------- */
function tmPrice(id){
  const d = MOVE_DB[id]; if(!d) return 0;
  const p = d[2] === 2 ? 1500 : d[3] <= 60 ? 1000 : d[3] <= 90 ? 2000 : d[3] <= 120 ? 3000 : 5000;
  return daily('sale') ? Math.ceil(p*0.8) : p;
}
function tmState(){ if(!state.tms || typeof state.tms !== 'object') state.tms = {}; return state.tms; }
function tmIdxOf(id){ return TM_LIST.findIndex(x=>x[1] === +id); }
function tmLabel(id){ const i = tmIdxOf(id); return `招式學習器${String(TM_LIST[i][0]).padStart(3,'0')}`; }
function canTeach(m, id){ const i = tmIdxOf(id); return i >= 0 && tmCompat(m.dex, i) && !knownMoves(m).includes(+id); }
let tmShopType = '', tmShopPage = 0, tmQty = 1;
function screenTmShop(msg){
  clearLog(); renderBar();
  print(`<span class="em">— 💿 招式學習器 —</span>　💰 ${state.money}${daily('sale') ? '　<span class="good">🏷 8 折</span>' : ''}`);
  if(msg) print(msg);
  print('<span class="sys">買來的招式學習器到「隊伍 → 寶可夢 → ⚔️ 招式」使用，用一次消耗一個。後面的數字是隊伍裡學得會的隻數。</span>');
  const list = TM_LIST.filter(([n,id])=>!tmShopType || MOVE_DB[id][1] === tmShopType);
  const {items, page, pages} = pageSlice(list, tmShopPage); tmShopPage = page;
  const opts = items.map(([n,id])=>{
    const k = state.party.filter(m=>canTeach(m, id)).length, own = tmState()[id] || 0;
    return {label:`${String(n).padStart(3,'0')} ${MOVE_DB[id][0]} $${tmPrice(id)}${k ? ` ✔${k}` : ''}${own ? ` 持有${own}` : ''}`, half:true, action:()=>screenTmItem(id)};
  });
  pageNav(opts, {page, pages}, pg=>{ tmShopPage = pg; screenTmShop(); });
  opts.push({label:`🔍 屬性：${tmShopType || '全部'}`, half:true, action:()=>screenPickFilter('選擇屬性', [['', '全部'], ...Object.keys(TYPE_COLOR).map(t=>[t,t])], tmShopType, v=>{ tmShopType = v; tmShopPage = 0; screenTmShop(); }, ()=>screenTmShop())});
  opts.push({label:'← 返回商店', half:true, action:()=>screenShop()});
  setOptions(opts);
}
function screenTmItem(id, msg){
  const mv = makeMove(id), p = tmPrice(id);
  clearLog(); renderBar();
  print(`<span class="em">${tmLabel(id)}</span>　$${p}　<span class="sys">持有 ${tmState()[id]||0}　💰 ${state.money}</span>`);
  print(moveLine(mv));
  const who = state.party.filter(m=>canTeach(m, id)).map(m=>esc(m.name));
  print(who.length ? `<span class="good">隊伍裡學得會：${who.join('、')}</span>` : '<span class="sys">隊伍裡沒有學得會（或已經會）的寶可夢。</span>');
  if(msg) print(msg);
  print('<span class="sys">選要買幾個，下一步再確認。</span>');
  setOptions([1,5,10].map(n=>({label:`買 ${n} 個`, half:n!==10, action:()=>{ tmQty = n; screenTmConfirm(id); }}))
    .concat([{label:'← 返回', action:()=>screenTmShop()}]));
}
function screenTmConfirm(id){
  const total = tmPrice(id)*tmQty;
  clearLog(); renderBar();
  print('<span class="em">確認購買</span>');
  print(`${tmLabel(id)}（${esc(MOVE_DB[id][0])}）×${tmQty}　共 💰 ${total}　<span class="sys">（目前 💰 ${state.money}）</span>`);
  if(state.money < total) print(`<span class="bad">錢不夠，還差 💰 ${total-state.money}。</span>`);
  const opts = [];
  if(state.money >= total) opts.push({label:`✅ 確認購買 $${total}`, action:()=>buyTm(id)});
  opts.push({label:'重選數量', half:true, action:()=>screenTmItem(id)});
  opts.push({label:'取消', half:true, action:()=>screenTmShop()});
  setOptions(opts);
}
function buyTm(id){
  const total = tmPrice(id)*tmQty;
  if(state.money < total) return screenTmItem(id, `<span class="bad">錢不夠！還差 💰 ${total-state.money}。</span>`);
  state.money -= total;
  tmState()[id] = (tmState()[id]||0) + tmQty;
  saveGame();
  screenTmItem(id, `<span class="good">買了 ${tmLabel(id)} ×${tmQty}，花費 💰 ${total}。</span>`);
}

/* ---------- 隊伍：招式頁（換招、用學習器） ---------- */
let moveEditPage = 0;
function screenMoves(i, back, msg){
  const m = state.party[i]; if(!m) return screenParty(back);
  clearLog();
  print(`<span class="em">⚔️ ${nm(m)} 的招式</span>　<span class="sys">會的招式 ${knownMoves(m).length} 招</span>`);
  if(msg) print(msg);
  m.moves.forEach((mv,k)=>print(`${k+1}. ${moveLine(mv)}`));
  print('<span class="sys">點一招可以換成其他會的招式。</span>');
  const opts = m.moves.map((mv,k)=>({label:`${k+1}. ${mv.name}（${mv.type}）`, half:true, action:()=>{ moveEditPage = 0; screenMoveSwap(i, back, k); }}));
  if(m.moves.length < 4) opts.push({label:'＋ 新增招式', half:true, action:()=>{ moveEditPage = 0; screenMoveSwap(i, back, m.moves.length); }});
  const tms = Object.keys(tmState()).filter(id=>tmState()[id] > 0 && canTeach(m, id));
  opts.push({label:`💿 使用招式學習器${tms.length ? `（${tms.length}）` : ''}`, half:true, cls:tms.length?'':'off', action:()=>{ if(tms.length){ moveEditPage = 0; screenTmUse(i, back); } }});
  opts.push({label:'返回', half:true, action:()=>screenMember(i, back)});
  setOptions(opts);
}
function screenMoveSwap(i, back, slot){
  const m = state.party[i]; if(!m) return screenParty(back);
  const cur = m.moves[slot];
  const list = knownMoves(m).filter(id=>!m.moves.some(x=>x.id === id));
  clearLog();
  print(`<span class="em">${nm(m)}：${cur ? `把「${esc(cur.name)}」換成……` : '新增一招'}</span>`);
  if(!list.length) print('<span class="sys">沒有其他會的招式了。升級、進化或用招式學習器可以學更多。</span>');
  const {items, page, pages} = pageSlice(list, moveEditPage); moveEditPage = page;
  items.forEach(id=>print(moveLine(makeMove(id))));
  const opts = items.map(id=>({label:`${MOVE_DB[id][0]}（${MOVE_DB[id][1]}${MOVE_DB[id][2]===2?'・變化':' '+MOVE_DB[id][3]}）`, half:true, action:()=>{
    const old = m.moves[slot]; m.moves[slot] = makeMove(id); if(old && old.pp < old.maxpp) m.moves[slot].pp = Math.min(m.moves[slot].maxpp, Math.round(m.moves[slot].maxpp*old.pp/old.maxpp));
    saveGame(); screenMoves(i, back, `<span class="good">${nm(m)} ${old ? `忘記了「${esc(old.name)}」，` : ''}換上了「${esc(MOVE_DB[id][0])}」！</span>`);
  }}));
  pageNav(opts, {page, pages}, pg=>{ moveEditPage = pg; screenMoveSwap(i, back, slot); });
  if(cur && m.moves.length > 1) opts.push({label:'🗑 拿掉這招', half:true, action:()=>{ m.moves.splice(slot,1); saveGame(); screenMoves(i, back, `<span class="sys">拿掉了「${esc(cur.name)}」（之後還能再換回來）。</span>`); }});
  opts.push({label:'← 返回', half:true, action:()=>screenMoves(i, back)});
  setOptions(opts);
}
function screenTmUse(i, back){
  const m = state.party[i]; if(!m) return screenParty(back);
  const list = Object.keys(tmState()).map(Number).filter(id=>tmState()[id] > 0 && canTeach(m, id)).sort((a,b)=>tmIdxOf(a)-tmIdxOf(b));
  clearLog();
  print(`<span class="em">💿 要教 ${nm(m)} 哪一招？</span>　<span class="sys">（用掉 1 個）</span>`);
  const {items, page, pages} = pageSlice(list, moveEditPage); moveEditPage = page;
  items.forEach(id=>print(moveLine(makeMove(id))));
  const opts = items.map(id=>({label:`${MOVE_DB[id][0]} ×${tmState()[id]}`, half:true, action:()=>teachTm(i, back, id)}));
  pageNav(opts, {page, pages}, pg=>{ moveEditPage = pg; screenTmUse(i, back); });
  opts.push({label:'← 返回', action:()=>screenMoves(i, back)});
  setOptions(opts);
}
function teachTm(i, back, id){
  const m = state.party[i];
  if(!m || !(tmState()[id] > 0) || !canTeach(m, id)) return screenMoves(i, back);
  tmState()[id]--; if(!tmState()[id]) delete tmState()[id];
  m.xm = [...new Set([...(m.xm||[]), id])];
  bump('tmUsed');
  let msg = `<span class="good">${nm(m)} 學會了「${esc(MOVE_DB[id][0])}」！</span>`;
  if(m.moves.length < 4){ m.moves.push(makeMove(id)); saveGame(); return screenMoves(i, back, msg); }
  saveGame();
  clearLog(); print(msg); print('要換掉哪一招？（不換的話，之後也能在招式頁換上）');
  const opts = m.moves.map((mv,k)=>({label:`${mv.name}`, half:true, action:()=>{ const old = m.moves[k]; m.moves[k] = makeMove(id); saveGame(); screenMoves(i, back, `<span class="good">${nm(m)} 忘記了「${esc(old.name)}」，換上了「${esc(MOVE_DB[id][0])}」！</span>`); }}));
  opts.push({label:'先不換', action:()=>screenMoves(i, back, msg)});
  setOptions(opts);
}

/* ---------- 親密度 ---------- */
const FRIEND_EVO_MIN = 160;
const FRIEND_EVO = new Set([171,172,173,445,41,174,297,112,405,432,426,446,526,540,771,871,914,132]);   // 本傳靠親密度進化的（DEX 索引）
function friendOf(m){ return Math.max(0, Math.min(255, m.friend ?? 70)); }
function addFriend(m, n){ if(!m) return; m.friend = Math.max(0, Math.min(255, friendOf(m) + n)); }
function friendHearts(m){ const f = friendOf(m), n = Math.min(5, Math.floor(f/51)); return '♥'.repeat(n) + '♡'.repeat(5-n); }
function friendText(m){
  const f = friendOf(m);
  const t = f >= 255 ? '非常要好' : f >= 200 ? '很親近' : f >= 150 ? '感情不錯' : f >= 100 ? '慢慢熟了' : f >= 50 ? '還有點陌生' : '有點疏遠';
  return `${friendHearts(m)}　${f}/255（${t}）` + (FRIEND_EVO.has(m.dex) && f < FRIEND_EVO_MIN ? `<span class="sys">　親密度 ${FRIEND_EVO_MIN} 以上就會進化</span>` : '');
}

/* ---------- 統計頁 ---------- */
function statsHtml(){
  const st = state.stats, all = [...state.party, ...state.box];
  const cell = (k,v)=>`<div class="qi"><small>${k}</small>${v}</div>`;
  const wins = st.wins||0, loss = st.losses||0, tot = wins + loss;
  let h = '<div class="mh">⚔️ 戰鬥</div><div class="pstat">'
    + cell('勝場', wins) + cell('敗場', loss) + cell('勝率', tot ? Math.round(100*wins/tot)+'%' : '—') + cell('逃跑', st.flees||0)
    + cell('擊敗訓練家', st.trainers||0) + cell('道館徽章', state.meta.badges+' / '+GYMS.length)
    + cell('出招次數', st.movesUsed||0) + cell('會心一擊', st.crits||0)
    + cell('單次最高傷害', st.maxHit ? `${st.maxHit}<small>${esc(st.maxHitBy||'')}</small>` : '—') + cell('我方倒下', st.faints||0)
    + '</div>';
  h += '<div class="mh">📖 收集</div><div class="pstat">'
    + cell('捕捉數', st.catches||0) + cell('圖鑑', state.caught.size+' / '+DEX.length) + cell('✨ 色違', state.shinyCaught.size) + cell('擁有寶可夢', all.length)
    + cell('進化次數', st.evolves||0) + cell('用掉招式學習器', st.tmUsed||0)
    + cell('塔層通過', st.floors||0) + cell('小魔王擊破', st.bosses||0) + cell('簽到天數', st.checkins||0)
    + cell('平均等級', all.length ? Math.round(all.reduce((a,m)=>a+m.level,0)/all.length) : '—')
    + '</div>';
  const top = (map, n) => Object.entries(map||{}).sort((a,b)=>b[1]-a[1]).slice(0, n);
  const pu = top(st.pu, 5);
  if(pu.length){ h += '<div class="mh">🏟 最常上場</div>'; pu.forEach(([d,c],i)=>{ h += `<div class="qi"><div class="qrow"><span>${i+1}. ${esc(DEX[d] ? DEX[d][0] : '?')}</span><span>${c} 次</span></div></div>`; }); }
  const pd = top(st.pd, 5);
  if(pd.length){ h += '<div class="mh">💥 累計傷害最多</div>'; pd.forEach(([d,c],i)=>{ h += `<div class="qi"><div class="qrow"><span>${i+1}. ${esc(DEX[d] ? DEX[d][0] : '?')}</span><span>${c}</span></div></div>`; }); }
  const fr = all.slice().sort((a,b)=>friendOf(b)-friendOf(a)).slice(0, 5);
  if(fr.length){ h += '<div class="mh">💕 最親近的寶可夢</div>'; fr.forEach((m,i)=>{ h += `<div class="qi"><div class="qrow"><span>${i+1}. ${esc(monName(m))} Lv.${m.level}</span><span>${friendHearts(m)} ${friendOf(m)}</span></div></div>`; }); }
  return h;
}

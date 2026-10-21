/* ========== 成長相關：性別、進化道具／條件、白天夜晚、PP 提升劑、神奇糖果 ========== */

/* ---------- 性別（GENDER_RATE：雌性機率/8，-1＝無性別） ---------- */
function rollGender(dex){ const r = (typeof GENDER_RATE !== 'undefined') ? GENDER_RATE[dex] : -1; if(r == null || r < 0) return ''; return Math.random()*8 < r ? 'F' : 'M'; }
function ensureGender(m){ if(m.gender === undefined || (m.gender && GENDER_RATE[m.dex] < 0)) m.gender = rollGender(m.dex); if(m.gender === 'F' && GENDER_RATE[m.dex] === 0) m.gender = 'M'; if(m.gender === 'M' && GENDER_RATE[m.dex] === 8) m.gender = 'F'; return m.gender; }
function genderSign(m){ return m && m.gender === 'M' ? '♂' : m && m.gender === 'F' ? '♀' : ''; }
function genderHtml(m){ const g = genderSign(m); return g ? `<span class="gd ${m.gender === 'M' ? 'gm' : 'gf'}">${g}</span>` : ''; }

/* ---------- 白天／夜晚（6~17 點白天） ---------- */
function isNight(){ const h = nowFn().getHours(); return h < 6 || h >= 18; }
function timeIcon(){ return isNight() ? '🌙 夜晚' : '☀️ 白天'; }
const TIME_SET = {day:new Set(TIME_PREF.day), night:new Set(TIME_PREF.night)};
// 遭遇池：另一個時段才出現的拿掉；25% 機率從這個時段特別多的裡面挑
function timePool(pool){
  const now = isNight() ? 'night' : 'day', other = now === 'night' ? 'day' : 'night';
  let p = pool.filter(i=>!TIME_SET[other].has(i));
  if(!p.length) p = pool;
  const fav = p.filter(i=>TIME_SET[now].has(i));
  return (fav.length && Math.random() < 0.25) ? fav : p;
}

/* ---------- 進化：照本傳改成道具／通訊交換（聯繫繩）／時段／性別／會的招式 ---------- */
// EVO_COND[原索引] = [{to, lvl, time, gender, move, rel}]：升級時檢查的條件進化
// STONE_EVO[原索引][道具] = 進化後索引（或陣列：同一個道具有兩種進化，讓玩家選）；EVO_ITEM_COND['原>後'] = {time, gender}
const EVO_COND = {}, EVO_ITEM_COND = {}, FAIRY_EVO = {};
(function(){
  const lvOf = (a)=> EVO[a] ? EVO[a][1] : 1;
  EVO_FIX.forEach(([a, b, c, cur])=>{
    if(cur){   // 石頭本來就有，只是石頭不對
      if(STONE_EVO[a] && STONE_EVO[a][cur] === b) delete STONE_EVO[a][cur];
      if(c.fairy){ FAIRY_EVO[a] = b; return; }
    } else if(EVO[a]){
      const lvl = EVO[a][1], t = EVO[a][0];
      const rest = (Array.isArray(t) ? t : [t]).filter(x=>x !== b);
      if(!rest.length) delete EVO[a]; else EVO[a] = [rest.length === 1 ? rest[0] : rest, lvl];
      if(!c.item){ (EVO_COND[a] = EVO_COND[a] || []).push(Object.assign({to:b, lvl:c.move ? 1 : lvl}, c)); return; }
    }
    if(c.item){
      const s = STONE_EVO[a] = STONE_EVO[a] || {};
      const old = s[c.item];
      s[c.item] = old === undefined ? b : [].concat(old, b);
      if(c.time || c.gender) EVO_ITEM_COND[a + '>' + b] = {time:c.time, gender:c.gender};
    }
  });
  // 進化道具加進 ITEMS
  Object.keys(EVO_ITEM_NAMES).forEach(k=>{
    if(!ITEMS[k]) ITEMS[k] = {label:EVO_ITEM_NAMES[k], desc:k === 'linkingcord' ? '本傳要通訊交換才會進化的寶可夢，用這個進化' : '讓特定寶可夢進化', price:/stone$/.test(k) ? 2000 : 3000, stone:true};
    if(!STONE_KEYS.includes(k)) STONE_KEYS.push(k);
  });
})();
function condOk(m, c){
  if(!c) return '';
  if(c.time === 'night' && !isNight()) return '要在晚上（18~6 點）';
  if(c.time === 'day' && isNight()) return '要在白天（6~18 點）';
  if(c.gender && ensureGender(m) !== c.gender) return c.gender === 'F' ? '只有雌性會進化' : '只有雄性會進化';
  if(c.move && !knownMoves(m).includes(c.move)) return `要會「${MOVE_DB[c.move] ? MOVE_DB[c.move][0] : '?'}」`;
  if(c.lvl && m.level < c.lvl) return `要 Lv.${c.lvl}`;
  return '';
}
// 升級（或對戰結束）時：條件進化
function condEvoTarget(p){
  if(FAIRY_EVO[p.dex] !== undefined && friendOf(p) >= FRIEND_EVO_MIN && knownMoves(p).some(id=>MOVE_DB[id] && MOVE_DB[id][1] === '妖精')) return FAIRY_EVO[p.dex];
  const L = EVO_COND[p.dex]; if(!L) return null;
  for(const c of L){
    if(c.rel !== undefined){ if(p.level < c.lvl) continue; const r = Math.sign(p.atk - p.def); if(r === c.rel) return c.to; continue; }
    if(!condOk(p, c)) return c.to;
  }
  return null;
}
// 道具進化：回傳 [{to, why}]（why 空字串＝現在可以進化）
function stoneTargets(m, k){
  const s = STONE_EVO[m.dex]; if(!s || s[k] === undefined) return [];
  return [].concat(s[k]).map(to=>({to, why:condOk(m, EVO_ITEM_COND[m.dex + '>' + to])}));
}

/* ---------- PP 提升劑、神奇糖果 ---------- */
(function(){
  ITEMS.ppup = {label:'ＰＰ提升劑', desc:'一個招式的 PP 上限 +20%（最多 3 次）', price:9800, ppup:1};
  ITEMS.ppmax = {label:'ＰＰ極限提升劑', desc:'一個招式的 PP 上限直接提到最高（+60%）', price:24800, ppup:3};
  ITEMS.rarecandy = {label:'神奇糖果', desc:'讓一隻寶可夢升 1 級', price:4800, candy:true};
})();
function ppMaxOf(id, up){ const d = MOVE_DB[id]; return d ? d[4] + Math.floor(d[4]*(up||0)/5) : 0; }
let growPage = 0;
function screenGrowItem(k, msg, pick){
  const it = ITEMS[k];
  if(!(state.bag[k] > 0)) return screenBag();
  clearLog();
  print(`<span class="em">— ${esc(it.label)}（剩 ${state.bag[k]}）—</span>`);
  if(msg) print(msg);
  const all = viewMons([...state.party.map((m,i)=>({m,i,box:false})), ...state.box.map((m,i)=>({m,i,box:true}))].filter(({m})=> it.candy ? m.level < MAX_LEVEL : (m.moves||[]).some(mv=>mv.id && (mv.ppUp||0) < 3)));
  const per = 8, pages = Math.max(1, Math.ceil(all.length/per)); growPage = Math.min(Math.max(0, growPage), pages-1);
  print(all.length ? '要用在誰身上？（📦 = 在倉庫）' : '<span class="sys">沒有可以用的寶可夢。</span>');
  const opts = all.slice(growPage*per, growPage*per+per).map(({m,i,box})=>({label:`${box?'📦 ':''}${monName(m)}${genderSign(m)}　Lv.${m.level}`, half:true, action:()=> it.candy ? useCandy(k, box, i) : screenPpPick(k, box, i)}));
  if(pages > 1){
    opts.push({label:'◀ 上一頁', half:true, cls:growPage===0?'off':'', action:()=>{ if(growPage>0){ growPage--; screenGrowItem(k); } }});
    opts.push({label:'下一頁 ▶', half:true, cls:growPage>=pages-1?'off':'', action:()=>{ if(growPage<pages-1){ growPage++; screenGrowItem(k); } }});
  }
  opts.push({label:'← 返回背包', action:screenBag});
  setOptions(opts);
}
function useCandy(k, box, i){
  const m = (box ? state.box : state.party)[i];
  if(!m || !(state.bag[k] > 0) || m.level >= MAX_LEVEL) return screenGrowItem(k);
  state.bag[k]--;
  clearLog();
  print(`你給 ${nm(m)} 吃了神奇糖果！`);
  m.exp = Math.max(m.exp, m.expNext - 1);
  grantExp(m, 1, 0.0001, '得到', true);
  const done = ()=>{ saveGame(); setOptions([{label:'再用一個', half:true, cls:state.bag[k] > 0 && m.level < MAX_LEVEL ? '' : 'off', action:()=>{ if(state.bag[k] > 0 && m.level < MAX_LEVEL) useCandy(k, box, i); }}, {label:'← 返回背包', half:true, action:screenBag}]); };
  if(!box) runEvolutions(done); else done();
}
function screenPpPick(k, box, i){
  const it = ITEMS[k], m = (box ? state.box : state.party)[i];
  if(!m) return screenGrowItem(k);
  clearLog();
  print(`<span class="em">${esc(it.label)}：要用在 ${nm(m)} 的哪一招？</span>`);
  const opts = (m.moves||[]).map((mv,j)=>{
    const up = mv.ppUp||0, ok = mv.id && up < 3;
    return {label:`${mv.name}　PP ${mv.maxpp}${up ? `（已提升 ${up} 次）` : ''}`, half:true, cls:ok?'':'off', action:()=>{
      if(!ok || !(state.bag[k] > 0)) return;
      state.bag[k]--;
      const nu = Math.min(3, up + it.ppup), before = mv.maxpp;
      mv.ppUp = nu; mv.maxpp = ppMaxOf(mv.id, nu); mv.pp += mv.maxpp - before;
      saveGame();
      screenGrowItem(k, `<span class="good">${nm(m)} 的 ${esc(mv.name)} PP 上限變成了 ${mv.maxpp}！</span>`);
    }};
  });
  opts.push({label:'← 返回', action:()=>screenGrowItem(k)});
  setOptions(opts);
}

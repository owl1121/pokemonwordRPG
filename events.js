/* =====================================================
   events.js — 節日活動系統
   玩法：活動期間內完成活動任務 → 全部領完就解鎖該節日的「背景主題」，
        解鎖後在「🎉 活動」分頁選用，整個遊戲介面會換成節日風格。
   載入順序：data.js → battle.js → events.js → index.html 內的主程式
   新增節日：在 EVENTS 加一筆（日期、任務、theme.id），再到 index.html 的 CSS
            加上 :root[data-fest="主題id"] 的配色，以及下方 festFxHtml() 的裝飾即可。
   測試用：網址後面加 ?fest=halloween 可以強制開啟該活動（不受日期限制）。
   ===================================================== */

const EVENTS = [
  {
    id:'halloween', name:'萬聖節活動', emoji:'🎃',
    start:[10,1], end:[11,7],               // 每年 10/1 ~ 11/7
    intro:'夜晚的寶可夢們變得躁動不安……幫忙完成南瓜村的委託，就能解鎖萬聖節限定背景！',
    quests:[
      {id:'h1', name:'🎃 南瓜糖果：擊敗 20 隻寶可夢',            key:'wins',      target:20, reward:{items:{superpotion:3}}},
      {id:'h2', name:'👻 抓鬼大作戰：捕捉 3 隻幽靈或惡屬性寶可夢', key:'ghostCatch',target:3,  reward:{items:{ultraball:3}}},
      {id:'h3', name:'🕸️ 蛛網迷宮：在無限之塔通過 10 層',         key:'floors',    target:10, reward:{money:1500}},
      {id:'h4', name:'🦇 蝙蝠突襲：擊破 2 隻小魔王',              key:'bosses',    target:2,  reward:{items:{greatball:5}}},
      {id:'h5', name:'🧙 魔女的藥水：讓寶可夢進化 2 次',          key:'evolves',   target:2,  reward:{items:{ether:3}}},
      {id:'h6', name:'🍬 不給糖就搗蛋：擊敗 5 位訓練家',          key:'trainers',  target:5,  reward:{items:{maxpotion:2}}}
    ],
    finalReward:{money:3000},
    theme:{id:'halloween', name:'萬聖節背景', emoji:'🎃'}
  }
];

/* ---------- 日期 ---------- */
function festNow(){ return new Date(); }
function festForced(){ try{ return new URLSearchParams(location.search).get('fest'); }catch(e){ return null; } }
// 回傳 {active, start, end}：目前這一輪（或下一輪）活動的起訖日期
function festWindow(ev, now){
  now = now || festNow();
  const y = now.getFullYear();
  const mk = (yy)=>({ s:new Date(yy, ev.start[0]-1, ev.start[1]), e:new Date(yy, ev.end[0]-1, ev.end[1], 23, 59, 59) });
  let {s, e} = mk(y);
  if(e < s){ // 跨年（例如 12/15 ~ 1/5）
    if(now <= e){ s = mk(y-1).s; } else { e = mk(y+1).e; }
  }
  if(now > e){ const n = mk(y+1); s = n.s; e = n.e; }   // 今年已結束 → 顯示明年
  return {active: now >= s && now <= e, start: s, end: e};
}
function festActive(ev){ return festForced() === ev.id || festWindow(ev).active; }
function festActiveList(){ return EVENTS.filter(festActive); }
function festYear(){ return festNow().getFullYear(); }
const fmtMD = d => `${d.getMonth()+1}/${d.getDate()}`;

/* ---------- 進度 ---------- */
function festState(){
  if(!state.fest) state.fest = {joined:{}, themes:[], theme:'default'};
  if(!state.fest.joined) state.fest.joined = {};
  if(!Array.isArray(state.fest.themes)) state.fest.themes = [];
  return state.fest;
}
// 活動開始（或新的一年）第一次進來時，記下現在的統計數字當起點，之後只算活動期間的進度
function festTick(){
  const f = festState();
  festActiveList().forEach(ev=>{
    const j = f.joined[ev.id];
    if(!j || j.year !== festYear()){
      f.joined[ev.id] = {year:festYear(), base:Object.assign({}, state.stats), claimed:[], done:false};
    }
  });
}
function festProg(ev, q){
  const j = festState().joined[ev.id]; if(!j) return 0;
  return Math.max(0, (state.stats[q.key]||0) - ((j.base && j.base[q.key])||0));
}
function festClaimable(){
  const f = festState();
  return festActiveList().some(ev=>{
    const j = f.joined[ev.id]; if(!j) return false;
    return ev.quests.some(q=> !j.claimed.includes(q.id) && festProg(ev,q) >= q.target);
  });
}
function festClaim(evId, qid){
  const ev = EVENTS.find(e=>e.id===evId); if(!ev || !festActive(ev)) return;
  festTick();
  const f = festState(), j = f.joined[evId], q = ev.quests.find(x=>x.id===qid);
  if(!j || !q || j.claimed.includes(qid) || festProg(ev,q) < q.target) return;
  j.claimed.push(qid);
  giveReward(q.reward);
  let msg = `${ev.emoji} 活動任務完成！獲得 ${rewardText(q.reward)}`;
  if(ev.quests.every(x=>j.claimed.includes(x.id)) && !j.done){
    j.done = true;
    giveReward(ev.finalReward);
    if(!f.themes.includes(ev.theme.id)){
      f.themes.push(ev.theme.id);
      f.theme = ev.theme.id;                  // 解鎖後直接套用
      applyFestTheme();
      msg = `${ev.emoji} 全部完成！解鎖【${ev.theme.name}】，並獲得 ${rewardText(ev.finalReward)}`;
    } else {
      msg = `${ev.emoji} 全部完成！獲得 ${rewardText(ev.finalReward)}`;
    }
  }
  if(state.party.length) saveGame();
  notify(msg); openMenu('event'); refreshMenuDot();
}

/* ---------- 背景主題 ---------- */
function festSetTheme(id){
  const f = festState();
  if(id !== 'default' && !f.themes.includes(id)){
    const ev = EVENTS.find(e=>e.theme.id===id);
    notify('🔒 尚未解鎖：完成「' + (ev ? ev.name : '活動') + '」全部任務'); return;
  }
  f.theme = id;
  applyFestTheme();
  if(state.party.length) saveGame();
  openMenu();   // 留在目前的分頁（檔案或活動）
  const ev = EVENTS.find(e=>e.theme.id===id);
  notify('🖼 背景：' + (ev ? ev.theme.name : DEFAULT_THEME.name));
}
function festFxHtml(id){
  if(id === 'halloween'){
    return '<div class="moon"></div><span class="web">🕸️</span>'
      + '<span class="bat b1">🦇</span><span class="bat b2">🦇</span><span class="bat b3">🦇</span>'
      + '<span class="gh">👻</span><span class="pk pl">🎃</span><span class="pk pr">🎃</span>';
  }
  return '';
}
function applyFestTheme(){
  const f = festState(), id = (f.theme && f.themes.includes(f.theme)) ? f.theme : 'default';
  const root = document.documentElement;
  if(id === 'default') root.removeAttribute('data-fest'); else root.setAttribute('data-fest', id);
  const old = document.getElementById('festFx'); if(old) old.remove();
  const html = festFxHtml(id);
  if(html){ const d = document.createElement('div'); d.id = 'festFx'; d.innerHTML = html; document.body.appendChild(d); }
}

/* ---------- 「🎉 活動」分頁 ---------- */
// 背景主題選擇區（「🎉 活動」分頁和「👤 檔案」分頁共用）：預設叫「終端機」，其餘都是完成節日活動後解鎖
const DEFAULT_THEME = {id:'default', name:'終端機', emoji:'>_'};
function festThemeGrid(){
  const f = festState();
  const themes = [DEFAULT_THEME].concat(EVENTS.map(ev=>Object.assign({}, ev.theme)));
  const cur = (f.theme && f.themes.includes(f.theme)) ? f.theme : 'default';
  let h = '<div class="frgrid">';
  themes.forEach(t=>{
    const open = t.id==='default' || f.themes.includes(t.id), on = cur===t.id;
    h += `<button class="frbtn${on?' on':''}${open?'':' lock'}" onclick="festSetTheme('${t.id}')"><span class="thchip th-${t.id}">${t.emoji}</span><small>${esc(t.name)}${on?' ✓':open?'':' 🔒'}</small></button>`;
  });
  return h + '</div>';
}
function festHtml(){
  const f = festState();
  const bar = (c,t)=>`<div class="qbar"><i style="width:${Math.min(100,Math.round(100*c/t))}%"></i></div>`;
  let h = '<div class="mh">🖼 背景（完成節日活動就能解鎖更多）</div>' + festThemeGrid();

  const act = festActiveList();
  if(!act.length) h += '<div class="qi"><div>目前沒有進行中的活動<small>敬請期待下一個節日！</small></div></div>';
  act.forEach(ev=>{
    const w = festWindow(ev), j = f.joined[ev.id] || {claimed:[], done:false};
    const left = Math.max(0, Math.ceil((w.end - festNow())/86400000));
    const forced = festForced() === ev.id && !w.active;
    h += `<div class="mh" style="margin-top:12px">${ev.emoji} ${esc(ev.name)}　<span class="sys">${forced?'（測試模式）':`${fmtMD(w.start)} – ${fmtMD(w.end)}・剩 ${left} 天`}</span></div>`;
    h += `<div class="qi"><div><small>${esc(ev.intro)}</small></div></div>`;
    ev.quests.forEach(q=>{
      const c = Math.min(festProg(ev,q), q.target), claimed = j.claimed.includes(q.id), ok = c >= q.target;
      h += `<div class="qi${ok&&!claimed?' done':''}"><div>${claimed?'✅ ':''}${esc(q.name)}<small>獎勵：${esc(rewardText(q.reward))}</small></div>${bar(c,q.target)}<div class="qrow"><span>${c} / ${q.target}</span>${claimed?'<span>已領取</span>':ok?`<button class="claim" onclick="festClaim('${ev.id}','${q.id}')">領取</button>`:'<span></span>'}</div></div>`;
    });
    const got = f.themes.includes(ev.theme.id);
    const doneN = ev.quests.filter(x=>j.claimed.includes(x.id)).length;
    h += `<div class="qi${got?' done':''}"><div>${got?'✅ ':'🎁 '}全部完成獎勵：${esc(ev.theme.name)}　${esc(rewardText(ev.finalReward))}<small>${got?'已解鎖，可在上方切換背景':`已領取 ${doneN} / ${ev.quests.length} 個任務`}</small></div></div>`;
  });

  const upcoming = EVENTS.filter(ev=>!festActive(ev)).map(ev=>({ev, w:festWindow(ev)})).sort((a,b)=>a.w.start-b.w.start);
  if(upcoming.length){
    h += '<div class="mh" style="margin-top:12px">即將到來</div>';
    upcoming.forEach(({ev,w})=>{ h += `<div class="qi"><div>${ev.emoji} ${esc(ev.name)}<small>${fmtMD(w.start)} – ${fmtMD(w.end)}</small></div></div>`; });
  }
  return h;
}

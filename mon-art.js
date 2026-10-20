// mon-art.js — 每隻寶可夢的外框特徵（框外露出的一小塊特徵圖）。須在 battle.js 之前載入。
// 資料依組別拆檔，「用到才載入」（loadArtFile），不在 index.html 一次全載（全部約 4MB）：
//   一般版 mon-art-gen1.js ~ mon-art-gen9.js、mon-art-regional.js、mon-art-mega.js → Object.assign(MON_ART, …)
//   異色版 mon-art-shiny-gen1.js ~ …-gen9.js、…-regional.js、…-mega.js        → Object.assign(MON_ART_SHINY, …)
// MON_ART[DEX索引] = 一串 piece；每個 piece 是一張獨立的圖，疊在玩家選的球框「後面」，只露出框外的部分。
//   s：貼在卡片哪一邊  't' 上 / 'b' 下 / 'l' 左 / 'r' 右
//   上、下邊用  x（距左）、xr（距右）、xc（水平置中於該位置）；左、右邊用  y（距上）、yb（距下）、yc（垂直置中於該位置）。
//   svg：HTML 字串（目前都是 base64 內嵌的像素圖 <img>）。左側突出量盡量 ≤ 28px（卡片靠畫面左邊）。
// 沒有在 MON_ART 裡的寶可夢就不畫特徵。
const MON_ART = {};
const MON_ART_SHINY = {};

/* ---------- 延遲載入 ----------
   key：DEX 索引（數字）或超進化 'M'+MEGAS.id。索引範圍：
   gen1 0~150、gen2 151~250、gen3 251~385、gen4 386~492、gen5 493~648、gen6 649~720、
   gen7 721~808、gen8 809~904、regional 905~961、gen9 962~1081、mega 'M…' */
const ART_GROUPS = [[150,'gen1'],[250,'gen2'],[385,'gen3'],[492,'gen4'],[648,'gen5'],[720,'gen6'],[808,'gen7'],[904,'gen8'],[961,'regional'],[1081,'gen9']];
function artGroup(key){
  if(typeof key === 'string' && key[0] === 'M') return 'mega';
  const n = +key;
  for(const [hi, g] of ART_GROUPS) if(n <= hi) return g;
  return null;
}
function artFile(key, shiny){ const g = artGroup(key); return g ? 'mon-art-' + (shiny ? 'shiny-' : '') + g + '.js' : null; }
const ART_STATE = {};    // 檔名 → 'done' | 'fail'
const ART_PENDING = {};  // 檔名 → Promise
function artLoaded(f){ return !f || ART_STATE[f] === 'done' || ART_STATE[f] === 'fail'; }
function loadArtFile(f){
  if(!f || artLoaded(f)) return Promise.resolve(true);
  if(ART_PENDING[f]) return ART_PENDING[f];
  return ART_PENDING[f] = new Promise(res => {
    const s = document.createElement('script');
    s.src = f;
    s.onload = () => { ART_STATE[f] = 'done'; delete ART_PENDING[f]; res(true); };
    s.onerror = () => { ART_STATE[f] = 'fail'; delete ART_PENDING[f]; s.remove(); res(false); };   // 失敗就不畫特徵，不重試
    document.head.appendChild(s);
  });
}
/* 某隻寶可夢（m：有 dex、shiny、_mega）畫外框要用到的檔案 */
function artFilesFor(m){
  if(!m) return [];
  const keys = [m.dex];
  if(m._mega && m._mega.id != null) keys.push('M' + m._mega.id);
  const fs = [];
  for(const k of keys){ fs.push(artFile(k, false)); if(m.shiny) fs.push(artFile(k, true)); }
  return [...new Set(fs.filter(Boolean))];
}
function preloadArtFor(list){
  const fs = [...new Set((list || []).flatMap(artFilesFor))];
  const go = () => fs.forEach(loadArtFile);
  if(window.requestIdleCallback) requestIdleCallback(go, {timeout: 3000}); else setTimeout(go, 500);
}

/* 名字旁的小圖示：取這隻最大的那塊特徵圖（旋渦變形過），縮小放在名字後面 */
function monIconHtml(key, table) {
  const list = (table || MON_ART)[key];
  if (!list || !list.length) return '';
  let best = null, area = -1;
  for (const p of list) {
    const w = +(p.svg.match(/width=['"](\d+)/) || [])[1] || 0, h = +(p.svg.match(/height=['"](\d+)/) || [])[1] || 0;
    if (w * h > area) { area = w * h; best = p; }
  }
  const src = (best.svg.match(/src=['"](data:[^'"]+)['"]/) || [])[1];
  return src ? `<img class="nicon" alt="" src="${src}">` : '';
}

/* 把某隻的 piece 組成 HTML（舊的「貼在外框邊緣」畫法，目前沒用到）（疊在 .card.me 裡面；沒有專屬圖就回傳空字串） */
function monArtHtml(dex, table) {
  const list = (table || MON_ART)[dex];
  if (!list) return '';
  return list.map(p => {
    let st = '';
    if (p.s === 't') st += 'bottom:calc(100% - 2px);';
    else if (p.s === 'b') st += 'top:calc(100% - 2px);';
    else if (p.s === 'l') st += 'right:calc(100% - 2px);';
    else st += 'left:calc(100% - 2px);';
    if (p.s === 't' || p.s === 'b') {
      if (p.x) st += `left:${p.x};`;
      if (p.xr) st += `right:${p.xr};`;
      if (p.xc) st += `left:${p.xc};transform:translateX(-50%);`;
    } else {
      if (p.y) st += `top:${p.y};`;
      if (p.yb) st += `bottom:${p.yb};`;
      if (p.yc) st += `top:${p.yc};transform:translateY(-50%);`;
    }
    return `<span class="art" style="${st}">${p.svg}</span>`;
  }).join('');
}

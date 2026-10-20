// mon-art.js — 每隻寶可夢的對戰卡片底圖（高 8 格的馬賽克，鋪滿玩家和對手的卡片）。須在 battle.js 之前載入。
// 資料依組別拆檔，「用到才載入」（loadArtFile），不在 index.html 一次全載（全部約 1.1MB）：
//   一般版 mon-art-gen1.js ~ mon-art-gen9.js、mon-art-regional.js、mon-art-mega.js → Object.assign(MON_ART, …)
//   異色版 mon-art-shiny-gen1.js ~ …-gen9.js、…-regional.js、…-mega.js        → Object.assign(MON_ART_SHINY, …)
// MON_ART[key] = PNG data URL（高 8 格馬賽克，由原本的外框特徵圖套旋渦後縮小而成）。沒有在 MON_ART 裡的寶可夢就用原本的純色卡片。
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

/* 卡片底圖（馬賽克）的 data URL；沒有就回傳空字串 */
function monBgSrc(key, table) {
  const v = (table || MON_ART)[key];
  return typeof v === 'string' ? v : '';
}

// mon-art.js — 每隻寶可夢的對戰卡片底圖。須在 battle.js 之前載入。
// 底圖是 art/<key>.webp（異色 art/shiny/<key>.webp），玩家和對手的卡片都鋪滿（CSS 用 cover）。
// 產生方式（2026-10-20）：PokeAPI official-artwork 官方圖鑑圖 → 縮成 256 正方形 → 超強順時針旋渦 → 跟白色 30% 混合調淡
//   → 裁成 256×116 → WebP。工具與 key→圖編號對照見專案文件「外框特徵進度」。
// key：DEX 索引（數字，0~1081；905~961 是地區形態）或超進化 'M'+MEGAS.id（例如 'M6X'）。
// 瀏覽器只會在卡片顯示時才下載那一張圖，不用自己做延遲載入。

// 沒有官方異色圖的（用一般版底圖代替）
const ART_SHINY_MISSING = new Set(['570', 'M445Z', 'M978']);

/* 某隻寶可夢（m：有 dex、shiny、_mega）的底圖網址 */
function monBgSrc(m){
  if(!m || m.dex == null) return '';
  const k = (m._mega && m._mega.id != null) ? 'M' + m._mega.id : String(m.dex);
  return (m.shiny && !ART_SHINY_MISSING.has(k)) ? `art/shiny/${k}.webp` : `art/${k}.webp`;
}
/* 開機時先在空閒時載入隊伍的底圖，進對戰比較快出現 */
function preloadArtFor(list){
  const go = () => (list || []).forEach(m => { const u = monBgSrc(m); if(u){ const i = new Image(); i.src = u; } });
  if(window.requestIdleCallback) requestIdleCallback(go, {timeout: 3000}); else setTimeout(go, 500);
}

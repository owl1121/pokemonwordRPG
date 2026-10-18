// mon-art.js — 每隻寶可夢「專屬手繪」外框裝飾（不是通用零件拼的）。須在 battle.js 之前載入。
// MON_ART[DEX索引] = 一串 piece；每個 piece 是一張獨立的 SVG（寬高就是實際像素），疊在玩家選的球框「後面」，只露出框外的部分。
//   s：貼在卡片哪一邊  't' 上 / 'b' 下 / 'l' 左 / 'r' 右
//   上、下邊用  x（距左）、xr（距右）、xc（水平置中於該位置）；左、右邊用  y（距上）、yb（距下）、yc（垂直置中於該位置）。
//   svg 要自己畫好；靠卡片那一側約 5px 會被球框蓋住，圖要畫到底。左側突出量盡量 ≤ 28px（卡片靠畫面左邊）。
// 原則：照圖鑑畫；不畫腳（除非腳是唯一特徵）；尖的地方用 RP 做圓。
// 沒有在這裡的寶可夢就不畫特徵。
const MON_ART = (() => {
  const O = 'stroke="#1b1b1b" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
  const S = (w, h, inner, tf) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${tf ? `<g transform="${tf}">${inner}</g>` : inner}</svg>`;
  const P = (d, fill, x = '') => `<path d="${d}" fill="${fill}" ${O} ${x}/>`;                                   // 填色＋黑邊
  const RP = (d, fill, r = 3) => `<path d="${d}" fill="${fill}" stroke="#1b1b1b" stroke-width="${2 * r + 2.2}" stroke-linejoin="round"/><path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${2 * r}" stroke-linejoin="round"/>`; // 尖角做圓（圖形會外擴 r）
  const RF = (d, fill, r = 1.5) => `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${2 * r}" stroke-linejoin="round"/>`; // 圓角、無黑邊（內側色塊）
  const L = (d, col, w = 1.6, op = 1) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`; // 細線（紋路）
  const E = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${O} ${x}/>`;
  const R = (cx, cy, rx, ry, fill, op = 1) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${op}"/>`; // 無邊（高光、斑點）
  const T = (d, col, w) => `<path d="${d}" fill="none" stroke="#1b1b1b" stroke-width="${w + 4.4}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; // 有黑邊的粗線（尾巴、細枝）

  // Q版粗線風：粗黑外框、單色平塗、不加陰影高光
  const K = (d, fill, w = 4.4) => `<path d="${d}" fill="${fill}" stroke="#1b1b1b" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const KL = (d, col = '#1b1b1b', w = 4) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const SC = (svg, k) => svg.replace(/width="([\d.]+)" height="([\d.]+)"/, (m, w, h) => `width="${w * k}" height="${h * k}"`); // 整張放大
  const FLAME = RP('M20 56 C4 52 2 34 12 22 C14 28 18 28 18 20 C18 12 24 6 26 2 C28 14 40 20 38 38 C38 50 30 56 20 56Z', '#f08a28', 2) + RF('M20 54 C10 50 10 40 16 32 C18 36 22 36 22 30 C28 38 30 46 20 54Z', '#ffd84a', 1);                   // 40x56 火焰
  const FAN = (ang, ax, ay, len, w, c1, c2) => ang.map(a => `<g transform="translate(${ax} ${ay}) rotate(${a})">` + RP(`M4 0 C${len * .35} ${-w} ${len * .7} ${-w} ${len} 0 C${len * .7} ${w} ${len * .35} ${w} 4 0Z`, c1, 2) + (c2 ? RF(`M4 0 C${len * .25} ${-w * .6} ${len * .45} ${-w * .6} ${len * .55} 0 C${len * .45} ${w * .6} ${len * .25} ${w * .6} 4 0Z`, c2, 1) : '') + '</g>').join(''); // 羽毛扇（從 ax,ay 向外放射）
  const EAR = (w, h, c, ci, tf) => S(w, h, RP(`M4 ${h} C0 ${h * .5} ${w * .2} 6 ${w / 2} 4 C${w * .8} 6 ${w} ${h * .5} ${w - 4} ${h}Z`, c, 3) + RF(`M${w * .3} ${h} C${w * .28} ${h * .6} ${w * .4} ${h * .4} ${w / 2} ${h * .3} C${w * .6} ${h * .4} ${w * .72} ${h * .6} ${w * .7} ${h}Z`, ci, 1.2), tf); // 通用圓耳

  // ===== 二代共用小工具 =====


  return {
    /* ===== #001 妙蛙種子：背上一顆葉形球莖（Q版粗線風：粗黑線、單色平塗、頂端兩個小尖、一條彎葉脈） ===== */
    0: [
      { s: 't', x: '20%', svg: SC(S(136, 112,
          K('M6 112 C-4 80 14 54 42 42 C56 36 60 22 62 8 L72 18 L84 6 C88 24 98 36 112 46 C136 60 134 94 122 112Z', '#3f9a3f') +
          KL('M92 30 C104 48 108 72 98 94', '#1b1b1b', 4.6) +
          KL('M44 56 C38 70 38 86 44 100', '#1b1b1b', 3.8)), 1.2) }
    ],
    /* ===== #002 妙蛙草：粉紅花苞（粗線、頂端裂開、一道螺旋線），左右各一片粗線大葉 ===== */
    1: [
      { s: 't', x: '4%', svg: SC(S(210, 100,
          K('M78 104 C60 100 30 98 8 78 C28 70 50 70 66 76 C62 62 60 52 62 40 C76 50 90 66 96 84Z', '#3f9a3f') +
          KL('M80 98 C60 88 36 80 16 78', '#1b1b1b', 3.6) +
          K('M132 104 C150 100 180 98 202 78 C182 70 160 70 144 76 C148 62 150 52 148 40 C134 50 120 66 114 84Z', '#3f9a3f') +
          KL('M130 98 C150 88 174 80 194 78', '#1b1b1b', 3.6) +
          K('M80 104 C70 76 82 50 105 30 C108 24 108 16 105 6 C114 12 120 18 124 28 C140 48 146 78 134 104Z', '#c05aa6') +
          KL('M104 8 C100 26 118 36 122 54 C124 70 118 88 114 100', '#1b1b1b', 4.2)), 1.2) }
    ],
    /* ===== #003 妙蛙花：頂端四瓣大花（粗線、平塗粉紅、黃色花心），下面橫紋花莖，兩側粗線大葉 ===== */
    2: [
      { s: 't', x: '8%', svg: SC(S(210, 130,
          K('M74 128 C54 124 22 120 4 98 C26 90 52 92 68 98 C64 84 62 74 66 62 C80 72 92 88 98 104Z', '#3f9a3f') +
          KL('M76 122 C56 110 32 102 12 98', '#1b1b1b', 3.6) +
          K('M136 128 C156 124 188 120 206 98 C184 90 158 92 142 98 C146 84 148 74 144 62 C130 72 118 88 112 104Z', '#3f9a3f') +
          KL('M134 122 C154 110 178 102 198 98', '#1b1b1b', 3.6) +
          K('M82 130 L84 70 C98 78 114 78 128 70 L130 130Z', '#4fb04a') +
          KL('M84 90 C98 96 114 96 128 90 M84 108 C98 114 114 114 129 108', '#1b1b1b', 3.8) +
          K('M105 44 C84 44 82 62 98 68 C106 70 114 70 122 66 C138 60 132 44 105 44Z', '#e86a8a') +
          K('M105 8 C84 2 76 22 92 32 C100 36 112 36 120 32 C136 22 126 2 105 8Z', '#e86a8a') +
          K('M60 28 C40 24 28 42 40 52 C50 58 68 54 76 46 C84 38 76 30 60 28Z', '#e86a8a') +
          K('M150 28 C170 24 182 42 170 52 C160 58 142 54 134 46 C126 38 134 30 150 28Z', '#e86a8a') +
          '<circle cx="105" cy="34" r="12" fill="#f4d24a" stroke="#1b1b1b" stroke-width="4.4"/>' +
          KL('M100 34 C101 29 110 29 110 34', '#1b1b1b', 3)), 1.1) }
    ],
    /*__NEXT__*/
  };
})();

/* 把某隻的 piece 組成 HTML（疊在 .card.me 裡面；沒有專屬圖就回傳空字串） */
function monArtHtml(dex) {
  const list = MON_ART[dex];
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

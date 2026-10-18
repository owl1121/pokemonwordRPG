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
    /* ===== #001 妙蛙種子：像素風球莖（使用者提供的圖，直接用） ===== */
    0: [
      { s: 't', x: '7.1%', svg: '<img alt="" width="84" height="50" style="display:block;image-rendering:pixelated" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAACQCAYAAAA2oebIAAADS0lEQVR42u3du2tTcRjH4RzbiBDU4jU2tQhe8IJaHdwEXUT6DxQcRBQXBXF1dHF1EFRwc3ISF8FFR8FBoaBYK0pNbZtEEHHxktr4F+jgFzkYn2d/+zvJyacny0uKCv+00dHRXjLfbDaLZL7RaETnz83NFe7in1vmLQABAwIGBAwCBgQMCBgQMAgYEDAgYBAwIGBAwICAod8NegvKNbRxVbRPe+raRHT+1bM3o/PPXD8RnX/j7O3o/A+d9n+9T+wJDAIGBAwIGAQMCBgQMCBgEDAgYEDAIGBAwICAAQFD37MPnIv2WT+1P0eHf/3SieYv3TkfzX+cfxfNf+i0fYI8gUHAgIABAQMCBgEDAgYEDAgYBAwIGBAwCBgQMCBg4Nf64bdVo33cofrK6PCTl49H86+fz0fz1eXZSveOAyPR/Ktn76P5kS1ro/kbF+5G8/V6PZpvtVqlNuQJDL5CAwIGBAwCBgQMCBgQMAgYEDAgYBAwIGBAwICAoe+V/vvAa4ZXRfu8p6+MR+d//xYdX5l53Yrmdx5oRPNTk9n5vcqPaH5xcSmar62rRvMXb01E85OPZ6L5pfu96APU6bSjfWJPYPAVGhAwIGAQMCBgQMCAgEHAgIABAYOAAQEDAgYEDH0v3gdevTbb5x0/d6zUV/DuxUI0v31sOJovekU4n73+IvwXvmss22eefpb9PvKOg9n7P3Z4S/b+hb8O/PLBQHQHPYHBV2hAwICAQcCAgAEBAwIGAQMCBgQMAgYEDAgYEDD0vcFarRbtI+7bsz+7gnChdSrcJ129bkOZl1+Znsyuf/ehTeU+AVZk81t317P3L90nDve5N45m1/9o/oknMPgKDQgYEDAgYBAwIGBAwICAQcCAgAEBg4ABAQMCBn5n8NK9i9EfmH2a7WNOPXiTvYJqtpA7dDQ7vjXbjea73aXwFg6E80ulfgAHqtn1d79n97/dXAyvv+oJDAgYBAwIGBAwIGAQMCBgQMCAgEHAgIABAYOAAQEDf9PgwnQr+gOzC9k+b21vts+5eWRbND/98G003ziyPrsD4e8Lt5rdSqkXECp6Rann9yrFPx2wJzAIGBAwIGAQMCBgQMCAgEHAgIABAYOAAQEDAgYEDH3vJ0xtjGWxJBttAAAAAElFTkSuQmCC">' }
    ]
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

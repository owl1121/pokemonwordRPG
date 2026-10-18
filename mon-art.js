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

  const SC = (svg, k) => svg.replace(/width="([\d.]+)" height="([\d.]+)"/, (m, w, h) => `width="${w * k}" height="${h * k}"`); // 整張放大
  const FLAME = RP('M20 56 C4 52 2 34 12 22 C14 28 18 28 18 20 C18 12 24 6 26 2 C28 14 40 20 38 38 C38 50 30 56 20 56Z', '#f08a28', 2) + RF('M20 54 C10 50 10 40 16 32 C18 36 22 36 22 30 C28 38 30 46 20 54Z', '#ffd84a', 1);                   // 40x56 火焰
  const FAN = (ang, ax, ay, len, w, c1, c2) => ang.map(a => `<g transform="translate(${ax} ${ay}) rotate(${a})">` + RP(`M4 0 C${len * .35} ${-w} ${len * .7} ${-w} ${len} 0 C${len * .7} ${w} ${len * .35} ${w} 4 0Z`, c1, 2) + (c2 ? RF(`M4 0 C${len * .25} ${-w * .6} ${len * .45} ${-w * .6} ${len * .55} 0 C${len * .45} ${w * .6} ${len * .25} ${w * .6} 4 0Z`, c2, 1) : '') + '</g>').join(''); // 羽毛扇（從 ax,ay 向外放射）
  const EAR = (w, h, c, ci, tf) => S(w, h, RP(`M4 ${h} C0 ${h * .5} ${w * .2} 6 ${w / 2} 4 C${w * .8} 6 ${w} ${h * .5} ${w - 4} ${h}Z`, c, 3) + RF(`M${w * .3} ${h} C${w * .28} ${h * .6} ${w * .4} ${h * .4} ${w / 2} ${h * .3} C${w * .6} ${h * .4} ${w * .72} ${h * .6} ${w * .7} ${h}Z`, ci, 1.2), tf); // 通用圓耳

  // ===== 二代共用小工具 =====


  return {
    /* ===== #001 妙蛙種子：背上三瓣的綠色球莖（中間那瓣最高、頂端尖，頂上一小撮葉尖） ===== */
    0: [
      { s: 't', x: '14%', svg: SC(S(150, 112,
          P('M12 112 C-2 88 0 60 24 48 C42 40 54 28 58 14 C66 28 74 46 76 70 L76 112Z', '#3d8a36') +
          P('M138 112 C152 88 150 60 126 48 C108 40 96 28 92 14 C84 28 76 46 74 70 L74 112Z', '#3d8a36') +
          P('M40 112 C34 84 42 52 60 34 C67 26 72 18 75 8 C78 18 83 26 90 34 C108 52 116 84 110 112Z', '#459a3e') +
          RF('M50 104 C46 82 50 58 62 42 C60 62 62 84 66 104Z', '#78c86a', 1.3) +
          L('M60 36 C56 56 58 84 64 110 M90 36 C94 56 92 84 86 110', '#2a6a26', 1.8, .75) +
          P('M64 16 L68 2 L74 10 L79 0 L82 12 L88 6 L86 20 C78 24 70 24 64 16Z', '#58b24c') +
          L('M12 70 C10 82 14 96 22 106 M138 70 C140 82 136 96 128 106', '#2a6a26', 1.6, .6)), 1.25) }
    ],
    /* ===== #002 妙蛙草：粉紫色花苞（頂端裂開、有螺旋紋），左右各一片鋸齒大綠葉 ===== */
    1: [
      { s: 't', x: '0%', svg: SC(S(236, 100,
          P('M88 100 L52 98 L60 90 L18 84 L38 76 L6 64 L40 62 L24 42 L52 54 L52 32 L70 54 L84 64 L98 86Z', '#3d8a36') +
          L('M92 94 C70 84 44 74 14 64 M64 88 L34 82 M70 70 L50 50 M56 76 L38 64', '#2a6a26', 1.8, .8) +
          '<g transform="translate(236 0) scale(-1 1)">' +
          P('M88 100 L52 98 L60 90 L18 84 L38 76 L6 64 L40 62 L24 42 L52 54 L52 32 L70 54 L84 64 L98 86Z', '#3d8a36') +
          L('M92 94 C70 84 44 74 14 64 M64 88 L34 82 M70 70 L50 50 M56 76 L38 64', '#2a6a26', 1.8, .8) + '</g>' +
          P('M84 100 C78 74 86 46 106 28 C110 20 113 14 116 6 C119 14 123 20 130 28 C150 46 158 74 152 100Z', '#c05aa6') +
          RF('M92 94 C88 74 92 52 104 38 C102 58 104 78 108 94Z', '#e48ed0', 1.3) +
          L('M118 20 C110 36 126 44 132 56 C137 68 132 82 130 98', '#7a2a66', 2.2) +
          P('M104 24 L100 12 L108 18 L112 6 L116 20Z', '#c05aa6') +
          P('M130 26 L134 14 L126 18 L124 6 L118 20Z', '#a84a92')), 1.2) }
    ],
    /* ===== #003 妙蛙花：頂端大花（四瓣、中心有螺旋），下面是橫紋圓柱花莖，兩側鋸齒大葉＋底部小葉 ===== */
    2: [
      { s: 't', x: '6%', svg: SC(S(224, 132,
          P('M84 126 L40 118 L52 110 L8 100 L36 92 L4 80 L40 78 L22 58 L56 70 L58 48 L76 70 L86 82 L96 108Z', '#3d8a36') +
          L('M94 112 C70 100 40 90 10 80 M64 108 L30 102 M68 90 L50 70', '#2a6a26', 1.8, .8) +
          '<g transform="translate(224 0) scale(-1 1)">' +
          P('M84 126 L40 118 L52 110 L8 100 L36 92 L4 80 L40 78 L22 58 L56 70 L58 48 L76 70 L86 82 L96 108Z', '#3d8a36') +
          L('M94 112 C70 100 40 90 10 80 M64 108 L30 102 M68 90 L50 70', '#2a6a26', 1.8, .8) + '</g>' +
          P('M80 128 C82 112 84 100 86 62 L138 62 C140 100 142 112 144 128Z', '#4fa84a') +
          RF('M88 120 C90 104 92 86 94 66 L102 66 C100 86 98 106 98 122Z', '#86d478', 1.2) +
          L('M86 76 C100 82 124 82 138 76 M86 90 C100 96 124 96 138 90 M86 104 C100 110 124 110 140 104', '#2a6a26', 2.2, .85) +
          P('M66 128 L76 116 L82 124 L90 112 L96 126Z', '#58b24c') + P('M158 128 L148 116 L142 124 L134 112 L128 126Z', '#58b24c') +
          P('M112 40 C86 40 78 56 96 62 C104 64 120 64 128 62 C146 56 138 40 112 40Z', '#d8607c') +
          P('M112 4 C90 -2 80 16 96 26 C104 30 120 30 128 26 C144 16 134 -2 112 4Z', '#e8708a') +
          P('M62 30 C42 26 30 42 42 52 C52 58 70 54 78 48 C88 40 80 32 62 30Z', '#d8607c') +
          P('M162 30 C182 26 194 42 182 52 C172 58 154 54 146 48 C136 40 144 32 162 30Z', '#d8607c') +
          RF('M100 14 C104 8 118 8 124 14 C116 12 108 14 104 18Z', '#f8a8bc', 1) +
          E(112, 34, 15, 11, '#f2d86a') + L('M104 34 C106 28 118 28 118 34 C118 40 108 40 108 35', '#b8902a', 2)), 1.15) }
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

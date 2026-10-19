// mon-art.js — 每隻寶可夢的外框特徵（框外露出的一小塊特徵圖）。須在 battle.js 之前載入。
// 資料依世代拆在 mon-art-gen1.js ~ mon-art-gen5.js，各自用 Object.assign 加進 MON_ART；index.html 要在本檔之後依序載入。
// MON_ART[DEX索引] = 一串 piece；每個 piece 是一張獨立的圖，疊在玩家選的球框「後面」，只露出框外的部分。
//   s：貼在卡片哪一邊  't' 上 / 'b' 下 / 'l' 左 / 'r' 右
//   上、下邊用  x（距左）、xr（距右）、xc（水平置中於該位置）；左、右邊用  y（距上）、yb（距下）、yc（垂直置中於該位置）。
//   svg：HTML 字串（目前都是 base64 內嵌的像素圖 <img>）。左側突出量盡量 ≤ 28px（卡片靠畫面左邊）。
// 沒有在 MON_ART 裡的寶可夢就不畫特徵。
const MON_ART = {};

/* 把某隻的 piece 組成 HTML（疊在 .card.me 裡面；沒有專屬圖就回傳空字串） */
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

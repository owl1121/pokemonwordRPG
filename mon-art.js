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
    ],
    /* ===== #002 妙蛙草：像素圖（使用者提供，直接用） ===== */
    1: [
      { s: 't', x: '5.8%', svg: '<img alt="" width="91" height="69" style="display:block;image-rendering:pixelated" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAACwCAYAAAAxDeP+AAAESUlEQVR42u3dzW/TdQDH8f62tuPB4WOCuCFTJ4QYcQxxDCOJEU/KkWAgPtxMNIb4B8iBhOjB06IhIfGiR2M8c5BGRRSYOnxITAQ2UaCoWdBEga3tz/+gl0/Isvl63T9ru/bdXy/f/IoKmZ5KGe07C/4KCm/iYv74AQIGBAwIGAQMCBgQMCBgEDAgYEDAIGBAwICAAQHDElf9v/8Dlley87yv7XgyevzdGzZG+xvhW7j3yET0+i+UzhO7AgMCBgEDAgYEDAgYBAwIGBAwIGAQMCBgQMAgYEDAwE206M9y3lHpjc6zHnzupejxR29bFe2/njqZPf6WkWg/X2Yfgb2H3432l5wndgUGAQMCBgQMCBgEDAgYEDAgYBAwIGBAwCBgQMCAgIFuFv39gVuVdrS/5+5bo/3szO/ZN2i5LNr3trPv4J7sOHVl+6Pbov1Hp09HT6CsdMJPUJl+BBf0PLMrMPgJDQgYEDAIGBAwIGBAwCBgQMCAgEHAgIABAQMChiUvPg88sG44OlB58Zez0eMf2Pd8tL+r1Yr2P1w5H+23jI5E+97wPOuF5p/R/pn1G6L93/Wr0X7w6a3Rvuhkx3nfO/R+9ga0s/PErsDgJzQgYEDAIGBAwICAAQGDgAEBAwIGAQMCBgQMCBiWvGrjs0Z0nvHNiTeiJ3Df8MpoP1/LznM2m7PZ44ffgdOz2Xncepm9/iJ8/kV4f+K+9u3R/sdPZ6L9ycbnaUPuDwwIGAQMCBgQMCBgEDAgYEDAgIBBwICAAQGDgAEBAzdTfJbxxYO7o/PEVy5m53Gv/fxHtH927SPZN+DZZrRfu2Yg2reKTrSfq2a3t/145ttov3rn5mh/57rV0f6tV96O9uXcwjboCgx+QgMCBgQMAgYEDAgYEDAIGBAwIGAQMCBgQMCAgGHJK745cyY6EPrq6/ujJzA8fm+07/S1on2z8V203zUwGu37W9mR7E+mf4r2v63IHn/F0C3Rvt1zPbsC1f6J9pu2b4r2fXP90f7Qy++4AoOf0ICAAQEDAgYBAwIGBAwIGAQMCBgQMAgYEDAgYKCb+P7AeyYOROeJzx89ET1+/1/Z/XHne7J/QVm0o32n599ov3PPjmh/fOpYtB954qHs/1dWo/3kie+jfa3VF+3rrXq0P/pBwxUY/IQGBAwIGBAwCBgQMCBgQMAgYEDAgIBBwICAAQED3cTngR/b/0J0Hrgso3mlDJ//A4PZ/YnPHfsy2i+/nt0f91o9228e3xjt1wytivbHT32Rff7GxqN9p7wR7Scns/d/bOvjrsDgJzQgYEDAgIBBwICAAQEDAgYBAwIGBAwCBgQMCBjoppr+gaK2LNvPZedZhwYHo/39Dz8Y7tdnb0Ar+//Xwv2HRw5H+23FcPb+t1dG+8uXrkb76V/PZa9/7Klo/9WpKVdg8BMaEDAgYEDAIGBAwICAAQGDgAEBAwIGAQMCBgQMdPMfvj65OSQEgokAAAAASUVORK5CYII=">' }
    ],
    /* ===== #003 妙蛙花：像素圖（使用者提供，直接用） ===== */
    2: [
      { s: 't', x: '7.8%', svg: '<img alt="" width="85" height="62" style="display:block;image-rendering:pixelated" src="data:image/png;base64,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">' }
    ],
    /* ===== #004 小火龍：尾巴上的火焰（底邊接卡片上緣）：像素圖（第三代火紅葉綠，照使用者的方式切出特徵） ===== */
    3: [
      { s: 't', x: '78%', svg: "<img alt='' width='30' height='51' style='display:block;image-rendering:pixelated;position:relative;top:4px' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAzCAYAAACAArhKAAAA40lEQVR42mM8e3YNA7lAc2rIfxj7evYaRlL0MjEMEBgwixkpCeoh6eNRi0dAqv6WxAAvBDidOOAS5zSXMFK70EDWO8ILEOSgoHWwj5bVJAW70fUYuJrv+34wkBLsIy+oWUjVgBy8yAA5OkZTNdlBjZxiiQlSYgqW0QKEYNCRmpJxFSwjvAWCKwXiCmpigh05qEdTNUmpF1fQjbarqV4tkgpwtV5Gg5pggUBqQTGaqsluV5MKRstqqjT2cAUjMVEzGtRYG2a4qssXL7yw6pXYt200qMlL1cjBLlg77z+5lo3sdjUAK79uzpgeQlYAAAAASUVORK5CYII='>" }
    ],
    /* ===== #005 火恐龍：尾巴上的火焰（底邊接卡片上緣）：像素圖（第三代火紅葉綠，照使用者的方式切出特徵） ===== */
    4: [
      { s: 't', x: '76%', svg: "<img alt='' width='48' height='63' style='display:block;image-rendering:pixelated;position:relative;top:4px' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAA/CAYAAACmVEtSAAABk0lEQVR42u2ZoW/CQBjFr8vMXCVIZOfAbW4WSVDTyP0J+zOQlQuKTOIa3FAUR2Ul/AfITq39mtwX7muv613znirJpc3lfnnvfUdwPG6VRNFmWfw9Z+/bQPWsB+W5vN9AIEUIJ4AN1PXY9Qe6di0g5JQLuRZSQMg7F3qajnAC2ICtLmTiSHQNldTB2rgfEHK2C1FH4o6YPtM1/xmIQMiLOk1xmmUfJR6307Wxw3AOBoQGg1AarQMdNhxaJji1cTwg5GwXKr5GhQQbE0lx4lAEQl7XaU4maNlCyKSiAyFng0zqQm2wQRcavAtxONnCRvoe6khAaDBBZoKBLYTgQt4N9dykRqcnrs/UsJnM9GiptDFOQMg7hLj7nDZOQtGS4gSEeg+y9TQskXiJ48Y3ySZXhXk21xMU7SqEFmRNnt4d9oFQ7y70mVc/kg4+UAuy7D5az+hCQw8ykymJOpI04G7fOy1+uBdyNsjCsAqyJImt/yXKVe7zRl+t95cfJQlWINS7C3WBDedOVIfLqkTrbfyKod5b/QI45MInPxLdmwAAAABJRU5ErkJggg=='>" }
    ],
    /* ===== #006 噴火龍：翅膀（靠身體的直邊接卡片右框）：像素圖（第三代火紅葉綠，照使用者的方式切出特徵） ===== */
    5: [
      { s: 'r', yc: '45%', svg: "<img alt='' width='45' height='90' style='display:block;image-rendering:pixelated;position:relative;left:-4px' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAABaCAYAAAAsPd/jAAABhklEQVR42u3ZrVLDQBSG4Q2DwOJiI3MZDA4JElkcdZUFBZV1wYHEUe6Aa0CujI2rxQXDNNuZLOySbvYn71HJtNM5k3n6nZMkezsTrfipz+o5ExHUkYiwomz6uCwvu7P5Tdv3pdDYwGM0HurJHhW1AmMDDy88dBUaG3h44SHl+98kLNm4oAIP7+lx3hS742q7tuPBlZ7ScJmfLvo/aLrDj7zuZ+MgSeARFA+Tsh1M8JgUD6P95EBJAo/oeKgDqJJrp0kCD5qm6SkMFxeDBh6j8VBXSu0dSmCDBh40TdMhpMehEmPMQQOPZHYPF4MGHjRN0zRN04kNl5Oye1X3Jev/7xvwSIXHEBJ7b3vzjod6Q81zj6h5qCSGUGG4JJ8eXGl4/ELCV2LAI4rV1LZ06ygv9KPmMSQlTNZRIS6sfnP59NrCI7n0sK1l87hjsMrvMtIDHgZUhCjg4ZfH7KHs/be+3MvW974hrmp4jM9DR0LHRkfFdt9Qd4nV7TWPxRguahmR2BSkh9f6BinZiM/NGccoAAAAAElFTkSuQmCC'>" }
    ],
    /* ===== #007 傑尼龜：捲尾（左直邊接卡片右框）：像素圖（第三代火紅葉綠，照使用者的方式切出特徵） ===== */
    6: [
      { s: 'r', yc: '50%', svg: "<img alt='' width='40' height='56' style='display:block;image-rendering:pixelated;position:relative;left:-4px' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAA4CAYAAACPKLr2AAABKUlEQVR42u2ZoQ+CQBjFD2cg8i8YiWSbEZvRqDYiNG1qg2bE5kiM5jVszkg0GvkXbFi5z+1uN2Bj8F47uINve7+9j+OMjc0qVpN3Sw3WI01Yz4UCm2qqu4C/RGapHh8uXR+uXQMWo8A6g1lpCRc8MiFIuMCc74XSB5qlLb0fJFGlwyQsHnyBhmVZ0lzb35+dFsCzSJqTsHh8vdg/xZ2+8Fu8hXFxzcQJaxcWjzwHVQyaji3NMZUWM5fpfE/CYuxJVL2TMkUZpTov59LcpbkIi4fPYNPeS5mjvbZpr4fFyEEqmlOq3gqLUWDbDLat6LATxnkeY188sj3J8ZJWbTLkbFdaOUqZg8XIQV1R5v7+tRCpmIPFYFCVcyrpMgaL0YtV5yRtMwWLUSDRDysPU5bT8tUaAAAAAElFTkSuQmCC'>" }
    ],
    /* ===== #008 卡咪龜：毛尾巴（左直邊接卡片右框）：像素圖（第三代火紅葉綠，照使用者的方式切出特徵） ===== */
    7: [
      { s: 'r', yc: '50%', svg: "<img alt='' width='42' height='75' style='display:block;image-rendering:pixelated;position:relative;left:-4px' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAABLCAYAAAAGaxWkAAACNklEQVR42u2aIXDCMBSG290EssjK4sAxydSQxQ23SdyKQ1JZO0flLK5ySByVm1px1FEHSFymVt7u8i5Jm7Zw934VaBJ69+W9/C/BZIe9oaI4O7O/9irMhP1dz87bA7tlGgV1Z9yIbuZFTRn0vp8yHkrHbgnHptnZ4C2VIHBMQn+V6CFuL3C0//B0HObtKPJMQt8o+jLRHfqpMOFj88gsA0KvW/fYAxncENlsMeH2gUkeLgOo9XcIPnkU9fWjx9CUkcycw75He339CX/+tim8p0ML9z79EGYAqNHjQ94+7hLa6+tHvz/sWdHBmHvfbldIMjeUcBP6ShM+3K+7XdfQ4eph1M+MCTfSqa5vHP2LO+M+6HU6eTvZJdxIh+o7XfDpVHhPJ/T1FXeMcRO+78XcBC6zj8sIegOq6xuJeog4CAfcTtE6yNtxkhZGjGk8DhnV9Y06fKhwObpYsuPxgmnoCzMA5vZljnT+LTmwDAh9pQm/3W4LB3xuvoS4F5Hano4ViYS+UvSWZTEVO1cmumUOe7H5Cb1+hz9oFR4Ma3ZYxGH1vgxiuITg/IReO/plfMH0KhHpqpI5yMWWENm8StGXGQz3fdWDXNgf8w+E/mrRQ0HcECt2kCuDGx4BEfpKbZ4MjqpFDv8moj5bWXnbdk9aXgi7uyf0jTh87O+XLlK+w+IOun3sexjp2I0eodee8J+f5sJLWxnbpoqb7usbR7/52THdk+rCTehvwuFD9To9rktXxU3oq9QvSkoJP8Oq2r0AAAAASUVORK5CYII='>" }
    ],
    /* ===== #009 水箭龜：水砲（底邊接卡片上緣）：像素圖（第三代火紅葉綠，照使用者的方式切出特徵） ===== */
    8: [
      { s: 't', xr: '10%', svg: "<img alt='' width='36' height='63' style='display:block;image-rendering:pixelated;position:relative;top:4px' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA/CAYAAACIEWrAAAABwklEQVR42u2YoVLDQBCGLwwGRx8hMnVX2SoqE4dMZSVxLaqgKimuyKJoHLJ1IOtoXCv7COENDkXyM3M7l0suMx1mf7WT3O1k7pt/d3Pe09ebMOnqKNRvvE0z7ZqbufSEA12IM9PZfZCHyCg0m83CmCiKpk5QMjIjsjCcKBOal/Va6FCGsSziu9HIiLIKPkZm0iX1otPpGDfvdkLUdSUjq40Mjxfd1ESYB/NH0VSZHMfIarusivr9sfY5Oo4qmOyy2r1MKaVsCiOFCUX1OOxrt8G+iPN47DGyxi7L89w4fthiWsbl+kX6XcQ+u8yFy5rodDgUcXL/qkWG+sz2jKy5y/DYbdUbDEo3jSW+4V7mFpkrTHG/LHX7Y1kAh1K/F9cwslYnxm2W/f8TOj9kOFqEUlptfkgSrbP+uC+4ZmTtuQxHBfrGY2XEhBpKff/qJWWe2ceSh/zqyNBZlMsQZRVMVZxF5WFkRmR+t+tk/KCEA/x0lWmdxciskLnCZNuzuJc5nxipaTDdnYh/Lr2qOIuRWSGj0ODFFI4cbWBiZK3+lyEOxIfP32dBGT8+Fxdi/nzCLnOLjHIWJby1QExUIZ2xyxzoBzI+rX716GkBAAAAAElFTkSuQmCC'>" }
    ],
    /* ===== #010 綠毛蟲：頭上紅觸角（底邊接卡片上緣）：像素圖（第三代火紅葉綠，照使用者的方式切出特徵） ===== */
    9: [
      { s: 't', x: '10%', svg: "<img alt='' width='39' height='24' style='display:block;image-rendering:pixelated;position:relative;top:4px' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAYCAYAAAB5j+RNAAAA9ElEQVR42mM8e3YNAwz8KJn6nwEL4OjJZmQYAMDEMIjBoHYc41FHR3hUWmUbYVV0bOo5mkYxruQ0Gq1kR2t1kiU8SL3uczAQimLBlLlw9t69c7BG8brz2+BmXj92HKs5xfclCNo1Gq1Uj1ZkoGn1Aau40tT7cLZTkCTB6MNlDjK4fkxgNFopj1bkutXZOQUexVsNDUmKYuTooET9aG6lerQiA+Qozg7SZCCUoykB3ufPj0YrfaIVGbROrYVH8b51zxkI5WhSo6/nqNVotNInWpGjck5PEKI59BwRNfd73xPMxdsUf8DZisWCBB10/7jEaLRSDABhBlm/UxXxsQAAAABJRU5ErkJggg=='>" }
    ],
    /* ===== #011 鐵甲蛹：殼的尖角（底邊接卡片上緣）：像素圖（第三代火紅葉綠，照使用者的方式切出特徵） ===== */
    10: [
      { s: 't', x: '10%', svg: "<img alt='' width='78' height='30' style='display:block;image-rendering:pixelated;position:relative;top:4px' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAeCAYAAACCJCjqAAACH0lEQVR42u2ZMVPCQBCFN44Ff4EyZfwJ0mGXUjpb6Ci1Y6wcOinpwNJKKdNhpx1jJ2VK/4IdFsdjyJrl7pJDHNzXMFxC5pL98vbdES0WT1Smx3y42v5+FQ8i+ocajm8Lz2HQv4uIiE5IVUmnEmlpp10cfzbjx04eJyy9jgvHL1q9lRIXkjhJSdI0FRmZiuBdPzbCOGnL5Wfp75S4fRPHK/FXyOPdP8++yGVeII17GJSNciIiitOGEncQ4uKzxFT0Y3lQ8jhhvPt3etM1cbu9TCKJv1kgT4k7lMfZPO9lZrrQfD6JfoOwjbet3wTXPAaS8iwvPX7TeiMiou7EjE97eeG+lLiKiqS16nvjYbXtbVJlJaGivgRyUvrT1IkwTsr967nXg+DzBWmQEhfK46RdEJ6YOXmu3odPrPG42pdN2kWYK+GYL64HgqSc9iM1oMvOaCdp2lXrEoekjUpjFwTjaaeY33iecxX3DGkt7HtdkLaZr9A9JfKktSiuJ0mJC5XjkJPGWRaEtH2Jk4JuyMmCd/FcxgUvk3KbEheKOKwxh12Tn2y5aV/kgSB4nStpvh4Lkmzd3SYlLvRale+AwvuqkgaSbMRI5Em/A0E8v9l2P3A+P8/mbUpcKOK414E4VCBJ6nmatK8lkeHrZTbCJK/rpnGl+1HiQntcKNmSu6sn2XJXXbl6mxIXmriN143K/28MRRrv3r7k+eauUKQpcTX1DepQNeSLD6WdAAAAAElFTkSuQmCC'>" }
    ],
    /* ===== #012 巴大蝶：翅膀（左直邊接卡片右框）：像素圖（第三代火紅葉綠，照使用者的方式切出特徵） ===== */
    11: [
      { s: 'r', yc: '45%', svg: "<img alt='' width='81' height='93' style='display:block;image-rendering:pixelated;position:relative;left:-4px' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFEAAABdCAYAAADdTYpNAAADKklEQVR42u2dIXfqQBCFyTv9ASCRSHCVjYwsDktdJbJxrazExr0ncT0oqGscVLWVSCS2/6B1YUTm7MzbTZgk96qwJ5B0z/0ys7ObbfTx8dLrktJ0/eM65+vrtbT97e1vVNb+pwd5C50YQNFs9uC09+PjTdQWVPN85fyd/X5fHD89ZaXnLJezCE4EzsZw3mx2pQi8vx+K4yxLnRHKArYSVLXi0KYRHE4EzkZw7vf7zoh2KYTrxJZTkszhRODcFJwtjJ2bgi2cCJxt66rOi63X3z/nJDY3ha3kHrjvwonAucU4y7C9N4stnAicO44zTZifnxe987Eb29PpVBwPh0NT2GLsDJw7gjNFeLVaqlDl2rVj2DqxhROBs22pS2EShKk4hOfzNPgf4zP+5b6LiSrg3LLorEVYgo/2UaCNnqGS8DiOyacMTgTOTcRZi3CWvZKIlvf+F38umlMMOVRpe53VcjgRnWgQZy3CNGGO4yQ4wlx7FWNnbYJNl9bAicDZCM50UolWpCUIa7HlJEE41HV9Sl5wInA2jjNNjBeL2+L4eDyWRqhQCPuMtX3Ka6FewYATgbM9Rbtd+SsY1MY0ao9Go1LkabtEHHoUtypQlWgwGJS24wVJ4NygsbMPwly7dkJKUpH2WXaiva7k9RM4ETgbwZlDmIqiyrVzSalPcq4tkUnQxtgZOHckOktUBbYShKtYdkLFVa3hRODcoLEzfd95u906sb2UJKUw7aPAB2E4ETgbx/n6+taZeEvkUy6rIsHm0AbOwLkjOPtET5+Kdyi0JdGZ7vcFJwLnFifbocbUEvy14kpzknsIhTCciE40jjOVBG2fpLrq0lbVCMOJ6ESDOHMb8+b5v9rQlujz8/ybd3dT5/l1blcIJ6ITbUg0UTWduvGhyPsgPJlMVNfS3iecCJxbjPN4PC4+HA7nvbWT5F4VqUOh5DN+hxOBM6KzStwqMm7OWjvhJVmmQpN5+hi51H7gcCI60QjONCJLRMtKaZox2/0tnHhya8K59jpLZ3AiOrEj0dkHbZ8oTBVq+QecCJzbJVFlW4sM918tJIk3t/sHlQWE4UR0oj39AhKR3l0pfCrzAAAAAElFTkSuQmCC'>" }
    ],
    /* ===== #013 獨角蟲：頭上的角（底邊接卡片上緣）：像素圖（第三代火紅葉綠，照使用者的方式切出特徵） ===== */
    12: [
      { s: 't', x: '12%', svg: "<img alt='' width='35' height='30' style='display:block;image-rendering:pixelated;position:relative;top:4px' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAeCAYAAACmPacqAAAAcklEQVR42mM8e3YNA7lg27YX/9HFpk5twVC3desURmLMY2IYRGDUMUPCMSyUJNaammwMdV5elhhi3t7e/4lJ1KPRNOqYUceMOma0BCa2tCUWbN26lahSeTSaRh0z6phRx4ysEpjapS0lpfJoNI06hlQAAAHbInS7iGm3AAAAAElFTkSuQmCC'>" }
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

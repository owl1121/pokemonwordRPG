// mon-parts.js — 寶可夢特徵（耳朵、尾巴、翅膀…）零件庫＋各寶可夢設定。須在 battle.js 之前載入（一般 <script src>）。
// 邊框一律照玩家的選擇；這裡的特徵是疊在邊框「後面」，只露出框外的部分。
// 新增寶可夢：在最下方 MON_PARTS 加一行。key = DEX 索引（圖鑑編號 − 1，例：皮卡丘 #025 → 24）。
//   c1 主色、c2 次色、c3 點綴色（零件上色用），ft = 零件名稱清單（見 MON_FEATURES）。
// 改完可執行：node tools/check-mon-parts.js 檢查零件名稱與色碼有沒有填錯。
/* 通用特徵零件庫：每個零件是一段 SVG，顏色用 --c1 主色 / --c2 次色 / --c3 點綴色，.ink 為外框線色 */
const MON_OL = 'fill="none" stroke="#1b1b1b" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
const MON_FEATURES = {
  /* ---- 耳朵（上方） ---- */
  earL: `<span class="ft ft-earL"><svg viewBox="0 0 24 30"><path class="c1" d="M3 30 L12 2 L21 30 Z"/><path class="ink" d="M12 2 L15.6 13 L8.4 13 Z"/><path d="M3 30 L12 2 L21 30" ${MON_OL}/></svg></span>`,
  earR: `<span class="ft ft-earR"><svg viewBox="0 0 24 30"><path class="c1" d="M3 30 L12 2 L21 30 Z"/><path class="ink" d="M12 2 L15.6 13 L8.4 13 Z"/><path d="M3 30 L12 2 L21 30" ${MON_OL}/></svg></span>`,
  earRoundL: `<span class="ft ft-earRoundL"><svg viewBox="0 0 26 28"><ellipse class="c1" cx="13" cy="17" rx="10.5" ry="11"/><ellipse class="c2" cx="13" cy="18" rx="5.5" ry="6"/><ellipse cx="13" cy="17" rx="10.5" ry="11" ${MON_OL}/></svg></span>`,
  earRoundR: `<span class="ft ft-earRoundR"><svg viewBox="0 0 26 28"><ellipse class="c1" cx="13" cy="17" rx="10.5" ry="11"/><ellipse class="c2" cx="13" cy="18" rx="5.5" ry="6"/><ellipse cx="13" cy="17" rx="10.5" ry="11" ${MON_OL}/></svg></span>`,
  earLongL: `<span class="ft ft-earLongL"><svg viewBox="0 0 26 46"><path class="c1" d="M3 46 C0 28 4 12 10 2 C18 14 24 30 23 46 Z"/><path class="c2" d="M9 46 C8 32 10 20 12 12 C16 22 18 34 17 46 Z"/><path d="M3 46 C0 28 4 12 10 2 C18 14 24 30 23 46" ${MON_OL}/></svg></span>`,
  earLongR: `<span class="ft ft-earLongR"><svg viewBox="0 0 26 46"><path class="c1" d="M3 46 C2 30 8 14 16 2 C22 12 26 28 23 46 Z"/><path class="c2" d="M9 46 C8 34 10 22 14 12 C18 22 18 34 17 46 Z"/><path d="M3 46 C2 30 8 14 16 2 C22 12 26 28 23 46" ${MON_OL}/></svg></span>`,
  /* ---- 頭頂 ---- */
  horn: `<span class="ft ft-horn"><svg viewBox="0 0 18 30"><path class="c3" d="M2 30 L9 1 L16 30 Z"/><path d="M2 30 L9 1 L16 30" ${MON_OL}/></svg></span>`,
  bulb: `<span class="ft ft-bulb"><svg viewBox="0 0 40 34"><path class="c3" d="M4 34 C0 22 6 10 20 8 C34 10 40 22 36 34 Z"/><path class="c2" d="M20 8 C16 4 18 1 20 0 C22 1 24 4 20 8Z"/><path d="M20 8 L20 34 M12 14 C10 22 11 28 12 34 M28 14 C30 22 29 28 28 34" fill="none" stroke="#1b1b1b" stroke-width="1.4" opacity=".55"/><path d="M4 34 C0 22 6 10 20 8 C34 10 40 22 36 34" ${MON_OL}/></svg></span>`,
  finTop: `<span class="ft ft-finTop"><svg viewBox="0 0 60 26"><path class="c2" d="M2 26 L8 6 L16 20 L24 2 L32 20 L40 4 L48 20 L56 8 L58 26 Z"/><path d="M2 26 L8 6 L16 20 L24 2 L32 20 L40 4 L48 20 L56 8 L58 26" ${MON_OL}/></svg></span>`,
  /* ---- 背後（右上）翅膀、殼 ---- */
  wing: `<span class="ft ft-wing"><svg viewBox="0 0 58 52"><path class="c3" d="M0 52 C2 36 8 18 6 4 L20 20 L28 0 L36 22 L52 10 L44 36 C32 46 16 50 0 52 Z"/><path d="M6 4 L16 30 M28 0 L26 34 M52 10 L34 34" fill="none" stroke="#1b1b1b" stroke-width="1.6" opacity=".6"/><path d="M0 52 C2 36 8 18 6 4 L20 20 L28 0 L36 22 L52 10 L44 36 C32 46 16 50 0 52 Z" ${MON_OL}/></svg></span>`,
  shell: `<span class="ft ft-shell"><svg viewBox="0 0 34 64"><path class="c2" d="M0 4 C24 4 34 18 34 32 C34 46 24 60 0 60 Z"/><path d="M6 14 L20 32 L6 50 M20 32 L32 32" fill="none" stroke="#1b1b1b" stroke-width="1.6" opacity=".6"/><path d="M0 4 C24 4 34 18 34 32 C34 46 24 60 0 60" ${MON_OL}/></svg></span>`,
  /* ---- 尾巴（右下，根部藏在框後面） ---- */
  tailBolt: `<span class="ft ft-tail"><svg viewBox="0 0 50 58"><path class="c1" d="M0 58 L0 46 L14 40 L8 36 L26 22 L18 19 L44 2 L34 26 L46 29 L24 46 L30 50 L18 58 Z"/><path class="c2" d="M0 58 L0 46 L14 40 L24 46 L30 50 L18 58 Z"/><path d="M6 43.4 L14 40 L8 36 L26 22 L18 19 L44 2 L34 26 L46 29 L24 46 L30 50 L18 58 L6 58" ${MON_OL}/></svg></span>`,
  tailFlame: `<span class="ft ft-tailFlame"><svg viewBox="0 0 40 48"><path d="M0 40 C14 42 25 36 28 27" fill="none" stroke="#1b1b1b" stroke-width="10"/><path d="M0 40 C14 42 25 36 28 27" fill="none" style="stroke:var(--c1)" stroke-width="6"/><path d="M29 28 C20 22 27 14 30 3 C34 11 41 16 38 23 C37 27 33 30 29 28Z" fill="#ff5a2a" ${MON_OL}/><path d="M30 26 C27 23 30 20 31 15 C34 19 35 22 33 25Z" fill="#ffe066"/></svg></span>`,
  tailCurl: `<span class="ft ft-tailCurl"><svg viewBox="0 0 46 50"><path d="M0 42 C16 48 34 42 34 28 C34 16 44 16 43 25 C42 31 37 31 37 27" fill="none" stroke="#1b1b1b" stroke-width="9" stroke-linecap="round"/><path d="M0 42 C16 48 34 42 34 28 C34 16 44 16 43 25 C42 31 37 31 37 27" fill="none" style="stroke:var(--c1)" stroke-width="5" stroke-linecap="round"/></svg></span>`,
  tailFluffy: `<span class="ft ft-tailFluffy"><svg viewBox="0 0 48 58"><path class="c1" d="M0 52 C4 38 14 32 20 22 C22 10 36 4 44 12 C50 22 44 40 30 50 C20 58 8 58 0 56 Z"/><path class="c2" d="M20 22 C22 10 36 4 44 12 C47 17 47 24 45 30 C38 22 26 24 20 22 Z"/><path d="M0 52 C4 38 14 32 20 22 C22 10 36 4 44 12 C50 22 44 40 30 50 C20 58 8 58 0 56" ${MON_OL}/></svg></span>`,
  tailFin: `<span class="ft ft-tailFin"><svg viewBox="0 0 48 60"><path class="c1" d="M0 46 C10 46 20 40 28 32 L44 14 C48 30 46 48 36 58 C24 62 10 56 0 52 Z"/><path d="M4 48 L40 22 M6 52 L44 38 M10 55 L40 50" fill="none" style="stroke:var(--c2)" stroke-width="2.4" stroke-linecap="round"/><path d="M0 46 C10 46 20 40 28 32 L44 14 C48 30 46 48 36 58 C24 62 10 56 0 52" ${MON_OL}/></svg></span>`,
  tailPoint: `<span class="ft ft-tailPoint"><svg viewBox="0 0 50 50"><path class="c1" d="M0 36 C14 36 30 30 46 12 C46 32 32 50 0 50 Z"/><path class="c2" d="M0 44 C14 44 28 40 38 32 C32 46 18 50 0 50 Z"/><path d="M0 36 C14 36 30 30 46 12 C46 32 32 50 0 50" ${MON_OL}/></svg></span>`
};
/* 小尖耳：同尖耳形狀，尺寸較小（卡比獸這類） */
MON_FEATURES.earSmallL = MON_FEATURES.earL.replace('ft-earL','ft-earSmallL');
MON_FEATURES.earSmallR = MON_FEATURES.earR.replace('ft-earR','ft-earSmallR');
/* 腳爪：長在底部左右圓角上，3 根各自垂直於圓角（沿半徑）往外。
   SVG 以圓角圓心為中心（80x80，圓心在 40,40）；框的圓角半徑 16px + 外圈 2px，爪根從半徑 16 起（藏在框後面）。 */
function clawFan(side){
  const sg = side === 'L' ? -1 : 1; let d = '';
  for(const deg of [15, 45, 75]){
    const a = deg * Math.PI / 180, dx = sg * Math.sin(a), dy = Math.cos(a), px = -dy, py = dx;
    const b = 16, t = 31, hw = 2.8, f = n => n.toFixed(1);
    d += `M${f(40+b*dx+px*hw)} ${f(40+b*dy+py*hw)} L${f(40+t*dx)} ${f(40+t*dy)} L${f(40+b*dx-px*hw)} ${f(40+b*dy-py*hw)} Z `;
  }
  return `<span class="ft ft-clawFoot${side}"><svg viewBox="0 0 80 80"><path class="c2" d="${d}"/><path d="${d}" fill="none" stroke="#1b1b1b" stroke-width="1.5" stroke-linejoin="round"/></svg></span>`;
}
MON_FEATURES.clawFootL = clawFan('L');
MON_FEATURES.clawFootR = clawFan('R');

/* ---------- 各寶可夢設定 ---------- */
const MON_PARTS = {
  0:   {c1:'#5fb8a8', c2:'#3b8f7d', c3:'#5bb04a', ft:['earL','earR','bulb']},                          // 妙蛙種子
  3:   {c1:'#f08030', c2:'#f4d89a', c3:'#f08030', ft:['tailFlame']},                                   // 小火龍
  5:   {c1:'#f08030', c2:'#f4d89a', c3:'#4db6a8', ft:['wing','tailFlame']},                            // 噴火龍
  6:   {c1:'#6cb7e0', c2:'#b8864b', c3:'#f4ecc8', ft:['shell','tailCurl']},                            // 傑尼龜
  24:  {c1:'#ffd83a', c2:'#c98a3a', c3:'#e53935', ft:['earL','earR','tailBolt']},                      // 皮卡丘
  33:  {c1:'#8a6fc0', c2:'#d8c8f0', c3:'#f4ecd2', ft:['earRoundL','earRoundR','horn','tailPoint']},    // 尼多王
  51:  {c1:'#f3dca0', c2:'#c9a24e', c3:'#e8c94a', ft:['earL','earR','tailCurl']},                      // 喵喵
  128: {c1:'#e8643c', c2:'#f4d27a', c3:'#e8643c', ft:['finTop','tailFin']},                            // 鯉魚王
  132: {c1:'#c98a4b', c2:'#f4e3c0', c3:'#c98a4b', ft:['earLongL','earLongR','tailFluffy']},            // 伊布
  142: {c1:'#7fb0bd', c2:'#f4ead2', c3:'#7fb0bd', ft:['earSmallL','earSmallR','clawFootL','clawFootR']}, // 卡比獸
  148: {c1:'#f0b050', c2:'#f4e0a0', c3:'#7bb0d8', ft:['horn','wing','tailPoint']}                      // 快龍
};

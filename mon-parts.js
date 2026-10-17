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
/* 一代補充零件：觸角、鳥冠、花、葉、鉗、觸手、背刺、雙角、細長尾、頭頂火焰 */
Object.assign(MON_FEATURES, {
  antenna: `<span class="ft ft-antenna"><svg viewBox="0 0 50 34"><path d="M15 34 C13 20 9 12 5 5 M35 34 C37 20 41 12 45 5" fill="none" stroke="#1b1b1b" stroke-width="5.4" stroke-linecap="round"/><path d="M15 34 C13 20 9 12 5 5 M35 34 C37 20 41 12 45 5" fill="none" style="stroke:var(--c2)" stroke-width="2.6" stroke-linecap="round"/><circle class="c3" cx="5" cy="5" r="3.6"/><circle class="c3" cx="45" cy="5" r="3.6"/><circle cx="5" cy="5" r="3.6" ${MON_OL}/><circle cx="45" cy="5" r="3.6" ${MON_OL}/></svg></span>`,
  crest: `<span class="ft ft-crest"><svg viewBox="0 0 40 36"><path class="c3" d="M5 36 L9 10 L16 24 L20 2 L24 24 L31 10 L35 36 Z"/><path d="M5 36 L9 10 L16 24 L20 2 L24 24 L31 10 L35 36" ${MON_OL}/></svg></span>`,
  flower: `<span class="ft ft-flower"><svg viewBox="0 0 44 36">${[-60,-30,0,30,60].map(a => `<ellipse class="c3" cx="22" cy="17" rx="6.5" ry="12.5" transform="rotate(${a} 22 30)"/><ellipse cx="22" cy="17" rx="6.5" ry="12.5" transform="rotate(${a} 22 30)" ${MON_OL}/>`).join('')}<circle class="c2" cx="22" cy="29" r="5.5"/><circle cx="22" cy="29" r="5.5" ${MON_OL}/></svg></span>`,
  leaves: `<span class="ft ft-leaves"><svg viewBox="0 0 44 34">${[-44,44,0].map(a => `<g transform="rotate(${a} 22 34)"><path class="c3" d="M22 34 C13 25 12 10 19 0 C28 9 29 24 22 34 Z"/><path d="M22 34 C13 25 12 10 19 0 C28 9 29 24 22 34 Z" ${MON_OL}/><path d="M22 32 C20 22 20 12 20 6" fill="none" stroke="#1b1b1b" stroke-width="1.2" opacity=".5"/></g>`).join('')}</svg></span>`,
  pincerL: `<span class="ft ft-pincerL"><svg viewBox="0 0 36 40"><path class="c1" d="M36 34 C20 36 3 30 2 8 C8 16 15 18 21 15 C17 9 17 5 19 1 C26 8 32 16 36 24 Z"/><path d="M36 34 C20 36 3 30 2 8 C8 16 15 18 21 15 C17 9 17 5 19 1 C26 8 32 16 36 24" ${MON_OL}/></svg></span>`,
  pincerR: `<span class="ft ft-pincerR"><svg viewBox="0 0 36 40"><g transform="translate(36 0) scale(-1 1)"><path class="c1" d="M36 34 C20 36 3 30 2 8 C8 16 15 18 21 15 C17 9 17 5 19 1 C26 8 32 16 36 24 Z"/><path d="M36 34 C20 36 3 30 2 8 C8 16 15 18 21 15 C17 9 17 5 19 1 C26 8 32 16 36 24" ${MON_OL}/></g></svg></span>`,
  tentacles: `<span class="ft ft-tentacles"><svg viewBox="0 0 60 34"><path d="M12 0 C6 10 18 16 12 30 M30 0 C24 10 36 16 30 32 M48 0 C42 10 54 16 48 30" fill="none" stroke="#1b1b1b" stroke-width="8.4" stroke-linecap="round"/><path d="M12 0 C6 10 18 16 12 30 M30 0 C24 10 36 16 30 32 M48 0 C42 10 54 16 48 30" fill="none" style="stroke:var(--c2)" stroke-width="4.4" stroke-linecap="round"/></svg></span>`,
  spikesTop: `<span class="ft ft-spikesTop"><svg viewBox="0 0 70 18"><path class="c2" d="M2 18 L10 2 L18 18 L26 4 L35 18 L44 4 L52 18 L60 2 L68 18 Z"/><path d="M2 18 L10 2 L18 18 L26 4 L35 18 L44 4 L52 18 L60 2 L68 18" ${MON_OL}/></svg></span>`,
  hornPair: `<span class="ft ft-hornPair"><svg viewBox="0 0 70 34"><path class="c3" d="M14 34 C6 28 2 16 4 2 C14 8 22 18 24 34 Z"/><path class="c3" d="M56 34 C64 28 68 16 66 2 C56 8 48 18 46 34 Z"/><path d="M14 34 C6 28 2 16 4 2 C14 8 22 18 24 34 M56 34 C64 28 68 16 66 2 C56 8 48 18 46 34" ${MON_OL}/></svg></span>`,
  tailLong: `<span class="ft ft-tailLong"><svg viewBox="0 0 54 54"><path d="M0 46 C20 50 36 40 40 22 C41 14 45 9 50 7" fill="none" stroke="#1b1b1b" stroke-width="7" stroke-linecap="round"/><path d="M0 46 C20 50 36 40 40 22 C41 14 45 9 50 7" fill="none" style="stroke:var(--c1)" stroke-width="3.6" stroke-linecap="round"/><circle class="c3" cx="50" cy="7" r="5"/><circle cx="50" cy="7" r="5" ${MON_OL}/></svg></span>`,
  flameTop: `<span class="ft ft-flameTop"><svg viewBox="0 0 40 40"><path d="M4 40 C0 28 10 22 12 10 C16 16 18 14 20 0 C26 12 36 20 36 40 Z" fill="#ff5a2a" ${MON_OL}/><path d="M14 40 C12 32 18 28 20 18 C24 26 28 30 26 40 Z" fill="#ffe066"/></svg></span>`
});

/* 第二批零件（一代補強）：用小函式產生左右成對的零件。左側零件突出量要小（卡片靠畫面左邊） */
const FT = (cls, w, h, inner) => `<span class="ft ft-${cls}"><svg viewBox="0 0 ${w} ${h}">${inner}</svg></span>`;
const MIR = (w, inner) => `<g transform="translate(${w} 0) scale(-1 1)">${inner}</g>`;
const STK = (d, w, col) => `<path d="${d}" fill="none" stroke="#1b1b1b" stroke-width="${w + 4}" stroke-linecap="round"/><path d="${d}" fill="none" style="stroke:var(${col})" stroke-width="${w}" stroke-linecap="round"/>`;
/* sidePair：inner 是「右側」原生的圖，左側自動鏡射 */
function sidePair(name, w, h, inner) {
  MON_FEATURES[name + 'R'] = FT(name + 'R', w, h, inner);
  MON_FEATURES[name + 'L'] = FT(name + 'L', w, h, MIR(w, inner));
}
const P_FEATHER = 'M0 44 C6 36 14 22 20 4 C24 14 26 18 28 22 C32 12 38 6 46 2 C46 16 42 30 30 38 C22 44 10 46 0 46';
const P_BAT = 'M0 46 C4 30 8 14 4 2 C14 10 20 16 24 22 C26 14 32 8 40 6 C40 14 36 20 36 26 C42 24 46 24 50 24 C44 34 30 44 0 46';
sidePair('wingFeather', 50, 46, `<path class="c1" d="${P_FEATHER}Z"/><path d="M12 42 L22 16 M24 42 L36 14" fill="none" style="stroke:var(--c2)" stroke-width="2.4" stroke-linecap="round"/><path d="${P_FEATHER}" ${MON_OL}/>`);
sidePair('wingBat', 50, 46, `<path class="c3" d="${P_BAT}Z"/><path d="M4 2 L26 36 M24 22 L36 30" fill="none" stroke="#1b1b1b" stroke-width="1.4" opacity=".6"/><path d="${P_BAT}" ${MON_OL}/>`);
sidePair('wingBug', 50, 46, `<ellipse class="c3" cx="22" cy="18" rx="19" ry="12" transform="rotate(-32 22 18)" opacity=".9"/><ellipse class="c3" cx="20" cy="34" rx="14" ry="8" transform="rotate(8 20 34)" opacity=".9"/><ellipse cx="22" cy="18" rx="19" ry="12" transform="rotate(-32 22 18)" ${MON_OL}/><ellipse cx="20" cy="34" rx="14" ry="8" transform="rotate(8 20 34)" ${MON_OL}/>`);
const P_ARM = `<path class="c1" d="M0 12 C12 10 24 16 28 26 L20 38 C12 32 4 30 0 32Z"/><path d="M0 12 C12 10 24 16 28 26 L20 38 C12 32 4 30 0 32" ${MON_OL}/><circle class="c1" cx="25" cy="33" r="9"/><circle cx="25" cy="33" r="9" ${MON_OL}/>`;
sidePair('arm', 34, 46, P_ARM);
sidePair('armLow', 34, 46, P_ARM);
sidePair('foot', 32, 18, `<ellipse class="c1" cx="16" cy="8" rx="14" ry="8"/><ellipse cx="16" cy="8" rx="14" ry="8" ${MON_OL}/>`);
sidePair('whiskers', 30, 26, `<path d="M0 6 L28 0 M0 13 L30 13 M0 20 L28 26" fill="none" stroke="#1b1b1b" stroke-width="1.8" stroke-linecap="round"/>`);
sidePair('headBump', 30, 28, `<ellipse class="c1" cx="15" cy="16" rx="12" ry="11"/><ellipse cx="15" cy="16" rx="12" ry="11" ${MON_OL}/>`);
sidePair('hair', 26, 70, MIR(26, `<path class="c3" d="M24 0 C8 6 0 24 4 46 C6 58 12 66 16 70 C16 56 22 40 24 28Z"/><path d="M24 0 C8 6 0 24 4 46 C6 58 12 66 16 70 C16 56 22 40 24 28" ${MON_OL}/>`));
sidePair('vines', 36, 64, MIR(36, STK('M34 4 C14 12 30 26 12 34 C0 40 14 54 8 62', 4.4, '--c2') + STK('M34 26 C22 32 30 44 22 52', 4.4, '--c2')));
sidePair('earFox', 24, 30, `<path class="c1" d="M3 30 L12 2 L21 30 Z"/><path class="c2" d="M12 12 L17 26 L7 26Z"/><path d="M3 30 L12 2 L21 30" ${MON_OL}/>`);
sidePair('earBat', 30, 40, `<path class="c1" d="M2 40 C0 20 8 6 14 0 C16 14 24 24 28 40Z"/><path class="c2" d="M9 40 C8 28 11 16 14 10 C16 20 20 30 21 40Z"/><path d="M2 40 C0 20 8 6 14 0 C16 14 24 24 28 40" ${MON_OL}/>`);
sidePair('cannon', 22, 34, `<rect class="c3" x="5" y="4" width="12" height="28" rx="3"/><rect x="5" y="4" width="12" height="28" rx="3" ${MON_OL}/><ellipse class="c2" cx="11" cy="4" rx="6" ry="3"/><ellipse cx="11" cy="4" rx="6" ry="3" ${MON_OL}/>`);
for (const k of ['Top', 'L', 'R', 'BL', 'BR'])
  MON_FEATURES['star' + k] = FT('star' + k, 36, 40, `<path class="c1" d="M18 0 L34 40 L2 40Z"/><path d="M18 10 L18 40" fill="none" style="stroke:var(--c2)" stroke-width="2.4" stroke-linecap="round"/><path d="M18 0 L34 40 L2 40Z" ${MON_OL}/>`);
function multiTail(n, angles) {
  const T = 'M4 52 C8 40 22 34 30 24 C34 14 44 10 48 14 C50 24 40 40 28 48 C20 54 12 54 4 52Z';
  MON_FEATURES['tailMulti' + n] = FT('tailMulti' + n, 56, 60, angles.map(a => `<g transform="rotate(${a} 4 52)"><path class="c1" d="${T}"/><circle class="c2" cx="42" cy="17" r="5"/><path d="${T}" ${MON_OL}/></g>`).join(''));
}
multiTail(3, [-50, -22, 6]);
multiTail(5, [-66, -48, -30, -12, 6]);
Object.assign(MON_FEATURES, {
  bud: FT('bud', 58, 60, `<path class="c3" d="M6 60 C2 44 12 30 29 28 C46 30 56 44 52 60Z"/><path d="M29 30 C27 42 27 52 29 60 M17 34 C18 44 18 54 16 60 M41 34 C40 44 40 54 42 60" fill="none" stroke="#1b1b1b" stroke-width="1.4" opacity=".5"/><path class="c2" d="M29 28 C14 28 4 20 4 6 C16 6 27 14 29 28Z"/><path class="c2" d="M29 28 C44 28 54 20 54 6 C42 6 31 14 29 28Z"/><path class="c2" d="M29 28 C18 20 20 8 29 0 C38 8 40 20 29 28Z"/><path d="M6 60 C2 44 12 30 29 28 C46 30 56 44 52 60 M29 28 C14 28 4 20 4 6 C16 6 27 14 29 28 M29 28 C44 28 54 20 54 6 C42 6 31 14 29 28 M29 28 C18 20 20 8 29 0 C38 8 40 20 29 28" ${MON_OL}/>`),
  bloom: FT('bloom', 70, 52, [0, 60, 120, 180, 240, 300].map(a => `<ellipse class="c3" cx="35" cy="14" rx="10" ry="15" transform="rotate(${a} 35 32)"/><ellipse cx="35" cy="14" rx="10" ry="15" transform="rotate(${a} 35 32)" ${MON_OL}/>`).join('') + `<circle class="c2" cx="35" cy="32" r="9"/><circle cx="35" cy="32" r="9" ${MON_OL}/>`),
  capDuo: FT('capDuo', 70, 30, `<g><path class="c3" d="M4 30 C4 14 12 6 20 6 C28 6 36 14 36 30Z"/><circle class="c2" cx="14" cy="18" r="3"/><circle class="c2" cx="26" cy="14" r="2.4"/><path d="M4 30 C4 14 12 6 20 6 C28 6 36 14 36 30" ${MON_OL}/></g><g><path class="c3" d="M38 30 C38 12 48 2 54 2 C62 2 68 12 68 30Z"/><circle class="c2" cx="48" cy="14" r="3"/><circle class="c2" cx="60" cy="10" r="2.6"/><path d="M38 30 C38 12 48 2 54 2 C62 2 68 12 68 30" ${MON_OL}/></g>`),
  capBig: FT('capBig', 90, 36, `<path class="c3" d="M2 36 C2 12 22 2 45 2 C68 2 88 12 88 36Z"/><circle class="c2" cx="26" cy="22" r="5"/><circle class="c2" cx="46" cy="14" r="5"/><circle class="c2" cx="64" cy="24" r="4.4"/><circle class="c2" cx="78" cy="30" r="3"/><path d="M2 36 C2 12 22 2 45 2 C68 2 88 12 88 36" ${MON_OL}/>`),
  beakL: FT('beakL', 28, 22, `<path class="c2" d="M28 2 L0 11 L28 20Z"/><path d="M28 11 L6 11" stroke="#1b1b1b" stroke-width="1.2" opacity=".6"/><path d="M28 2 L0 11 L28 20" ${MON_OL}/>`),
  billL: FT('billL', 34, 22, `<path class="c2" d="M34 3 C20 0 6 2 2 8 C2 16 20 22 34 19Z"/><path d="M34 3 C20 0 6 2 2 8 C2 16 20 22 34 19" ${MON_OL}/>`),
  tailFeathers: FT('tailFeathers', 54, 56, [-44, -20, 6].map((a, i) => `<g transform="rotate(${a} 4 50)"><path class="${['c1', 'c3', 'c2'][i]}" d="M4 50 C14 41 30 37 50 39 C41 47 24 52 4 50Z"/><path d="M4 50 C14 41 30 37 50 39 C41 47 24 52 4 50" ${MON_OL}/></g>`).join('')),
  hood: FT('hood', 76, 40, `<path class="c3" d="M2 40 C4 14 22 2 38 2 C54 2 72 14 74 40Z"/><ellipse class="c2" cx="38" cy="22" rx="12" ry="9"/><circle cx="33" cy="21" r="2" fill="#1b1b1b"/><circle cx="43" cy="21" r="2" fill="#1b1b1b"/><path d="M2 40 C4 14 22 2 38 2 C54 2 72 14 74 40" ${MON_OL}/>`),
  tailThick: FT('tailThick', 58, 44, `<path class="c1" d="M0 12 C16 8 36 12 54 32 C46 38 22 42 0 40Z"/><path class="c2" d="M0 32 C16 32 32 34 48 36 C34 40 14 42 0 40Z"/><path d="M0 12 C16 8 36 12 54 32 C46 38 22 42 0 40" ${MON_OL}/>`),
  curlTop: FT('curlTop', 30, 34, STK('M15 34 C15 20 4 20 6 10 C8 0 24 0 22 10 C21 15 14 15 14 11', 3.2, '--c1')),
  dome: FT('dome', 84, 34, `<path class="c2" d="M2 34 C2 12 20 2 42 2 C64 2 82 12 82 34Z"/><path d="M42 2 L42 34 M24 6 L18 34 M60 6 L66 34" fill="none" stroke="#1b1b1b" stroke-width="1.4" opacity=".55"/><path d="M2 34 C2 12 20 2 42 2 C64 2 82 12 82 34" ${MON_OL}/>`),
  mound: FT('mound', 90, 24, `<path class="c2" d="M0 8 C10 0 20 10 30 4 C42 0 50 10 60 4 C72 0 80 8 90 6 L90 24 L0 24Z"/><path d="M0 8 C10 0 20 10 30 4 C42 0 50 10 60 4 C72 0 80 8 90 6" ${MON_OL}/>`)
});

/* ---------- 各寶可夢設定 ---------- */
const MON_PARTS = {
  0: {c1:'#5fb8a8', c2:'#3b8f7d', c3:'#5bb04a', ft:['earL','earR','bud','footL','footR']},  // 妙蛙種子
  1: {c1:'#5fb8a8', c2:'#3b8f7d', c3:'#e8508a', ft:['earL','earR','bud','footL','footR']},  // 妙蛙草
  2: {c1:'#5fb8a8', c2:'#e8c94a', c3:'#f06a9a', ft:['earL','earR','bloom','footL','footR']},  // 妙蛙花
  3: {c1:'#f08030', c2:'#f4d89a', c3:'#f08030', ft:['tailFlame']},  // 小火龍
  4: {c1:'#e8643c', c2:'#f4d89a', c3:'#e8643c', ft:['horn','tailFlame','footL','footR']},  // 火恐龍
  5: {c1:'#f08030', c2:'#f4d89a', c3:'#4db6a8', ft:['wing','tailFlame']},  // 噴火龍
  6: {c1:'#6cb7e0', c2:'#b8864b', c3:'#f4ecc8', ft:['shell','tailCurl']},  // 傑尼龜
  7: {c1:'#6cb7e0', c2:'#b8864b', c3:'#f4ecc8', ft:['earLongL','earLongR','shell','tailFluffy']},  // 卡咪龜
  8: {c1:'#4a88c7', c2:'#b8864b', c3:'#9aa8b8', ft:['cannonL','cannonR','shell','tailCurl','footL','footR']},  // 水箭龜
  9: {c1:'#8fd04a', c2:'#e8643c', c3:'#e8643c', ft:['antenna','footL','footR']},  // 綠毛蟲
  10: {c1:'#6fbf5a', c2:'#4a8f3a', c3:'#6fbf5a', ft:['horn','tailPoint']},  // 鐵甲蛹
  11: {c1:'#8f6fc0', c2:'#2b2b2b', c3:'#c8d0f0', ft:['antenna','wingBugL','wingBugR']},  // 巴大蝶
  12: {c1:'#e8d06a', c2:'#b8864b', c3:'#f4ecc8', ft:['horn','tailPoint','footL','footR']},  // 獨角蟲
  13: {c1:'#e8d06a', c2:'#b8864b', c3:'#e8d06a', ft:['spikesTop','tailPoint']},  // 鐵殼蛹
  14: {c1:'#e8c94a', c2:'#2b2b2b', c3:'#f4f4f4', ft:['wingBugL','wingBugR','armLowL','armLowR','tailPoint']},  // 大針蜂
  15: {c1:'#b8864b', c2:'#f0d070', c3:'#e8d06a', ft:['crest','beakL','tailFeathers','footL','footR']},  // 波波
  16: {c1:'#b8864b', c2:'#f0d070', c3:'#e8643c', ft:['crest','beakL','wingFeatherL','wingFeatherR','tailFeathers']},  // 比比鳥
  17: {c1:'#c98a4b', c2:'#f0d070', c3:'#e8643c', ft:['crest','beakL','wingFeatherL','wingFeatherR','tailFeathers']},  // 大比鳥
  18: {c1:'#8f6fc0', c2:'#f4ecd2', c3:'#c9a24e', ft:['earRoundL','earRoundR','tailCurl','footL','footR']},  // 小拉達
  19: {c1:'#b8864b', c2:'#f4ecd2', c3:'#e8d06a', ft:['earRoundL','earRoundR','whiskersL','whiskersR','tailCurl','footL','footR']},  // 拉達
  20: {c1:'#b8864b', c2:'#f0d0b0', c3:'#e8643c', ft:['crest','beakL','tailFeathers','footL','footR']},  // 烈雀
  21: {c1:'#b8864b', c2:'#f0d0b0', c3:'#e8643c', ft:['crest','beakL','wingFeatherL','wingFeatherR','tailFeathers']},  // 大嘴雀
  22: {c1:'#8f6fc0', c2:'#e8d06a', c3:'#e8d06a', ft:['tailCurl']},  // 阿柏蛇
  23: {c1:'#8f6fc0', c2:'#e8d06a', c3:'#8f6fc0', ft:['hood','tailCurl']},  // 阿柏怪
  24: {c1:'#ffd83a', c2:'#c98a3a', c3:'#e53935', ft:['earL','earR','tailBolt']},  // 皮卡丘
  25: {c1:'#f09a3a', c2:'#f4e3c0', c3:'#ffd83a', ft:['earL','earR','tailBolt','footL','footR']},  // 雷丘
  26: {c1:'#e8d06a', c2:'#c98a3a', c3:'#e8d06a', ft:['earFoxL','earFoxR','tailPoint','footL','footR']},  // 穿山鼠
  27: {c1:'#e8d06a', c2:'#c98a3a', c3:'#c98a3a', ft:['earFoxL','earFoxR','tailPoint','armLowL','armLowR']},  // 穿山王
  28: {c1:'#6a9fd8', c2:'#4a7fb8', c3:'#6a9fd8', ft:['earBatL','earBatR','tailPoint','footL','footR']},  // 尼多蘭
  29: {c1:'#6a9fd8', c2:'#4a7fb8', c3:'#6a9fd8', ft:['earBatL','earBatR','tailPoint','footL','footR']},  // 尼多娜
  30: {c1:'#6a9fd8', c2:'#f4ecd2', c3:'#6a9fd8', ft:['earRoundL','earRoundR','tailThick','footL','footR']},  // 尼多后
  31: {c1:'#8a6fc0', c2:'#d8c8f0', c3:'#f4ecd2', ft:['earBatL','earBatR','horn','footL','footR']},  // 尼多朗
  32: {c1:'#8a6fc0', c2:'#d8c8f0', c3:'#f4ecd2', ft:['earBatL','earBatR','horn','tailPoint','footL','footR']},  // 尼多力諾
  33: {c1:'#8a6fc0', c2:'#d8c8f0', c3:'#f4ecd2', ft:['earRoundL','earRoundR','horn','tailPoint']},  // 尼多王
  34: {c1:'#f4b8c8', c2:'#f4d8e0', c3:'#2b2b2b', ft:['earL','earR','tailCurl','footL','footR']},  // 皮皮
  35: {c1:'#f4b8c8', c2:'#f4d8e0', c3:'#2b2b2b', ft:['earL','earR','wingBatL','wingBatR','tailCurl']},  // 皮可西
  36: {c1:'#d8683a', c2:'#f4e3c0', c3:'#d8683a', ft:['earFoxL','earFoxR','tailMulti3','footL','footR']},  // 六尾
  37: {c1:'#f0d890', c2:'#f4e3c0', c3:'#e8643c', ft:['earFoxL','earFoxR','tailMulti5','footL','footR']},  // 九尾
  38: {c1:'#f4b8c8', c2:'#f4d8e0', c3:'#f4b8c8', ft:['earFoxL','earFoxR','curlTop','tailCurl','footL','footR']},  // 胖丁
  39: {c1:'#f4b8c8', c2:'#f4d8e0', c3:'#f4b8c8', ft:['earFoxL','earFoxR','curlTop','tailCurl','footL','footR']},  // 胖可丁
  40: {c1:'#6a9fd8', c2:'#8f6fc0', c3:'#c8b8e8', ft:['earBatL','earBatR','wingBatL','wingBatR']},  // 超音蝠
  41: {c1:'#8f6fc0', c2:'#6a9fd8', c3:'#c8b8e8', ft:['earBatL','earBatR','wingBatL','wingBatR','tailPoint']},  // 大嘴蝠
  42: {c1:'#6a9fd8', c2:'#4a7fb8', c3:'#5bb04a', ft:['leaves','footL','footR']},  // 走路草
  43: {c1:'#6a9fd8', c2:'#4a7fb8', c3:'#e8508a', ft:['flower','footL','footR']},  // 臭臭花
  44: {c1:'#6a9fd8', c2:'#e8c94a', c3:'#e8508a', ft:['bloom','footL','footR']},  // 霸王花
  45: {c1:'#e8884a', c2:'#f4d8a0', c3:'#e8643c', ft:['capDuo','pincerL','pincerR','footL','footR']},  // 派拉斯
  46: {c1:'#e8884a', c2:'#f4d8a0', c3:'#e8643c', ft:['capBig','pincerL','pincerR','footL','footR']},  // 派拉斯特
  47: {c1:'#8f6fc0', c2:'#6e4fa0', c3:'#e8508a', ft:['antenna','footL','footR']},  // 毛球
  48: {c1:'#a888c8', c2:'#6e4fa0', c3:'#f4f4f4', ft:['antenna','wingBugL','wingBugR']},  // 摩魯蛾
  49: {c1:'#b8864b', c2:'#8a5a2b', c3:'#e8508a', ft:['mound']},  // 地鼠
  50: {c1:'#b8864b', c2:'#8a5a2b', c3:'#e8508a', ft:['mound','headBumpL','headBumpR']},  // 三地鼠
  51: {c1:'#f3dca0', c2:'#c9a24e', c3:'#e8c94a', ft:['earL','earR','tailCurl']},  // 喵喵
  52: {c1:'#f3dca0', c2:'#c9a24e', c3:'#e8c94a', ft:['earFoxL','earFoxR','whiskersL','whiskersR','tailCurl']},  // 貓老大
  53: {c1:'#f0d44a', c2:'#f0b050', c3:'#2b2b2b', ft:['crest','billL','footL','footR']},  // 可達鴨
  54: {c1:'#6a9fd8', c2:'#f4f4f4', c3:'#e53935', ft:['finTop','billL','tailFin','footL','footR']},  // 哥達鴨
  55: {c1:'#f4e3c0', c2:'#c98a4b', c3:'#c98a4b', ft:['earRoundL','earRoundR','tailCurl','armL','armR']},  // 猴怪
  56: {c1:'#f4e3c0', c2:'#c98a4b', c3:'#c98a4b', ft:['earRoundL','earRoundR','tailCurl','armL','armR']},  // 火爆猴
  57: {c1:'#e8884a', c2:'#f4e3c0', c3:'#2b2b2b', ft:['earFoxL','earFoxR','tailFluffy','footL','footR']},  // 卡蒂狗
  58: {c1:'#e8884a', c2:'#f4e3c0', c3:'#2b2b2b', ft:['earFoxL','earFoxR','whiskersL','whiskersR','tailFluffy','footL','footR']},  // 風速狗
  59: {c1:'#4a88c7', c2:'#f4f4f4', c3:'#4a88c7', ft:['tailCurl']},  // 蚊香蝌蚪
  60: {c1:'#4a88c7', c2:'#f4f4f4', c3:'#4a88c7', ft:['tailCurl','footL','footR']},  // 蚊香蛙
  61: {c1:'#4a88c7', c2:'#f4f4f4', c3:'#f4f4f4', ft:['armL','armR','footL','footR']},  // 快泳蛙
  62: {c1:'#e8c94a', c2:'#b8864b', c3:'#b8864b', ft:['earFoxL','earFoxR','tailPoint','footL','footR']},  // 凱西
  63: {c1:'#e8c94a', c2:'#b8864b', c3:'#b8864b', ft:['earFoxL','earFoxR','tailPoint','armL','armR']},  // 勇吉拉
  64: {c1:'#e8c94a', c2:'#b8864b', c3:'#b8864b', ft:['earFoxL','earFoxR','whiskersL','whiskersR','tailPoint','armLowL','armLowR']},  // 胡地
  65: {c1:'#8fa8c0', c2:'#6a7fa0', c3:'#8fa8c0', ft:['armL','armR','footL','footR']},  // 腕力
  66: {c1:'#8fa8c0', c2:'#6a7fa0', c3:'#8fa8c0', ft:['armL','armR','footL','footR']},  // 豪力
  67: {c1:'#8fa8c0', c2:'#6a7fa0', c3:'#8fa8c0', ft:['armL','armR','armLowL','armLowR','footL','footR']},  // 怪力
  68: {c1:'#e8d06a', c2:'#5bb04a', c3:'#5bb04a', ft:['leaves']},  // 喇叭芽
  69: {c1:'#e8d06a', c2:'#5bb04a', c3:'#5bb04a', ft:['leaves','armL','armR']},  // 口呆花
  70: {c1:'#e8d06a', c2:'#5bb04a', c3:'#5bb04a', ft:['leaves','vinesL','vinesR']},  // 大食花
  71: {c1:'#6a9fd8', c2:'#e8508a', c3:'#6a9fd8', ft:['tentacles','spikesTop']},  // 瑪瑙水母
  72: {c1:'#6a9fd8', c2:'#e8508a', c3:'#6a9fd8', ft:['tentacles','spikesTop']},  // 毒刺水母
  73: {c1:'#a89880', c2:'#6e6050', c3:'#a89880', ft:['armL','armR']},  // 小拳石
  74: {c1:'#a89880', c2:'#6e6050', c3:'#a89880', ft:['armL','armR','armLowL','armLowR']},  // 隆隆石
  75: {c1:'#a89880', c2:'#6e6050', c3:'#a89880', ft:['spikesTop','armL','armR','armLowL','armLowR']},  // 隆隆岩
  76: {c1:'#f0d890', c2:'#e8643c', c3:'#ff8a3a', ft:['flameTop','tailFlame','footL','footR']},  // 小火馬
  77: {c1:'#f0d890', c2:'#e8643c', c3:'#ff8a3a', ft:['flameTop','tailFlame','footL','footR']},  // 烈焰馬
  78: {c1:'#f4a8b8', c2:'#f4ecd2', c3:'#f4ecd2', ft:['earSmallL','earSmallR','tailLong','footL','footR']},  // 呆呆獸
  79: {c1:'#f4a8b8', c2:'#9a90b8', c3:'#f4ecd2', ft:['earSmallL','earSmallR','shell','footL','footR']},  // 呆殼獸
  80: {c1:'#b8c4d0', c2:'#d8d8d8', c3:'#9aa4b0', ft:['horn','armL','armR']},  // 小磁怪
  81: {c1:'#b8c4d0', c2:'#d8d8d8', c3:'#e53935', ft:['hornPair','armL','armR']},  // 三合一磁怪
  82: {c1:'#b8864b', c2:'#f0c070', c3:'#5bb04a', ft:['leaves','beakL','tailFeathers','footL','footR']},  // 大蔥鴨
  83: {c1:'#b8864b', c2:'#f0d070', c3:'#2b2b2b', ft:['crest','beakL','tailFeathers','footL','footR']},  // 嘟嘟
  84: {c1:'#b8864b', c2:'#f0d070', c3:'#2b2b2b', ft:['crest','beakL','tailFeathers','armL','armR']},  // 嘟嘟利
  85: {c1:'#f4f4f4', c2:'#a8c8e0', c3:'#f4f4f4', ft:['horn','tailFin','footL','footR']},  // 小海獅
  86: {c1:'#f4f4f4', c2:'#a8c8e0', c3:'#f4f4f4', ft:['horn','tailFin','armL','armR']},  // 白海獅
  87: {c1:'#a888c8', c2:'#8f6fc0', c3:'#a888c8', ft:['tentacles']},  // 臭泥
  88: {c1:'#a888c8', c2:'#8f6fc0', c3:'#a888c8', ft:['tentacles','armL','armR']},  // 臭臭泥
  89: {c1:'#8f6fc0', c2:'#c8b8e8', c3:'#8f6fc0', ft:['dome']},  // 大舌貝
  90: {c1:'#8f6fc0', c2:'#c8b8e8', c3:'#8f6fc0', ft:['dome','pincerL','pincerR']},  // 刺甲貝
  91: {c1:'#2b2b4a', c2:'#6e4fa0', c3:'#8f6fc0', ft:['spikesTop','vinesL','vinesR']},  // 鬼斯
  92: {c1:'#2b2b4a', c2:'#6e4fa0', c3:'#8f6fc0', ft:['spikesTop','armL','armR']},  // 鬼斯通
  93: {c1:'#6a4a9a', c2:'#a888c8', c3:'#e53935', ft:['earFoxL','earFoxR','tailPoint','footL','footR']},  // 耿鬼
  94: {c1:'#a89880', c2:'#6e6050', c3:'#a89880', ft:['spikesTop','tailThick']},  // 大岩蛇
  95: {c1:'#e8c94a', c2:'#b8864b', c3:'#e8c94a', ft:['earSmallL','earSmallR','tailCurl','footL','footR']},  // 催眠貘
  96: {c1:'#e8c94a', c2:'#b8864b', c3:'#e8c94a', ft:['earSmallL','earSmallR','tailCurl','armL','armR']},  // 引夢貘人
  97: {c1:'#e8643c', c2:'#f4d8a0', c3:'#e8643c', ft:['pincerL','pincerR','footL','footR']},  // 大鉗蟹
  98: {c1:'#e8643c', c2:'#f4d8a0', c3:'#e8643c', ft:['pincerL','pincerR','footL','footR']},  // 巨鉗蟹
  99: {c1:'#e53935', c2:'#f4f4f4', c3:'#f4f4f4', ft:['spikesTop']},  // 霹靂電球
  100: {c1:'#e53935', c2:'#f4f4f4', c3:'#f4f4f4', ft:['spikesTop']},  // 頑皮雷彈
  101: {c1:'#f4b8c8', c2:'#f4ecd2', c3:'#5bb04a', ft:['leaves','headBumpL','headBumpR']},  // 蛋蛋
  102: {c1:'#e8c94a', c2:'#5bb04a', c3:'#5bb04a', ft:['leaves','headBumpL','headBumpR','footL','footR']},  // 椰蛋樹
  103: {c1:'#c98a4b', c2:'#f4ecd2', c3:'#f4ecd2', ft:['dome','tailLong','footL','footR']},  // 卡拉卡拉
  104: {c1:'#c98a4b', c2:'#f4ecd2', c3:'#f4ecd2', ft:['dome','tailLong','armL','armR']},  // 嘎啦嘎啦
  105: {c1:'#b8864b', c2:'#f4e3c0', c3:'#e53935', ft:['armL','armR','footL','footR']},  // 飛腿郎
  106: {c1:'#b8864b', c2:'#f4e3c0', c3:'#e53935', ft:['crest','armL','armR','footL','footR']},  // 快拳郎
  107: {c1:'#f4b8c8', c2:'#e8508a', c3:'#e8508a', ft:['earSmallL','earSmallR','tailCurl','footL','footR']},  // 大舌頭
  108: {c1:'#a888c8', c2:'#c8b8e8', c3:'#8f6fc0', ft:['spikesTop','vinesL','vinesR']},  // 瓦斯彈
  109: {c1:'#a888c8', c2:'#c8b8e8', c3:'#8f6fc0', ft:['spikesTop','vinesL','vinesR']},  // 雙彈瓦斯
  110: {c1:'#8fa0b0', c2:'#f4ecd2', c3:'#f4ecd2', ft:['earSmallL','earSmallR','horn','tailThick','footL','footR']},  // 獨角犀牛
  111: {c1:'#8fa0b0', c2:'#f4ecd2', c3:'#f4ecd2', ft:['earSmallL','earSmallR','horn','tailThick','armL','armR']},  // 鑽角犀獸
  112: {c1:'#f4b8c8', c2:'#f4d8e0', c3:'#f4b8c8', ft:['curlTop','armL','armR','footL','footR']},  // 吉利蛋
  113: {c1:'#4a78c0', c2:'#2b4a90', c3:'#4a78c0', ft:['vinesL','vinesR','tentacles']},  // 蔓藤怪
  114: {c1:'#c98a4b', c2:'#f4e3c0', c3:'#c98a4b', ft:['earSmallL','earSmallR','tailThick','footL','footR']},  // 袋獸
  115: {c1:'#6a9fd8', c2:'#f4f4f4', c3:'#6a9fd8', ft:['finTop','tailCurl']},  // 墨海馬
  116: {c1:'#4a78c0', c2:'#f4f4f4', c3:'#4a78c0', ft:['finTop','tailCurl','armL','armR']},  // 海刺龍
  117: {c1:'#f4f4f4', c2:'#e8643c', c3:'#e8643c', ft:['horn','tailFin']},  // 角金魚
  118: {c1:'#f4f4f4', c2:'#e8643c', c3:'#e8643c', ft:['horn','tailFin','armL','armR']},  // 金魚王
  119: {c1:'#c98a4b', c2:'#e8c94a', c3:'#c98a4b', ft:['starTop','starL','starR','starBL','starBR']},  // 海星星
  120: {c1:'#8f6fc0', c2:'#e8c94a', c3:'#8f6fc0', ft:['starTop','starL','starR','starBL','starBR']},  // 寶石海星
  121: {c1:'#f4b8c8', c2:'#6a9fd8', c3:'#6a9fd8', ft:['crest','armL','armR','footL','footR']},  // 魔牆人偶
  122: {c1:'#8fd04a', c2:'#f4f4f4', c3:'#d8e8f0', ft:['pincerL','pincerR','tailPoint']},  // 飛天螳螂
  123: {c1:'#e8508a', c2:'#f4d8a0', c3:'#e8d06a', ft:['hairL','hairR','crest']},  // 迷唇姐
  124: {c1:'#e8c94a', c2:'#2b2b2b', c3:'#2b2b2b', ft:['earL','earR','tailBolt','footL','footR']},  // 電擊獸
  125: {c1:'#e8643c', c2:'#f4d27a', c3:'#ff8a3a', ft:['flameTop','tailPoint','armL','armR']},  // 鴨嘴火獸
  126: {c1:'#8f6a4a', c2:'#f4ecd2', c3:'#f4ecd2', ft:['hornPair','footL','footR']},  // 凱羅斯
  127: {c1:'#b8864b', c2:'#f4e3c0', c3:'#f4ecd2', ft:['hornPair','tailMulti3','footL','footR']},  // 肯泰羅
  128: {c1:'#e8643c', c2:'#f4d27a', c3:'#e8643c', ft:['finTop','tailFin']},  // 鯉魚王
  129: {c1:'#4a78c0', c2:'#f4e3c0', c3:'#e8c94a', ft:['finTop','tailFin','whiskersL','whiskersR']},  // 暴鯉龍
  130: {c1:'#6a9fd8', c2:'#f4ecd2', c3:'#b8864b', ft:['horn','shell','tailFin','armL','armR']},  // 拉普拉斯
  131: {c1:'#c8a0d8', c2:'#b080c8', c3:'#c8a0d8', ft:['tentacles','vinesL','vinesR']},  // 百變怪
  132: {c1:'#c98a4b', c2:'#f4e3c0', c3:'#c98a4b', ft:['earLongL','earLongR','tailFluffy']},  // 伊布
  133: {c1:'#6a9fd8', c2:'#f4ecd2', c3:'#6a9fd8', ft:['earLongL','earLongR','tailFin','footL','footR']},  // 水伊布
  134: {c1:'#e8c94a', c2:'#f4ecd2', c3:'#e8c94a', ft:['earLongL','earLongR','tailFluffy','footL','footR']},  // 雷伊布
  135: {c1:'#e8643c', c2:'#f4ecd2', c3:'#e8643c', ft:['earLongL','earLongR','tailFluffy','footL','footR']},  // 火伊布
  136: {c1:'#e8508a', c2:'#6a9fd8', c3:'#e8508a', ft:['horn','tailPoint','footL','footR']},  // 多邊獸
  137: {c1:'#6a9fd8', c2:'#e8d8a0', c3:'#6a9fd8', ft:['shell','tentacles']},  // 菊石獸
  138: {c1:'#6a9fd8', c2:'#e8d8a0', c3:'#6a9fd8', ft:['shell','tentacles','spikesTop']},  // 多刺菊石獸
  139: {c1:'#a89880', c2:'#6e6050', c3:'#a89880', ft:['dome','tailPoint','footL','footR']},  // 化石盔
  140: {c1:'#a89880', c2:'#6e6050', c3:'#e8d8a0', ft:['dome','pincerL','pincerR','tailPoint']},  // 鐮刀盔
  141: {c1:'#a888c8', c2:'#d8c8f0', c3:'#c8b8e8', ft:['earFoxL','earFoxR','wingBatL','wingBatR','tailPoint']},  // 化石翼龍
  142: {c1:'#7fb0bd', c2:'#f4ead2', c3:'#7fb0bd', ft:['earSmallL','earSmallR','clawFootL','clawFootR']},  // 卡比獸
  143: {c1:'#6a9fd8', c2:'#f4f4f4', c3:'#b8e8f8', ft:['crest','beakL','wingFeatherL','wingFeatherR','tailFeathers']},  // 急凍鳥
  144: {c1:'#e8c94a', c2:'#f0b050', c3:'#e8c94a', ft:['crest','beakL','wingFeatherL','wingFeatherR','tailBolt']},  // 閃電鳥
  145: {c1:'#e8643c', c2:'#f4d27a', c3:'#ff8a3a', ft:['flameTop','beakL','wingFeatherL','wingFeatherR','tailFlame']},  // 火焰鳥
  146: {c1:'#6a9fd8', c2:'#f4f4f4', c3:'#f4f4f4', ft:['horn','tailPoint']},  // 迷你龍
  147: {c1:'#6a9fd8', c2:'#f4f4f4', c3:'#f4f4f4', ft:['antenna','tailPoint']},  // 哈克龍
  148: {c1:'#f0b050', c2:'#f4e0a0', c3:'#7bb0d8', ft:['horn','wing','tailPoint']},  // 快龍
  149: {c1:'#d8c8e0', c2:'#8f6fc0', c3:'#8f6fc0', ft:['earFoxL','earFoxR','tailThick','armL','armR','footL','footR']},  // 超夢
  150: {c1:'#f4b8c8', c2:'#f4d8e0', c3:'#f4b8c8', ft:['earFoxL','earFoxR','tailLong','footL','footR']}  // 夢幻
};

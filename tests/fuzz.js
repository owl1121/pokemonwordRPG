#!/usr/bin/env node
/* 自動測試：用 jsdom 載入整個遊戲，隨機按按鈕，抓例外錯誤和數值異常。
   用法（在 repo 根目錄）：
     cd tests && npm install        （第一次）
     node tests/fuzz.js                  兩種都跑（預設）
     node tests/fuzz.js battle -n 500    只跑隨機對戰 500 場
     node tests/fuzz.js monkey -n 3000   只跑亂按 3000 步（從 test-save.json 開始）
     node tests/fuzz.js monkey --new     亂按，從新遊戲開始
     node tests/fuzz.js --seed 42        指定亂數種子（重現問題用）
     node tests/fuzz.js -v               每個錯誤印出最後幾步操作
   有錯誤時結束碼為 1。 */
'use strict';
const fs = require('fs');
const path = require('path');
let JSDOM, ResourceLoader, VirtualConsole;
try { ({ JSDOM, ResourceLoader, VirtualConsole } = require('jsdom')); }
catch (e) { console.error('找不到 jsdom，請先執行：cd tests && npm install'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const MODE = ['battle', 'monkey', 'all'].find(m => args.includes(m)) || 'all';
const N = +opt('-n', 0);
const SEED = +opt('--seed', Date.now() % 100000);
const VERBOSE = args.includes('-v');
const FRESH = args.includes('--new');

/* ---------- 亂數：遊戲和測試都用同一個可重現的亂數 ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- 錯誤收集（同一個錯誤只記一次，算次數） ---------- */
const problems = new Map();
let trail = [], curWin = null;
function report(kind, msg, stack) {
  const where = (stack || '').split('\n').find(l => /\.(js|html)/.test(l) && !/node_modules|fuzz\.js/.test(l)) || '';
  const key = kind + '|' + msg + '|' + where.trim();
  const p = problems.get(key);
  if (p) { p.count++; return; }
  problems.set(key, { kind, msg, where: where.trim().replace(/^at\s+/, ''), count: 1, trail: trail.slice(-8), log: lastLines() });
}

function lastLines() {
  try { return [...curWin.document.querySelectorAll('#log .line')].slice(-8).map(d => d.textContent.trim()).filter(Boolean); } catch (e) { return []; }
}

/* ---------- 載入遊戲 ---------- */
class LocalLoader extends ResourceLoader {
  fetch(url) {
    const u = new URL(url);
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!/\.js$/.test(f)) return null;                     // 只載 js（圖、音效都略過）
    if (!fs.existsSync(f)) return Promise.reject(new Error('no file'));
    return Promise.resolve(fs.readFileSync(f));
  }
}

function boot(saveText, seed) {
  const random = rng(seed);
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Could not load script.*sounds\/list\.js/.test(e.message)) report('載入錯誤', e.message, e.stack || (e.detail && e.detail.stack)); });
  vc.on('error', (...a) => report('console.error', a.map(String).join(' ').slice(0, 200), new Error().stack));
  // 假時鐘：setTimeout 不真的等，由 flush() 依時間順序執行
  const clock = { now: 0, seq: 0, q: [] };
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/index.html', runScripts: 'dangerously', resources: new LocalLoader(), pretendToBeVisual: false, virtualConsole: vc,
    beforeParse(w) {
      w.Math.random = random;
      w.setTimeout = (fn, ms, ...a) => { const id = ++clock.seq; clock.q.push({ id, at: clock.now + Math.max(0, +ms || 0), fn, a }); return id; };
      w.clearTimeout = id => { clock.q = clock.q.filter(t => t.id !== id); };
      w.setInterval = (fn, ms) => { const id = ++clock.seq; const tick = () => { fn(); clock.q.push({ id, at: clock.now + Math.max(16, +ms || 0), fn: tick, a: [] }); }; clock.q.push({ id, at: clock.now + Math.max(16, +ms || 0), fn: tick, a: [] }); return id; };
      w.clearInterval = w.clearTimeout;
      w.requestAnimationFrame = fn => w.setTimeout(() => fn(clock.now), 16);
      w.cancelAnimationFrame = w.clearTimeout;
      Object.defineProperty(w, 'performance', { value: { now: () => clock.now }, configurable: true });
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.scrollTo = () => {};
      w.alert = w.confirm = w.prompt = () => true;
      w.fetch = () => Promise.reject(new Error('no network'));
      w.Image = class { set src(v) {} };
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
      w.HTMLCanvasElement.prototype.getContext = () => null;
      try { w.localStorage.clear(); if (saveText) w.localStorage.setItem('pkmn_tower_save_v2', saveText); } catch (e) {}
      w.addEventListener('error', ev => report('例外', ev.message, ev.error && ev.error.stack));
      w.addEventListener('unhandledrejection', ev => report('Promise 例外', String(ev.reason), ev.reason && ev.reason.stack));
    }
  });
  const w = dom.window; curWin = w;
  function flush(budgetMs = 60000) {
    const end = clock.now + budgetMs;
    for (let i = 0; i < 5000 && clock.q.length; i++) {
      clock.q.sort((a, b) => a.at - b.at || a.id - b.id);
      const t = clock.q[0];
      if (t.at > end) break;
      clock.q.shift();
      clock.now = Math.max(clock.now, t.at);
      try { t.fn(...t.a); } catch (e) { report('例外（計時器）', e.message, e.stack); }
    }
    clock.now = Math.max(clock.now, end - budgetMs + 1);
  }
  return new Promise((res, rej) => {
    const t0 = Date.now();
    (function wait() {
      if (w.eval('typeof state !== "undefined" && typeof screenCover === "function" && document.getElementById("opts")')) {
        w.eval('Object.defineProperty(window, "state", { get(){ return state; }, configurable: true })');   // state 是 let，外面要這樣才拿得到
        flush(); return res({ dom, w, flush });
      }
      if (Date.now() - t0 > 20000) return rej(new Error('遊戲載入逾時'));
      setImmediate(wait);
    })();
  });
}

/* ---------- 共用：按按鈕、檢查數值 ---------- */
function buttons(w) { return [...w.document.querySelectorAll('#opts button.opt')]; }
function press(g, b) {
  const label = (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  trail.push(label);
  const inp = g.w.document.getElementById('nameInput'); if (inp && !inp.value) inp.value = '測試';
  try { b.onclick && b.onclick.call(b, new g.w.MouseEvent('click')); }
  catch (e) { report('例外', e.message, e.stack); }
  g.flush();
}
function pick(list, random, weight) {
  const ws = list.map(weight), sum = ws.reduce((a, b) => a + b, 0);
  let r = random() * sum;
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}
const NUM_KEYS = ['hp', 'maxhp', 'atk', 'def', 'spa', 'sdf', 'spd', 'level', 'exp'];
function checkMon(m, where) {
  if (!m || typeof m !== 'object') return;
  for (const k of NUM_KEYS) if (typeof m[k] !== 'number' || !isFinite(m[k])) report('數值異常', `${where} ${m.name}.${k} = ${m[k]}`);
  if (m.hp < 0 || m.hp > m.maxhp) report('數值異常', `${where} ${m.name} HP ${m.hp}/${m.maxhp} 超出範圍`);
  if (!Array.isArray(m.moves) || !m.moves.length) report('數值異常', `${where} ${m.name} 沒有招式`);
  else for (const mv of m.moves) {
    if (!mv || !mv.name) { report('數值異常', `${where} ${m.name} 有空的招式`); continue; }
    if (!isFinite(mv.pp) || mv.pp < 0 || mv.pp > mv.maxpp) report('數值異常', `${where} ${m.name} ${mv.name} PP ${mv.pp}/${mv.maxpp}`);
  }
}
let lastLog = '';
function checkState(w) {
  const s = w.state;
  s.party.forEach(m => checkMon(m, '隊伍'));
  if (s.battle && s.battle.wild) checkMon(s.battle.wild, '對手');
  if (!isFinite(s.money)) report('數值異常', `money = ${s.money}`);
  if (!s.battle && w.eval('saveGame()') === false) report('存檔失敗', 'saveGame() 回傳 false（通常是 JSON 循環參照）');
  const log = w.document.getElementById('log').textContent;
  if (log !== lastLog) {
    const m = log.match(/.{0,20}(undefined|NaN|\[object Object\]|null（|（null).{0,20}/);
    if (m) report('畫面文字異常', m[0].replace(/\s+/g, ' '));
    lastLog = log;
  }
}

/* ---------- 模式一：隨機對戰 ---------- */
async function battleMode(count, seed) {
  const g = await boot(null, seed), w = g.w, random = rng(seed + 1);
  const ev = s => w.eval(s);
  const heldKeys = Object.keys(ev('HELD'));
  const nDex = ev('DEX.length'), nZone = ev('MAP_NAMES.length');
  const types = Object.keys(ev('TYPE_COLOR'));
  let done = 0, stuck = 0, steps = 0, kinds = { wild: 0, trainer: 0, gym: 0, other: 0 };
  for (let i = 0; i < count; i++) {
    trail = [`#${i} 開始`];
    try {
      const size = 1 + Math.floor(random() * 6);
      ev('state.battle = null; state.party = [];');
      for (let k = 0; k < size; k++) {
        const dex = Math.floor(random() * nDex), lv = 5 + Math.floor(random() * 96);
        const m = w.makeMon(dex, lv, {});
        if (random() < 0.6) m.held = heldKeys[Math.floor(random() * heldKeys.length)];
        m.tera = types[Math.floor(random() * types.length)];
        w.state.party.push(m);
      }
      ev('fullHeal(); state.meta.cd = 0;');
      w.state.zone = 1 + Math.floor(random() * nZone);
      w.state.meta.badges = Math.floor(random() * ev('GYMS.length'));
      const r = random();
      const kind = r < 0.55 ? 'wild' : r < 0.85 ? 'trainer' : 'gym';
      trail.push(`${kind} 區域${w.state.zone} 隊伍:${w.state.party.map(m => m.name + m.level + (m.held ? '@' + m.held : '')).join(',')}`);
      if (kind === 'wild') ev('state.meta.since = 0; state.meta.next = 999; encounter()');
      else if (kind === 'trainer') ev('startTrainer()');
      else { ev('DEX.forEach((_, i) => state.caught.add(i))'); ev('startGym()'); }
      g.flush();
    } catch (e) { report('例外（開場）', e.message, e.stack); continue; }
    if (!w.state.battle) { kinds.other++; continue; }
    kinds[w.state.battle.mode in kinds ? w.state.battle.mode : 'other']++;
    let n = 0;
    while (w.state.battle && n < 400) {
      const bs = buttons(w).filter(b => !b.classList.contains('off'));
      if (!bs.length) { report('卡住', `對戰中沒有可按的按鈕（${w.state.battle.mode}）`); stuck++; break; }
      const b = pick(bs, random, b => b.classList.contains('mv') ? 8 : /逃/.test(b.textContent) ? 0.2 : 1);
      press(g, b); checkState(w); n++;
    }
    if (w.state.battle && n >= 400) { report('卡住', `對戰超過 400 步還沒結束（${w.state.battle.mode}）`); stuck++; }
    // 對戰後的畫面（進化、學招式等）多按幾下收尾
    for (let k = 0; k < 10 && !w.state.battle; k++) { const bs = buttons(w); if (!bs.length) break; if (bs.some(b => /去野外|返回野外|繼續冒險/.test(b.textContent))) break; press(g, bs[Math.floor(random() * bs.length)]); }
    steps += n; done++;
    if ((i + 1) % 100 === 0) process.stdout.write(`  對戰 ${i + 1}/${count}\n`);
  }
  g.dom.window.close();
  return `對戰 ${done} 場（野生 ${kinds.wild}、訓練家 ${kinds.trainer}、道館 ${kinds.gym}），共 ${steps} 步，卡住 ${stuck} 次`;
}

/* ---------- 模式二：整個遊戲亂按 ---------- */
async function monkeyMode(count, seed) {
  const save = FRESH ? null : fs.readFileSync(path.join(ROOT, 'test-save.json'), 'utf8');
  const g = await boot(save, seed), w = g.w, random = rng(seed + 2);
  const seen = new Set();
  let resets = 0;
  trail = ['亂按開始'];
  for (let i = 0; i < count; i++) {
    let bs = buttons(w);
    if (!bs.length) { report('卡住', '畫面上沒有任何按鈕：' + w.document.getElementById('log').textContent.slice(-60)); w.eval('clearLog(); state.battle = null; state.party.length ? screenField() : screenCover()'); g.flush(); continue; }
    // 避開會把存檔清掉的按鈕（重置要先確認，按了確認才清）
    bs = bs.filter(b => !/確定重置|刪除存檔|重新開始遊戲/.test(b.textContent));
    if (!bs.length) bs = buttons(w);
    const b = pick(bs, random, b => b.classList.contains('mv') ? 4 : /返回|取消/.test(b.textContent) ? 0.6 : 1);
    seen.add((b.textContent || '').replace(/[\d,]+/g, '#').trim().slice(0, 20));
    press(g, b); checkState(w);
    if (w.eval('noAlive()') && !w.state.battle && random() < 0.3) { w.eval('fullHeal()'); }
    if (!w.state.party.length) resets++;
    if ((i + 1) % 1000 === 0) process.stdout.write(`  亂按 ${i + 1}/${count}\n`);
  }
  g.dom.window.close();
  return `亂按 ${count} 步，按過 ${seen.size} 種不同按鈕${FRESH ? '（新遊戲開始）' : '（test-save.json 開始）'}`;
}

/* ---------- 主程式 ---------- */
(async () => {
  const t0 = Date.now(), lines = [];
  console.log(`亂數種子 ${SEED}（用 --seed ${SEED} 可重現）`);
  try {
    if (MODE !== 'monkey') lines.push(await battleMode(N || 300, SEED));
    if (MODE !== 'battle') lines.push(await monkeyMode(N || 3000, SEED));
  } catch (e) { report('測試程式錯誤', e.message, e.stack); }
  console.log('\n' + lines.join('\n') + `\n耗時 ${((Date.now() - t0) / 1000).toFixed(1)} 秒`);
  if (!problems.size) { console.log('\n✅ 沒有發現問題'); process.exit(0); }
  console.log(`\n❌ 發現 ${problems.size} 種問題：`);
  for (const p of [...problems.values()].sort((a, b) => b.count - a.count)) {
    console.log(`\n[${p.kind}] ×${p.count}  ${p.msg}${p.where ? '\n    位置：' + p.where.replace(/http:\/\/localhost\//g, '') : ''}`);
    if (VERBOSE) { console.log('    最後操作：' + p.trail.join(' → ')); if (p.log.length) console.log('    畫面文字：\n      ' + p.log.join('\n      ')); }
  }
  process.exit(1);
})();

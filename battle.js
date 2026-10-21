/* =====================================================
   battle.js — 對戰相關程式碼（從 index.html 拆出）
   內容：屬性相剋、狀態效果、對戰卡片畫面、戰鬥流程
        （攻擊、捕捉、道具、換人、進化、經驗、勝敗結算）
   載入順序：data.js → battle.js → index.html 內的主程式
   注意：這些函式會用到主程式的 state、print、setOptions 等，
        只在被呼叫時才用到，所以可以先載入。
   ===================================================== */

/* =====================================================
   音效：預設用 WebAudio 即時合成（不需要音檔）。
   想換成自己的音效：把檔案放進 sounds/ 資料夾，再建立 sounds/list.js：
     window.SFX_FILES = ['hit.mp3','bgm_battle.mp3'];
   檔名（不含副檔名）對應下面的音效名稱，有放的用你的，沒放的用合成。
   音效名稱：click hit strong weak miss hurt faint win lose levelup evolve mega
             throw catchok catchfail reward blip
   背景音樂：bgm_field bgm_battle bgm_tower
   ===================================================== */
const SFX = (function(){
  let ctx = null, master = null, bgmGain = null, on = true, files = {}, bgmEl = null;
  try{ on = localStorage.getItem('pkmn_sfx') !== 'off'; }catch(e){}
  function ac(){
    if(ctx) return ctx;
    const C = window.AudioContext || window.webkitAudioContext; if(!C) return null;
    try{
      ctx = new C(); master = ctx.createGain(); master.gain.value = on ? 0.5 : 0; master.connect(ctx.destination);
      bgmGain = ctx.createGain(); bgmGain.gain.value = 0.55; bgmGain.connect(master);
    }catch(e){ ctx = null; }
    return ctx;
  }
  const hz = m => 440 * Math.pow(2, (m-69)/12);
  const waves = {};
  function W(name){   // 脈衝波：p25＝25% 佔空比、p125＝12.5%（掌機寶可夢那種尖尖的音色）
    if(waves[name]) return waves[name];
    const d = name === 'p125' ? 0.125 : 0.25, N = 32, re = new Float32Array(N), im = new Float32Array(N);
    for(let n=1;n<N;n++) re[n] = 2/(n*Math.PI)*Math.sin(n*Math.PI*d);
    return waves[name] = ctx.createPeriodicWave(re, im);
  }
  function osc(type, f, t, d, v, f2, dest, hold){
    const c = ctx, o = c.createOscillator(), g = c.createGain();
    if(type === 'p25' || type === 'p125') o.setPeriodicWave(W(type)); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(20,f2), t+d);
    g.gain.setValueAtTime(0.0001, t);
    let end = t + d;
    if(hold){   // 延音：很快升到音量、維持整個音符長度，結束後再慢慢淡出（尾音和下一個音自然重疊）
      const rel = hold === true ? 0.55 : hold;
      g.gain.exponentialRampToValueAtTime(v, t+0.04); g.gain.setValueAtTime(v, Math.max(t+0.04, t+d));
      end = t + d + rel;
    } else g.gain.exponentialRampToValueAtTime(v, t+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(g); g.connect(dest||master); o.start(t); o.stop(end+0.03);
  }
  let nbuf = null;
  function noise(t, d, v, f1, f2, dest){
    const c = ctx;
    if(!nbuf){ nbuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const a = nbuf.getChannelData(0); for(let i=0;i<a.length;i++) a[i]=Math.random()*2-1; }
    const s = c.createBufferSource(); s.buffer = nbuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type='bandpass'; fl.frequency.setValueAtTime(f1,t); if(f2) fl.frequency.exponentialRampToValueAtTime(f2,t+d);
    const g = c.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
    s.connect(fl); fl.connect(g); g.connect(dest||master); s.start(t); s.stop(t+d+0.03);
  }
  // 短旋律：[[音高MIDI, 起始秒, 長度秒], ...]，每個音都是持續音，沒有多餘的裝飾
  const jingle = (list, wave, vol, t, rel) => list.forEach(([m,o,l])=>osc(wave, hz(m), t+o, l, vol, null, null, rel||0.12));
  const DEF = {
    click:  t=>osc('p25', 1046, t, 0.05, 0.1),
    blip:   t=>osc('p25', 784, t, 0.07, 0.12),
    hit:    t=>osc('p25', 330, t, 0.1, 0.18, 110),
    strong: t=>{ osc('p25', 440, t, 0.14, 0.2, 110); osc('triangle', 110, t, 0.18, 0.3, 55); },
    weak:   t=>osc('triangle', 260, t, 0.1, 0.2, 160),
    miss:   t=>osc('triangle', 330, t, 0.12, 0.12, 260),
    hurt:   t=>osc('p25', 220, t, 0.14, 0.18, 80),
    faint:  t=>osc('p25',440,t,0.8,0.16,110,null,0.2),
    win:    t=>jingle([[67,0,0.14],[72,0.14,0.14],[76,0.28,0.14],[79,0.42,0.7]],'p25',0.14,t,0.08),
    lose:   t=>jingle([[64,0,0.2],[62,0.2,0.2],[60,0.4,0.2],[57,0.6,0.7]],'p25',0.14,t,0.08),
    levelup:t=>jingle([[72,0,0.12],[76,0.12,0.12],[79,0.24,0.12],[84,0.36,0.6]],'p25',0.14,t,0.08),
    evolve: t=>{ osc('p25',262,t,1.4,0.16,1047,null,0.05); jingle([[72,1.4,1],[76,1.4,1],[79,1.4,1]],'p25',0.1,t,0.08); },
    shiny:  t=>{ [[96,0],[103,0.07],[108,0.14],[103,0.32],[108,0.39],[112,0.46]].forEach(([m,o])=>osc('p125', hz(m), t+o, 0.06, 0.09)); },   // 色違出場：兩串叮叮叮
    mega:   t=>{ osc('p25',196,t,1.5,0.16,1568,null,0.05); osc('triangle',98,t,1.5,0.2,392,null,0.05); jingle([[67,1.5,1.1],[71,1.5,1.1],[74,1.5,1.1],[79,1.5,1.1]],'p25',0.09,t,0.08); },
    throw:  t=>osc('triangle', 392, t, 0.25, 0.14, 784),
    catchok:t=>jingle([[72,0,0.12],[79,0.12,0.12],[84,0.24,0.7]],'p25',0.14,t,0.08),
    catchfail:t=>jingle([[60,0,0.12],[55,0.14,0.3]],'p25',0.14,t,0.1),
    crack:  t=>{ noise(t,0.12,0.4,3200,1400); osc('p25',1900,t,0.05,0.06,900); },
    shatter:t=>{ noise(t,0.55,0.55,4200,1000); noise(t,0.3,0.3,9000,5000); [0,.03,.07,.12,.17,.24,.31].forEach(o=>osc('triangle',2200+Math.random()*2600,t+o,0.14,0.07)); },
    reward: t=>jingle([[79,0,0.08],[84,0.08,0.4]],'p25',0.12,t,0.2)
  };
  /* 背景音樂：每首 16 小節（A 段＋B 段循環），有主旋律、和弦伴奏、低音和鼓。
     旋律 [音高MIDI, 長度（步）]，null＝休止；和弦 [低音根音, 'M'大調/'m'小調] */
  const MAJ = [0,4,7], MIN = [0,3,7];
  const SONGS = {
    field: { step:0.268, bs:8, sus:true, rel:0.06, wave:'p25', leadVol:0.13, lead2:null,
      arpWave:'sine', arpEvery:1, arp:[0], arpOct:12, arpVol:0,
      bassWave:'triangle', bassEvery:4, bassPat:[0,0], bassVol:0.22, drums:'none', pad:false, padVol:0.05,
      chords:[[48,'M'],[43,'M'],[45,'m'],[48,'M'],[41,'M'],[36,'M'],[38,'m'],[43,'M'],
              [48,'M'],[41,'M'],[36,'M'],[43,'M'],[48,'M'],[50,'m'],[43,'M'],[48,'M'],
              [41,'M'],[43,'M'],[38,'m'],[45,'m'],[50,'m'],[43,'M'],[48,'M'],[43,'M'],
              [48,'M'],[43,'M'],[45,'m'],[48,'M'],[41,'M'],[36,'M'],[38,'m'],[43,'M']],
      mel:[[[76,2],[79,2],[84,2],[79,2]],[[83,2],[79,2],[74,2],[79,2]],[[81,2],[76,2],[72,2],[76,2]],[[79,2],[76,2],[74,2],[76,2]],
           [[77,2],[81,2],[84,2],[81,2]],[[79,2],[76,2],[72,2],[76,2]],[[77,2],[74,2],[77,2],[81,2]],[[79,4],[74,2],[71,2]],
           [[84,2],[81,2],[88,2],[84,2]],[[81,2],[77,2],[81,2],[84,2]],[[88,2],[84,2],[79,2],[84,2]],[[86,2],[83,2],[79,2],[83,2]],
           [[84,2],[88,2],[91,2],[88,2]],[[86,2],[81,2],[77,2],[81,2]],[[83,2],[79,2],[74,2],[79,2]],[[79,2],[83,2],[86,2],[null,2]],
           [[81,4],[84,2],[81,2]],[[79,4],[83,2],[79,2]],[[77,2],[81,2],[86,4]],[[84,4],[79,2],[76,2]],
           [[81,2],[84,2],[89,4]],[[88,2],[86,2],[83,4]],[[84,2],[81,2],[76,2],[81,2]],[[83,4],[79,2],[null,2]],
           [[76,2],[79,2],[84,2],[79,2]],[[83,2],[79,2],[74,2],[79,2]],[[81,2],[76,2],[72,2],[76,2]],[[79,2],[76,2],[74,2],[76,2]],
           [[77,2],[81,2],[84,2],[81,2]],[[79,2],[76,2],[72,2],[76,2]],[[77,2],[74,2],[77,2],[81,2]],[[79,4],[74,2],[71,2]]],
      secs:[{}, {}, {drums:'none'}, {}] },
    battle: { step:0.12, bs:16, sus:true, rel:0.05, wave:'p25', leadVol:0.1, lead2:null,
      arpWave:'square', arpEvery:2, arp:[0], arpOct:24, arpVol:0,
      bassWave:'triangle', bassEvery:4, bassPat:[0,0], bassVol:0.22, drums:'none', pad:false, padVol:0.035,
      chords:[[45,'m'],[48,'M'],[41,'M'],[43,'M'],[48,'M'],[45,'m'],[50,'m'],[43,'M'],
              [38,'m'],[43,'M'],[48,'M'],[45,'m'],[50,'m'],[43,'M'],[40,'M'],[45,'m']],
      mel:[[[81,2],[84,2],[88,4],[84,2],[81,2],[84,4]],[[81,2],[84,2],[88,2],[91,2],[88,4],[84,2],[81,2]],
           [[84,2],[81,2],[77,4],[81,2],[84,2],[89,4]],[[86,2],[83,2],[79,4],[83,2],[86,2],[91,2],[86,2]],
           [[88,4],[84,2],[81,2],[84,4],[81,2],[76,2]],[[81,2],[84,2],[88,2],[93,2],[91,2],[88,2],[84,2],[81,2]],
           [[84,4],[88,2],[84,2],[81,4],[77,4]],[[83,2],[80,2],[76,2],[80,2],[83,2],[88,2],[86,2],[83,2]],
           [[86,4],[89,2],[86,2],[81,4],[77,2],[81,2]],[[86,2],[89,2],[93,4],[89,2],[86,2],[89,4]],
           [[84,4],[81,2],[84,2],[88,4],[84,2],[81,2]],[[81,2],[84,2],[88,2],[84,2],[81,4],[null,4]],
           [[89,4],[84,2],[89,2],[93,4],[89,2],[84,2]],[[91,4],[86,2],[91,2],[95,4],[91,2],[86,2]],
           [[88,2],[83,2],[80,2],[83,2],[88,2],[92,2],[88,2],[83,2]],[[88,8],[null,4],[83,2],[80,2]]] },
    tower: { step:0.24, bs:8, sus:true, rel:0.06, wave:'p25', leadVol:0.1, lead2:null,
      arpWave:'sine', arpEvery:2, arp:[0], arpOct:12, arpVol:0,
      bassWave:'sine', bassEvery:8, bassPat:[0], bassVol:0.26, drums:'none', pad:false, padVol:0.06,
      chords:[[38,'m'],[43,'m'],[48,'M'],[45,'M'],[50,'m'],[43,'m'],[45,'M'],[50,'m'],
              [43,'m'],[48,'M'],[50,'m'],[45,'M'],[50,'m'],[45,'m'],[50,'m'],[45,'M']],
      mel:[[[74,3],[77,1],[81,2],[null,2]],[[82,3],[81,1],[77,2],[null,2]],[[79,2],[84,2],[79,2],[76,2]],[[85,2],[81,2],[76,2],[null,2]],
           [[77,2],[81,2],[86,3],[null,1]],[[79,2],[82,2],[86,2],[82,2]],[[85,4],[81,2],[76,2]],[[74,6],[null,2]],
           [[86,2],[82,2],[77,2],[82,2]],[[84,2],[79,2],[76,2],[79,2]],[[81,3],[86,1],[89,2],[86,2]],[[88,2],[85,2],[81,2],[85,2]],
           [[89,2],[86,2],[82,2],[86,2]],[[88,2],[84,2],[79,2],[84,2]],[[85,2],[88,2],[93,2],[88,2]],[[85,4],[null,4]]] }
  };
  Object.values(SONGS).forEach(S=>{      // 把旋律攤平成「第幾步開始哪個音」
    S.lead = {}; S.total = S.bs * S.mel.length;
    if(S.secs) S.q = S.secs.map(o=>Object.assign({}, S, o));
    S.mel.forEach((bar,b)=>{ let p = b*S.bs; bar.forEach(([m,l])=>{ if(m!=null) S.lead[p] = [m,l]; p += l; }); });
  });
  function drums(kind, pos, t, bs, v){
    const d = bus;
    if(kind === 'soft'){
      if(pos % 4 === 0) osc('sine',130,t,0.12,0.16,45,d);
      if(pos % 4 === 2) noise(t,0.04,0.05,7000,null,d);
    } else if(kind === 'brush'){
      if(pos % 4 === 2) noise(t,0.05,0.03,6000,null,d);
    } else if(kind === 'soft2'){
      if(pos === 0 || pos === 4) osc('sine',140,t,0.12,0.2,45,d);
      if(pos === 2 || pos === 6){ noise(t,0.08,0.08,3000,1500,d); }
      noise(t,0.025,0.03,9000,null,d);
    } else if(kind === 'rock'){
      if(pos === 0 || pos === 8 || pos === 10) osc('sine',150,t,0.14,0.28,45,d);
      if(pos === 4 || pos === 12){ noise(t,0.12,0.22,2200,900,d); osc('triangle',220,t,0.08,0.1,120,d); }
    } else if(kind === 'heart'){
      if(pos === 0 || pos === 3) osc('sine',90,t,0.25,pos?0.12:0.22,35,d);
    }
  }
  let scene = null, timer = null, step = 0, nextT = 0, bus = null;
  function newBus(){   // 每個場景一條獨立音軌，換場景時整條淡出並切掉，已排程的音符也不會繼續響
    if(bus){ const old = bus, t = ctx.currentTime; try{ old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t+0.08); }catch(e){} setTimeout(()=>{ try{ old.disconnect(); }catch(e){} }, 150); }
    bus = ctx.createGain(); bus.gain.value = 1; bus.connect(bgmGain);
  }
  function tick(){
    if(!ctx || !on || !scene) return;
    const S = SONGS[scene]; if(!S) return;
    while(nextT < ctx.currentTime + 0.35){
      const t = Math.max(nextT, ctx.currentTime), k = step % S.total, bar = Math.floor(k / S.bs), pos = k % S.bs;
      const ch = S.chords[bar], iv = ch[1] === 'm' ? MIN : MAJ;
      const Q = S.q ? S.q[Math.floor(bar/8) % S.q.length] : S;
      const L = S.lead[k];
      if(L){ osc(Q.wave, hz(L[0]), t, S.step*L[1]*(Q.sus?1:0.92), Q.leadVol, null, bus, Q.sus && (Q.rel||0.55)); if(Q.lead2) osc(Q.lead2, hz(L[0]-12), t, S.step*L[1]*0.9, Q.leadVol*0.5, null, bus); }
      if(Q.arpVol && pos % Q.arpEvery === 0){ const i = Q.arp[(pos/Q.arpEvery) % Q.arp.length]; osc(Q.arpWave, hz(ch[0] + Q.arpOct + iv[i%3] + (i>2?12:0)), t, S.step*Q.arpEvery*1.2, Q.arpVol, null, bus); }
      if(pos % Q.bassEvery === 0){ const o = Q.bassPat[(pos/Q.bassEvery) % Q.bassPat.length]; osc(Q.bassWave, hz(ch[0] + o), t, S.step*Q.bassEvery*(Q.sus?0.98:0.95), Q.bassVol, null, bus, Q.sus && (Q.rel||0.55)); }
      if(Q.pad && pos === 0) iv.forEach(x=>osc('triangle', hz(ch[0] + 12 + x), t, S.step*S.bs*0.98, Q.padVol, null, bus, Q.sus && (Q.rel||0.55)));
      drums(Q.drums, pos, t);
      nextT += S.step; step++;
    }
  }
  function playFileBgm(name){
    if(bgmEl){ bgmEl.pause(); bgmEl = null; }
    if(!name || !on) return;
    bgmEl = new Audio('sounds/' + files[name]); bgmEl.loop = true; bgmEl.volume = 0.4;
    bgmEl.play().catch(()=>{});
  }
  function setScene(s){
    if(s === scene) return;
    scene = s; step = 0; nextT = ctx ? ctx.currentTime + 0.12 : 0;
    if(ctx) newBus();
    const nm = 'bgm_' + s;
    if(files[nm]){ playFileBgm(nm); return; }
    if(bgmEl){ bgmEl.pause(); bgmEl = null; }
  }
  function play(name, delay){
    if(!on) return;
    if(delay > 0) return void setTimeout(()=>play(name), delay);
    try{
      if(files[name]){ const a = new Audio('sounds/' + files[name]); a.volume = 0.7; a.play().catch(()=>{}); return; }
      if(!ac()) return; if(ctx.state === 'suspended') ctx.resume();
      const f = DEF[name]; if(f) f(ctx.currentTime + 0.01);
    }catch(e){}
  }
  function setOn(v){
    on = !!v;
    try{ localStorage.setItem('pkmn_sfx', on ? 'on' : 'off'); }catch(e){}
    if(master) master.gain.value = on ? 0.5 : 0;
    if(!on && bgmEl) bgmEl.pause();
    if(on){ const s = scene; scene = null; if(ac() && ctx.state==='suspended') ctx.resume(); setScene(s); }
    const b = document.getElementById('sfxBtn'); if(b) b.textContent = on ? '🔊' : '🔇';
  }
  function init(){
    if(window.SFX_FILES) window.SFX_FILES.forEach(f=>{ files[f.replace(/\.[^.]+$/,'')] = f; });
    const unlock = ()=>{ if(ac() && ctx.state==='suspended') ctx.resume(); };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('click', e=>{
      const b = e.target.closest && e.target.closest('button');
      if(b && !b._go && b.id !== 'sfxBtn') play('click');
    }, true);
    timer = setInterval(()=>{
      try{
        if(!on) return;
        let s = null;
        if(typeof state !== 'undefined' && state && state.party && state.party.length){
          s = state.battle ? (state.battle.mode === 'tower' ? 'tower' : 'battle') : 'field';
        }
        if(s && !files['bgm_'+s] && !ac()) return;   // 還沒互動過，瀏覽器不允許出聲
        if(ctx && ctx.state !== 'running') return;
        setScene(s); tick();
      }catch(e){}
    }, 80);
    setOn(on);
  }
  return {init, play, setOn, isOn:()=>on};
})();

/* ---------- 屬性相剋 ---------- */
function eff(atkType, defTypes){
  let m = 1;
  const c = CHART[atkType];
  if(!c) return m;
  for(const t of defTypes){
    if(!t) continue;
    if(c.n && c.n.includes(t)) return 0;
    if(c.s.includes(t)) m *= 2;
    if(c.w.includes(t)) m *= 0.5;
  }
  return m;
}

/* ---------- 狀態效果：每回合的中毒／劇毒／灼傷傷害（招式的附加效果在 moves.js） ---------- */
function tickStatus(mon){
  if(!mon.status || mon.hp<=0 || hasAb(mon,'magicguard')) return '';
  const ph = abPoisonHeal(mon); if(ph) return ph.trim();   // 毒療
  if(mon.status==='poison'){ const d=Math.max(1,Math.floor(mon.maxhp/8)); mon.hp=Math.max(0,mon.hp-d); return `<span class="bad">${nm(mon)} 因中毒損失了 ${d} 點HP。</span>`; }
  if(mon.status==='toxic'){ const n = Math.min(15, mon._tox||1), d=Math.max(1,Math.floor(mon.maxhp*n/16)); mon._tox = n+1; mon.hp=Math.max(0,mon.hp-d); return `<span class="bad">${nm(mon)} 因劇毒損失了 ${d} 點HP。</span>`; }
  if(mon.status==='burn'){ const d=Math.max(1,Math.floor(mon.maxhp/16)); mon.hp=Math.max(0,mon.hp-d); return `<span class="bad">${nm(mon)} 因灼傷損失了 ${d} 點HP。</span>`; }
  return '';
}

/* ---------- 對戰卡片畫面 ---------- */
function pctHp(m){ return Math.max(0, Math.round(100*m.hp/m.maxhp)); }
const STATUS_CHIP = {burn:'🔥灼傷', poison:'☠️中毒', toxic:'☠️劇毒', paralyze:'⚡麻痺', sleep:'💤睡眠', freeze:'🧊冰凍'};
function stChip(m){ const t=STATUS_CHIP[m.status]; return (t ? ' · '+t : '') + (state.battle ? stagesChip(m) + sideChip(m) : ''); }
// 對戰卡片：at = 幾毫秒後才更新（讓血條跟著文字一起變），換了寶可夢則立即更新
let stageTimers = [], stageLatest = null, stageKey = null;
let stageDetail = null;   // 非對戰時要顯示在上方畫面的內容（例如寶可夢的能力六邊形）；只在下一次 setOptions 生效一次
function flushStage(){ stageTimers.forEach(clearTimeout); stageTimers = []; if(stageLatest){ stageLatest(); stageLatest = null; } }
/* ---------- 擊倒／捕捉動畫 ---------- */
// 動畫期間先「留住」對戰畫面，避免對戰一結束卡片就消失
let stageHoldTill = 0, stageHoldTimer = 0, fxGen = 0;
function stageHeldMs(){ return Math.max(0, stageHoldTill - performance.now()); }
function holdStage(ms){ stageHoldTill = Math.max(stageHoldTill, performance.now() + ms); }
function releaseStage(){ stageHoldTill = 0; fxGen++; clearTimeout(stageHoldTimer); if(!state.battle && appEl.classList.contains('battle')) syncBattleUI(); }
function fxReduced(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
/* ---------- 色違出場：卡片閃一下＋星星往外散開兩次（像本傳） ---------- */
function shinyFx(side){
  const b0 = state.battle;
  const go = ()=>{
    if(!state.battle || state.battle !== b0) return;
    if((typeof introEl !== 'undefined' && introEl) || stageHeldMs() > 0) return setTimeout(go, 120);   // 等開場動畫、擊倒動畫播完
    const c = stageEl.querySelector('.card.'+side); if(!c) return;
    if(typeof SFX !== 'undefined') SFX.play('shiny');
    if(fxReduced() || !c.animate) return;
    c.animate([{filter:'brightness(1)'}, {filter:'brightness(1.9) saturate(1.4)', offset:.25}, {filter:'brightness(1)', offset:.5}, {filter:'brightness(1.6)', offset:.7}, {filter:'brightness(1)'}], {duration:900, easing:'ease-out'});
    const r = c.getBoundingClientRect(), cx = r.left + r.width/2, cy = r.top + r.height/2;
    [0, 320].forEach((delay, wave)=>{
      for(let i=0;i<8;i++){
        const s = document.createElement('div'); s.className = 'shinyStar'; s.textContent = i%2 ? '✦' : '✧';
        s.style.left = cx+'px'; s.style.top = cy+'px';
        document.body.appendChild(s);
        const a = (i/8 + wave/16)*Math.PI*2, k = wave ? .75 : 1, dx = Math.cos(a)*r.width*.62*k, dy = Math.sin(a)*r.height*1.0*k;
        const an = s.animate([
          {transform:'translate(-50%,-50%) scale(.2) rotate(0deg)', opacity:0},
          {transform:`translate(calc(-50% + ${dx*.55}px), calc(-50% + ${dy*.55}px)) scale(1.25) rotate(90deg)`, opacity:1, offset:.45},
          {transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.3) rotate(180deg)`, opacity:0}
        ], {duration:650, delay, easing:'ease-out', fill:'forwards'});
        an.onfinish = ()=>s.remove();
        setTimeout(()=>s.remove(), delay + 1200);
      }
    });
  };
  setTimeout(go, Math.max(150, curDelay() + 80));
}
const KO_MS = 2400;
// 對手被打倒：像玻璃一樣碎掉——震動 → 裂痕 → 閃光一聲碎開，碎片往外噴、往下掉
// 每次隨機挑一種碎法（蛛網／三角格／亂刀／蛛網＋亂刀），形狀、數量都不一樣
const KO_SHAKE = 750, KO_CRACK = 500;
// 用一條直線把多邊形切成兩半（線：通過 p，方向 d）
function splitPoly(poly, p, d){
  const side = q => (q[0]-p[0])*d[1] - (q[1]-p[1])*d[0];
  const A = [], B = [];
  for(let i=0;i<poly.length;i++){
    const u = poly[i], v = poly[(i+1)%poly.length], su = side(u), sv = side(v);
    (su >= 0 ? A : B).push(u);
    if((su > 0 && sv < 0) || (su < 0 && sv > 0)){
      const t = su/(su - sv), x = [u[0] + (v[0]-u[0])*t, u[1] + (v[1]-u[1])*t];
      A.push(x); B.push(x);
    }
  }
  return [A, B].filter(q => q.length >= 3);
}
function polyArea(q){ let a = 0; for(let i=0;i<q.length;i++){ const u=q[i], v=q[(i+1)%q.length]; a += u[0]*v[1]-v[0]*u[1]; } return Math.abs(a)/2; }
function shatterPolys(W, H, cx, cy){
  const rnd = (a, b)=> a + Math.random()*(b-a), M = 6;   // M：外框多留一點，碎片才不會有缺角
  const box = [[-M,-M],[W+M,-M],[W+M,H+M],[-M,H+M]];
  const radial = ()=>{                                  // 蛛網：從撞擊點放射，3 圈
    const N = 10 + Math.floor(Math.random()*5), FAR = Math.hypot(W, H)*1.2, R = Math.min(W, H);
    const ang = Array.from({length:N}, (_, i)=> (i + .15 + Math.random()*.7) * 2*Math.PI/N);
    const rings = [R*.22, R*.5, R*.95].map(r => ang.map(()=> r*rnd(.7, 1.3)));
    const pt = (i, r)=> [cx + Math.cos(ang[i%N])*r, cy + Math.sin(ang[i%N])*r];
    const out = [];
    for(let i=0;i<N;i++){
      const j = i+1;
      out.push([[cx,cy], pt(i, rings[0][i]), pt(j, rings[0][j%N])]);
      for(let k=0;k<3;k++){
        const r0 = rings[k], r1 = k<2 ? rings[k+1] : null;
        const q = [pt(i, r0[i]), r1 ? pt(i, r1[i]) : pt(i, FAR), r1 ? pt(j, r1[j%N]) : pt(j, FAR), pt(j, r0[j%N])];
        if(Math.random() < .45){ out.push([q[0],q[1],q[2]], [q[0],q[2],q[3]]); } else out.push(q);   // 有些再對切一刀
      }
    }
    return out;
  };
  const grid = ()=>{                                    // 三角格：抖動過的格點，每格斜切成兩塊
    const C = 7 + Math.floor(Math.random()*3), Rw = 3 + Math.floor(Math.random()*2);
    const P = [];
    for(let r=0;r<=Rw;r++){ P.push([]); for(let c=0;c<=C;c++){
      let x = -M + (W+2*M)*c/C, y = -M + (H+2*M)*r/Rw;
      if(c>0 && c<C) x += rnd(-.35, .35)*(W/C);
      if(r>0 && r<Rw) y += rnd(-.3, .3)*(H/Rw);
      P[r].push([x, y]);
    }}
    const out = [];
    for(let r=0;r<Rw;r++) for(let c=0;c<C;c++){
      const a = P[r][c], b = P[r][c+1], d = P[r+1][c+1], e = P[r+1][c];
      if(Math.random() < .5) out.push([a,b,d],[a,d,e]); else out.push([a,b,e],[b,d,e]);
    }
    return out;
  };
  const slash = (polys, n)=>{                           // 亂刀：好幾條穿過撞擊點附近的直線
    for(let k=0;k<n;k++){
      const p = [cx + rnd(-.25, .25)*W, cy + rnd(-.35, .35)*H], a = Math.random()*Math.PI;
      polys = polys.flatMap(q => splitPoly(q, p, [Math.cos(a), Math.sin(a)]));
    }
    return polys;
  };
  const style = Math.floor(Math.random()*4);
  let polys = style===0 ? radial() : style===1 ? grid() : style===2 ? slash([box], 7 + Math.floor(Math.random()*3)) : slash(radial(), 2);
  polys = polys.filter(q => polyArea(q) > 6);
  while(polys.length > 70){ polys.sort((a,b)=>polyArea(a)-polyArea(b)); polys.shift(); }   // 太碎就去掉最小的幾片
  return polys;
}
function koFx(){
  if(fxReduced()) return;
  const at = Math.max(0, curDelay() - ATTACK_GAP + 450), gen = fxGen;
  gap(Math.max(0, at + KO_MS - curDelay()));   // 後面的文字等動畫播完再出現
  holdStage(at + KO_MS + 150);
  setTimeout(()=>{
    if(gen !== fxGen) return;
    const c = stageEl.querySelector('.card.foe'); if(!c || !c.animate) return;
    const W = c.offsetWidth, H = c.offsetHeight, L = c.offsetLeft, T = c.offsetTop;
    // 1. 震動 6 下，越震越輕
    const k = [{transform:'translate(0,0)'}], n = 6;
    for(let i=0;i<n;i++){
      const amp = 9*(1 - i/n) + 2;
      k.push({transform:`translate(${-amp}px,${(Math.random()-.5)*3}px)`, offset:(i+.25)/n});
      k.push({transform:`translate(${amp}px,${(Math.random()-.5)*3}px)`,  offset:(i+.75)/n});
    }
    k.push({transform:'translate(0,0)'});
    c.animate(k, {duration:KO_SHAKE, easing:'linear'});
    const cx = W*(.3 + Math.random()*.4), cy = H*(.3 + Math.random()*.4);
    const polys = shatterPolys(W, H, cx, cy);
    // 2. 裂痕：每條邊照離撞擊點的距離依序裂開（近的先裂）
    setTimeout(()=>{
      if(gen !== fxGen) return;
      if(typeof SFX !== 'undefined') SFX.play('crack');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'koCrack'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      Object.assign(svg.style, {left:L+'px', top:T+'px', width:W+'px', height:H+'px'});
      const seen = new Set(), edges = [];
      polys.forEach(q => q.forEach((u, i)=>{
        const v = q[(i+1)%q.length], key = [u, v].map(p=>p.map(x=>Math.round(x)).join(',')).sort().join('|');
        if(seen.has(key)) return; seen.add(key);
        const du = Math.hypot(u[0]-cx, u[1]-cy), dv = Math.hypot(v[0]-cx, v[1]-cy);
        edges.push(du <= dv ? [u, v, du] : [v, u, dv]);
      }));
      const maxD = Math.max(1, ...edges.map(e=>e[2]));
      svg.innerHTML = edges.map(([u, v])=>`<path d="M${u[0].toFixed(1)},${u[1].toFixed(1)}L${v[0].toFixed(1)},${v[1].toFixed(1)}"/>`).join('');
      stageEl.appendChild(svg);
      [...svg.children].forEach((path, i)=>{
        const len = Math.hypot(edges[i][1][0]-edges[i][0][0], edges[i][1][1]-edges[i][0][1]) + 1;
        path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
        path.animate([{strokeDashoffset:len}, {strokeDashoffset:0}],
          {duration:KO_CRACK*.35, delay:KO_CRACK*.55*edges[i][2]/maxD, easing:'ease-out', fill:'forwards'});
      });
      c.animate([{filter:'none'}, {filter:'brightness(1.6)'}, {filter:'brightness(1.2)'}], {duration:KO_CRACK, fill:'forwards'});
    }, KO_SHAKE);
    // 3. 碎開：閃光＋畫面一震＋亮片，原卡片換成一片片的複製卡片（clip-path 切形狀）往外噴、往下掉
    setTimeout(()=>{
      if(gen !== fxGen) return;
      if(typeof SFX !== 'undefined') SFX.play('shatter');
      stageEl.querySelectorAll('.koCrack').forEach(e=>e.remove());
      const rest = KO_MS - KO_SHAKE - KO_CRACK, diag = Math.hypot(W, H);
      c.style.visibility = 'hidden';
      stageEl.animate([{transform:'translate(0,0)'},{transform:'translate(-5px,3px)'},{transform:'translate(4px,-3px)'},{transform:'translate(-3px,2px)'},{transform:'translate(0,0)'}],
        {duration:260, easing:'linear'});
      const flash = document.createElement('div'); flash.className = 'koFlash';
      Object.assign(flash.style, {left:(L-8)+'px', top:(T-8)+'px', width:(W+16)+'px', height:(H+16)+'px'});
      stageEl.appendChild(flash);
      flash.animate([{opacity:.95, transform:'scale(1)'}, {opacity:0, transform:'scale(1.25)'}], {duration:280, easing:'ease-out', fill:'forwards'});
      setTimeout(()=>flash.remove(), 320);
      polys.forEach(poly=>{
        const s = c.cloneNode(true);
        s.classList.add('koShard'); s.style.visibility = 'visible';
        Object.assign(s.style, {left:L+'px', top:T+'px', width:W+'px', height:H+'px', margin:0});
        s.style.clipPath = `polygon(${poly.map(([x,y])=>`${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;
        const mx = poly.reduce((t,p)=>t+Math.max(0,Math.min(W,p[0])),0)/poly.length, my = poly.reduce((t,p)=>t+Math.max(0,Math.min(H,p[1])),0)/poly.length;
        const dx = mx - cx, dy = my - cy, dist = Math.hypot(dx, dy) || 1;
        const near = 1 - Math.min(1, dist/diag), small = polyArea(poly) < 300;   // 離撞擊點越近、越小片 → 噴越遠、轉越快
        const sp = (45 + Math.random()*55) * (.6 + near) * (small ? 1.3 : 1);
        const vx = dx/dist*sp, vy = dy/dist*sp*.7 - 10*Math.random(), fall = 80 + Math.random()*90;
        const rot = (Math.random()-.5) * (small ? 540 : 220), glint = 1 + Math.random()*.6;
        s.style.transformOrigin = `${mx.toFixed(0)}px ${my.toFixed(0)}px`;
        stageEl.appendChild(s);
        s.animate([
          {transform:'translate(0,0) rotate(0deg)', opacity:1, filter:`brightness(${glint+.4})`},
          {transform:`translate(${vx*.55}px,${vy*.55 - 8}px) rotate(${rot*.3}deg)`, opacity:1, filter:`brightness(${glint})`, offset:.18},
          {transform:`translate(${vx*.85}px,${vy*.85 + fall*.35}px) rotate(${rot*.65}deg)`, opacity:.85, offset:.55},
          {transform:`translate(${vx}px,${vy + fall}px) rotate(${rot}deg)`, opacity:0}
        ], {duration:rest*(.8 + Math.random()*.2), easing:'linear', fill:'forwards'});
        setTimeout(()=>s.remove(), rest + 50);
      });
      // 亮晶晶的小玻璃屑
      for(let i=0;i<22;i++){
        const g = document.createElement('i'); g.className = 'koGlint';
        g.style.left = (L+cx)+'px'; g.style.top = (T+cy)+'px';
        stageEl.appendChild(g);
        const a = Math.random()*2*Math.PI, r = 40 + Math.random()*110;
        g.animate([{transform:'translate(0,0) rotate(45deg) scale(1)', opacity:1},
                   {transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r*.7 + 30}px) rotate(${225+Math.random()*360}deg) scale(.3)`, opacity:0}],
          {duration:450 + Math.random()*500, easing:'cubic-bezier(.2,.7,.4,1)', fill:'forwards'});
        setTimeout(()=>g.remove(), 1000);
      }
    }, KO_SHAKE + KO_CRACK);
  }, at);
}
// 丟球：球飛過去 → 對手被吸進球裡 → 搖晃 → 成功（★）或掙脫
const CATCH_FLY = 450, CATCH_SUCK = 300, CATCH_DROP = 250, CATCH_SHAKE = 600, CATCH_END = 550;
function catchFx(ballKey, caught, shakes){
  if(fxReduced()) return 0;
  const total = CATCH_FLY + CATCH_SUCK + CATCH_DROP + shakes*CATCH_SHAKE + CATCH_END;
  const at = curDelay(), gen = fxGen;
  holdStage(at + total + 150);
  setTimeout(()=>{
    if(gen !== fxGen) return;
    const c = stageEl.querySelector('.card.foe'), me = stageEl.querySelector('.card.me');
    if(!c || !c.animate) return;
    const tx = c.offsetLeft + c.offsetWidth/2 - 13, ty = c.offsetTop + c.offsetHeight/2 - 13;
    const sx = me ? me.offsetLeft + 20 : 20, sy = me ? me.offsetTop + me.offsetHeight/2 : stageEl.offsetHeight;
    const ball = document.createElement('div');
    ball.className = 'cball fr-' + (BALL_TO_FRAME[ballKey] || 'poke');
    ball.style.left = tx+'px'; ball.style.top = ty+'px';
    stageEl.appendChild(ball);
    const dx = sx - tx, dy = sy - ty, T = (x,y,r)=>`translate(${x}px,${y}px) rotate(${r||0}deg)`;
    // 1. 拋物線飛過去
    ball.animate([
      {transform:T(dx,dy,0)}, {transform:T(dx*.5,dy*.5-60,360), offset:.5}, {transform:T(0,0,720)}
    ], {duration:CATCH_FLY, easing:'ease-out', fill:'forwards'});
    // 2. 對手閃一下被吸進球裡
    const t1 = CATCH_FLY;
    c.animate([
      {transform:'none', filter:'none', opacity:1},
      {transform:'scale(.9)', filter:'brightness(3)', opacity:1, offset:.3},
      {transform:'scale(.05)', filter:'brightness(3)', opacity:0}
    ], {duration:CATCH_SUCK, delay:t1, easing:'ease-in', fill:'forwards'});
    ball.animate([{transform:T(0,0)}, {transform:T(0,-14)}, {transform:T(0,0)}],
      {duration:CATCH_SUCK + CATCH_DROP, delay:t1, easing:'ease-in-out', fill:'forwards'});
    // 3. 搖晃
    const t2 = t1 + CATCH_SUCK + CATCH_DROP;
    for(let i=0;i<shakes;i++){
      ball.animate([
        {transform:T(0,0,0)}, {transform:T(-4,0,-25), offset:.2}, {transform:T(4,0,25), offset:.45}, {transform:T(0,0,0), offset:.65}, {transform:T(0,0,0)}
      ], {duration:CATCH_SHAKE, delay:t2 + i*CATCH_SHAKE, easing:'ease-in-out', fill:'forwards'});
    }
    const t3 = t2 + shakes*CATCH_SHAKE;
    setTimeout(()=>{
      if(gen !== fxGen) return;
      if(caught){
        ball.classList.add('done');
        ['★','★','★'].forEach((s,i)=>{
          const st = document.createElement('span'); st.className = 'cstar'; st.textContent = s;
          st.style.left = (tx+8)+'px'; st.style.top = (ty+4)+'px'; stageEl.appendChild(st);
          const ang = (-150 + i*60) * Math.PI/180;
          st.animate([{transform:'translate(0,0) scale(.4)', opacity:1}, {transform:`translate(${Math.cos(ang)*34}px,${Math.sin(ang)*34}px) scale(1.2)`, opacity:0}],
            {duration:CATCH_END, easing:'ease-out', fill:'forwards'});
        });
      } else {
        ball.animate([{transform:T(0,0), opacity:1, filter:'brightness(1)'}, {transform:T(0,-6)+' scale(1.4)', opacity:0, filter:'brightness(3)'}],
          {duration:300, easing:'ease-out', fill:'forwards'});
        c.animate([{transform:'scale(.05)', filter:'brightness(3)', opacity:0}, {transform:'scale(1.08)', filter:'brightness(1.6)', opacity:1, offset:.6}, {transform:'none', filter:'none', opacity:1}],
          {duration:CATCH_END, easing:'ease-out', fill:'forwards'});
      }
    }, t3);
  }, at);
  return total;
}
/* ---------- 對戰邊框：精靈球／超級球／高級球／大師球配色 ---------- */
const FRAME_NAMES = {none:'無框', poke:'精靈球', great:'超級球', ultra:'高級球', master:'大師球'};
const BALL_TO_FRAME = {pokeball:'poke', greatball:'great', ultraball:'ultra', masterball:'master'};
// 邊框解鎖條件：用該種球抓到的寶可夢數（精靈球預設解鎖；大師球也可以靠降服神獸解鎖）
const FRAME_UNLOCK = {
  none:   {need:0,  text:'預設解鎖'},
  poke:   {need:0,  text:'預設解鎖'},
  great:  {need:20, key:'cb_great',  text:'用超級球抓 20 隻寶可夢'},
  ultra:  {need:30, key:'cb_ultra',  text:'用高級球抓 30 隻寶可夢'},
  master: {need:1,  key:'cb_master', text:'用大師球抓 1 隻寶可夢，或降服 1 隻神獸'}
};
function frameProgress(k){                       // 回傳 [目前進度, 需要數量]
  const u = FRAME_UNLOCK[k]; if(!u || !u.key) return [0, 0];
  let n = (state.stats && state.stats[u.key]) || 0;
  if(k === 'master' && state.tower && state.tower.legendaryPtr > 0) n = Math.max(n, 1);
  return [Math.min(n, u.need), u.need];
}
function frameUnlocked(k){ const [n, need] = frameProgress(k); return !!FRAME_UNLOCK[k] && n >= need; }
// 個人檔案選了固定邊框（且已解鎖）就用它；選「依捕捉的球」（auto）則用這隻寶可夢被抓時用的球；
// 沒有紀錄（御三家、舊存檔）或那種邊框還沒解鎖的，都當精靈球
function frameKey(m){
  const f = state.profile && state.profile.frame;
  if(f && f !== 'auto' && FRAME_NAMES[f] && frameUnlocked(f)) return f;
  return (m && FRAME_NAMES[m.ball] && frameUnlocked(m.ball)) ? m.ball : 'poke';
}
/* ---------- 寶可夢特徵（疊在玩家選的邊框後面） ----------
   邊框一律照個人檔案的選擇（含限定的超級球／高級球／大師球）；各寶可夢的特徵（耳朵、尾巴…）再疊在框後面。
   卡片底圖（官方圖扭曲版）在 mon-art.js 的 monBgSrc。 */
function frameClass(m){ return 'fr-' + frameKey(m); }
// 「無框」：用這隻寶可夢的兩個代表色做上→下漸層（異色用異色的顏色；超進化中用超進化的顏色）
function monColorKey(m){ return (m && m._mega && typeof MON_COLORS==='object' && MON_COLORS['M'+m._mega.id]) ? 'M'+m._mega.id : (m && m.dex); }
function frameStyle(m){
  if(frameKey(m) !== 'none' || typeof MON_COLORS !== 'object') return '';
  const c = MON_COLORS[monColorKey(m)]; if(!c) return '';
  const [a, b] = m.shiny ? [c[2], c[3]] : [c[0], c[1]];
  return `--fr:linear-gradient(180deg,${a},${b});`;
}
// 卡片底圖（官方圖扭曲版，玩家和對手都有）：mon-art.js 的 monBgSrc 給圖片網址，瀏覽器顯示時才下載
function monBgAttr(m, side, extra){
  const u = (typeof monBgSrc==='function') ? monBgSrc(m) : '';
  const st = (extra||'') + (u ? `--mzimg:url(${u});` : '');
  return ` class="card ${side}${u?' mz':''}${m._dmax?' dmax':''}${m._tera?' tera':''}` + (side==='me' ? ' '+frameClass(m) : '') + `"` + (st ? ` style="${st}"` : '');
}



// 訓練家／館主的隊伍進度：✖ 已倒下、● 還能戰鬥（含目前場上那隻）
function teamDots(b, w){
  const f = (b.foeFainted||[]).length, left = (b.foes?b.foes.length:0) + (w.hp>0?1:0);
  return (f+left>1) ? ` · 對手 ${'✖'.repeat(f)}${'●'.repeat(left)}` : '';
}
function renderStage(at, hit, power){   // hit：'foe' 或 'me'，該張卡片會左右晃一下；power：'strong'／'weak'
  const b=state.battle, p=state.party[b.playerIdx], w=b.wild;
  const nmx = m => (m.shiny?'✨':'')+esc(m.name)+genderHtml(m)+(m._dmax?' 🔴':'')+(m._tera?' 💎':'');
  const xp = p.level>=MAX_LEVEL ? 100 : Math.min(100, Math.round(100*p.exp/p.expNext));
  const html =
    `<div${monBgAttr(w,'foe')}><div class="r1"><span>${nmx(w)}</span><span>Lv.${w.level}</span></div><div class="r2">#${dexNo(w.dex)} · ${w._tera?'💎':''}${esc(typesOf(w).filter(Boolean).join('／'))}${b.mode==='wild' ? (state.caught.has(w.dex) ? ' · ✔已抓過' : ' · ★未抓過') : ''}${stChip(w)}${teamDots(b,w)}</div><div class="bar${pctHp(w)<30?' low':''}"><i style="width:${pctHp(w)}%"></i></div></div>`+
    `<div${monBgAttr(p,'me',frameStyle(p))}><div class="r1"><span>${nmx(p)}</span><span>Lv.${p.level}</span></div><div class="r2">${p._tera?'💎':''}${esc(typesOf(p).filter(Boolean).join('／'))}${p._dmax?` · 極巨化剩 ${p._dmax} 回合`:''} · 速度 ${p.spd}${stChip(p)}</div><div class="bar${pctHp(p)<30?' low':''}"><i style="width:${pctHp(p)}%"></i></div><div class="hpt">HP: ${p.hp}/${p.maxhp}</div><div class="xp"><i style="width:${xp}%"></i></div></div>`;
  const turnHtml = `<div>回合<br><b>${b.turn||1}</b></div><div>狀態<br><b>${b.phase||'選擇行動'}</b></div>${weatherChip() ? `<div>天氣<br><b>${weatherChip()}</b></div>` : ''}${fieldChip() ? `<div>場地<br><b>${fieldChip()}</b></div>` : ''}`;
  const apply = ()=>{
    stageEl.innerHTML = html; turnEl.innerHTML = turnHtml;
    if(hit){ const c = stageEl.querySelector('.card.'+hit); if(c){ c.classList.add('hit'); if(power) c.classList.add(power); } }
    if(stageLatest===apply) stageLatest=null;
  };
  const fresh = stageKey && (stageKey[0]!==w || stageKey[1]!==p);
  stageKey = [w,p];
  const held = stageHeldMs();   // 擊倒／捕捉動畫還在播：卡片晚點再換
  if(held > 0) at = Math.max(at||0, held);
  if(!at || at<=0 || (fresh && !held) || !stageEl.innerHTML){ apply(); return; }
  stageLatest = apply;
  stageTimers.push(setTimeout(apply, at));
}
function syncBattleUI(phase){
  if(!state.battle && appEl.classList.contains('battle') && stageHeldMs() > 0){   // 對戰剛結束：等動畫播完再收起對戰畫面
    clearTimeout(stageHoldTimer);
    stageHoldTimer = setTimeout(()=>{ if(!state.battle) syncBattleUI(); }, stageHeldMs() + 30);
    return;
  }
  const b=state.battle, d=stageDetail; stageDetail = null;
  if(b && state.party[b.playerIdx]){ appEl.classList.remove('detail'); if(phase) b.phase=phase; appEl.classList.add('battle'); renderStage(curDelay()); }
  else {
    appEl.classList.remove('battle');
    if(d){ stageEl.innerHTML = d; appEl.classList.add('detail'); } else appEl.classList.remove('detail');
  }
}

/* ---------- BATTLE ---------- */
function statusTag(m){
  if(!m.status) return '';
  const tag = STATUS_CHIP[m.status] || '';
  return tag ? ` <span class="bad">[${tag}]</span>` : '';
}
function who(m){
  const b = state.battle;
  if(b && m === b.wild) return (b.mode==='wild' ? '野生的 ' : '對手 ') + nm(m);
  return nm(m);
}
function screenBattle(){
  const b = state.battle, p = state.party[b.playerIdx];
  renderBar();
  entryCheck();   // 天氣、出場特性（威嚇、乾旱……）
  if((b.wild && b.wild.hp<=0) || (p && p.hp<=0)){ if(checkBattleEnd()) return; }   // 換上場時被撒菱類打倒
  const busy = p._force || p._rch;   // 蓄力、需要休息、忍耐中：這回合只能繼續
  if(busy){
    const t = p._rch ? '需要休息' : (p._bide ? '正在忍耐' : `正在蓄力：${p._force.mv.name}`);
    print(`<span class="sys">${nm(p)} ${esc(t)}……</span>`);
    return setOptions([{label:`▶ 繼續（${t}）`, action:()=>playerMove(-2)}], '繼續');
  }
  const mk = (mv0,i)=>{
    const mv = mv0.struggle ? mv0 : shownMove(p, mv0);   // 極巨化中顯示極巨招式
    const why = mv0.struggle ? '' : moveBlockReason(p, mv0), off = !!why;
    const ppTxt = mv.struggle ? 'PP ∞' : `PP ${mv0.pp}/${mv0.maxpp}`;
    const ppCls = mv.struggle ? '' : (mv0.pp<=0 ? ' zero' : mv0.pp <= Math.ceil(mv0.maxpp/4) ? ' low' : '');
    const sub = (why && why !== 'PP 用完了') ? `🚫${why}` : moveShort(mv);
    return { label:`${mv.name}（${mv.type}／${mv.cls===2?'變化':'威力'+mv.power}／${ppTxt}）`, half:!mv.struggle, cls:'mv'+(off?' off':''),
      html:`<span class="mvn">${esc(mv.name)}</span><span class="mvt" style="background:${TYPE_COLOR[mv.type]||'#2b3a8c'}">${mv.type}</span><span class="mvpp${ppCls}">${ppTxt}</span><span class="mvp">${esc(sub)}</span>`,
      action: off ? ()=>screenBattle() : ()=>playerMove(i) };
  };
  const lock = holds(p,'choicescarf') && p._lock;   // 講究圍巾：只能用第一個選的招式
  let opts;
  if(usableMoves(p).length){ opts = p.moves.map(mk); if(lock) print(`<span class="sys">〔講究圍巾〕只能使用 ${esc(lock)}。</span>`); if(p._enc) print(`<span class="sys">被再來一次，只能使用 ${esc(p._enc.name)}。</span>`); }
  else { print('<span class="bad">沒有能用的招式了！只能使用「掙扎」。</span>'); opts = [mk(STRUGGLE,-1)]; }
  if(b.mode !== 'run') opts.push({label:'🎒 道具', cls:'q', action:screenItemSelect});   // 連戰試煉不能用道具
  if(state.party.filter(m=>m.hp>0).length>1) opts.push({label:'🔄 換上場', cls:'q', action:screenSwitch});
  if(gimmickFree() && !p._mega && !p._dmax && megaFormsFor(p).length) opts.push({label:'✨ Mega 進化', cls:'q', action:screenMegaEvolve});
  if(canZ(p)) opts.push({label:'⚡ Z 招式', cls:'q', action:screenZ});
  if(canTera(p)) opts.push({label:`💎 太晶化（${teraOf(p)}）`, cls:'q', action:doTera});
  if(canDmax(p)) opts.push({label:'🔴 極巨化', cls:'q', action:doDmax});
  if(b.mode==='wild'){
    opts.push({label:'🎯 捕捉', cls:'q', action:screenBallSelect});
    opts.push({label:'🏃 逃跑', cls:'q', action:tryFlee});
  }
  if(b.mode==='mega') opts.push({label:'🏃 逃跑', cls:'q', action:tryFlee});
  if(b.mode==='mega') print('<span class="sys">（Mega 對戰：不能捕捉，打贏就能拿到 Mega 碎片）</span>');
  else if(b.mode==='legendary') print('<span class="sys">（神獸戰無法逃跑，也無法用精靈球——擊敗牠就能收服）</span>');
  else if(b.mode==='trainer' || b.mode==='gym') print('<span class="sys">（訓練家對戰不能逃跑，也不能捕捉）</span>');
  else if(b.mode==='tower') print('<span class="sys">（塔內不能捕捉也不能逃跑，輸了會被送出塔外）</span>');
  else if(b.mode==='run') print('<span class="sys">（連戰試煉：不能用道具、不能逃跑、不能捕捉，全隊倒下就結束）</span>');
  setOptions(opts,'選擇招式');
}

function screenMegaEvolve(){
  const b = state.battle, p = state.party[b.playerIdx], forms = megaFormsFor(p);
  if(b.megaUsed || p._mega || !forms.length) return screenBattle();
  if(forms.length === 1) return doMegaEvolve(forms[0].id);
  clearLog();
  print(`<span class="em">✨ 要讓 ${nm(p)} 進化成哪一種 Mega？</span>`);
  forms.forEach(m=>print(`<b>${esc(m.name)}</b>　${esc(typeStr(m))}`));
  const opts = forms.map(m=>({label:m.name, action:()=>doMegaEvolve(m.id)}));
  opts.push({label:'← 返回', action:toBattle});
  setOptions(opts, '選擇 Mega');
}
function doMegaEvolve(id){
  const b = state.battle, p = state.party[b.playerIdx], m = MEGA_BY_ID[id];
  if(!b || !p || !m || !gimmickFree() || p._mega) return screenBattle();
  const before = p.name;
  megaEvolve(p, m); b.megaUsed = true;
  clearLog();
  print(`<span class="boss">✨ ${esc(before)} 的 Mega 進化石發出了光芒！</span>`);
  print(`<span class="boss">${esc(before)} Mega 進化成了 ${esc(p.name)}！（${esc(typeStr(p))}　特性：${esc(abName(p))}）</span>`);
  stageKey = null;
  screenBattle();
  flushStage(); renderStage(0);   // 卡片馬上換成 Mega 的名字和屬性
}
function screenBallSelect(){
  const b = state.battle;
  clearLog(); renderBar();
  const balls = BALL_KEYS.filter(k=>state.bag[k]>0);
  balls.forEach(k=>print(`<b>${esc(ITEMS[k].label)}</b> ×${state.bag[k]}　<span class="sys">${esc(ITEMS[k].desc)}</span>`));
  const opts = balls.map(k=>({label:ITEMS[k].label, half:true, action:()=>tryCatch(k)}));
  if(!opts.length) print('<span class="bad">你沒有任何精靈球了！去商店買吧。</span>');
  opts.push({label:'← 返回', action:toBattle});
  setOptions(opts,'選擇球種');
}
function screenMoveSelect(){ screenBattle(); }

function hpBars(){ /* 改由 renderStage() 畫對戰卡片 */ }

function normalizeLegend(w){
  if(!w.legend) return;
  const fresh = makeMon(w.dex, w.level, {shiny:w.shiny, iv:w.iv, ivCap:w.ivCap, nature:w.nature, ab:w.ab});
  Object.assign(w, {maxhp:fresh.maxhp, hp:fresh.maxhp, atk:fresh.atk, def:fresh.def, spa:fresh.spa, sdf:fresh.sdf, spd:fresh.spd, moves:fresh.moves, exp:0, expNext:fresh.expNext});
  delete w.legend;
}
function randomWildMove(w){ return chooseFoeMove(w); }   // 對手選招在 moves.js
function clearBattleModifiers(){ state.party.forEach(m=>{ m.status=null; m.atkMul=1; m.defMul=1; resetBattleFlags(m); }); }
function effText(mult){
  if(mult === 0) return ' <span class="bad">沒有效果……</span>';
  if(mult >= 2) return ' <span class="good">效果絕佳！</span>';
  if(mult < 1) return ' <span class="bad">效果不好...</span>';
  return '';
}
function dmg(atkMon, defMon, move){
  const stab = move.struggle ? 1 : stabMul(atkMon, move);   // 本系加成（太晶化見 gimmicks.js）
  const e = moveEff(move, defMon);
  if(e === 0) return 0;
  const variance = 0.85 + Math.random()*0.3;
  const phys = isPhys(move);   // 物理招式吃攻擊／防禦，特殊招式吃特攻／特防
  const L = fxList(move), wr = bf().wroom;   // 奇妙空間：防禦、特防對調
  const src = L.includes('foul') ? defMon : atkMon;
  const ua = dAb(atkMon, defMon,'unaware'), ud = hasAb(atkMon,'unaware');   // 純樸：無視對方的能力變化
  const st = (m, k, mul, ign) => (m[k] ?? m.atk) * (ign ? 1 : (m[mul]||1)) * abStatMul(m, k);
  const atkStat = L.includes('bpress') ? st(atkMon, 'def', 'defMul', ua)
    : phys ? st(src, 'atk', 'atkMul', ua) : st(atkMon, 'spa', 'spaMul', ua);
  const useDef = phys || L.includes('psyshock');
  const dRaw = (useDef !== !!wr) ? defMon.def : (defMon.sdf ?? defMon.def);
  const dMul = ud ? 1 : useDef ? (defMon.defMul||1) : (defMon.sdfMul||1);
  const defStat = Math.max(1, dRaw * dMul * fxDefStat(defMon, useDef) * abStatMul(defMon, (useDef !== !!wr) ? 'def' : 'sdf'));
  const raw = ((2*atkMon.level/5+2)*move.power*(atkStat/defStat)/50 + 2);
  return Math.max(1, Math.floor(raw*stab*e*variance*fxDmgMul(atkMon, defMon, move, e)*fieldDmgMul(atkMon, defMon, move)));   // 天氣、特性、攜帶道具、場地
}
function moveEff(move, defMon){
  if(move.struggle) return 1;
  let t = typesOf(defMon).filter(Boolean);
  if((move.type === '一般' || move.type === '格鬥') && (defMon._foresight || (state.battle && hasAb(activeFoeOf(defMon),'scrappy')))) t = t.filter(x=>x !== '幽靈');
  if(move.type === '地面' && state.battle){
    if(bf().grav) t = t.filter(x=>x !== '飛行');
    else if(defMon._mrise || defMon._tkin) return 0;
  }
  if(move.cls === 2) return 1;   // 變化招不看屬性相剋（電磁波、粉末類另外判斷）
  return eff(move.type, t);
}
function effSpd(m){ return m.spd * fxSpd(m) * (m.status==='paralyze' ? 0.5 : 1) * (state.battle && sideOf(m).tailw ? 2 : 1); }
// 單次出招：處理麻痺、傷害、反作用力、吸血、附加效果
function doAttack(att, def, move){
  const t0 = curDelay(), hpBefore = def.hp;
  const target = (state.battle && def === state.battle.wild) ? 'foe' : 'me';
  attackCore(att, def, move);
  const mult = moveEff(move, def);
  if(state.battle) renderStage(t0 || 1, def.hp < hpBefore ? target : null, mult >= 2 ? 'strong' : (mult < 1 ? 'weak' : null));
  gap(ATTACK_GAP);
}
function attackCore(att, def, move){
  if(!beforeMoveFx(att, move)) return;   // 畏縮、節拍器
  useMove(att, def, move);               // 招式效果都在 moves.js
}
// 回傳 true 代表戰鬥已結束或已切換畫面
function checkBattleEnd(){
  const b = state.battle; if(!b) return true;
  if(b._ended) return finishEarly();   // 被吹走、瞬間移動
  const p = state.party[b.playerIdx]; const w = b.wild;
  if(w.hp<=0){
    koFx();
    if(p.hp<=0) print(`<span class="bad">${nm(p)} 也在同一擊中倒下了！</span>`);
    winBattle(); return true;
  }
  if(p.hp<=0){ afterFaintCheck(p); return true; }
  return false;
}
function enemyTurn(){
  const b = state.battle, w = b.wild;
  w._choice = chooseFoeMove(w);
  doAttack(w, state.party[b.playerIdx], w._choice);
  return checkBattleEnd();
}
function endOfTurn(){
  const b = state.battle; let p = state.party[b.playerIdx]; const w = b.wild;
  const tW = tickStatus(w); if(tW) print(tW);
  endTurnFx(w); moveEndTurn(w);
  const tP = tickStatus(p); if(tP) print(tP);
  endTurnFx(p); moveEndTurn(p);
  fieldEndTurn();
  weatherTick();
  if(b._ended) return finishEarly();
  if(w.hp<=0){ koFx(); if(p.hp<=0) print(`<span class="bad">${nm(p)} 也倒下了！</span>`); return winBattle(); }
  if(afterFaintCheck(p)) return;
  dmaxTick(p);
  if(b._foePivot) doFoePivot();
  if(b._pivot) return screenPivot();
  b.turn = (b.turn||1) + 1;
  screenBattle();
}
// 出招順序：先比先制度，再比速度（戲法空間反過來）
function turnOrder(p, pm, w, wm){
  const pr = (m, mv, o) => (mv.pri||0) + abPriority(m, mv, o);
  const pp = pr(p, pm, w), wp = pr(w, wm, p);
  pm._pri = pp; wm._pri = wp;
  let first;
  if(pp !== wp) first = pp > wp;
  else {
    const bp = abOrderBias(p, pm), bw = abOrderBias(w, wm);
    if(bp !== bw) first = bp > bw;
    else {
      const ps = effSpd(p), ws = effSpd(w);
      first = ps === ws ? Math.random() < 0.5 : (bf().troom ? ps < ws : ps > ws);
      if(!first && holds(p,'quickclaw') && Math.random() < 0.2){ first = true; print(`<span class="good">〔先制之爪〕${nm(p)} 搶先行動了！</span>`); }
    }
  }
  return first ? [[p,pm],[w,wm]] : [[w,wm],[p,pm]];
}
function playerMove(moveIdx, opt){
  const b = state.battle; const p = state.party[b.playerIdx]; const w = b.wild;
  if(!(opt && opt.z)) clearLog();
  let pm;
  if(p._force) pm = p._force.mv;
  else if(p._rch) pm = p.moves[0] || STRUGGLE;
  else {
    if(moveIdx >= 0 && moveBlockReason(p, p.moves[moveIdx])) return screenMoveSelect();
    if(moveIdx < 0 && usableMoves(p).length) return screenMoveSelect();
    pm = moveIdx < 0 ? STRUGGLE : p.moves[moveIdx];
    if(opt && opt.z && !pm.struggle) pm = zMoveOf(pm);          // Z 招式
    else if(p._dmax && !pm.struggle) pm = maxMoveOf(pm);       // 極巨招式
  }
  const wm = chooseFoeMove(w);
  if((holds(p,'choicescarf') || hasAb(p,'gorillatactics')) && !pm.struggle && !p._lock && !p._dmax) p._lock = (pm._base || pm).name;
  p._choice = pm; w._choice = wm;
  for(const [a, m] of turnOrder(p, pm, w, wm)){
    const active = a === b.wild || a === state.party[b.playerIdx];   // 被吹走換下場的就不能出招了
    const d = active ? activeFoeOf(a) : null;
    if(!active || a.hp<=0 || !d || d.hp<=0) continue;
    doAttack(a, d, m);
    if(checkBattleEnd()) return;
  }
  endOfTurn();
}
function tryCatch(ballKey){
  if(typeof ballKey !== 'string') ballKey = 'pokeball';
  const b = state.battle; const w = b.wild; const ball = ITEMS[ballKey];
  clearLog();
  if(!(state.bag[ballKey]>0)){
    print(`<span class="bad">${ball.label}用完了！去商店補貨吧。</span>`);
    return screenBattle();
  }
  state.bag[ballKey]--;
  const hpRatio = w.hp/w.maxhp;
  const chance = ball.master ? 1 : Math.min(0.97, (1-hpRatio)*0.75 + 0.15 + ball.ball + (daily('catch') ? 0.1 : 0));
  print(`你對 ${nm(w)} 丟出了${ball.label}……`);
  const caught = Math.random() < chance;
  gap(catchFx(ballKey, caught, caught ? 3 : Math.floor(Math.random()*3)));
  if(caught){
    unboostMon(w); w.status = null; w.atkMul = 1; w.defMul = 1; resetBattleFlags(w); bump('catches'); battleDone();
    w.ball = BALL_TO_FRAME[ballKey] || 'poke';   // 記住被哪種球抓到（決定邊框）
    { if([w.t1,w.t2].some(x=>x==='幽靈'||x==='惡')) bump('ghostCatch');   // 節日活動任務用
      const fk = w.ball, was = frameUnlocked(fk); bump('cb_' + fk);
      if(!was && frameUnlocked(fk)) notify('🎴 解鎖新邊框：' + FRAME_NAMES[fk] + '！（到個人檔案裡設定）'); }

    pityResolve(w, true);
    if(b.mode === 'wild') addZoneWin();
    state.caught.add(w.dex);
    if(w.shiny) state.shinyCaught.add(w.dex);
    print(`<span class="good">抓到了！${nm(w)} 已加入圖鑑！</span>`);
    if(state.party.length<6){ state.party.push(w); print('它加入了你的隊伍！'); }
    else { state.box.push(w); print('隊伍已滿，它被送到了倉庫。'); }
    const activeMon = state.party[b.playerIdx];
    if(activeMon && activeMon.hp>0 && activeMon!==w) grantExp(activeMon, w.level, 0.5, '因為成功捕捉獲得');
    state.battle=null;
    return runEvolutions(()=>screenField());
  }
  print('<span class="bad">牠掙脫了！</span>');
  if(enemyTurn()) return;
  endOfTurn();
}
function screenItemSelect(){
  const b = state.battle; const p = state.party[b.playerIdx];
  clearLog(); renderBar(); hpBars(p, b.wild);
  print('選擇要使用的道具：');
  const opts = [];
  Object.keys(ITEMS).forEach(kind=>{
    const it = ITEMS[kind];
    if(it.ball!==undefined || it.stone || !(state.bag[kind] > 0)) return;
    const relevant = it.pp ? p.moves.some(m=>m.pp<m.maxpp) : it.heal ? p.hp < p.maxhp : statusMatch(p.status, it.cure);
    if(relevant){ print(`<b>${esc(it.label)}</b> ×${state.bag[kind]}　<span class="sys">${esc(it.desc)}</span>`); opts.push({label:it.label, half:true, action:()=>useItem(kind)}); }
  });
  if(opts.length===0) print('<span class="sys">（目前沒有能用的道具）</span>');
  opts.push({label:'← 返回', action:toBattle});
  setOptions(opts,'選擇道具');
}
function useItem(kind){
  const b = state.battle; const p = state.party[b.playerIdx];
  const it = ITEMS[kind];
  clearLog();
  if(!it || !(state.bag[kind]>0)){ print('<span class="bad">道具用完了！</span>'); return screenBattle(); }
  state.bag[kind]--;
  if(it.pp){
    restorePP(p);
    print(`<span class="good">使用了${it.label}，${nm(p)} 的全部招式 PP 恢復了！</span>`);
  } else if(it.heal){
    const before = p.hp;
    p.hp = Math.min(p.maxhp, p.hp + it.heal);
    print(`<span class="good">使用了${it.label}，${nm(p)} 回復了 ${p.hp-before} 點 HP。</span>`);
  } else {
    p.status = null;
    print(`<span class="good">使用了${it.label}，${nm(p)} 的異常狀態治好了！</span>`);
  }
  if(enemyTurn()) return;
  endOfTurn();
}
function tryFlee(){
  clearLog();
  const fp = state.party[state.battle.playerIdx];
  if(!canEscape(fp) || abTrapped(fp)){ print(`<span class="bad">${nm(fp)} 被困住了，逃不掉！${abTrapped(fp) ? `（${abTrapped(fp)}）` : ''}</span>`); return screenBattle(); }
  if(hasAb(fp,'runaway') || Math.random()<0.75){
    print('你成功逃跑了。');
    bump('flees');
    state.battle=null; megaRevertAll(); state.party.forEach(resetBattleFlags);
    return screenField();
  }
  print('<span class="bad">沒能逃脫！</span>');
  if(enemyTurn()) return;
  endOfTurn();
}
function screenSwitch(){
  const b = state.battle;
  clearLog();
  const cur = state.party[b.playerIdx];
  if(!canEscape(cur) || abTrapped(cur)){ print(`<span class="bad">${nm(cur)} 被困住了，不能換下場！</span>`); return screenBattle(); }
  print('<span class="em">選擇要換上場的寶可夢：</span>');
  const opts = state.party.map((m,i)=>{
    const tag = i===b.playerIdx ? '（目前上場）' : (m.hp<=0 ? '（已無法戰鬥）' : `HP ${m.hp}/${m.maxhp}`);
    const usable = i!==b.playerIdx && m.hp>0;
    return { label:`${monName(m)} Lv.${m.level} ${tag}`, half:true, action: usable ? ()=>doSwitch(i) : screenSwitch };
  });
  opts.push({label:'取消，返回戰鬥', action:toBattle});
  setOptions(opts,'選擇寶可夢');
}
function doSwitch(idx){
  const b = state.battle;
  const old = state.party[b.playerIdx];
  b.playerIdx = idx;
  clearLog();
  print(`收回了 ${nm(old)}，換上 ${nm(state.party[idx])}！`);
  switchOutFx(old); entryCheck();
  if(enemyTurn()) return;
  endOfTurn();
}
/* ---------- 訓練家／館主：打倒一隻後，先宣告對方下一隻，再問玩家要不要換寶可夢 ---------- */
// 詢問期間 b.wild 仍是剛倒下的那隻（卡片留著、血條是空的），b.foes[0] 才是對方即將派出的
function askShiftBeforeFoe(nx){
  const b = state.battle;
  hr();
  print(`<span class="em">${esc(b.title)} 要派出 ${nm(nx)}（Lv.${nx.level}）！</span>`);
  const canSwitch = state.party.some((m,i)=> i!==b.playerIdx && m.hp>0);
  if(!canSwitch) return sendNextFoe(nx, true);   // 隊上沒有別隻能換，就不用問了
  print('要不要換寶可夢？');
  setOptions([
    {label:'🔄 換寶可夢', action:()=>screenSwitchBeforeFoe(nx)},
    {label:'⚔️ 不換，直接開打', action:()=>sendNextFoe(nx)}
  ], '要換寶可夢嗎？');
}
function screenSwitchBeforeFoe(nx){
  const b = state.battle;
  clearLog();
  print('<span class="em">選擇要換上場的寶可夢：</span>');
  const opts = state.party.map((m,i)=>{
    const tag = i===b.playerIdx ? '（目前上場）' : (m.hp<=0 ? '（已無法戰鬥）' : `HP ${m.hp}/${m.maxhp}`);
    const usable = i!==b.playerIdx && m.hp>0;
    return { label:`${monName(m)} Lv.${m.level} ${tag}`, half:true, action: usable ? ()=>doSwitchBeforeFoe(i, nx) : ()=>screenSwitchBeforeFoe(nx) };
  });
  opts.push({label:'取消，返回', action:()=>{ clearLog(); askShiftBeforeFoe(nx); }});
  setOptions(opts,'選擇寶可夢');
}
function doSwitchBeforeFoe(idx, nx){
  const b = state.battle;
  const old = state.party[b.playerIdx];
  b.playerIdx = idx;
  clearLog();
  print(`收回了 ${nm(old)}，換上 ${nm(state.party[idx])}！`);   // 這是我方的免費換人，對方不會趁機攻擊
  switchOutFx(old);
  sendNextFoe(nx, true);
}
function sendNextFoe(nx, keepLog){
  const b = state.battle;
  if(!keepLog) clearLog();
  b.foes.shift(); b.wild = nx;
  print(`<span class="em">${esc(b.title)} 派出了 ${nm(nx)}（Lv.${nx.level}）！</span>`);
  screenBattle();
}
/* ---------- 進化：先詢問玩家，同意後才進化 ---------- */
const evoSkip = new WeakMap();   // 玩家選了「不進化」：同一等級不再詢問（重新整理頁面後會再問一次）
let evoQueue = [];
function evoTarget(p){           // 回傳進化後的圖鑑索引；現在還不能進化則回傳 null
  const ce = condEvoTarget(p); if(ce !== null) return ce;   // 時段、性別、會的招式、攻防比較、仙子伊布（growth.js）
  const te = TIME_EVO[p.dex];
  if(FRIEND_EVO.has(p.dex) && friendOf(p) >= FRIEND_EVO_MIN){   // 親密度夠高：不用等到等級
    if(te){ const h = nowFn().getHours(); return (h>=6 && h<18) ? te.day : te.night; }
    const r = EVO[p.dex]; if(r) return Array.isArray(r[0]) ? r[0][Math.floor(Math.random()*r[0].length)] : r[0];
  }
  if(te){
    if(p.level < te.lvl) return null;
    const h = nowFn().getHours();
    return (h>=6 && h<18) ? te.day : te.night;
  }
  const rule = EVO[p.dex];
  if(!rule) return null;
  const [toIdx, lvl] = rule;
  if(p.level < lvl) return null;
  return Array.isArray(toIdx) ? toIdx[Math.floor(Math.random()*toIdx.length)] : toIdx; // 多分支：隨機
}
function queueEvolution(p){      // 達成進化條件就排進詢問佇列
  if(evoSkip.get(p) === p.level) return;
  if(evoTarget(p) === null) return;
  if(!evoQueue.includes(p)) evoQueue.push(p);
}
function evolveTo(p, toIdx){
  const oldName = esc(monName(p)), oldDex = p.dex;
  const e = DEX[toIdx];
  p.dex = toIdx; p.name = e[0]; p.t1 = e[1]; p.t2 = e[2]; p.tier = e[3];
  const st = monStats(p);
  const hpGain = st.hp - p.maxhp;
  p.maxhp = st.hp; p.hp = Math.max(1, Math.min(p.maxhp, p.hp + hpGain));
  setNonHpStats(p, st);
  learnOnEvolve(p, oldDex);   // 招式保留；學會新形態的進化招式
  state.caught.add(toIdx); state.seen.add(toIdx);
  if(p.shiny) state.shinyCaught.add(toIdx);
  print(`<span class="em">「${oldName}」正在進化…</span>`);
  print(`<span class="em">✦ 「${oldName}」進化成了「${esc(monName(p))}」！</span>`);
  bump('evolves');
  return true;
}
// 戰鬥／捕捉結束後呼叫：有寶可夢可以進化就逐隻詢問，全部處理完才執行 next()
function runEvolutions(next){
  state.party.forEach(queueEvolution);
  evoQueue = evoQueue.filter(p => state.party.includes(p) && evoSkip.get(p) !== p.level && evoTarget(p) !== null);
  if(!evoQueue.length) return next();
  const p = evoQueue[0], n = esc(monName(p));
  print(`<span class="em">咦……？「${n}」的樣子……！</span>`);
  print(`要讓「${n}」進化嗎？`);
  setOptions([
    {label:'✔ 進化', action:()=>{
      evoQueue.shift();
      const to = evoTarget(p);
      if(to !== null) evolveTo(p, to);
      saveGame();
      runEvolutions(next);
    }},
    {label:'✖ 不進化', action:()=>{
      evoQueue.shift();
      evoSkip.set(p, p.level);
      print(`<span class="sys">「${n}」停止了進化。</span>`);
      runEvolutions(next);
    }}
  ]);
}
function grantExp(p, oppLevel, mult, verb, quiet){
  if(p.level >= MAX_LEVEL){
    p.exp = 0;
    queueEvolution(p); // 滿級才抓到、或舊存檔中尚未進化的寶可夢，也能進化
    if(!quiet) print(`<span class="sys">${nm(p)} 已經是 Lv.${MAX_LEVEL}，經驗值無法再增加。</span>`);
    return;
  }
  const gained = Math.max(1, Math.floor((10 + oppLevel*4) * mult * expMulFor(p) * (friendOf(p) >= 255 ? 1.2 : 1)));   // 修行日、幸運蛋、親密度滿
  p.exp += gained;
  if(!quiet) print(`<span class="good">${nm(p)} ${verb} ${gained} 經驗值。</span>`);
  while(p.level < MAX_LEVEL && p.exp >= p.expNext){
    p.exp -= p.expNext; p.level++; p.expNext = 18 + p.level*9;
    const st = monStats(p);
    const gainHp = st.hp-p.maxhp;
    p.maxhp=st.hp; p.hp=Math.min(p.hp+gainHp, p.maxhp); setNonHpStats(p, st);
    print(`<span class="em">${nm(p)} 升到了 Lv.${p.level}！</span>`);
    addFriend(p, 2);
    learnOnLevel(p);
    queueEvolution(p);
  }
  if(p.level >= MAX_LEVEL){ p.exp = 0; print(`<span class="em">${nm(p)} 達到等級上限 Lv.${MAX_LEVEL}！</span>`); }
}
// 沒出場但還能戰鬥的隊員分到部分經驗（倒下的不算）
const SHARE_EXP = 0.3;
function shareExp(active, oppLevel, mult){
  const others = state.party.filter(m=>m!==active && m.hp>0 && m.level<MAX_LEVEL);
  if(!others.length) return;
  const gained = Math.max(1, Math.floor((10 + oppLevel*4) * mult * SHARE_EXP * (daily('exp') ? 1.5 : 1)));
  print(`<span class="good">隊伍中其他 ${others.length} 隻寶可夢各分到 ${gained} 經驗值。</span>`);
  others.forEach(m=>grantExp(m, oppLevel, mult*SHARE_EXP, '分到', true));
}
function giveMoney(amount){
  amount = Math.round(amount * moneyMul());   // 豐收日、護符金幣
  state.money += amount;
  print(`<span class="good">獲得了 💰 ${amount}！（目前 ${state.money}）</span>`);
}
function warnIfWiped(){
  if(noAlive()) print('<span class="bad">你的隊伍已經沒有能戰鬥的寶可夢了！請先回補給站治療。</span>');
}
function winBattle(){
  if(state.battle && state.battle.mode === 'run') return svWin();   // 連戰試煉有自己的結算
  const b = state.battle; const p = state.party[b.playerIdx]; const w = b.wild;
  const mode = b.mode;
  bump('wins'); if(mode==='tower'){ bump('floors'); if(b.boss) bump('bosses'); }
  { const act = state.party[b.playerIdx]; state.party.forEach(m=>{ if(m.hp > 0) addFriend(m, m === act ? 2 : 1); }); }   // 親密度：上場的 +2、其他 +1
  if(mode==='wild'){ pityResolve(w, false); addZoneWin(); }
  print(`<span class="good">擊敗了${mode==='wild'?'野生的 ':' '}${nm(w)}！</span>`);
  const expMul = (mode==='tower') ? TOWER_EXP_MUL : 1;
  if(p.hp>0) grantExp(p, w.level, expMul, '獲得');
  shareExp(p, w.level, expMul);
  if(b.foes && b.foes.length){
    (b.foeFainted = b.foeFainted || []).push(w);   // 倒下的那隻留在對手隊伍裡（卡片上顯示已倒下）
    const nx = b.foes[0];
    const cur = state.party[b.playerIdx];
    return runEvolutions(()=>{
      if(cur.hp<=0){   // 我方也同時倒下：先選我方下一隻，對手直接派出下一隻
        b.foes.shift(); b.wild = nx;
        print(`<span class="em">${esc(b.title)} 派出了 ${nm(nx)}（Lv.${nx.level}）！</span>`);
        return afterFaintCheck(cur);
      }
      askShiftBeforeFoe(nx);
    });
  }
  state.battle=null;
  battleDone();

  if(mode==='mega'){
    const ms = megaState(), id = w.megaId;
    ms.shards[id] = (ms.shards[id]||0) + 1; bump('megaWins');
    giveMoney(w.level * 15);
    print(`<span class="boss">💎 獲得了【${esc(w.name)}】碎片 ×1（${ms.shards[id]}/${MEGA_NEED}）</span>`);
    if(ms.shards[id] >= MEGA_NEED && !ms.stones[id]) print('<span class="good">碎片集滿了！到「📦 碎片與進化石」就能合成進化石。</span>');
    warnIfWiped(); return runEvolutions(()=>screenMegaBattle(true));
  }
  if(mode==='trainer'){
    addZoneWin(); giveMoney(b.reward); bump('trainers'); warnIfWiped(); return runEvolutions(()=>screenField());
  }
  if(mode==='gym'){
    giveMoney(b.reward); state.meta.badges++; bump('gyms');
    { const sk = STONE_KEYS[Math.floor(Math.random()*STONE_KEYS.length)]; state.bag[sk] = (state.bag[sk]||0) + 1; print(`<span class="good">館主另外送了你一顆 ${ITEMS[sk].label}！</span>`); }
    print(`<span class="boss">🏅 獲得了【${esc(GYMS[b.gymIdx][1])}】的徽章！（${state.meta.badges}/${GYMS.length}）</span>`);
    warnIfWiped(); return runEvolutions(()=>screenGym(true));
  }
  if(mode==='tower'){
    const t = state.tower;
    giveMoney(w.level * 10 * (b.boss ? 3 : 1));
    let gotCoin = true;
    if(b.endless){
      t.coins++;
      t.endlessPtr++;
      if(t.endlessPtr >= BOSSES.length){ t.endlessPtr = 0; t.loop++; print(`<span class="boss">第 ${t.loop+1} 輪小魔王全數擊破！下一輪再度強化。</span>`); }
    } else {
      gotCoin = !isCleared(t.floorPtr);       // 只有第一次通過的樓層才有硬幣
      if(gotCoin){ t.coins++; markCleared(t.floorPtr); }
      t.floorPtr++;
      if(clearedCount() === NONLEG.length) t.floorPtr = NONLEG.length;                       // 全部通過 → 進入第二輪小魔王
      else if(t.floorPtr >= NONLEG.length) t.floorPtr = segmentStart(firstUncleared());      // 跳著打到最後一層：回頭找還沒通過的
    }
    if(gotCoin) print(`<span class="good">🪙 ${b.boss?'小魔王擊破':'樓層突破'}！獲得 1 枚硬幣（目前 ${t.coins} 枚）</span>`);
    else print(`<span class="sys">${b.boss?'小魔王擊破':'樓層突破'}！這層已經領過硬幣了，不會重複獲得（目前 ${t.coins} 枚）</span>`);
    if(b.boss){
      fullHeal();
      print('<span class="good">小魔王倒下時留下了一道光，你的隊伍全部回滿了！現在可以返回地面。</span>');
    }
    if(!b.endless && gotCoin && t.floorPtr === NONLEG.length){
      print(`<span class="boss">塔內 ${NONLEG.length} 層全數突破！接下來進入第二輪小魔王（HP、能力大幅強化）。</span>`);
    }
    warnIfWiped();
    return runEvolutions(()=>screenTower(true));
  }
  if(mode==='legendary'){
    giveMoney(w.level * 20);
    normalizeLegend(w);   // 降服後強化消失，數值與招式恢復成一般的神獸
    w.ball = 'master';    // 靠實力降服的神獸，邊框是大師球
    const wasMaster = frameUnlocked('master');
    w.hp = w.maxhp; w.status=null; w.atkMul=1; w.defMul=1; resetBattleFlags(w);
    state.caught.add(w.dex); state.seen.add(w.dex);
    if(w.shiny) state.shinyCaught.add(w.dex);
    if(state.party.length<6){ state.party.push(w); print(`<span class="good">✦ ${nm(w)} 被你的實力降服，加入了隊伍！</span>`); }
    else { state.box.push(w); print(`<span class="good">✦ ${nm(w)} 被降服，送往了倉庫！</span>`); }
    state.tower.legendaryPtr++;
    if(!wasMaster && frameUnlocked('master')) notify('🎴 解鎖新邊框：大師球！（到個人檔案裡設定）');
    warnIfWiped();
    return runEvolutions(()=>screenTower(true));
  }
  giveMoney(w.level * 10);
  warnIfWiped();
  runEvolutions(()=>screenField());
}
function loseBattle(){
  if(state.battle && state.battle.mode === 'run') return svEnd();   // 連戰試煉：全隊倒下＝挑戰結束
  bump('losses');
  print('<span class="bad">你的隊伍全部失去戰鬥能力了……你被送回了補給站。</span>');
  state.party.forEach(m=>{ m.hp=Math.max(1, Math.floor(m.maxhp*0.5)); m.status=null; restorePP(m); });
  const mode = state.battle && state.battle.mode;
  state.battle=null;
  battleDone();
  if(mode==='trainer' || mode==='gym'){ const lost = Math.floor(state.money*0.1); state.money -= lost; print(`<span class="bad">你輸給了對手，賠了 💰 ${lost}。</span>`); }
  if(mode==='tower' || mode==='legendary') return kickOutOfTower();
  screenField();
}


/* ---------- 對戰前轉場動畫（用文字符號畫的全螢幕效果） ---------- */
// kind：wild（旋渦）、trainer（橫條＋VS）、big（道館／小魔王／傳說：三閃＋橫條＋大字）
const INTRO = {
  wild:    {flash:2, flashMs:60, close:380, hold:60,  open:260, style:'spiral'},
  trainer: {flash:2, flashMs:60, close:380, hold:360, open:280, style:'stripes'},
  big:     {flash:3, flashMs:60, close:400, hold:520, open:320, style:'stripes'}
};
function introReduced(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
// 從動畫開始到「開始掀開畫面」的時間；戰鬥文字會等這麼久才開始出現
function introLeadFor(kind){
  const c = INTRO[kind];
  return (!c || introReduced()) ? 0 : c.flash*c.flashMs*2 + c.close + c.hold;
}
function introSpiral(rows, cols){
  const o = []; let t=0, b=rows-1, l=0, r=cols-1;
  while(t<=b && l<=r){
    for(let c=l;c<=r;c++) o.push([t,c]); t++;
    for(let i=t;i<=b;i++) o.push([i,r]); r--;
    if(t<=b){ for(let c=r;c>=l;c--) o.push([b,c]); b--; }
    if(l<=r){ for(let i=b;i>=t;i--) o.push([i,l]); l++; }
  }
  return o;
}
function introLabel(kind){
  const b = state.battle; if(!b || kind==='wild') return '';
  if(kind==='trainer') return `<div class="vs">VS</div><div class="sub">${esc(b.title||'')}</div>`;
  if(b.mode==='gym')       return `<div class="vs">🏛</div><div class="sub">${esc(b.title||'')}</div>`;
  if(b.mode==='mega')      return `<div class="vs">💎</div><div class="sub">${esc(b.wild.name)}</div>`;
  if(b.mode==='legendary') return `<div class="vs">✦</div><div class="sub">傳說的 ${esc(monName(b.wild))}</div>`;
  return `<div class="vs">💀</div><div class="sub">小魔王 ${esc(monName(b.wild))}</div>`;
}
let introEl = null, introRaf = 0;
function battleIntro(kind){
  stageHoldTill = 0; fxGen++;   // 新的對戰：上一場的擊倒／捕捉動畫不再保留畫面
  const cfg = INTRO[kind];
  if(!cfg || introReduced()) return;
  if(introEl){ cancelAnimationFrame(introRaf); introEl.remove(); introEl = null; }
  // 只蓋在上方的對戰畫面（兩張寶可夢卡片那一塊），不是全螢幕
  const rect = stageEl.getBoundingClientRect();
  const W = Math.round(rect.width), H = Math.round(rect.height);
  if(W < 40 || H < 40) return;
  const el = document.createElement('div'); el.id = 'introFx';
  el.style.left = rect.left+'px'; el.style.top = rect.top+'px'; el.style.width = W+'px'; el.style.height = H+'px';
  const pre = document.createElement('pre'); el.appendChild(pre);
  const lab = document.createElement('div'); lab.className = 'introTxt'; lab.innerHTML = introLabel(kind); el.appendChild(lab);
  document.body.appendChild(el); introEl = el;
  pre.textContent = '█'.repeat(20);
  const pr = pre.getBoundingClientRect();
  const cw = (pr.width/20) || 8.4, ch = pr.height || 14;
  const cols = Math.ceil(W/cw)+1, rows = Math.ceil(H/ch)+1, cx = cols/2;
  const order = cfg.style==='spiral' ? introSpiral(rows, cols) : null;
  const tF = cfg.flash*cfg.flashMs*2, tC = tF + cfg.close, tH = tC + cfg.hold, tEnd = tH + cfg.open;
  const hw = document.documentElement.getAttribute('data-fest') === 'halloween';   // 節日主題：換成紫橘配色
  const PAL = hw ? {onBg:'#1a0a24', offBg:'#0d0614', on:'#ffd9a0', off:'#4a2266', closeBg:'#0d0614', close:'#d9701a', cover:'#2a1040'}
                 : {onBg:'#0b1410', offBg:'#060907', on:'#d8ffe9', off:'#1d3a2b', closeBg:'#060907', close:'#2a8a5c', cover:'#0f2c1e'};
  const COVER = PAL.cover;
  const render = grid => { pre.textContent = grid.map(r=>r.join('')).join('\n'); };
  const blank = ch1 => Array.from({length:rows}, ()=>Array(cols).fill(ch1));
  const t0 = performance.now();
  function frame(){
    const t = performance.now() - t0;
    if(t >= tEnd){ el.remove(); if(introEl===el) introEl = null; return; }
    if(t < tF){                                   // 1. 閃光
      const on = Math.floor(t/cfg.flashMs) % 2 === 0;
      el.style.background = on ? PAL.onBg : PAL.offBg;
      pre.style.color = on ? PAL.on : PAL.off;
      render(blank(on ? '█' : '░'));
    } else if(t < tC){                            // 2. 蓋住畫面
      const p = (t - tF) / cfg.close;
      el.style.background = PAL.closeBg; pre.style.color = PAL.close;
      const g = blank(' ');
      if(order){                                  // 旋渦：由外圈往中心
        const n = Math.floor(p*order.length), edge = Math.ceil(cols*0.6);
        for(let i=0;i<n;i++) g[order[i][0]][order[i][1]] = '█';
        for(let i=n;i<Math.min(order.length, n+edge);i++) g[order[i][0]][order[i][1]] = i-n < edge/2 ? '▓' : '▒';
      } else {                                    // 橫條：奇偶列由左右兩邊對衝
        const len = Math.round(p*(cols+4));
        for(let r=0;r<rows;r++){
          const rev = Math.floor(r/2)%2 === 1;
          for(let k=0;k<Math.min(len,cols);k++){
            const c = rev ? cols-1-k : k, d = len-k;
            g[r][c] = d>3 ? '█' : d>2 ? '▓' : d>1 ? '▒' : '░';
          }
        }
      }
      render(g);
    } else if(t < tH){                            // 3. 全蓋住：顯示字樣
      el.style.background = COVER; pre.style.color = COVER; render(blank('█'));
      lab.style.display = 'block';
    } else {                                      // 4. 兩邊往外掀開
      const p = (t - tH) / cfg.open;
      el.style.background = 'transparent'; pre.style.color = COVER; lab.style.display = 'none';
      const g = blank(' '), half = cx*(1-p);
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        const d = Math.abs(c-cx) - (cx-half);     // 離開口邊緣的距離（>0 代表仍被蓋住）
        g[r][c] = d>2 ? '█' : d>1 ? '▓' : d>0 ? '▒' : d>-1 ? '░' : ' ';
      }
      render(g);
    }
    introRaf = requestAnimationFrame(frame);
  }
  frame();
}


/* =====================================================
   🔥 連戰試煉（生存模式）
   只能用「複製一份」的現有隊伍，一關一隻，打到全隊倒下為止。
   每過一關：三選一強化（攻擊／防禦／速度／血量 +1~3%）或回血、復活；每 5 關有寶箱，越後面越豐厚。
   進度不存檔：中途關掉頁面就當作結束（原本的隊伍完全不受影響，已拿到的獎勵也都保留）。
   ===================================================== */
let svRun = null;
const SV_STATS = [
  {k:'atk', name:'攻擊', icon:'⚔️'}, {k:'def', name:'防禦', icon:'🛡️'},
  {k:'spd', name:'速度', icon:'💨'}, {k:'hp',  name:'血量上限', icon:'❤️'}
];
const SV_HEAL_PCT = 35, SV_REVIVE_PCT = 50;
function svRoll3(){
  const pool = SV_STATS.slice().sort(()=>Math.random()-0.5).slice(0,3);
  const cards = pool.map(s=>{
    const r = Math.random(), pct = r<0.60 ? 1 : r<0.90 ? 2 : 3;     // 60% +1%、30% +2%、10% +3%
    return {kind:'stat', k:s.k, pct, label:`${s.icon} ${s.name} +${pct}%　${'★'.repeat(pct)}`};
  });
  if(Math.random() < 0.15){                                          // 15% 機率其中一張變成稀有的「全能強化」
    cards[Math.floor(Math.random()*3)] = {kind:'all', pct:2, label:'🌟 全能強化 +2%'};
  }
  return cards;
}
function svPerkLine(){
  const p = svRun.perks;
  return SV_STATS.map(s=>`${s.icon}${s.name} +${p[s.k]}%`).join('　');
}
function svApply(){            // 依目前的強化重算整隊的數值（以複製當下的原始數值為基準）
  const p = svRun.perks;
  state.party.forEach(m=>{
    const b0 = m._b; if(!b0) return;
    m.atk = Math.round(b0.atk*(1+p.atk/100)); m.def = Math.round(b0.def*(1+p.def/100)); m.spd = Math.round(b0.spd*(1+p.spd/100));
    m.spa = Math.round((b0.spa ?? b0.atk)*(1+p.atk/100)); m.sdf = Math.round((b0.sdf ?? b0.def)*(1+p.def/100));
    const nmax = Math.round(b0.maxhp*(1+p.hp/100)), gain = nmax - m.maxhp;
    m.maxhp = nmax; if(m.hp>0 && gain>0) m.hp = Math.min(nmax, m.hp + gain);
    if(m.hp>m.maxhp) m.hp = m.maxhp;
  });
}
function svMilestone(s){       // 每 5 關的寶箱
  const stone = ()=>STONE_KEYS[Math.floor(Math.random()*STONE_KEYS.length)];
  const T = {
    5:  {money:1000,  items:{superpotion:3, greatball:5}},
    10: {money:2500,  items:{greatball:10, ether:5, maxpotion:2}},
    15: {money:4000,  items:{ultraball:10, maxpotion:3}},
    20: {money:6000,  items:{ultraball:15, maxpotion:5, ether:8}},
    25: {money:9000,  items:{masterball:1}},
    30: {money:13000, items:{masterball:1, ultraball:20, maxpotion:8}}
  };
  const r = T[s] ? {money:T[s].money, items:Object.assign({}, T[s].items)}
                 : {money:s*500, items:Object.assign({ultraball:20, maxpotion:8}, s%10===0 ? {masterball:1} : {})};
  if(s >= 15){ const k = stone(); r.items[k] = (r.items[k]||0) + (s>=25 ? 3 : 2); }   // 15 關起附贈進化石
  return r;
}
function svGive(reward){        // 發獎勵並累計到本次結算
  giveReward(reward);
  const t = svRun.total;
  t.money += reward.money||0;
  Object.entries(reward.items||{}).forEach(([k,n])=>{ t.items[k] = (t.items[k]||0) + n; });
}
function svEnemy(s){
  const avg = Math.round(state.party.reduce((a,m)=>a+m.level,0) / state.party.length);
  const boss = s % 10 === 0;
  let dex;
  if(boss){ const pool = BOSSES.filter(i=>DEX[i][3] >= 3); dex = pool[Math.floor(Math.random()*pool.length)]; }
  else dex = pickWildIndex(25);
  const lv = Math.max(2, Math.min(MAX_LEVEL, Math.round(avg*0.85 + s*1.0)));
  const e = makeMon(dex, lv, {shiny:false});
  const hpS = 1 + 0.04*(s-1) + (boss ? 0.30 : 0), atkS = 1 + 0.02*(s-1) + (boss ? 0.25 : 0);
  e.maxhp = Math.round(e.maxhp*hpS); e.hp = e.maxhp;
  scaleAD(e, atkS, 1 + 0.012*(s-1) + (boss?0.1:0));
  e.spd = Math.round(e.spd*(1 + 0.01*(s-1)));
  return e;
}
function screenSurvival(){
  clearLog(); renderBar();
  const best = state.stats.runBest || 0;
  print('<span class="em">🔥 連戰試煉</span>');
  print('只能使用你現在的隊伍（會複製一份，原本的隊伍和 HP 完全不受影響）。一關一隻對手，一直打到全隊倒下為止。');
  print(`每過一關可以<b>三選一強化</b>（攻擊／防禦／速度／血量 +1~3%），或選擇<b>回血 ${SV_HEAL_PCT}%</b>、<b>復活</b>一隻；PP 每關自動補滿。`);
  print('每 5 關有寶箱（越後面越豐厚，還會給進化石和大師球），每 10 關是魔王。不能用道具、逃跑和捕捉。');
  print(best ? `<span class="good">個人最高紀錄：第 ${best} 關</span>` : '<span class="sys">還沒有挑戰紀錄</span>');
  setOptions([
    {label:'▶ 開始挑戰', action:svStart},
    {label:"返回", action:screenBattleMenu}
  ]);
}
function svStart(){
  if(!state.party.length) return screenSurvival();
  const backup = state.party;
  const team = JSON.parse(JSON.stringify(backup)).map(m=>{
    m.hp = m.maxhp; m.status = null; m.atkMul = 1; m.defMul = 1; restorePP(m);
    m._b = {maxhp:m.maxhp, atk:m.atk, def:m.def, spa:m.spa, sdf:m.sdf, spd:m.spd};
    return m;
  });
  svRun = {backup, stage:0, cleared:0, perks:{atk:0,def:0,spd:0,hp:0}, total:{money:0, items:{}}};
  state.party = team;
  svNextStage();
}
function svNextStage(){
  if(firstAlive() < 0) return svEnd();   // 保險：全隊倒光就直接結算，避免後面讀到空的出戰寶可夢
  const r = svRun; r.stage++;
  const s = r.stage, e = svEnemy(s), boss = s % 10 === 0;
  clearBattleModifiers(); state.party.forEach(restorePP);
  state.battle = {wild:e, foes:[], playerIdx:firstAlive(), mode:'run', title:`連戰試煉 第 ${s} 關`, stageNo:s, boss};
  const kind = boss ? 'big' : 'wild';
  introLead = introLeadFor(kind);
  clearLog();
  print(`<span class="${boss?'boss':'em'}">🔥 連戰試煉　第 ${s} 關${boss?'　💀 魔王關！':''}</span>`);
  print(`${boss?'魔王 ':'對手 '}${nm(e)}（Lv.${e.level}）出現了！`);
  screenBattle(); battleIntro(kind);
}
function svWin(){
  const r = svRun, b = state.battle, s = b.stageNo;
  print(`<span class="good">擊敗了 ${nm(b.wild)}！（第 ${s} 關通過）</span>`);
  state.battle = null;
  r.cleared = s;
  state.stats.runBest = Math.max(state.stats.runBest||0, s);
  const gold = 80 + s*20 + (b.boss ? 300 : 0);
  svGive({money:gold}); print(`<span class="good">獲得了 💰 ${gold}</span>`);
  if(s % 5 === 0){
    const box = svMilestone(s);
    svGive(box);
    print(`<span class="boss">🎁 第 ${s} 關寶箱！獲得 ${esc(rewardText(box))}</span>`);
  }
  saveGame();                 // 獎勵先存起來，就算之後關掉頁面也不會丟
  svPerkScreen();
}
function svPerkScreen(){
  const r = svRun;
  hr();
  print(`<span class="em">選擇一項強化：</span>`);
  print(`<span class="sys">目前累計　${svPerkLine()}</span>`);
  const cards = svRoll3();
  const allDead = firstAlive() < 0;       // 打贏的同時最後一隻也倒了（反作用力等）：只能選復活
  print(`<span class="sys">🌟 全能強化＝攻擊／防禦／速度／血量各 +2%　💚 全隊回血 ${SV_HEAL_PCT}%　✨ 復活一隻倒下的寶可夢（HP ${SV_REVIVE_PCT}%）</span>`);
  const opts = allDead ? [] : cards.map(c=>({label:c.label, action:()=>svPick(c)}));
  if(!allDead) opts.push({label:'💚 全隊回血', action:svHeal});
  if(state.party.some(m=>m.hp<=0)) opts.push({label:'✨ 復活一隻', action:svRevive});
  setOptions(opts, '選擇強化');
}
function svPick(c){
  const p = svRun.perks;
  if(c.kind === 'all') SV_STATS.forEach(s=>{ p[s.k] += c.pct; }); else p[c.k] += c.pct;
  svApply();
  state.party.forEach(m=>{ m.status = null; });
  svNextStageWithMsg(`<span class="good">獲得強化：${esc(c.label.replace(/　[★✦]+$/,''))}</span>`);
}
function svHeal(){
  state.party.forEach(m=>{ if(m.hp>0) m.hp = Math.min(m.maxhp, m.hp + Math.ceil(m.maxhp*SV_HEAL_PCT/100)); });
  svNextStageWithMsg(`<span class="good">💚 全隊回復了 ${SV_HEAL_PCT}% 的 HP！</span>`);
}
function svRevive(){
  const dead = state.party.filter(m=>m.hp<=0).sort((a,b)=>b.level-a.level)[0];
  if(!dead) return svHeal();
  dead.hp = Math.max(1, Math.ceil(dead.maxhp*SV_REVIVE_PCT/100)); dead.status = null;
  svNextStageWithMsg(`<span class="good">✨ ${nm(dead)} 復活了！（HP ${SV_REVIVE_PCT}%）</span>`);
}
function svNextStageWithMsg(msg){
  const m0 = msg;
  svNextStage();                 // 會清畫面，所以選擇的結果補印在新關卡的開頭
  print(m0);
}
function svEnd(){
  const r = svRun;
  state.battle = null;
  state.party = r.backup;        // 換回原本的隊伍（原本的隊伍完全沒被動過）
  svRun = null;
  saveGame();
  clearLog(); renderBar();
  const reached = r.cleared, best = state.stats.runBest || 0;
  print('<span class="bad">全隊倒下了……連戰試煉結束。</span>');
  print(`<span class="em">本次到達：第 ${reached} 關</span>${reached && reached >= best ? ' <span class="boss">🏆 新紀錄！</span>' : ''}`);
  print(`<span class="sys">個人最高紀錄：第 ${best} 關</span>`);
  if(r.perks && (r.perks.atk||r.perks.def||r.perks.spd||r.perks.hp)) print(`<span class="sys">最終強化　${svPerkLineOf(r.perks)}</span>`);
  const t = r.total;
  if(t.money || Object.keys(t.items).length){
    print(`<span class="good">本次獲得：${esc(rewardText({money:t.money, items:t.items}))}</span>`);
  } else print('<span class="sys">這次沒有拿到獎勵，下次再來！</span>');
  setOptions([
    {label:"🔥 再挑戰一次", action:screenSurvival},
    {label:"返回對戰選單", action:screenBattleMenu}
  ]);
}
function svPerkLineOf(p){ return SV_STATS.map(s=>`${s.icon}${s.name} +${p[s.k]}%`).join('　'); }

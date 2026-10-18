// 檢查 mon-parts.js 的設定：node tools/check-mon-parts.js
// 檢查項目：key 是否為有效的 DEX 索引、色碼格式、零件名稱是否存在、有沒有未使用的零件
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const DEX = new Function(read('data.js') + ';return DEX;')();
const { MON_FEATURES, MON_PARTS } = new Function(read('mon-parts.js') + ';return {MON_FEATURES, MON_PARTS};')();
const hex = /^#[0-9a-fA-F]{6}$/;
const errs = [], used = new Set();
for (const [k, v] of Object.entries(MON_PARTS)) {
  const name = DEX[k] ? `${k} ${DEX[k][0]}` : `${k} ?`;
  if (!Number.isInteger(+k) || !DEX[k]) errs.push(`${name}：key 不是有效的 DEX 索引（0~${DEX.length - 1}）`);
  for (const c of ['c1', 'c2', 'c3']) if (!hex.test(v[c] || '')) errs.push(`${name}：${c} 色碼格式錯誤（${v[c]}），要 #rrggbb`);
  if (!Array.isArray(v.ft) || !v.ft.length) errs.push(`${name}：ft 要是非空陣列`);
  else for (const f of v.ft) { used.add(f); if (!MON_FEATURES[f]) errs.push(`${name}：找不到零件「${f}」`); }
  if (Array.isArray(v.ft) && new Set(v.ft).size !== v.ft.length) errs.push(`${name}：ft 有重複的零件`);
}
const unused = Object.keys(MON_FEATURES).filter(f => !used.has(f));
console.log(`寶可夢 ${Object.keys(MON_PARTS).length} 隻，零件 ${Object.keys(MON_FEATURES).length} 種` + (unused.length ? `（尚未使用：${unused.join('、')}）` : ''));
if (errs.length) { console.error('\n發現問題：\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('檢查通過');

// 檢查 mon-art.js：DEX 索引 0~(ART_DONE-1) 每隻都要有專屬圖（一代全做完；二代做到哪就把 ART_DONE 改到哪），每個 piece 的 s 要是 t/b/l/r 且有 svg
{
  const { MON_ART } = new Function(read('mon-art.js') + ';return {MON_ART};')();
  const ART_DONE = 493; // 已完成專屬圖的隻數（索引 0~492 = 一代～四代全部，到 #493 阿爾宙斯）
  const e2 = [];
  for (let i = 0; i < ART_DONE; i++) {
    const arts = MON_ART[i];
    if (!arts || !arts.length) { e2.push(`${i} ${DEX[i][0]}：MON_ART 缺專屬圖`); continue; }
    for (const p of arts) if (!'tblr'.includes(p.s) || !p.svg) e2.push(`${i} ${DEX[i][0]}：piece 的 s 或 svg 有問題`);
  }
  console.log(`MON_ART ${Object.keys(MON_ART).length} 隻` + (e2.length ? '' : '，0~' + (ART_DONE - 1) + ' 全部有專屬圖'));
  if (e2.length) { console.error('\nMON_ART 問題：\n- ' + e2.join('\n- ')); process.exit(1); }
}

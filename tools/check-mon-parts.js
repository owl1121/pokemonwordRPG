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

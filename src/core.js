import { MEGA } from './games.js';
export const TOTAL = 50063860;
export const pad = n => String(n).padStart(2, '0');
export function choose(n, k) { if (k < 0 || k > n) return 0; let v = 1; for (let i = 1; i <= k; i++) v = v * (n - i + 1) / i; return Math.round(v); }
export function totalCombinations(game = MEGA) { return choose(game.pool, game.drawn); }
export function hitProbability(k, size, game = MEGA) {
  size ??= game.drawn;
  return choose(size, k) * choose(game.pool - size, game.drawn - k) / totalCombinations(game);
}
export function randomInt(max) {
  const limit = Math.floor(4294967296 / max) * max;
  const a = new Uint32Array(1); do { crypto.getRandomValues(a); } while (a[0] >= limit);
  return a[0] % max;
}
export function draw(int = randomInt, size, game = MEGA) {
  size ??= game.drawn;
  if (!game.sizes.includes(size)) throw new Error(`Escolha uma quantidade válida para ${game.name}.`);
  const pool = Array.from({ length: game.pool }, (_, i) => i + 1);
  for (let i = 0; i < size; i++) { const j = i + int(game.pool - i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, size).sort((a, b) => a - b);
}
export function validateNumbers(values, size, game = MEGA) {
  size ??= game.drawn;
  if (values.length !== size) return `Selecione exatamente ${size} dezenas.`;
  if (values.some(v => v === '' || v == null || typeof v === 'boolean' || !Number.isInteger(Number(v)) || Number(v) < 1 || Number(v) > game.pool)) return `As dezenas devem ser inteiros de 1 a ${game.pool}, sem campos vazios.`;
  if (new Set(values.map(Number)).size !== size) return 'Há dezenas repetidas nesta seleção.';
  return null;
}
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/)[0];
  const delim = [';', ',', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (c === delim && !quoted) { row.push(value.trim()); value = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(value.trim()); rows.push(row); row = []; value = ''; }
    else value += c;
  }
  if (quoted) throw new Error('CSV com aspas não fechadas. Revise o arquivo.');
  if (value || row.length) { row.push(value.trim()); rows.push(row); }
  return rows;
}
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(+value) ? null : value.toISOString().slice(0, 10);
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/) || s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)?.slice(0, 1).concat(s.slice(6), s.slice(3, 5), s.slice(0, 2));
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`; const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === iso ? iso : null;
}
export function auditRows(rows, mapping, header = true, descending = false, game = MEGA) {
  const valid = [], errors = [], duplicates = [], ids = new Set();
  if (mapping.numbers.length !== game.drawn || new Set(mapping.numbers).size !== game.drawn) throw new Error(`Mapeie ${game.drawn} colunas diferentes para as dezenas.`);
  const selected = [...mapping.numbers, ...[mapping.id, mapping.date].filter(x => x >= 0)];
  if (new Set(selected).size !== selected.length) throw new Error('Identificação, data e dezenas devem usar colunas diferentes.');
  rows.slice(header ? 1 : 0).forEach((row, i) => {
    const line = i + (header ? 2 : 1);
    if (!row.some(v => v !== '' && v != null)) return;
    const values = mapping.numbers.map(c => row[c]);
    let error = validateNumbers(values, game.drawn, game);
    const date = mapping.date >= 0 ? parseDate(row[mapping.date]) : null;
    if (mapping.date >= 0 && !date) error = error || 'Data ausente ou inválida. Use DD/MM/AAAA ou AAAA-MM-DD.';
    if (error) { errors.push({ line, error }); return; }
    const id = mapping.id >= 0 ? String(row[mapping.id] ?? '').trim() : '';
    if (id && ids.has(id)) duplicates.push({ line, id });
    if (id) ids.add(id);
    valid.push({ id, date, numbers: values.map(Number).sort((a,b) => a-b), line });
  });
  if (descending) valid.reverse();
  if (mapping.date >= 0) valid.sort((a,b) => a.date.localeCompare(b.date));
  return { valid, errors, duplicates };
}
export function stats(events, game = MEGA) {
  const counts = Array(game.pool).fill(0), last = Array(game.pool).fill(-1), parity = Array(game.drawn + 1).fill(0), sums = {}, pairs = {};
  events.forEach((e, i) => {
    e.numbers.forEach(n => { counts[n-1]++; last[n-1] = i; });
    parity[e.numbers.filter(n => n % 2 === 0).length]++;
    const sum = e.numbers.reduce((a,b) => a+b,0); sums[sum] = (sums[sum] || 0) + 1;
    for (let a=0;a<game.drawn;a++) for(let b=a+1;b<game.drawn;b++) { const key = `${pad(e.numbers[a])}–${pad(e.numbers[b])}`; pairs[key] = (pairs[key] || 0) + 1; }
  });
  return { counts, gaps: last.map(i => i < 0 ? null : events.length-1-i), parity, sums, pairs: Object.entries(pairs).sort((a,b) => b[1]-a[1]) };
}
export function toCSV(rows) {
  return '\uFEFF' + rows.map(row => row.map(v => { let s=String(v ?? ''); if (/^[=+@-]/.test(s)) s="'"+s; return '"'+s.replaceAll('"','""')+'"'; }).join(';')).join('\r\n');
}
export function historicalMatches(events, selection, game = MEGA) {
  const selected = new Set(selection);
  return events.map(event => {
    const matchedNumbers = [...new Set(event.numbers)].filter(n => selected.has(n)).sort((a,b) => a-b);
    return { ...event, hits: matchedNumbers.length, matchedNumbers };
  }).filter(event => event.hits >= game.minHits)
    .sort((a,b) => b.hits-a.hits || (b.date ?? '').localeCompare(a.date ?? ''));
}
export function celebrationCount(hits, game = MEGA) {
  if(hits < game.minHits) return 0;
  return 30 + Math.round(120 * (Math.min(hits,game.drawn)-game.minHits)/(game.drawn-game.minHits));
}
export function seeded(seed=42) { return max => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return Math.floor(((t ^ t >>> 14) >>> 0) / 4294967296 * max); }; }
export function simulate(events, training=30, repetitions=100, seed=42, size, game = MEGA) {
  size ??= game.drawn;
  if (!game.sizes.includes(size)) throw new Error(`Escolha uma quantidade válida para ${game.name}.`);
  if (!Number.isInteger(training) || training < 1 || training >= events.length) throw new Error('O treino deve ser menor que o total de eventos e ter ao menos 1 evento.');
  const counts = Array(game.pool).fill(0), hist = Array(game.drawn + 1).fill(0), baselineHist = Array(game.drawn + 1).fill(0), means = [], rng = seeded(seed);
  let total = 0;
  events.forEach((e,i) => {
    if (i >= training) {
      const pick = counts.map((v,j) => ({v,n:j+1})).sort((a,b) => b.v-a.v || a.n-b.n).slice(0,size).map(x=>x.n);
      const hits = e.numbers.filter(n=>pick.includes(n)).length; hist[hits]++; total += hits;
    }
    e.numbers.forEach(n=>counts[n-1]++);
  });
  for(let r=0;r<repetitions;r++) { let sum=0; for(let i=training;i<events.length;i++) { const pick=draw(rng,size,game); const hits=events[i].numbers.filter(n=>pick.includes(n)).length; sum+=hits; baselineHist[hits]++; } means.push(sum/(events.length-training)); }
  means.sort((a,b)=>a-b);
  return { gameId:game.id, size, count:events.length-training, mean:total/(events.length-training), hist, baselineHist:baselineHist.map(n=>n/repetitions), baselineMean:means.reduce((a,b)=>a+b,0)/repetitions, low:means[Math.floor(repetitions*.025)], high:means[Math.min(repetitions-1,Math.floor(repetitions*.975))], repetitions, seed };
}

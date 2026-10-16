import test from 'node:test';
import assert from 'node:assert/strict';
import { choose,TOTAL,hitProbability,draw,validateNumbers,parseCSV,parseDate,auditRows,stats,simulate,seeded,toCSV } from '../src/core.js';
test('combinatória e distribuição de acertos normalizada',()=>{assert.equal(choose(60,6),TOTAL);assert.equal(hitProbability(6),1/TOTAL);assert.ok(Math.abs(Array.from({length:7},(_,k)=>hitProbability(k)).reduce((a,b)=>a+b)-1)<1e-12);assert.ok(Math.abs(Array.from({length:7},(_,k)=>k*hitProbability(k)).reduce((a,b)=>a+b)-.6)<1e-12);});
test('geração sem repetição e limites',()=>{const rng=seeded(7);for(let i=0;i<1000;i++){const n=draw(rng);assert.equal(validateNumbers(n),null);assert.deepEqual(n,[...n].sort((a,b)=>a-b));}assert.ok(validateNumbers([1,1,2,3,4,5]));assert.ok(validateNumbers(['',2,3,4,5,6]));assert.ok(validateNumbers([1,2,3,4,5,61]));assert.ok(validateNumbers([1,2,3,4,5,5.5]));});
test('CSV: BOM, delimitadores, aspas e quebras de linha',()=>{assert.deepEqual(parseCSV('\ufeffa;b\r\n"um;dois";"a""b"\r\n'),[['a','b'],['um;dois','a"b']]);assert.deepEqual(parseCSV('a,b\n"x\ny",2'),[['a','b'],['x\ny','2']]);assert.throws(()=>parseCSV('a,b\n"ab,2'));});
test('datas reais e anos bissextos',()=>{assert.equal(parseDate('29/02/2024'),'2024-02-29');assert.equal(parseDate('31/02/2025'),null);assert.equal(parseDate('2025-12-01'),'2025-12-01');assert.equal(parseDate('2025-13-01'),null);});
test('auditoria preserva combinações iguais e aponta IDs e linhas inválidas',()=>{const rows=[['id','a','b','c','d','e','f'],['x',1,2,3,4,5,6],['y',1,2,3,4,5,6],['y',7,8,9,10,11,12],['z',1,1,2,3,4,5]];const a=auditRows(rows,{numbers:[1,2,3,4,5,6],id:0,date:-1});assert.equal(a.valid.length,3);assert.equal(a.duplicates.length,1);assert.equal(a.errors[0].line,5);assert.throws(()=>auditRows(rows,{numbers:[1,1,2,3,4,5],id:0,date:-1}));});
test('ordenação e ausência observada',()=>{const a=auditRows([['2025-01-02',1,2,3,4,5,6],['2025-01-01',7,8,9,10,11,12]],{numbers:[1,2,3,4,5,6],date:0,id:-1},false);assert.equal(a.valid[0].date,'2025-01-01');const s=stats(a.valid);assert.equal(s.gaps[0],0);assert.equal(s.gaps[6],1);assert.equal(s.gaps[59],null);assert.equal(s.pairs.length,30);assert.equal(s.parity[3],2);});
test('simulação não vê resultado futuro',()=>{const events=[{numbers:[1,2,3,4,5,6]},{numbers:[7,8,9,10,11,12]}];const r=simulate(events,1,100,42);assert.equal(r.mean,0);assert.equal(r.hist[0],1);assert.deepEqual(r,simulate(events,1,100,42));assert.throws(()=>simulate(events,2));});
test('exportação protege células que seriam fórmulas',()=>{assert.ok(toCSV([['=1+1','a"b']]).includes("'=1+1"));assert.ok(toCSV([['a"b']]).includes('a""b'));});
test('jogos de 7 e 8: probabilidade conjunta, normalização e média',()=>{
  for(const [size,coverage] of [[6,1],[7,7],[8,28]]) {
    assert.equal(hitProbability(6,size),coverage/TOTAL);
    const probabilities=Array.from({length:7},(_,k)=>hitProbability(k,size));
    assert.ok(Math.abs(probabilities.reduce((a,b)=>a+b,0)-1)<1e-12);
    assert.ok(Math.abs(probabilities.reduce((sum,p,k)=>sum+k*p,0)-size/10)<1e-12);
    const rng=seeded(size);
    for(let i=0;i<100;i++){const pick=draw(rng,size);assert.equal(pick.length,size);assert.equal(validateNumbers(pick,size),null);}
    assert.ok(validateNumbers(Array(size).fill(1),size));
    assert.ok(validateNumbers(Array.from({length:size-1},(_,i)=>i+1),size));
  }
  // A larger ticket must not change the six-number rule of historical events.
  assert.ok(validateNumbers([1,2,3,4,5,6,7]));
  assert.throws(()=>draw(undefined,9));
});
test('simulação compara jogos do tamanho escolhido, sem antecipar o resultado',()=>{
  const events=[{numbers:[1,2,3,4,5,6]},{numbers:[3,4,5,6,7,8]}];
  for(const [size,hits] of [[6,4],[7,5],[8,6]]) {
    const r=simulate(events,1,100,42,size);
    assert.equal(r.size,size);assert.equal(r.mean,hits);assert.equal(r.hist[hits],1);
    assert.ok(Math.abs(r.baselineHist.reduce((a,b)=>a+b,0)-1)<1e-12);
  }
});

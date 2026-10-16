import test from 'node:test';
import assert from 'node:assert/strict';
import { MEGA, LOTO } from '../src/games.js';
import { choose,totalCombinations,hitProbability,draw,seeded,validateNumbers,auditRows,stats,simulate } from '../src/core.js';
const first = Array.from({length:15},(_,i)=>i+1);
const last = Array.from({length:15},(_,i)=>i+11);

test('Loto Fácil: probabilidades de 15 em 25, normalização e média',()=>{
  assert.equal(totalCombinations(LOTO),3268760);
  assert.equal(hitProbability(15,15,LOTO),1/3268760);
  assert.equal(hitProbability(15,20,LOTO),15504/3268760);
  for(const size of LOTO.sizes){
    const p=Array.from({length:16},(_,k)=>hitProbability(k,size,LOTO));
    assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-12);
    assert.ok(Math.abs(p.reduce((sum,n,k)=>sum+k*n,0)-size*15/25)<1e-12);
    for(let k=0;k<size+15-25;k++)assert.equal(p[k],0);
    assert.equal(hitProbability(15,size,LOTO),choose(size,15)/3268760);
  }
  assert.equal(totalCombinations(MEGA),50063860);
});
test('Loto Fácil: geração e validação respeitam tamanho e intervalo',()=>{
  const rng=seeded(25);
  for(const size of LOTO.sizes)for(let i=0;i<100;i++){
    const pick=draw(rng,size,LOTO);
    assert.equal(pick.length,size);assert.equal(validateNumbers(pick,size,LOTO),null);
    assert.ok(pick.every(n=>n>=1&&n<=25));assert.equal(new Set(pick).size,size);
  }
  assert.equal(validateNumbers(first,undefined,LOTO),null);
  assert.ok(validateNumbers([...first.slice(0,14),26],15,LOTO));
  assert.ok(validateNumbers([...first.slice(0,14),14],15,LOTO));
  assert.ok(validateNumbers(first.slice(0,14),15,LOTO));
  assert.throws(()=>draw(rng,6,LOTO));
  assert.throws(()=>draw(rng,15,MEGA));
});
test('Loto Fácil: importa C–Q desde a linha 2 e rejeita dados inválidos',()=>{
  const rows=[['Evento','Data',...first.map(n=>'Dezena '+n)],
    [1,'01/01/2025',...first],[2,'02/01/2025',...last],
    [3,'03/01/2025',...first.slice(0,14),26],
    [4,'04/01/2025',...first.slice(0,14),14]];
  const mapping={numbers:first.map(n=>n+1),id:0,date:1};
  const report=auditRows(rows,mapping,true,false,LOTO);
  assert.equal(report.valid.length,2);assert.deepEqual(report.errors.map(e=>e.line),[4,5]);
  assert.deepEqual(report.valid[0].numbers,first);
  assert.deepEqual(report.valid[1].numbers,last);
  assert.throws(()=>auditRows(rows,mapping,true,false,MEGA));
});
test('Loto Fácil: frequências, somas, paridade e todas as 105 duplas por evento',()=>{
  const s=stats([{numbers:first},{numbers:last}],LOTO);
  assert.equal(s.counts.length,25);assert.equal(s.parity.length,16);
  assert.equal(s.counts.reduce((a,b)=>a+b,0),30);
  assert.equal(s.counts[10],2);assert.equal(s.counts[24],1);
  assert.equal(s.gaps[0],1);assert.equal(s.gaps[24],0);
  assert.deepEqual(s.sums,{120:1,270:1});
  assert.equal(s.parity[7],2);
  assert.equal(s.pairs.reduce((sum,[,n])=>sum+n,0),210);
});
test('Loto Fácil: simulação usa apenas o passado e retorna acertos de 0 a 15',()=>{
  const events=[{numbers:first},{numbers:last}];
  for(const [size,hits] of [[15,5],[20,10]]){
    const r=simulate(events,1,100,42,size,LOTO);
    assert.equal(r.gameId,'loto');assert.equal(r.hist.length,16);
    assert.equal(r.mean,hits);assert.equal(r.hist[hits],1);
    assert.ok(Math.abs(r.baselineHist.reduce((a,b)=>a+b,0)-1)<1e-12);
    assert.deepEqual(r,simulate(events,1,100,42,size,LOTO));
  }
});


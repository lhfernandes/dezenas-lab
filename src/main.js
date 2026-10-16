import './style.css';
import './theme-loto.css';
import { loadWorkbook } from './workbook.js';
import { showHistoricalCheck } from './history-dialog.js';
import { totalCombinations, choose, pad, draw, validateNumbers, parseCSV, auditRows, stats, toCSV, seeded, hitProbability } from './core.js';

import { GAMES, MEGA } from './games.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => n.toLocaleString('pt-BR', {maximumFractionDigits:2});
const columnName = i => (i >= 26 ? String.fromCharCode(64 + Math.floor(i / 26)) : '') + String.fromCharCode(65 + i % 26);
const newSession = game => ({ tab:'overview', events:[], source:'Nenhum arquivo importado', demo:false, filter:'all', from:'', to:'', size:game.drawn, candidate:[], rows:null, audit:null, workbook:null, result:null, running:false });
const sessions = Object.fromEntries(Object.values(GAMES).map(g=>[g.id,newSession(g)]));
let game = MEGA, state = sessions.mega, loading = false;
const tabs = [['overview','◫','Visão geral'],['import','↥','Importar histórico'],['combination','◎','Combinações'],['simulation','↗','Simulação histórica'],['method','⌘','Como funciona']];
function filtered(session=state) { let e = session.events.filter(e=>(!session.from || e.date >= session.from) && (!session.to || (e.date && e.date <= session.to))); return session.filter==='all' ? e : e.slice(-Number(session.filter)); }
function balls(numbers, small=false) { return `<div class="balls ${small?'small':''}">${numbers.map(n=>`<span>${pad(n)}</span>`).join('')}</div>`; }
function download(name,rows) { const url=URL.createObjectURL(new Blob([toCSV(rows)],{type:'text/csv;charset=utf-8;'})); const a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
function toast(message) { const el=$('#notice'); el.textContent=message; el.hidden=false; }
function render() {
  document.documentElement.dataset.game = game.id;
  $('#app').innerHTML=`<aside><a class="brand" href="#overview"><span class="brand-mark">✳</span> dezenas<span class="brand-dot">.</span></a><div class="workspace-label">LABORATÓRIO DE PROBABILIDADES</div><label class="game-selector">Modalidade de análise<select id="game-select" ${loading?'disabled':''}>${Object.values(GAMES).map(g=>`<option value="${g.id}" ${g.id===game.id?'selected':''}>${g.name}</option>`).join('')}</select><small>${game.drawn} sorteadas entre ${game.pool} dezenas</small></label><nav aria-label="Navegação principal">${tabs.map(([id,icon,name])=>`<button data-tab="${id}" class="nav-item ${state.tab===id?'active':''}" ${state.tab===id?'aria-current="page"':''}><span>${icon}</span>${name}</button>`).join('')}</nav><div class="sidebar-bottom"><span class="privacy-icon">◇</span><strong>Seus dados ficam com você</strong><p>Processamento no navegador.<br>Sem envio de planilhas.</p><span class="version">DEZENAS LAB · V1.0</span></div></aside><div class="workspace"><header><span>Seu espaço de análise <span class="slash">/</span> <strong>${game.name} · ${tabs.find(t=>t[0]===state.tab)[2]}</strong></span><span class="local-badge"><i></i> Ambiente local</span></header><main><div id="notice" role="status" hidden></div>${page()}</main><footer>Estatística para entender. Transparência para decidir.<span>${game.drawn} sorteadas · ${game.pool} dezenas</span></footer></div>`;
  bind();
}
function title(eyebrow,heading,description,action='') { return `<div class="page-title"><div><div class="eyebrow">${eyebrow}</div><h1>${heading}</h1><p>${description}</p></div>${action}</div>`; }
function page() { return ({overview,import:importPage,combination,simulation,method}[state.tab])(); }
function overview() {
 const events=filtered(), s=stats(events,game), peak=Math.max(...s.counts,1), top=s.counts.indexOf(Math.max(...s.counts))+1;
 return title('HISTÓRICO EM PERSPECTIVA','Cada dezena conta.','Explore os resultados, encontre padrões e entenda as probabilidades.',`<button class="primary" data-tab="import">↥ Importar planilha</button>`)+
 `<div class="source-strip"><span><i class="status-dot"></i> ${esc(state.source)} ${state.demo?'<span class="tag">DADOS SIMULADOS</span>':''}</span><button class="text-button" id="demo">${state.events.length?'Carregar demonstração':'Explorar demonstração'} ↗</button></div>
 <div class="filters"><label>Janela de análise<select id="filter"><option value="all">Todo o histórico</option>${[30,100,500].map(n=>`<option value="${n}" ${state.filter==n?'selected':''}>Últimos ${n} eventos</option>`).join('')}</select></label><label>De<input type="date" id="from" value="${state.from}" ${!state.events.some(e=>e.date)?'disabled':''}></label><label>Até<input type="date" id="to" value="${state.to}" ${!state.events.some(e=>e.date)?'disabled':''}></label><button class="text-button" id="reset-filters">Limpar filtros</button><button class="secondary export" id="export-stats" ${!events.length?'disabled':''}>↓ Exportar análise</button></div>
 <section class="metrics"><article><span>Eventos analisados</span><strong>${fmt(events.length)}</strong><small>${state.events.length?`${fmt(state.events.length)} eventos na base`:'Importe seu histórico para começar'}</small></article><article><span>Dezena mais frequente</span><strong>${events.length?pad(top):'—'} <em>${events.length?`${fmt(s.counts[top-1]/events.length*100)}%`:''}</em></strong><small>${events.length?`${s.counts[top-1]} ocorrências na janela`:'Frequência observada no histórico'}</small></article><article><span>Chance de cada dezena</span><strong>${fmt(100*game.drawn/game.pool)}<span class="unit">%</span></strong><small>${game.drawn} entre ${game.pool} em cada evento justo</small></article><article class="metric-dark"><span>Chance de um jogo de ${game.drawn} dezenas</span><strong>1 <span class="unit">em</span> ${fmt(totalCombinations(game))}</strong><small>Todas as combinações têm a mesma chance</small></article></section>
 <section class="card"><div class="section-heading"><div><h2>O mapa das dezenas</h2><p>Frequência no período selecionado. Selecione uma dezena para ver os detalhes.</p></div><span class="legend">Menor <i></i><i></i><i></i> Maior</span></div><div class="number-grid ${game.id==='loto'?'loto-grid':''}">${s.counts.map((c,i)=>`<button class="number-cell" data-number="${i+1}" style="--heat:${events.length?(.08+.85*c/peak):.03}" aria-label="Dezena ${i+1}, ${c} ocorrências"><strong>${pad(i+1)}</strong><span>${c} vezes</span></button>`).join('')}</div><div id="number-detail" class="chart-caption">${events.length?`Referência de um sorteio justo: aproximadamente ${fmt(events.length*game.drawn/game.pool)} ocorrências por dezena nesta janela.`:'Nenhum histórico carregado. Importe uma planilha ou explore a demonstração.'}</div></section>
 <div class="two-columns"><section class="card"><div class="section-heading"><div><h2>Pares e ímpares</h2><p>Como as dezenas se distribuem por evento</p></div><span class="mini-icon">◒</span></div><div class="bars">${s.parity.map((v,i)=>`<div class="bar-row"><span>${i} pares · ${game.drawn-i} ímpares</span><div><i style="width:${v/Math.max(...s.parity,1)*100}%"></i></div><strong>${v}</strong></div>`).join('')}</div></section><section class="card"><div class="section-heading"><div><h2>Encontros frequentes</h2><p>Pares de dezenas que apareceram juntos</p></div><span class="mini-icon">⠿</span></div>${s.pairs.length?`<div class="pair-list">${s.pairs.slice(0,5).map(([pair,n],i)=>`<div><span class="rank">${pad(i+1)}</span><strong>${pair}</strong><span>${n} eventos <small>· ${fmt(n/events.length*100)}%</small></span></div>`).join('')}</div>`:'<p class="empty">As duplas aparecerão após a importação.</p>'}</section></div>
 <section class="card"><div class="section-heading"><div><h2>Soma das dezenas</h2><p>Distribuição dos eventos por soma total</p></div></div><div class="sum-chart">${Array.from({length:12},(_,i)=>{ const min=game.drawn*(game.drawn+1)/2, max=game.drawn*(2*game.pool-game.drawn+1)/2, step=Math.ceil((max-min+1)/12), lo=min+i*step, hi=Math.min(max,lo+step-1); const v=Object.entries(s.sums).filter(([k])=>+k>=lo&&+k<=hi).reduce((a,[,n])=>a+n,0);return `<div><span>${v}</span><i style="height:${events.length?Math.max(2,v/events.length*220):2}px"></i><small>${lo}–${hi}</small></div>`;}).join('')}</div></section>
 <div class="insight"><span>ⓘ</span><p><strong>O histórico explica o passado.</strong> Frequência e tempo sem aparecer não aumentam a chance de uma dezena no próximo sorteio justo e independente.</p></div>`;
}
function importPage() {
 return title('SEUS DADOS, SUA ANÁLISE','Traga seu histórico.','Importe XLSX ou CSV e confira os dados antes de começar.')+
 `<section class="card upload"><div class="upload-icon">↥</div><h2>Escolha sua planilha</h2><p>${game.drawn} colunas de dezenas de 1 a ${game.pool}, com data e identificação opcionais.<br>XLSX ou CSV · até 10 MB · até 50.000 linhas<br>Para importar com sucesso, salve/exporte a planilha da Caixa e CSV ou em outro arquivo XLSX</p><label class="primary file-label">Selecionar arquivo<input id="file" type="file" accept=".csv,.xlsx" ${loading?'disabled':''}></label><button class="text-button" id="template">↓ Baixar modelo CSV</button><p class="privacy-note">Os dados permanecem na memória desta aba e são apagados ao recarregar ou fechar.</p></section>
 ${state.rows?mappingPage():''}`;
}
function mappingPage() {
 const width=Math.max(...state.rows.slice(0,100).map(r=>r.length));
 const opts=(selected,optional=false)=>`${optional?'<option value="-1">Não utilizar</option>':''}${Array.from({length:width},(_,i)=>`<option value="${i}" ${i===selected?'selected':''}>Coluna ${columnName(i)} — ${esc(String(state.rows[0]?.[i]??'').slice(0,45))}</option>`).join('')}`;
 const guess=state.rows[0]?.map(v=>String(v).toLowerCase())||[];
 const metadata = width >= game.drawn+2 ? guess.slice(0,2) : guess;
 const id=metadata.findIndex(v=>/concurso|evento|^id$/.test(v)), date=metadata.findIndex(v=>/data|date/.test(v));
 // Default: row 1 is the header; C–H for Mega Sena, C–Q for Loto Fácil.
 const nums=width>=game.drawn+2 ? Array.from({length:game.drawn},(_,i)=>i+2) : Array.from({length:width},(_,i)=>i).filter(i=>i!==id&&i!==date).slice(0,game.drawn);
 return `<section class="card"><div class="section-heading"><div><h2>Confira e mapeie as colunas</h2><p>${esc(state.filename)} · ${state.rows.length} linhas lidas</p></div></div>${state.workbook?`<label>Aba da planilha<select id="sheet">${state.workbook.worksheets.map((s,i)=>`<option value="${i}" ${i===state.sheet?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>`:''}<div class="mapping"><label>Identificação<select id="map-id">${opts(id,true)}</select></label><label>Data<select id="map-date">${opts(date,true)}</select></label>${Array.from({length:game.drawn},(_,i)=>`<label>Dezena ${i+1}<select class="map-number">${opts(nums[i]??0)}</select></label>`).join('')}</div><div class="inline-options"><label><input id="has-header" type="checkbox" checked> A primeira linha é um cabeçalho</label><label>Ordem das linhas<select id="order"><option value="asc">Mais antigo primeiro</option><option value="desc">Mais recente primeiro</option></select></label></div><p class="muted">Com data mapeada, os eventos são ordenados por data. No mesmo dia, a ordem das linhas escolhida acima é preservada.</p><div class="table-scroll"><table><caption>Prévia das primeiras 6 linhas</caption><thead><tr><th>Linha</th>${Array.from({length:width},(_,i)=>`<th>Coluna ${i+1}</th>`).join('')}</tr></thead><tbody>${state.rows.slice(0,6).map((r,i)=>`<tr><td>${i+1}</td>${Array.from({length:width},(_,j)=>`<td>${esc(r[j] instanceof Date?r[j].toISOString().slice(0,10):r[j])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><button id="validate" class="primary">Validar histórico →</button><div id="audit"></div></section>`;
}
function combination() {
 const e=filtered(),s=stats(e,game),size=state.size,covered=choose(size,game.drawn),total=totalCombinations(game),odds=total/covered;
 return title('UM UNIVERSO DE POSSIBILIDADES','Sua próxima combinação.',`Escolha ${game.sizes.join(", ")} dezenas para tentar conter as ${game.drawn} dezenas sorteadas.`)+
 `<div class="two-columns combination-layout"><section class="card combination-card">${sizeSelector()}<span class="eyebrow">${size} DEZENAS · SEM REPETIÇÃO</span>${state.candidate.length?balls(state.candidate):'<div class="balls placeholder">'+Array(size).fill('<span>–</span>').join('')+'</div>'}<button class="primary" id="generate">⟳ Gerar combinação</button><button class="text-button" id="export-pick" ${!state.candidate.length?'disabled':''}>↓ Exportar combinação</button><div class="divider"></div><h2>Já tem uma combinação?</h2><p>Preencha ${size} números de 1 a ${game.pool}.</p><form id="manual"><div class="manual-inputs" style="--pick-size:${size>=15?5:size}">${Array.from({length:size},(_,i)=>`<input aria-label="Dezena ${i+1}" type="number" min="1" max="${game.pool}" required>`).join('')}</div><button class="secondary">Consultar probabilidade</button></form></section><section class="card probability-card"><span class="eyebrow">CHANCE DE CONTER AS ${game.drawn} SORTEADAS</span><h2>${Number.isInteger(odds)?'':'≈ '}1 em<br><strong>${fmt(odds)}</strong></h2><p>≈ ${(covered/total*100).toLocaleString('pt-BR',{maximumFractionDigits:11})}% por evento</p><p><strong>${covered} ${covered===1?'combinação':'combinações'} de ${game.drawn} dezenas ${covered===1?'coberta':'cobertas'}.</strong><br>Probabilidade exata: ${covered} / ${fmt(total)}.</p><div class="divider"></div><h3>Compare jogos do mesmo tamanho.</h3><p>Toda seleção válida de ${size} dezenas tem a mesma chance em um sorteio justo. Escolher mais dezenas cobre mais combinações de ${game.drawn}, sem garantir o acerto.</p><p>O evento continua sorteando ${game.drawn} dezenas. A tabela abaixo conta quantas delas estão dentro da sua seleção, não quantos prêmios ela produz.</p></section></div>
 ${state.candidate.length?`<section class="card"><h2>Estas dezenas no seu histórico</h2><p>${e.length} eventos na janela atual. Ausência significa ausência apenas nesta janela.</p><div class="table-scroll"><table><thead><tr><th>Dezena</th><th>Ocorrências</th><th>Frequência</th><th>Eventos desde a última ocorrência</th></tr></thead><tbody>${state.candidate.map(n=>`<tr><td><strong>${pad(n)}</strong></td><td>${s.counts[n-1]}</td><td>${e.length?fmt(s.counts[n-1]/e.length*100)+'%':'—'}</td><td>${s.gaps[n-1]??'Não observada na janela'}</td></tr>`).join('')}</tbody></table></div></section>`:''}
 <section class="card"><h2>Probabilidade por quantidade de acertos</h2><p>Para uma seleção fixa de ${size} dezenas, em um evento justo que sorteia ${game.drawn} dezenas.</p><div class="table-scroll"><table><thead><tr><th>Acertos exatos</th><th>Probabilidade</th></tr></thead><tbody>${Array.from({length:game.drawn+1},(_,i)=>`<tr><td>${game.drawn-i}</td><td>${(hitProbability(game.drawn-i,size,game)*100).toLocaleString('pt-BR',{maximumFractionDigits:9})}%</td></tr>`).join('')}</tbody></table></div></section>`;
}
function sizeSelector() {
 return `<label class="size-selector">Quantidade de dezenas no jogo<select id="pick-size">${game.sizes.map(n=>`<option value="${n}" ${state.size===n?'selected':''}>${n} dezenas</option>`).join('')}</select></label>`;
}
function simulation() {
 return title('COLOQUE AS HIPÓTESES À PROVA','Aprenda com a simulação.','Compare a estratégia de frequência com 100 sequências de escolhas aleatórias.')+
 `<section class="card"><h2>Uma avaliação evento a evento</h2><p>A estratégia seleciona as ${state.size} dezenas mais frequentes apenas nos eventos anteriores. Empates são resolvidos pela menor dezena. A cada evento, o histórico de treino se expande.</p><p>Usa os ${filtered().length} eventos da janela selecionada na visão geral, em ordem cronológica. Referência teórica: <strong>${fmt(state.size*game.drawn/game.pool)} acerto por evento</strong>.</p><div class="simulation-controls">${sizeSelector()}<label>Eventos iniciais para treino<input id="training" type="number" min="1" max="${Math.max(1,filtered().length-1)}" value="${Math.min(30,Math.max(1,filtered().length-1))}"></label><button class="primary" id="simulate" ${filtered().length<2||state.running?'disabled':''}>Executar simulação →</button></div><div id="simulation-status" role="status">${state.running?'Calculando 100 sequências de referência…':filtered().length<2?'Importe pelo menos 2 eventos para simular.':''}</div></section><div id="simulation-result">${state.result?simulationResult(state.result):''}</div>`;
}
function simulationResult(r) {
 return `<section class="metrics simulation-metrics"><article><span>Eventos avaliados</span><strong>${fmt(r.count)}</strong><small>Jogos de ${r.size} dezenas, após o treino</small></article><article><span>Estratégia de frequência</span><strong>${fmt(r.mean)}</strong><small>Acertos por evento</small></article><article><span>Referência aleatória</span><strong>${fmt(r.baselineMean)}</strong><small>Média de ${r.repetitions} sequências</small></article></section><section class="card"><h2>A variação também faz parte</h2><p>Os 95% centrais das médias das sequências aleatórias ficaram entre <strong>${fmt(r.low)} e ${fmt(r.high)}</strong> acertos por evento. Esta é uma faixa empírica da simulação, não um intervalo de confiança da estratégia.</p><p>Diferenças neste histórico não provam capacidade de prever eventos futuros. A estratégia não foi ajustada automaticamente para melhorar este resultado. Semente reproduzível: ${r.seed}.</p><table><thead><tr><th>Acertos</th><th>Eventos: frequência</th><th>Eventos: aleatório (média)</th></tr></thead><tbody>${r.hist.map((n,i)=>`<tr><td>${i}</td><td>${n}</td><td>${fmt(r.baselineHist[i])}</td></tr>`).join('')}</tbody></table><button id="export-simulation" class="secondary">↓ Exportar simulação</button></section>`;
}
function method() {
 const {pool,drawn}=game;
 return title('MATEMÁTICA SEM MISTÉRIO',`Entenda a ${game.name}.`,'As premissas, os cálculos e os limites da análise.')+`<section class="card prose">
 <h2>${drawn} dezenas sorteadas entre ${pool}</h2><p>Cada evento contém ${drawn} inteiros distintos de 1 a ${pool}. A ordem não importa e as dezenas voltam a ficar disponíveis no evento seguinte.</p>
 <div class="formula">C(${pool}, ${drawn}) = ${pool}! / (${drawn}! × ${pool-drawn}!) = ${fmt(totalCombinations(game))}</div>
 <p>Um jogo de ${drawn} dezenas tem chance de 1 em ${fmt(totalCombinations(game))} de conter todas as sorteadas. Uma dezena específica aparece com probabilidade ${drawn}/${pool} = ${fmt(100*drawn/pool)}%.</p>
 <h2>Jogos com mais dezenas e acertos parciais</h2>
 <p>Escolha n = ${game.sizes.join(', ')} dezenas. A chance de conter todas as ${drawn} sorteadas é C(n,${drawn}) / C(${pool},${drawn}). Todas as seleções do mesmo tamanho têm a mesma chance.</p>
 <div class="formula">P(K = k) = C(n, k) × C(${pool} − n, ${drawn} − k) / C(${pool}, ${drawn})</div>
 <p>Esta distribuição conta exatamente k dezenas sorteadas dentro da sua seleção, não a multiplicidade de prêmios. A média esperada é n × ${drawn}/${pool} acertos por evento.</p>
 <h2>O que o histórico pode mostrar</h2><p>Frequências, somas, paridade, duplas e intervalos entre ocorrências descrevem os dados. Flutuações são esperadas: as contagens não precisam ser iguais. O painel não testa nem certifica a justiça do sorteio.</p>
 <h2>Geração e simulação</h2><p>O gerador usa a fonte criptográfica do navegador com amostragem sem reposição e rejeição para evitar viés nos índices. A simulação usa apenas eventos anteriores, compara jogos do mesmo tamanho e executa 100 sequências pseudoaleatórias reproduzíveis. A data mapeada determina a ordem; sem data, vale a ordem declarada na importação. Nada disso garante resultados futuros.</p>
 <h2>Modalidades e privacidade</h2><p>Mega Sena e Loto Fácil mantêm históricos, filtros, combinações e resultados separados nesta aba. Trocar a modalidade preserva esses dados em memória. Recarregar ou fechar a página apaga ambas as sessões. As planilhas não são enviadas a servidores nem gravadas no armazenamento do navegador.</p></section>`;
}
function renderAudit() {
 const a=state.audit;
 $('#audit').innerHTML=`<div class="audit-summary"><h3>${a.valid.length} eventos válidos · ${a.errors.length} linhas inválidas</h3>${a.errors.length?`<details open><summary>Ver erros de validação</summary><ul>${a.errors.slice(0,200).map(e=>`<li>Linha ${e.line}: ${esc(e.error)}</li>`).join('')}</ul>${a.errors.length>200?'<p>Exibindo os primeiros 200 erros. Exporte o relatório completo.</p>':''}</details><label><input id="exclude-errors" type="checkbox"> Confirmo a exclusão das ${a.errors.length} linhas inválidas desta importação.</label><button id="export-errors" class="text-button">↓ Exportar todos os erros</button>`:''}${a.duplicates.length?`<details open><summary>${a.duplicates.length} identificações repetidas</summary><p>${a.duplicates.slice(0,20).map(d=>`Linha ${d.line}: ${esc(d.id)}`).join(' · ')}</p></details><label><input id="keep-duplicates" type="checkbox"> Conferi as identificações repetidas e desejo manter esses registros.</label>`:''}<p>Combinações iguais em eventos diferentes são preservadas.</p><button id="confirm-import" class="primary" ${!a.valid.length?'disabled':''}>Confirmar importação</button></div>`;
 $('#confirm-import').onclick=()=>{if(a.errors.length&&!$('#exclude-errors').checked)return toast('Confirme a exclusão das linhas inválidas para prosseguir.');if(a.duplicates.length&&!$('#keep-duplicates').checked)return toast('Confira e confirme as identificações repetidas.');state.events=a.valid;state.demo=false;state.source=state.filename;state.result=null;state.filter='all';state.from='';state.to='';state.tab='overview';render();toast('Histórico importado com sucesso.');};
 if($('#export-errors'))$('#export-errors').onclick=()=>download('erros-importacao.csv',[['Linha','Erro'],...a.errors.map(e=>[e.line,e.error])]);
}
function bind() {
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render();window.scrollTo(0,0);});
 const on=(id,event,fn)=>{const el=$(id);if(el)el.addEventListener(event,fn);};
 on('#game-select','change',e=>{
   if(loading)return;
   game=GAMES[e.target.value];state=sessions[game.id];render();window.scrollTo(0,0);
 });
 on('#demo','click',()=>{const rng=seeded(2026);state.events=Array.from({length:240},(_,i)=>({id:String(i+1),date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),numbers:draw(rng,game.drawn,game)}));state.source=`${game.name} · demonstração · 240 eventos fictícios`;state.demo=true;state.result=null;state.filter='all';state.from='';state.to='';render();});
 ['filter','from','to'].forEach(id=>on('#'+id,'change',e=>{state[id]=e.target.value;state.result=null;render();if(state.from&&state.to&&state.from>state.to)toast('A data inicial está após a data final. Ajuste o período.');}));
 on('#reset-filters','click',()=>{state.filter='all';state.from='';state.to='';state.result=null;render();});
 document.querySelectorAll('[data-number]').forEach(b=>b.onclick=()=>{const n=+b.dataset.number,e=filtered(),s=stats(e,game);$('#number-detail').textContent=`Dezena ${pad(n)}: ${s.counts[n-1]} ocorrências (${e.length?fmt(s.counts[n-1]/e.length*100):0}% dos eventos). ${s.gaps[n-1]===null?'Não observada nesta janela.':`${s.gaps[n-1]} eventos desde a última ocorrência.`} Frequência esperada: ${fmt(100*game.drawn/game.pool)}%.`;});
 on('#export-stats','click',()=>{const e=filtered(),s=stats(e,game);download('analise-dezenas.csv',[['Modalidade',game.name],['Origem',state.source],['Eventos',e.length],['Dezena','Ocorrencias','Percentual','Eventos desde ultima ocorrencia','Ocorrencias esperadas'],...s.counts.map((n,i)=>[i+1,n,e.length?n/e.length*100:0,s.gaps[i]??'Nao observada',e.length*game.drawn/game.pool]),[],['Pares','Eventos'],...s.parity.map((n,i)=>[i,n]),[],['Soma','Eventos'],...Object.entries(s.sums),[],['Dupla','Eventos'],...s.pairs]);});
 on('#template','click',()=>{const rng=seeded(2026);download(`modelo-${game.id}.csv`,[['Evento','Data',...Array.from({length:game.drawn},(_,i)=>`Dezena ${i+1}`)],[1,'01/01/2025',...draw(rng,game.drawn,game)],[2,'02/01/2025',...draw(rng,game.drawn,game)]]);});
 on('#file','change',async e=>{
   const file=e.target.files[0];
   if(!file)return;
   try {
     if(file.size>10*1024*1024)throw new Error('O arquivo excede o limite de 10 MB.');
     loading=true;state.workbook=null;state.rows=null;state.audit=null;state.filename=file.name;
     render();toast('Lendo arquivo…');$('#file').disabled=true;
     if(/\.csv$/i.test(file.name)) {
       state.rows=parseCSV(await file.text());
     } else if(/\.xlsx$/i.test(file.name)) {
       const wb=await loadWorkbook(await file.arrayBuffer());
       state.workbook=wb;
       state.sheet=wb.worksheets.findIndex(s=>s.rowCount>0);
       state.rows=sheetRows(wb.worksheets[state.sheet]);
     } else throw new Error('Escolha um arquivo CSV ou XLSX.');
     checkRows();loading=false;render();
   } catch(err) {
     loading=false;state.rows=null;render();toast('Não foi possível importar: '+err.message);
   }
 });
 on('#sheet','change',e=>{try{state.sheet=+e.target.value;state.rows=sheetRows(state.workbook.worksheets[state.sheet]);state.audit=null;checkRows();render();}catch(err){toast(err.message);}});
 on('#validate','click',()=>{try{state.audit=auditRows(state.rows,{numbers:[...document.querySelectorAll('.map-number')].map(e=>+e.value),id:+$('#map-id').value,date:+$('#map-date').value},$('#has-header').checked,$('#order').value==='desc',game);renderAudit();}catch(err){toast(err.message);}});
 document.querySelectorAll('.mapping select,#has-header,#order').forEach(e=>e.onchange=()=>{state.audit=null;$('#audit').innerHTML='';});
 on('#pick-size','change',e=>{state.size=Number(e.target.value);state.candidate=[];state.result=null;render();});
 on('#generate','click',()=>{state.candidate=draw(undefined,state.size,game);render();});
 on('#manual','submit',e=>{
   e.preventDefault();
   const values=[...$('#manual').querySelectorAll('input')].map(e=>e.value);
   const error=validateNumbers(values,state.size,game);
   if(error)return toast(error);
   state.candidate=values.map(Number).sort((a,b)=>a-b);render();
   const message=showHistoricalCheck({events:state.events,selection:state.candidate,game,demo:state.demo,source:state.source,returnFocus:$('#manual button')});
   if(message)toast(message);
 });
 on('#export-pick','click',()=>download('combinacao.csv',[[...Array.from({length:state.size},(_,i)=>`Dezena ${i+1}`),'Modalidade',`Combinações de ${game.drawn} cobertas`,`Probabilidade exata de conter as ${game.drawn} sorteadas`],[...state.candidate,game.name,choose(state.size,game.drawn),`${choose(state.size,game.drawn)} / ${totalCombinations(game)}`]]));
 on('#simulate','click',()=>{
   const training=+$('#training').value, target=state, events=filtered(target), size=target.size, gameId=game.id;
   if(target.running)return;
   if(!Number.isInteger(training)||training<1||training>=events.length)return toast('Informe um treino inteiro entre 1 e '+(events.length-1)+'.');
   target.running=true;render();
   const worker=new Worker(new URL('./simulation.worker.js',import.meta.url),{type:'module'});
   const finish=()=>{worker.terminate();target.running=false;};
   worker.onmessage=({data})=>{
     finish();
     const current=filtered(target);
     if(!data.error&&target.size===size&&current.length===events.length&&current.every((e,i)=>e===events[i]))target.result=data.result;
     if(state===target&&state.tab==='simulation'){render();if(data.error)toast(data.error);}
   };
   worker.onerror=()=>{finish();if(state===target){render();toast('Não foi possível executar a simulação. Tente novamente.');}};
   worker.postMessage({events,training,size,gameId});
 });
 on('#export-simulation','click',()=>{const r=state.result;download('simulacao.csv',[['Modalidade',GAMES[r.gameId].name],['Dezenas por jogo',r.size],['Eventos avaliados',r.count],['Media estrategia',r.mean],['Media aleatoria',r.baselineMean],['Faixa empirica 2,5%',r.low],['Faixa empirica 97,5%',r.high],['Semente',r.seed],['Repeticoes',r.repetitions],[],['Acertos','Estrategia','Aleatorio media'],...r.hist.map((n,i)=>[i,n,r.baselineHist[i]])]);});
}
function sheetRows(sheet) {if(!sheet)throw new Error('Planilha sem abas.');if(sheet.columnCount>100)throw new Error('Use uma planilha com até 100 colunas.');if(sheet.rowCount>50001)throw new Error('Limite de 50.000 eventos excedido.');const rows=[];for(let i=1;i<=sheet.rowCount;i++){const values=sheet.getRow(i).values;rows.push(Array.from({length:Math.min(sheet.columnCount,100)},(_,j)=>{const v=values[j+1];if(v&&typeof v==='object'&&!(v instanceof Date)){if('result'in v)return v.result;if(v.richText)return v.richText.map(t=>t.text).join('');return v.text??'';}return v??'';}));}return rows;}
function checkRows(){if(!state.rows?.some(r=>r.some(v=>v!==''&&v!=null)))throw new Error('A planilha está vazia.');if(state.rows.length>50001)throw new Error('Limite de 50.000 eventos excedido.');if(state.rows.some(r=>r.length>100))throw new Error('Use uma planilha com até 100 colunas.');}
render();








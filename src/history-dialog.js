import { historicalMatches, celebrationCount, pad } from './core.js';
import './history-dialog.css';

const escape = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = date => date ? date.split('-').reverse().join('/') : 'Não informada';

export function showHistoricalCheck({events, selection, game, demo, source, returnFocus}) {
  const matches = historicalMatches(events, selection, game);
  if (!events.length) return 'Importe um histórico para conferir os acertos. A probabilidade matemática está exibida abaixo.';
  if (!matches.length) return `Conferidos os ${events.length} eventos de todo o histórico: nenhum teve ${game.minHits} ou mais dezenas da sua seleção. A probabilidade matemática está exibida abaixo.`;

  document.querySelector('#history-dialog')?.close();
  const best = matches[0].hits, pageSize = 25;
  let currentPage = 0, timer;
  const dialog = document.createElement('dialog');
  dialog.id = 'history-dialog';
  dialog.className = 'history-dialog';
  dialog.dataset.mode = game.id;
  dialog.setAttribute('aria-labelledby','history-title');
  dialog.setAttribute('aria-describedby','history-description');
  dialog.innerHTML = `
    <div class="confetti-layer" aria-hidden="true"></div>
    <section class="history-panel">
      <button type="button" class="history-close" aria-label="Fechar conferência histórica">×</button>
      <div class="history-hero">
        <span class="history-icon" aria-hidden="true">✦</span>
        <div class="eyebrow">${escape(game.name)} · ${demo?'DEMONSTRAÇÃO FICTÍCIA':'CONFERÊNCIA HISTÓRICA'}</div>
        <h2 id="history-title" tabindex="-1">${demo?'Sua seleção fez':'Você acertou'} ${best} dezenas${demo?' na demonstração':' neste histórico'}!</h2>
        <p id="history-description">${matches.length} ${matches.length===1?'evento encontrado':'eventos encontrados'} em ${events.length} eventos conferidos. Todos os acertos abaixo são de sorteios passados${demo?' simulados':''}.</p>
      </div>
      <div class="history-body">
        <p class="history-source">Base: ${escape(source)} · Todo o histórico, independentemente dos filtros.</p>
        <div class="hit-summary" aria-label="Resumo por quantidade de acertos">${Array.from({length:game.drawn-game.minHits+1},(_,i)=>game.drawn-i).map(h=>`<span><strong>${h} acertos</strong> · ${matches.filter(m=>m.hits===h).length} eventos</span>`).join('')}</div>
        <h3>Sua seleção de ${selection.length} dezenas</h3>
        <div class="history-selection">${selection.map(n=>`<span>${pad(n)}</span>`).join('')}</div>
        <h3>Concursos encontrados</h3>
        <p>Primeiro os maiores acertos, depois as datas mais recentes. As dezenas destacadas estão na sua seleção.</p>
        <div class="history-matches"></div>
        <div class="history-pagination">
          <button type="button" class="secondary history-prev">← Anterior</button>
          <span class="history-page" aria-live="polite"></span>
          <button type="button" class="secondary history-next">Próxima →</button>
        </div>
        <button type="button" class="primary history-done">Continuar análise</button>
      </div>
    </section>`;
  const renderPage = () => {
    dialog.querySelector('.history-matches').innerHTML = matches.slice(currentPage*pageSize,(currentPage+1)*pageSize).map(m=>`
      <article class="history-match" data-hits="${m.hits}">
        <div class="history-match-header"><strong>Concurso ${m.id ? escape(m.id) : 'não informado'}</strong><span class="hit-badge">${m.hits} acertos</span></div>
        <p>Data do sorteio: <strong>${escape(dateLabel(m.date))}</strong>${!m.id&&m.line?` · Linha ${m.line} da planilha`:''}</p>
        <div class="drawn-numbers" aria-label="Dezenas sorteadas">${m.numbers.map(n=>`<span class="${m.matchedNumbers.includes(n)?'matched':''}" aria-label="${pad(n)}${m.matchedNumbers.includes(n)?', acertou':''}">${pad(n)}</span>`).join('')}</div>
      </article>`).join('');
    dialog.querySelector('.history-page').textContent = `Página ${currentPage+1} de ${Math.ceil(matches.length/pageSize)}`;
    dialog.querySelector('.history-prev').disabled = currentPage === 0;
    dialog.querySelector('.history-next').disabled = (currentPage+1)*pageSize >= matches.length;
    dialog.querySelector('.history-pagination').hidden = matches.length <= pageSize;
  };
  renderPage();
  for(const selector of ['.history-close','.history-done']) dialog.querySelector(selector).onclick = () => dialog.close();
  for(const [selector,delta] of [['.history-prev',-1],['.history-next',1]]) dialog.querySelector(selector).onclick = () => {currentPage+=delta;renderPage();dialog.querySelector('.history-matches').scrollIntoView({block:'start'});};
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  const previousOverflow = document.body.style.overflow;
  dialog.addEventListener('close',()=>{clearTimeout(timer);dialog.remove();document.body.style.overflow=previousOverflow;returnFocus?.focus({preventScroll:true});},{once:true});
  document.body.append(dialog);
  document.body.style.overflow='hidden';
  dialog.showModal();
  dialog.querySelector('#history-title').focus({preventScroll:true});

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const layer = dialog.querySelector('.confetti-layer');
  if (!reducedMotion.matches) {
    for(let i=0;i<celebrationCount(best,game);i++) {
      const confetti=document.createElement('i');
      confetti.className='confetti-piece';
      confetti.style.cssText=`--x:${Math.random()*100}%;--drift:${Math.random()*180-90}px;--delay:${Math.random()*.7}s;--duration:${2.3+Math.random()*1.5}s;--spin:${360+Math.random()*720}deg;--confetti-color:var(--confetti-${i%4});`;
      layer.append(confetti);
    }
    timer=setTimeout(()=>layer.replaceChildren(),5000);
  }
  return null;
}

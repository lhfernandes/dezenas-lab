import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { mkdir, readFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5173');
 await page.getByRole('button',{name:'Explorar demonstração'}).click();
 assert.equal(await page.locator('.number-cell').count(),60);
 await page.locator('[data-number="1"]').click();
 assert.match(await page.locator('#number-detail').innerText(),/Dezena 01/);
 await mkdir('test-results',{recursive:true});
 await page.screenshot({path:'test-results/desktop.png',fullPage:true});
 await page.locator('[data-tab="combination"]').click();
 await page.locator('#generate').click();
 assert.equal(await page.locator('.balls span').count(),6);
 const numbers=await page.locator('.balls span').allTextContents();assert.equal(new Set(numbers).size,6);
 const downloadPromise=page.waitForEvent('download');await page.locator('#export-pick').click();assert.equal((await downloadPromise).suggestedFilename(),'combinacao.csv');
 const inputs=page.locator('#manual input');for(let i=0;i<6;i++)await inputs.nth(i).fill('1');await page.locator('#manual button').click();assert.match(await page.locator('#notice').innerText(),/repetidas/);
 for(let i=0;i<6;i++)await inputs.nth(i).fill(String(i+1));await page.locator('#manual button').click();assert.deepEqual(await page.locator('.balls span').allTextContents(),['01','02','03','04','05','06']);
 for(const [size,coverage] of [[7,7],[8,28]]) {
   await page.locator('#pick-size').selectOption(String(size));
   assert.equal(await page.locator('#manual input').count(),size);
   assert.ok(await page.locator('#export-pick').isDisabled());
   await page.locator('#generate').click();
   const pick=await page.locator('.balls span').allTextContents();
   assert.equal(pick.length,size);assert.equal(new Set(pick).size,size);
   assert.match(await page.locator('.probability-card').innerText(),new RegExp(`${coverage} / 50.063.860`));
   const manual=page.locator('#manual input');
   for(let i=0;i<size;i++)await manual.nth(i).fill('1');
   await page.locator('#manual button').click();assert.match(await page.locator('#notice').innerText(),/repetidas/);
   for(let i=0;i<size;i++)await manual.nth(i).fill(String(i+1));
   await page.locator('#manual button').click();
   assert.deepEqual(await page.locator('.balls span').allTextContents(),Array.from({length:size},(_,i)=>String(i+1).padStart(2,'0')));
   const filePromise=page.waitForEvent('download');await page.locator('#export-pick').click();
   const csvExport=await readFile(await (await filePromise).path(),'utf8');
   assert.ok(csvExport.includes(`Dezena ${size}`));assert.ok(csvExport.includes(`${coverage} / 50063860`));
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/combination-8-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'8-number mobile layout must not overflow');
 await page.setViewportSize({width:1440,height:1100});
 await page.locator('[data-tab="simulation"]').click();
 assert.equal(await page.locator('#pick-size').inputValue(),'8');
 await page.locator('#simulate').click();await page.locator('.simulation-metrics').waitFor();
 assert.match(await page.locator('#simulation-result').innerText(),/Jogos de 8 dezenas/);
 await page.locator('#pick-size').selectOption('6');assert.equal(await page.locator('.simulation-metrics').count(),0);
 await page.locator('[data-tab="combination"]').click();await page.locator('#generate').click();
 await page.locator('[data-tab="simulation"]').click();await page.locator('#simulate').click();await page.locator('.simulation-metrics').waitFor();assert.match(await page.locator('#simulation-result').innerText(),/210/);
 await page.locator('[data-tab="import"]').click();
 const csv='Evento;Data;D1;D2;D3;D4;D5;D6\n1;01/01/2025;1;2;3;4;5;6\n2;02/01/2025;2;3;4;5;6;7\n3;03/01/2025;1;1;2;3;4;5';
 await page.locator('#file').setInputFiles({name:'teste.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.locator('#validate').click();assert.match(await page.locator('#audit').innerText(),/2 eventos válidos · 1 linhas inválidas/);
 await page.locator('#confirm-import').click();assert.match(await page.locator('#notice').innerText(),/Confirme a exclusão/);
 await page.locator('#exclude-errors').check();await page.locator('#confirm-import').click();assert.match(await page.locator('.source-strip').innerText(),/teste.csv/);
 await page.locator('nav [data-tab="import"]').click();
 await page.locator('#file').setInputFiles({name:'colunas-c-h.csv',mimeType:'text/csv',buffer:Buffer.from('Observação;Referência;Bola1;Bola2;Bola3;Bola4;Bola5;Bola6\nignorar;ignorar;10;20;30;40;50;60')});
 await page.locator('#validate').waitFor();
 assert.deepEqual(await page.locator('.map-number').evaluateAll(elements=>elements.map(e=>e.value)),['2','3','4','5','6','7']);
 assert.ok(await page.locator('#has-header').isChecked());
 await page.locator('#validate').click();assert.match(await page.locator('#audit').innerText(),/1 eventos válidos · 0 linhas inválidas/);
 await page.locator('#confirm-import').click();
 await page.locator('[data-number="60"]').click();assert.match(await page.locator('#number-detail').innerText(),/1 ocorrências/);
 const wb=new ExcelJS.Workbook();wb.addWorksheet('Vazio');const sheet=wb.addWorksheet('Histórico');sheet.addRow(['Evento','Data','D1','D2','D3','D4','D5','D6']);sheet.addRow([1,new Date('2025-01-01T00:00:00Z'),1,2,3,4,5,6]);sheet.addRow([2,new Date('2025-01-02T00:00:00Z'),7,8,9,10,11,12]);sheet.getColumn(2).numFmt='dd/mm/yyyy';
 // First worksheet intentionally empty: user must still be able to select another sheet.
 await page.locator('nav [data-tab="import"]').click();
 await page.locator('#file').setInputFiles({name:'teste.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});
 await page.locator('#sheet').waitFor();await page.locator('#sheet').selectOption('1');await page.locator('#validate').click();assert.match(await page.locator('#audit').innerText(),/2 eventos válidos/);await page.locator('#confirm-import').click();
 assert.match(await page.locator('.source-strip').innerText(),/teste.xlsx/);
 // Regression: valid prefixed SpreadsheetML emitted by other spreadsheet tools.
 // The unpatched ExcelJS parser raises "reading 'sheets'" on this workbook.
 const zip=await JSZip.loadAsync(await wb.xlsx.writeBuffer());
 for(const entry of Object.values(zip.files)) {
   if(entry.dir || !entry.name.endsWith('.xml') || !entry.name.startsWith('xl/'))continue;
   let xml=await entry.async('string');
   if(!xml.includes('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'))continue;
   xml=xml.replace('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"','xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"');
   xml=xml.replace(/<(\/?)([A-Za-z_][\w.-]*)(?=[\s/>])/g,'<$1x:$2');
   zip.file(entry.name,xml);
 }
 const prefixed=await zip.generateAsync({type:'nodebuffer'});
 const workbookOnly=await JSZip.loadAsync(await wb.xlsx.writeBuffer());
 workbookOnly.file('xl/workbook.xml',await zip.file('xl/workbook.xml').async('string'));
 await assert.rejects(new ExcelJS.Workbook().xlsx.load(await workbookOnly.generateAsync({type:'nodebuffer'})),/sheets/);
 await assert.rejects(new ExcelJS.Workbook().xlsx.load(prefixed),/sheets|sheetNo/);
 const diagnosis=await page.evaluate(async bytes=>{
   const {loadWorkbook}=await import('/src/workbook.js');
   try {await loadWorkbook(new Uint8Array(bytes).buffer);return null;}
   catch(e){return {message:e.message,cause:e.cause?.stack};}
 },Array.from(prefixed));
 assert.equal(diagnosis,null,JSON.stringify(diagnosis));
 await page.locator('nav [data-tab="import"]').click();
 await page.locator('#file').setInputFiles({name:'prefixos.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:prefixed});
 await page.locator('#sheet').waitFor();await page.locator('#validate').click();
 assert.match(await page.locator('#audit').innerText(),/2 eventos válidos/);await page.locator('#confirm-import').click();
 await page.locator('nav [data-tab="combination"]').click();
 assert.match(await page.locator('main').innerText(),/2 eventos na janela atual/);
 await page.locator('nav [data-tab="import"]').click();
 await page.locator('#file').setInputFiles({name:'invalido.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('not an xlsx')});
 await page.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('Não foi possível importar'));
 assert.match(await page.locator('#notice').innerText(),/Abra o arquivo no Excel ou LibreOffice/);
 await page.locator('nav [data-tab="overview"]').click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile must not overflow');
 // The second modality has its own data, limits and selected ticket size.
 const megaSource=await page.locator('.source-strip').innerText();
 await page.locator('#game-select').selectOption('loto');
 assert.equal(await page.locator('.number-cell').count(),25);
 assert.match(await page.locator('.metrics').innerText(),/60%/);
 assert.match(await page.locator('.metrics').innerText(),/3.268.760/);
 assert.match(await page.locator('.source-strip').innerText(),/Nenhum arquivo/);
 await page.locator('#demo').click();
 await page.locator('#filter').selectOption('30');
 assert.match(await page.locator('.metrics').innerText(),/30/);
 await page.locator('#game-select').selectOption('mega');
 assert.equal(await page.locator('.number-cell').count(),60);
 assert.equal(await page.locator('.source-strip').innerText(),megaSource);
 await page.locator('#game-select').selectOption('loto');
 assert.equal(await page.locator('#filter').inputValue(),'30');
 await page.locator('#filter').selectOption('all');
 await page.setViewportSize({width:1440,height:1100});
 await page.screenshot({path:'test-results/loto-dashboard.png',fullPage:true});
 await page.locator('nav [data-tab="import"]').click();
 const templatePromise=page.waitForEvent('download');await page.locator('#template').click();
 const template=await readFile(await (await templatePromise).path(),'utf8');assert.ok(template.includes('Dezena 15'));
 const first15=Array.from({length:15},(_,i)=>i+1),last15=Array.from({length:15},(_,i)=>i+11);
 const lotoRows=[['Evento','Data',...first15.map(n=>'Dezena '+n)],
   [1,'01/01/2025',...first15],[2,'02/01/2025',...last15],
   [3,'03/01/2025',...first15.slice(0,14),26],
   [4,'04/01/2025',...first15.slice(0,14),14]];
 await page.locator('#file').setInputFiles({name:'loto.csv',mimeType:'text/csv',buffer:Buffer.from(lotoRows.map(r=>r.join(';')).join('\n'))});
 await page.locator('#validate').waitFor();
 assert.deepEqual(await page.locator('.map-number').evaluateAll(elements=>elements.map(e=>+e.value)),Array.from({length:15},(_,i)=>i+2));
 await page.locator('#validate').click();assert.match(await page.locator('#audit').innerText(),/2 eventos válidos · 2 linhas inválidas/);
 await page.locator('#exclude-errors').check();await page.locator('#confirm-import').click();
 await page.locator('[data-number="25"]').click();assert.match(await page.locator('#number-detail').innerText(),/Frequência esperada: 60%/);
 const lotoWB=new ExcelJS.Workbook();lotoWB.addWorksheet('Loto').addRows(lotoRows.slice(0,3));
 await page.locator('nav [data-tab="import"]').click();
 await page.locator('#file').setInputFiles({name:'loto.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await lotoWB.xlsx.writeBuffer())});
 await page.locator('#validate').click();assert.match(await page.locator('#audit').innerText(),/2 eventos válidos · 0 linhas inválidas/);
 await page.locator('#confirm-import').click();
 await page.locator('nav [data-tab="combination"]').click();
 for(const [size,coverage] of [[15,1],[16,16],[17,136],[18,816],[19,3876],[20,15504]]){
   await page.locator('#pick-size').selectOption(String(size));await page.locator('#generate').click();
   const selected=(await page.locator('.balls span').allTextContents()).map(Number);
   assert.equal(selected.length,size);assert.equal(new Set(selected).size,size);assert.ok(selected.every(n=>n>=1&&n<=25));
   assert.equal(await page.locator('#manual input').count(),size);
   assert.match(await page.locator('.probability-card').innerText(),new RegExp(`${coverage} / 3.268.760`));
 }
 const lotoInputs=page.locator('#manual input');
 for(let i=0;i<20;i++)await lotoInputs.nth(i).fill('1');await page.locator('#manual button').click();assert.match(await page.locator('#notice').innerText(),/repetidas/);
 for(let i=0;i<20;i++)await lotoInputs.nth(i).fill(String(i+1));await page.locator('#manual button').click();
 const lotoDownloadPromise=page.waitForEvent('download');await page.locator('#export-pick').click();
 const lotoExport=await readFile(await (await lotoDownloadPromise).path(),'utf8');assert.ok(lotoExport.includes('Loto Fácil'));assert.ok(lotoExport.includes('15504 / 3268760'));
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/loto-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Loto Fácil mobile must not overflow');
 await page.locator('nav [data-tab="simulation"]').click();await page.locator('#simulate').click();await page.locator('.simulation-metrics').waitFor();
 assert.match(await page.locator('#simulation-result').innerText(),/Jogos de 20 dezenas/);
 assert.equal(await page.locator('#simulation-result tbody tr').count(),16);
 assert.match(await page.locator('main').innerText(),/12 acerto por evento/);
 await page.locator('#game-select').selectOption('mega');
 assert.equal(await page.locator('.source-strip').innerText(),megaSource);
 await page.locator('nav [data-tab="combination"]').click();assert.equal(await page.locator('#pick-size').inputValue(),'6');
 assert.equal(await page.locator('.balls span').count(),6);
 await page.locator('#game-select').selectOption('loto');assert.ok(await page.locator('.simulation-metrics').isVisible());
 await page.locator('nav [data-tab="combination"]').click();assert.equal(await page.locator('.balls span').count(),20);
 assert.deepEqual(errors,[]);console.log('PASS: dashboard, generator, manual validation, exports, worker, CSV, XLSX sheets, prefixed XLSX regression, invalid file feedback, mobile layout; no browser errors.');
} catch(error) { console.error('Browser status:',await page.locator('#notice').textContent().catch(()=>'')); throw error; }
finally {await browser.close();}


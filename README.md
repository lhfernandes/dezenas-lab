# Dezenas Lab

Aplicação local em português com duas modalidades: **Mega Sena**, com 6 dezenas sorteadas entre 60, e **Loto Fácil**, com 15 dezenas sorteadas entre 25. Importa XLSX e CSV, valida linhas, calcula estatísticas, gera combinações e executa uma avaliação histórica sem acesso a eventos futuros.

## Executar

Requer Node.js 22.12 ou superior.

```powershell
npm.cmd install
npm.cmd run dev
```

Abra o endereço exibido no terminal, normalmente http://127.0.0.1:5173. No Windows, também é possível executar `iniciar.bat` após instalar as dependências.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Para repetir os testes completos de interface, mantenha `npm.cmd run dev -- --port 5173 --strictPort` em execução e rode `npm.cmd run test:e2e` em outro terminal. Esses testes usam o Microsoft Edge instalado, em modo invisível. Capturas são salvas em `test-results/`.

Validação realizada: 15 testes de lógica aprovados e fluxo de navegador aprovado em desktop e celular. Inclui importação CSV/XLSX das duas modalidades, jogos de 6–8 e 15–20 dezenas, probabilidades, exportação, simulação, preservação dos históricos ao trocar a modalidade e regressão de XLSX com namespaces. Build de produção concluído. A auditoria npm não reportou vulnerabilidades após atualizar a dependência indireta uuid. O build informa o tamanho do módulo ExcelJS (aproximadamente 937 kB antes de gzip); esse módulo só é carregado quando se importa um XLSX.

O build está em `dist/` e pode ser hospedado em um servidor estático. Abra por HTTP; não abra o HTML diretamente por `file://`.

## Uso

1. No seletor **Modalidade de análise**, escolha **Mega Sena** ou **Loto Fácil**. Entre em **Importar histórico** e selecione um CSV ou XLSX (até 10 MB, 50.000 eventos e 100 colunas). O modelo disponível para download acompanha a modalidade selecionada.
2. Escolha a aba XLSX. Por padrão, as dezenas são lidas nas colunas **C a H** na Mega Sena e **C a Q** na Loto Fácil, **a partir da linha 2**, com a linha 1 como cabeçalho. Você pode mudar esse mapeamento; se o arquivo contiver somente as colunas de dezenas, o mapeamento começa em A. Identificação e data são opcionais, detectadas em A/B quando disponíveis. Informe a ordem dos eventos. Datas CSV aceitas: DD/MM/AAAA ou AAAA-MM-DD.
3. Valide, revise os erros e confirme a importação. Linhas inválidas só são excluídas com confirmação. Identificações repetidas exigem revisão; combinações repetidas são preservadas.
4. Explore frequências, intervalos desde a última ocorrência, paridade, somas e duplas. Os filtros de data exigem uma coluna de data. Últimos N é aplicado depois do filtro de período.
5. Em **Combinações**, escolha **6, 7 ou 8 dezenas** na Mega Sena ou **15, 16, 17, 18, 19 ou 20** na Loto Fácil e gere ou preencha um jogo manualmente. O tamanho escolhido atualiza as probabilidades, o formulário, a exportação e a simulação. Trocar o tamanho limpa a combinação e a simulação anteriores daquela modalidade. Exporte combinações, análises, erros e simulações como CSV; as análises, jogos e simulações exportados identificam a modalidade.
6. Simule uma estratégia que escolhe a quantidade selecionada de dezenas mais frequentes no passado, com treino expansivo. O seletor de tamanho também está na simulação. Empates usam a menor dezena. A referência usa jogos do mesmo tamanho em 100 sequências pseudoaleatórias, com semente 42, em um Web Worker.

**Demonstração:** o botão de demonstração carrega 240 eventos fictícios da modalidade selecionada, gerados com uma semente fixa; não representa resultados oficiais. Importar ou carregar a demonstração substitui apenas a base dessa modalidade. Trocar a modalidade preserva os históricos, filtros, jogos e resultados separados em memória. Recarregar a página apaga ambas as sessões.

## Matemática

Sob sorteios justos e independentes, C(60,6) = 50.063.860. O histórico continua contendo exatamente seis dezenas por evento, nas colunas C–H. Para um jogo com n = 6, 7 ou 8 dezenas, a probabilidade de conter as seis sorteadas é C(n,6)/50.063.860. São 1, 7 ou 28 combinações cobertas, com chances respectivas de 1 em 50.063.860, 1 em 7.151.980 e 1 em 1.787.995. Cada dezena tem chance 10% de ser sorteada. Acertos exatos seguem C(n,k) × C(60−n,6−k) / C(60,6), com média de n/10 acertos por evento. A tabela mostra dezenas acertadas dentro da seleção, não a multiplicidade de prêmios.

A geração usa Web Crypto e Fisher–Yates parcial com índices sem viés por rejeição. A simulação usa PRNG reproduzível, não apropriado para criptografia. A faixa de 95% exibida é uma faixa empírica das médias aleatórias, não um intervalo de confiança ou evidência de capacidade preditiva. Ausência de uma dezena refere-se apenas à janela selecionada. A aplicação não testa a justiça dos sorteios.

Para **Loto Fácil**, C(25,15) = 3.268.760. Um jogo com n dezenas tem chance C(n,15)/3.268.760 de conter as 15 sorteadas. Os jogos de 15–20 dezenas cobrem, respectivamente, 1, 16, 136, 816, 3.876 e 15.504 combinações. Cada dezena tem chance 15/25 = 60% de aparecer. Acertos exatos seguem C(n,k) × C(25−n,15−k) / C(25,15), com média 15n/25 (9 acertos para um jogo de 15). Acertos impossíveis têm probabilidade zero; por exemplo, duas seleções de 15 dezenas entre 25 compartilham pelo menos 5 dezenas.

## Privacidade e estrutura

Sem conta, servidor de dados, telemetria ou persistência. Os arquivos ficam na memória do navegador; apenas o código é servido pelo servidor local. ExcelJS é carregado localmente quando um XLSX é importado. Nenhuma fonte ou biblioteca depende de CDN em execução.

- `src/core.js`: regras, CSV, validação, combinatória e simulação.
- `src/games.js`: parâmetros separados de Mega Sena e Loto Fácil.
- `src/main.js`: interface e importação XLSX.
- `src/workbook.js`: leitura de XLSX com tratamento de namespaces XML usados por diferentes exportadores; evita a falha de compatibilidade “reading 'sheets'”.
- `src/simulation.worker.js`: cálculo da simulação fora da interface.
- `src/style.css`: interface responsiva.
- `tests/core.test.js`: testes de matemática e integridade dos dados.
- `tests/loto.test.js`: probabilidades, importação, estatísticas e simulação de 15 dezenas entre 25.

Tecnologias: JavaScript, [Vite](https://vite.dev/guide/) e [ExcelJS](https://github.com/exceljs/exceljs). Não há previsão garantida nem aumento demonstrado de chance pela frequência histórica.



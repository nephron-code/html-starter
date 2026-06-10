# Transcritor AGHU — Interno++

Standalone HTML+JS app para transcrição de exames do prontuário AGHU do Hospital Universitário de Lagarto (HUL) e cálculo de doses de medicamentos. O usuário copia e cola texto de PDFs do sistema; o app parseia, formata e calcula.

## Arquivo principal

`index.html` — arquivo único, sem backend, sem dependências externas além de Google Fonts.

Outros arquivos no repo:
- `favicon.png` — ícone do app (embutido também como data URI no `<img>` do `<h1>`)
- `TABELA_DVA_AGO.pdf` — fonte das diluições padrão do HUL (referência, não usado em runtime)

## Seções e fontes de dados

| Seção | PDF de origem | Formato |
|---|---|---|
| Exames Laboratoriais | Laudo Individual (AGHU) | Blocos separados por `Recebimento material: DD/MM/YY HH:MM` |
| Controles / Sinais Vitais | Monitorização | Linhas `DD/MM HH:MM` com valores em linhas subsequentes |
| Balanço Hídrico | Controle Hídrico | Labels e valores em blocos separados |
| Calculadora DVA | — | Entrada: droga + peso + ml/h → dose com faixa e alerta |
| ISR + Sedação Contínua | — | Entrada: peso → protocolo completo de ISR e sedação |

## Formato do Laudo Individual

**CRÍTICO**: No AGHU, `Recebimento material: DD/MM/YY HH:MM` aparece no **final** de cada exame (não no início). O bloco de dados de cada exame é o texto **antes** do marcador, não depois. `findBlocks` usa a lógica: `text.slice(pos[i-1].end, pos[i].idx)` com `date/time = pos[i]`.

Estrutura real:
```
GASOMETRIA ARTERIAL          ← dados do exame
pH: 7,308 ...
Recebimento material: 07/06/26 11:16   ← marcador no final

POTÁSSIO: 5,30 mEq/L         ← próximo exame
Recebimento material: 07/06/26 11:26
```

O parser:
- Divide em blocos: texto ANTES de cada `Recebimento material:` com data/hora desse marcador
- Detecta tipo: GASOMETRIA / HEMOGRAMA / SUMÁRIO DE URINA / outros escalares
- Sempre roda `parseOtherExams` em todo bloco (K, Na, Cr, Ur etc. têm blocos próprios)
- Agrupa por (data DD/MM/YY, hora HH:MM)
- **Regra de hora**: exame com uma única ocorrência no dia → linha sem hora; múltiplas → linha por hora
- Exames únicos ficam no topo das entradas do dia (linha de data pura)
- Gasometria e Urina sempre em linhas separadas

### Quirks do PDF real
- `LACTATO\n:\n1,5` — normalizado com `text.replace(/\n\s*:/g, ':')`
- `PLAQUETAS/μL:\n561000` — valor na linha seguinte; regex usa `\s*` após `:`
- `pH: 7,308 7,35 a 7,45` — valor seguido de faixa de referência na mesma linha; regex captura o primeiro número
- `P.H.: 6,5` no Sumário de Urina — regex `/P\.?H\.?:\s*([\d,\.]+)/i`
- `Hemoglobina: ++` e `Leucocitos: +` na urina — valores alfanuméricos capturados com `[^\s\n]+`

## Formato da Monitorização (Controles)

Colunas: `PAS | PAD | FC | FR | Tax | SAT | GCAP(opcional)`

Os valores de cada medição são distribuídos em múltiplas linhas após o timestamp:
```
07/06 04:00 134
94 68 19
34,8 91
```

O parser varre linha a linha: ao encontrar `DD/MM HH:MM`, coleta números das linhas seguintes até ter 7 ou encontrar texto com letras (anotações) ou outro timestamp. Entradas com menos de 6 valores são ignoradas. Resultado: mínimo-máximo por dia.

## Formato do Balanço Hídrico

Os labels e valores ficam em blocos separados no PDF:
```
Balanço Hídrico:
Total de Volumes Administrados:
3. BALANÇO HÍDRICO
Total de Volumes Eliminados:
100,00        ← Adm
2.300,00      ← Elim
-2.200,00     ← Saldo
```

Estratégia: buscar a partir de `"Total de Volumes Eliminados:"` e coletar as 3 primeiras linhas que sejam apenas número com vírgula decimal (padrão `^-?[\d\.]+,\d+$`). Ordem confirmada: Adm → Elim → Saldo.

## Calculadora DVA

### Fórmula geral
```
dose(mcg/kg/min) = mL/h × factor / (peso × 60)   [se needsWeight = true]
dose(mcg/min)    = mL/h × factor / 60              [se needsWeight = false]
dose(UI/min)     = mL/h × factor / 60              [vasopressina]
```

### Estrutura DVA_DRUGS
Cada entrada: `{ name, dilution, factor, unit, needsWeight, minDose, maxDose }`

- `factor` = concentração efetiva que converte mL/h diretamente (derivado da diluição do HUL)
- `minDose` / `maxDose` definem a faixa terapêutica usual — fora dela exibe ⚠️

### Drogas disponíveis (diluições HUL)
| Droga | Diluição | factor |
|---|---|---|
| Noradrenalina 1× | 4mg/62mL | 64 mcg/mL |
| Noradrenalina 2× | 8mg/62mL | 128 mcg/mL |
| Dobutamina | 250mg/62mL | 4000 mcg/mL |
| Nitroglicerina | 20mg/60mL SF | — mcg/min |
| Nitroprussiato | 200mg/1L | — mcg/kg/min |
| Vasopressina 1× | 20UI/101mL | — UI/min |
| Vasopressina 2× | 40UI/102mL | — UI/min |

## ISR + Sedação Contínua

Entrada: peso em kg. Saída: protocolo completo com volumes calculados.

### Estruturas de dados

**ISR_PREMED** — pré-medicação com indicação clínica entre parênteses:
- Fentanil (sem diluição) — 50 mcg/mL, 1–3 mcg/kg
- Lidocaína 2% (sem diluição) — 20 mg/mL, 1–1,5 mg/kg

**ISR_INDUCAO** — indutores com notas clínicas:
- Propofol (sem diluição) — 10 mg/mL, 1,5–3 mg/kg; evitar em instáveis
- Midazolam 5mg/mL (sem diluição) — 5 mg/mL, 0,1–0,3 mg/kg; onset lento
- Etomidato (sem diluição) — 2 mg/mL, 0,2–0,3 mg/kg; preferir em instáveis
- Ketamina (1 amp + 8mL AD) — 10 mg/mL, 1–2 mg/kg; preferir em broncoespasmo/choque

**ISR_BLOQ** — bloqueadores neuromusculares:
- Succinilcolina (1 amp + 10mL AD) — 10 mg/mL, 1,0–2,0 mg/kg; CI: hipercalemia, queimados, rabdomiólise, TRM
- Rocurônio (sem diluição) — 10 mg/mL, 0,6–1,5 mg/kg; reversível com sugamadex

**SEDACAO** — sedação contínua, resultado em ml/h (mín–máx):
- Fentanil (2 amp + 80mL SF) — 10 mcg/mL, 0,7–4,5 mcg/kg/h
- Propofol (sem diluição) — 10 mg/mL, 1,5–4,5 mg/kg/h
- Midazolam (conc. final 1mg/mL) — 1 mg/mL, 0,05–0,10 mg/kg/h; campo `prep` com 2 opções de diluição
- Dexmedetomidina (1 amp + 48mL SF) — 4 mcg/mL, 0,20–0,70 mcg/kg/h

### Campo `prep`
Drogas que precisam de instruções de diluição têm campo `prep` na estrutura. O render exibe como linha indentada com `→` abaixo da linha de dose.

### Midazolam: distinção ISR vs sedação
- **ISR (bolus)**: `conc: 5` (5mg/mL, sem diluição) — volumes razoáveis para bolus (ex: 1,4mL para 70kg a 0,1mg/kg)
- **Sedação contínua**: `conc: 1` (1mg/mL, diluída) — duas opções de preparo: amp 3mL (15mg) ou amp 10mL (50mg)

## Decisões de design

- **Laudo Individual vs Fluxograma Laboratorial**: o Fluxograma não tem ano na data e exames esparsos não têm mapeamento confiável por coluna no copy-paste. O Laudo Individual tem `DD/MM/YY` e cada exame com timestamp próprio.
- **Sem upload de arquivo**: o sistema AGHU não expõe PDFs diretamente; o fluxo é copy-paste do visualizador web.
- **Números brasileiros**: vírgula como decimal, ponto como milhar. Conversão: `s.replace(/\./g, '').replace(',', '.')`.
- **Favicon**: `favicon.png` como arquivo físico (para Safari) + data URI embutida no `<img>` do `<h1>` (para uso standalone sem servidor).

## Como testar

Abrir `index.html` diretamente no browser (não precisa de servidor). Para preview com servidor:
```
npx serve -p 5500 .
# então abrir http://localhost:5500
```

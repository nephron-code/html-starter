# Transcritor AGHU — Interno++

Standalone HTML+JS app para transcrição de exames do prontuário AGHU do Hospital Universitário de Lagarto (HUL). O usuário copia e cola texto de PDFs do sistema; o app parseia e formata para anotação clínica.

## Arquivo principal

`Interno++.html` — arquivo único, sem backend, sem dependências externas além de Google Fonts.

## Seções e fontes de dados

| Seção | PDF de origem | Formato |
|---|---|---|
| Exames Laboratoriais | Laudo Individual (AGHU) | Blocos separados por `Recebimento material: DD/MM/YY HH:MM` |
| Controles / Sinais Vitais | Monitorização | Linhas `DD/MM HH:MM` com valores em linhas subsequentes |
| Balanço Hídrico | Controle Hídrico | Labels e valores em blocos separados |

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

## Decisões de design

- **Laudo Individual vs Fluxograma Laboratorial**: o Fluxograma não tem ano na data e exames esparsos não têm mapeamento confiável por coluna no copy-paste. O Laudo Individual tem `DD/MM/YY` e cada exame com timestamp próprio.
- **Sem upload de arquivo**: o sistema AGHU não expõe PDFs diretamente; o fluxo é copy-paste do visualizador web.
- **Números brasileiros**: vírgula como decimal, ponto como milhar. Conversão: `s.replace(/\./g, '').replace(',', '.')`.

## Como testar

Abrir `Interno++.html` diretamente no browser (não precisa de servidor). Para preview com servidor:
```
npx serve -p 5500 .
# então abrir http://localhost:5500/Interno++.html
```

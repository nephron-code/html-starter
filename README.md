# Interno++

Ferramenta web para transcrição e cálculo clínico integrados ao prontuário **AGHU** do Hospital Universitário de Lagarto (HUL). Desenvolvida para internos e residentes que precisam transcrever dados de exames e calcular doses de medicamentos de forma rápida e segura.

---

## Funcionalidades

### Extração de dados do AGHU (copy-paste)

| Seção | Fonte no AGHU | O que gera |
|---|---|---|
| **Exames Laboratoriais** | Laudo Individual | Gasometria, hemograma, urina, eletrólitos — agrupados por data/hora |
| **Controles / Sinais Vitais** | Monitorização | PAS, PAD, FC, FR, Tax, SpO₂ — mínimo e máximo por dia |
| **Balanço Hídrico** | Controle Hídrico | Volumes administrados, eliminados e saldo |

Como usar: no AGHU, abra o relatório desejado → **Ctrl+A → Ctrl+C** → cole na caixa correspondente → clique em **Extrair**.

> 🔒 Todo o processamento é local no navegador. Nenhum dado é enviado a servidores externos.

---

### Calculadora de DVA

Converte **ml/h → dose** para as principais drogas vasoativas e inotrópicas com as diluições padrão do HUL:

- Noradrenalina (1× e 2×)
- Dobutamina
- Nitroglicerina
- Nitroprussiato
- Vasopressina (1× e 2×)

Exibe a faixa terapêutica usual e alerta ⚠️ quando a dose calculada está fora do intervalo.

---

### ISR + Sedação Contínua

A partir do **peso do paciente**, gera automaticamente:

**Pré-medicação**
- Fentanil — resposta hemodinâmica à laringoscopia
- Lidocaína 2% — broncoespasmo / HIC

**Indução**
- Propofol, Midazolam, Etomidato, Ketamina — com volumes calculados e notas clínicas

**Bloqueio neuromuscular**
- Succinilcolina, Rocurônio — com indicações e contraindicações

**Sedação contínua (ml/h)**
- Fentanil, Propofol, Midazolam, Dexmedetomidina — range mínimo–máximo

---

## Como executar localmente

Nenhuma instalação necessária. Basta abrir o arquivo diretamente no navegador:

```bash
open index.html
```

Ou com servidor local:

```bash
npx serve -p 5500 .
# Acesse http://localhost:5500
```

---

## Aviso

Esta ferramenta tem **fins educativos e de apoio clínico**. Todas as informações devem ser verificadas em fontes primárias. Os resultados **não substituem o julgamento médico**.

---

## Sugestões e feedback

[Envie sua sugestão, crítica ou elogio →](https://forms.gle/Fpc2iQtnK5wUr2pX8)

---
target: app/calendario2026/page.tsx
total_score: 20
p0_count: 0
p1_count: 3
timestamp: 2026-09-01T11-53-41Z
slug: app-calendario2026-page-tsx
---
# Critica de design — calendario publico APT 2026–2027

## Design Health Score

| # | Heuristica | Nota | Problema principal |
|---|---|---:|---|
| 1 | Visibilidade do estado | 2/4 | O ano 2026 permanece visualmente ativo apos navegar para 2027; a faixa mensal nao informa posicao. |
| 2 | Correspondencia com o mundo real | 3/4 | Datas e cadencia sao naturais, mas quarter, corte e Courts pressupõem conhecimento interno. |
| 3 | Controle e liberdade | 2/4 | Ha atalhos por ancora, mas o mobile oculta navegacao e nao oferece escolha direta de mes. |
| 4 | Consistencia e padroes | 2/4 | A linguagem visual e consistente, mas o seletor de ano parece um controle de estado e funciona apenas como link. |
| 5 | Prevencao de erros | 3/4 | Datas derivadas reduzem erro factual, mas o proximo quarter e hard-coded e o estado visual do ano engana. |
| 6 | Reconhecimento em vez de memoria | 2/4 | Legenda e datas existem, mas o usuario precisa lembrar significados ao percorrer doze meses. |
| 7 | Flexibilidade e eficiencia | 1/4 | Nao ha proximo evento dominante, atalho mensal, exportacao ou visao compacta. |
| 8 | Estetica e design minimalista | 2/4 | O primeiro fold tem presenca, mas escala excessiva, repeticao e 7.109px no mobile diluem o foco. |
| 9 | Recuperacao de erro | 2/4 | Poucas acoes geram erro, mas saltos enganosos nao preservam orientacao contextual. |
| 10 | Ajuda e documentacao | 1/4 | A cadencia e explicada, mas o vocabulário do clube e o proximo passo para um visitante nao sao. |
| **Total** |  | **20/40** | **Fundacao aproveitavel; redesign estrutural necessario.** |

## Veredito de anti-padroes

**Avaliacao humana:** parece uma pagina esportiva competente gerada com ajuda de IA. Fotografia real, lockup oficial e paleta comprometida evitam o genérico total, mas a mesma microchamada clay aparece antes de quatro titulos, quase todas as secoes repetem a formula de heading condensado gigante, o hero e reutilizado no Finals e a frase principal e genérica. A linguagem promete um clube exclusivo, sobrio e sensual, mas entrega uma composicao editorial esportiva previsivel.

**Detector deterministico:** zero achados (`[]`). Isso confirma que nao ha os anti-padroes mecanicos catalogados, mas tambem mostra o limite do detector: ele nao identifica repeticao estrutural, climax fraco, copy genérica ou hierarquia concorrente.

**Overlay visual:** indisponivel. A pre-validacao mutavel falhou porque o ambiente expôs `document.title` apenas como getter e nao implementou `document.createElement`. A evidencia foi substituida por navegador real, metricas DOM e capturas em tres larguras.

## Impressao geral

A pagina tem materia-prima de marca, mas nao escolhe uma funcao principal. O maior ganho virá de transformar a agenda no objeto central e usar a marca para criar desejo ao redor dela, em vez de repetir manifesto, timeline, quarter tables e doze cards mensais com o mesmo peso.

## O que funciona

- A combinacao navy, mineral e clay com fotografia documental evita o verde-Wimbledon e tem aderencia ao APT.
- Datas usam elementos `time`, UTC e rotulos acessiveis por evento.
- A estrutura responsiva nao produz overflow de documento; o trilho mensal mobile rola e encaixa corretamente.

## Problemas prioritarios

### P1 — Hero desktop quebrado

A faixa `Proximo quarter` invade o CTA `Ver a temporada` em 16px e praticamente toda a largura do botao. O primeiro fold parece inacabado. Corrigir a topologia do hero; nenhum elemento informativo deve depender de sobreposicao acidental.

### P1 — Seletor de ano mente sobre estado

O link para 2027 navega, mas 2026 continua selecionado. Substituir o falso segmented control por navegacao honesta ou por estado real.

### P1 — O calendario e a parte menos legivel

No mobile, dias e intervalos chegam a aproximadamente 11.5px e os weekdays a 9.9px. O trilho tem 3.972px sem indicador, botoes ou escolha direta de mes. A agenda precisa ser o artefato mais legivel da pagina.

### P2 — Arquitetura repete em vez de priorizar

A mesma temporada aparece como linha, tabelas de quarters e calendario mensal. Escolher uma pergunta dominante — proximo evento, meu quarter ou ano completo — e revelar o restante progressivamente.

### P2 — Expressao de marca formulaica e anticlimatica

Eyebrows repetidos, headings sempre gigantes e a mesma foto no inicio e no Finals fazem a pagina parecer gerada. Finals precisa de imagem, ritmo e acao proprios.

## Red flags por persona

**Jordan, visitante novo:** quarter, corte e Courts nao sao explicados; o CTA principal apenas rola; a entrada no clube fica escondida no rodape.

**Riley, visitante sensivel a marca:** percebe imediatamente foto repetida, gramatica de secao idêntica e slogan genérico. A exclusividade prometida nao se materializa.

**Casey, usuario mobile interrompido:** enfrenta 7.109px de pagina, navegacao de secao oculta e trilho mensal sem orientacao. Links de ano medem 36px, abaixo do alvo de 44px.

## Observacoes menores

- O hero chega a 8.5rem, acima do teto Impeccable de 6rem, com line-height comprimido de 0.78.
- O lockup mobile ocupa aproximadamente 109px dentro de um header de 134px enquanto a navegacao util some.
- O significado dos eventos depende muito de cor e de uma legenda distante.
- `Proximo quarter` esta correto em 1 de setembro de 2026, mas nao expira automaticamente.
- Skip link e hierarquia semantica sao bons fundamentos.

## Perguntas provocativas

- A pagina e primeiro uma ferramenta de planejamento para membros ou uma pagina de desejo para futuros membros?
- Qual resposta deve aparecer em cinco segundos: a proxima data, a estrutura da temporada ou a sensacao de pertencer?
- Se Finals e o pico emocional, por que repete a imagem de abertura?
- Uma hierarquia `proximo evento + quarter atual + ano completo sob demanda` resolveria melhor que tres representacoes completas?
- Sem logo e cores, qual decisao visual ainda seria inequivocamente APT?

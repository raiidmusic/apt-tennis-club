# APT Product Design System

## Direction

Um sistema editorial de produto que combina clube contemporâneo, competição e intimidade. A linguagem visual nasce do tênis praticado de verdade: movimento técnico, esforço, quadra, sombra e detalhes de equipamento. A candidatura é espaçosa e emocional; portal e gestão são mais densos e objetivos.

## Operational product surfaces

Gestão, portal e formulários usam composição de CRM profissional com a identidade do clube: títulos de 24–28px em Outfit, controles e corpo em 16px, dados e metadados em 14px. A landing usa a mesma família Outfit com títulos editoriais contidos e fotografia documental.

- Trilho lateral de 240px, recolhido para 72px, com navegação móvel de alvos de pelo menos 44px.
- A composição da gestão adapta a referência Advanced Stats selecionada por Gabriel: gráfico dominante em duas partes da largura, cartão escuro da base e decisões na terceira parte. Os seis indicadores financeiros ficam abaixo, em uma linha no desktop amplo, três colunas nas larguras intermediárias e duas no mobile; gap de 16px e raio de 16px. Cada indicador abre seu ledger de atletas ou cobranças reais.
- A ordem atual escolhida é gráfico → base/decisões → seis indicadores. Essa decisão pela referência Advanced Stats substitui a ordem anterior de indicadores antes do gráfico; as definições e os ledgers financeiros permanecem iguais.
- O gráfico usa a adaptação do ClippedAreaChart público original: curva monotone com preenchimento amber, rastreamento do cursor e valores reais. Recebido e confirmado em liquidação são séries distintas; consulta por ponteiro, toque ou foco nos meses e valores completos acessíveis. O total continua somando apenas recebimentos. O cartão da base usa contagens reais de cadastros, cobertura paga e cortesias, sem metas ou deltas fictícios.
- Tabelas com texto de 14–16px, valores alinhados, ações identificadas e rolagem interna. A tabela de membros usa seis colunas proporcionais, identidade compacta com iniciais e e-mail, sem coluna congelada que cubra outros dados; o mobile mantém todas as colunas com indicação de rolagem. O quadro mantém colunas de largura útil, filtros existentes e estados financeiros derivados. Requerimentos podem mudar de etapa pela API protegida; aprovação, rejeição e pendência abrem a decisão explícita antes de efeitos externos.
- Ficha com contato estruturado (e-mail, WhatsApp, classe e data de entrada quando conhecida), cobertura paga e histórico de cobranças antes das configurações. Notas usam registro explícito e histórico real, sem autosave ou atividade demonstrativa. Recibo parcial de nota persistida é exibido e deduplicado mesmo se a auditoria posterior falhar; a falha permanece visível. Fichas abrem como diálogos modais nativos, com contenção de foco e retorno ao gatilho. Fechar invalida consultas pendentes; respostas e operações concluídas depois não reabrem nem misturam outra ficha. Controles menos frequentes usam disclosures nativos; campos existentes recebem labels e agrupamentos semânticos.
- Portal organiza identidade, participação financeira, ação contextual, acessos autorizados e cobranças reais. O perfil separa dados protegidos de contato editável, com validação e foco no campo inválido; Pix manual, recorrência comprovada e participação definida pela gestão mantêm as guardas existentes.
- Cadastro sem acesso válido apresenta orientação de convite e destinos reais de requerimento/login, sem coletar dados em formulário desabilitado. Histórico financeiro móvel indica sua rolagem horizontal.
- Login e recuperação com formulário de aproximadamente 440px, identidade oficial e ações de autenticação existentes. Cadastro e requerimento mantêm seus passos e limites, com validação clara junto ao campo.
- Nenhum gráfico usa tendência fictícia; nenhuma configuração, notificação, avatar fotográfico ou ação é adicionada sem comportamento existente.

## Photography

- Somente homens, refletindo a composição atual do APT.
- Gesto e equipamento tecnicamente plausíveis: tênis próprios para quadra, raquete, empunhadura, bola, rede e superfície coerentes.
- Recortes documentais e cinematográficos: saque, split step, pés, mãos, sombra e pausa entre pontos.
- Grão, contraste e movimento podem dar textura, mas nunca esconder anatomia ou objeto incorreto.
- Evitar poses de moda sem jogo, tênis de corrida, acessórios inventados e o imaginário genérico de country club.

## Official identity assets

O lockup caligráfico oficial “APT Tennis Club — Beyond the Court” é obrigatório em todas as jornadas. As versões oficiais navy sobre superfícies claras e clara sobre fotografia escura vêm da prancha oficial `LOGOS PRANCHETA.svg` e dos arquivos derivados aprovados; não devem ser recriadas tipograficamente.

## Selected theme and typography

Gabriel selecionou explicitamente [Amber Hearth · serafimcloud](https://21st.dev/@serafimcloud/themes/amber-hearth), tema 21st `e6b559a3-663b-470f-b3f5-46b533d86247`. O produto atual aplica o modo claro da fonte real: fundo/cartões brancos `#ffffff`, texto `#111827`, ação amber `#d87943`, secundário teal `#527575`, superfícies muted `#f3f4f6` e bordas `#e5e7eb`. A sidebar é clara; a curva de recebimentos usa o amber, conforme a referência Advanced Stats selecionada.

- A ação amber usa texto escuro `#111827` (5,69:1), pois o branco original resulta em 3,12:1 e não atende texto normal. Hover teal com branco resulta em 5,05:1.
- Metadados usam uma mistura de 85% `#6b7280` com 15% `#111827`, mantendo 5,36:1 sobre a superfície cinza. Foco usa o teal selecionado, com 4,59:1 sobre a sidebar.
- A linha de recebimentos usa uma derivação mais escura do amber de gráfico (3,68:1 sobre branco), com preenchimento amber suave; a série confirmada usa teal tracejado e legenda textual. Estados financeiros permanecem textuais: positivo recebe teal sobre superfície clara; erro usa uma derivação escura do vermelho original, sem depender apenas de cor. Recebimento e confirmação nunca são somados no mesmo indicador.
- Interface e títulos usam Outfit variável 100–900, hospedada localmente em `public/fonts`, com licença SIL OFL 1.1 preservada. Sem requisição de fonte ao abrir a página. Serif e mono do tema são declarações opcionais de fallback; não são fontes adicionais carregadas.
- Corpo e controles em 1rem; dados e metadados a partir de 0.875rem, com números tabulares; textos longos ficam entre 45 e 65 caracteres por linha.

## Landing

A navegação compacta adapta a referência pública 21st [Navbar 1](https://21st.dev/@preetsuthar17/components/navbar-1); a hierarquia da hero havia sido estudada em [Editorial Hero](https://21st.dev/@felipemenezes098/components/hero-05) e recebeu a nova direção abaixo. Navegação, entrada do membro e calendário permanecem encontráveis no celular. Galeria, divisões, temporada, FAQ e requerimento mantêm as afirmações, fotografias e destinos aprovados. A correção explícita do usuário faz as mesmas três palavras individuais — “competir.”, “evoluir.” e “pertencer.” — repetirem em ciclo a cada dois segundos, sem shimmer ou gradient text. A decisão mais recente do usuário remove Pausar/Retomar: o ciclo permanece contínuo em todas as larguras, sem controle de desligamento na página. A preferência de reduced motion do sistema apresenta a primeira palavra estática, sem temporizador; o título acessível permanece estático.

Na revisão explicitamente escolhida pelo usuário, a hero passa a usar fotografia ampla atrás do conteúdo, com parallax inspirado no [Parallax Scrolling de Osmo](https://21st.dev/@osmosupply/components/parallax-scrolling) e no trecho fornecido pelo usuário. A implementação própria usa `useScroll`/`useTransform` do Framer já instalado: fotografia, texto e referência de temporada têm deslocamentos distintos e limitados, sem controlar a rolagem global. Todos os planos permanecem estáticos em reduced motion; título e ações ficam visíveis desde o HTML inicial. A fotografia enviada pelo usuário foi adaptada com outpaint lateral para `public/apt-assets/hero-parallax-v2.webp` (1672 × 941 nativos, 134.740 bytes). A posição superior/direita preserva o saque e a bola; a alternativa gerada anteriormente permanece somente em outputs, sem integração pública.

O footer consulta a navegação agrupada de [Solace UI · Footer Section 5](https://21st.dev/@solaceui/components/footer-section-5), catálogo `19358`, com fonte pública lida no [registry oficial do autor](https://www.solaceui.com/r/footer-section-5.json). O catálogo declara `no-license`; nenhum bloco de código, shader, logo ou ícone da referência foi copiado. A correção explícita do usuário remove o wordmark vazado e o grande painel laranja. O encerramento final contém um CTA navy contido, logo oficial pequeno, texto branco de alto contraste e uma única ação real para requerimento; o footer abaixo é claro, com duas colunas de navegação. Alvos de 44px e foco visível são preservados. Não há painel duplicado de conversão, links fictícios, redes sociais presumidas ou formulário sem integração.

O frame de temporada segue a nova escolha de glass: superfície escura translúcida, blur e saturação discretos, borda fina e texto branco. O blur fica em pseudo-elemento interno, isolado e recortado ao frame, sem sombra externa ampla. Em navegadores sem backdrop-filter, usa fundo escuro opaco. O link do calendário preserva alvo de 44px e foco branco. A fonte precisa ser reinspecionada no browser em desktop, tablet e celular; os checks de código não representam aceite visual do usuário.

## Shape and spacing

- Escala de 4 pontos: 4, 8, 12, 16, 24, 32, 48 e 64px.
- Controles compactos com raio de 8px; superfícies e navegação usam o raio de 12px do tema. Na composição Advanced Stats selecionada, gráfico e cartões laterais usam 24px, e os indicadores inferiores usam 16px. Seções e formulários evitam caixas excessivas.
- Bordas são hairlines completas; sem faixas laterais decorativas.
- Alvos interativos têm no mínimo 44px.

## Motion

- Transições de estado entre 150 e 300ms com `ease-out-quint`.
- A troca de pergunta mantém sua entrada expressiva. No produto, feedback e transições duram 150–250ms; a rolagem usa apenas deslocamento discreto, com conteúdo visível sem animação e sem coreografia de entrada da página.
- `prefers-reduced-motion` reduz animações e rolagem suave.

## Responsive behavior

- Mobile: coluna única, landing page com CTA direto e formulário com controles próximos ao polegar.
- Tablet: duas colunas quando o conteúdo comporta.
- Desktop: candidatura em composição assimétrica; portal e gestão ganham trilho lateral persistente.

## Member and contact references

A lapidação de membros e contatos usa como inspiração o ZIP e as capturas de CRM fornecidos pelo usuário, a [User Table de Alain](https://21st.dev/@alain00/components/user-table) (fonte pública MIT consultada), o preview público [Settle](https://21st.dev/@uvain/templates/settle-payment-operations-dashboard) (código vendido não obtido) e a [Sidebar de Manu Arora](https://21st.dev/@manuarora700/components/sidebar) (fonte pública consultada). São referências de organização e acabamento; o usuário esclareceu que não exige reprodução literal. A implementação mantém CSS/HTML próprios, iniciais e ações APT; não incorpora o backend, papéis, chats, avatares ou atividade fictícia dos exemplos. A sidebar existente preserva o recolhimento por botão explícito e a navegação móvel acessível.

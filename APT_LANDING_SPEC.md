# APT Tennis Club — Landing Page Spec

Status: direção aprovada para reconstrução da rota `/`  
Referência principal: [Tenvibe — Tennis Club Website Design](https://dribbble.com/shots/26840646-Tenvibe-Tennis-Club-Website-Design)  
Escopo: landing pública. Não alterar os fluxos de requerimento, cadastro, portal, gestão ou integrações.

Nota de pesquisa: o shot `26840646` não abriu diretamente no crawler; a análise visual foi cruzada com o [shot Tenvibe acessível `26838266`](https://dribbble.com/shots/26838266-Tenvibe-Tennis-Club-Website-Design) e com o [case Tenvibe relacionado no Behance](https://www.behance.net/gallery/239701477/Tenvibe-Modern-Tennis-Club-Website-UXUI-Design).

## 1. Decisão central

A landing deve comunicar uma única promessa:

> Um ranking para quem leva o tênis a sério.

O usuário precisa entender em poucos segundos:

- o APT organiza um ranking competitivo por classes;
- a entrada acontece por indicação e análise;
- quem já é membro acessa uma área separada para assinatura, pagamentos e Twinner;
- o próximo passo é solicitar entrada ou acessar a área do membro.

O tom é seguro, direto e esportivo. A marca deve parecer relevante porque a experiência é bem organizada — não porque o texto afirma que ela é “exclusiva”, “para poucos” ou “transformadora”.

## 2. O que absorver da referência Tenvibe

A referência foi analisada como sistema visual, não como template para copiar.

### Absorver

- fotografia de tênis em ação ocupando a primeira dobra;
- contraste alto entre imagem, navy profundo e texto mineral;
- headline curta e dominante, com leitura imediata;
- navegação integrada ao hero e visualmente silenciosa;
- CTA de alto contraste, sem competir com o título;
- ritmo de seções largas, alternando imagem, texto e superfícies sólidas;
- composição assimétrica no desktop e coluna direta no mobile;
- detalhes gráficos mínimos, derivados de linhas de quadra e do enquadramento fotográfico;
- sensação de movimento criada pelo recorte da foto, não por efeitos gratuitos.

### Não absorver

- copy motivacional de academia, coaching, disciplina ou “unlock your potential”;
- planos, preços, estatísticas ou depoimentos inventados;
- lista de serviços que o APT não oferece;
- excesso de glassmorphism, tags flutuantes ou cartões sobre a imagem;
- visual verde-Wimbledon;
- qualquer imagem feminina ou equipamento de tênis tecnicamente incorreto;
- linguagem de luxo artificial, clube secreto ou networking como promessa principal.

Tradução para o APT: a energia e a precisão visual do Tenvibe, com menos elementos, copy mais objetiva e conteúdo fiel ao ranking.

## 3. Princípios de produto e marca

1. **Tênis primeiro.** A primeira mensagem é ranking, nível de jogo e frequência.
2. **Convite como critério, não ostentação.** A indicação explica a qualidade do ranking; não serve para criar pose de exclusividade.
3. **Imagem real é estrutura.** A fotografia carrega atmosfera; não é decoração entre blocos de copy.
4. **Poucas decisões por dobra.** Uma ideia, uma ação principal e no máximo uma alternativa.
5. **Área do membro visível.** Quem já faz parte não deve procurar onde entrar.
6. **Sem UI inventada.** A landing não exibe mockup falso do portal ou métricas que ainda não existem.
7. **Identidade oficial sempre.** Somente logos SVG transparentes aprovadas; nunca PNG com fundo, recriação tipográfica ou caixa colorida atrás da marca.
8. **Mobile primeiro.** O site deve parecer desenhado para 390 px, não uma versão reduzida do desktop.

Base estratégica: a promessa deve ser clara, consistente e comprovável. Nesta landing, cada seção deve responder a “o que o APT entrega de forma contínua?” — jogos equilibrados, frequência e gestão organizada.

## 4. Arquitetura da landing

A página terá 5 blocos, além do header e footer. Não adicionar FAQ, depoimentos, números, blog, parceiros ou galeria extensa nesta fase.

### Header

- logo oficial clara sobre o hero: `/logo-apt2.svg`;
- desktop: `O APT`, `Como funciona`, `Área do membro`, `Solicitar entrada`;
- mobile: logo + `Área do membro`; o CTA de entrada aparece no hero;
- posição absoluta sobre o hero, sem barra de vidro ou fundo azul;
- não usar menu hambúrguer: há poucas rotas e ele adicionaria interação sem valor.

### 1. Hero — promessa

- primeira dobra com fotografia full-bleed;
- imagem indicada: `/apt-editorial-clay.jpeg`;
- alternativa se o recorte impedir legibilidade em telas estreitas: `/apt-editorial-hero.jpeg`;
- sobreposição navy apenas o suficiente para contraste; nunca filtro que apague a quadra ou o atleta;
- headline, frase de apoio e 2 ações;
- sem selo, estatística, tag flutuante, monograma gigante ou palavra decorativa atrás do conteúdo.

### 2. O APT — explicação curta

- superfície mineral;
- headline + parágrafo em composição assimétrica;
- uma fotografia vertical de apoio: `/apt-editorial-blue.jpeg`;
- explicar o valor do ranking em 2 frases, sem manifesto.

### 3. Como funciona — 3 fundamentos

- superfície navy;
- 3 linhas horizontais, não cards:
  - ranking por classes;
  - entrada por indicação;
  - temporada com frequência;
- cada linha tem título e uma frase;
- números `01–03` são permitidos porque representam uma sequência real de entendimento, não decoração.

### 4. Área do membro — utilidade

- composição 50/50 no desktop; coluna no mobile;
- imagem: `/apt-editorial-ritual.jpeg`;
- texto direto sobre assinatura, pagamentos e acesso ao Twinner;
- CTA: `Entrar na área do membro`;
- não simular dashboard dentro de um telefone.

### 5. Entrada — fechamento

- superfície clay com texto navy ou superfície navy com CTA clay, conforme contraste validado;
- logo completa oficial `/logo-apt1.svg` ou `/logo-apt1-navy.svg`;
- explicar requerimento, análise e convite em 2 frases;
- CTA único: `Fazer requerimento`.

### Footer

- logo navy transparente sobre mineral;
- `APT Tennis Club · Brasília · 2025`;
- links: `Requerimento` e `Área do membro`;
- sem newsletter, redes sociais fictícias ou sitemap expandido.

## 5. Copy final sugerida

### Navegação

- O APT
- Como funciona
- Área do membro
- Solicitar entrada

### Hero

Contexto: `APT Tennis Club · Brasília`

H1:

> Um ranking para quem leva o tênis a sério.

Apoio:

> Jogos equilibrados, frequência e adversários do seu nível. Entrada por indicação.

CTAs:

- primário: `Solicitar entrada`
- secundário: `Já sou membro`

### O APT

H2:

> Bom tênis começa com bons jogos.

Texto:

> O APT organiza um ranking competitivo por classes para quem quer jogar com regularidade, enfrentar adversários do mesmo nível e evoluir durante a temporada.

Legenda da foto:

> Jogo de verdade. No ritmo certo.

### Como funciona

H2:

> Simples para jogar. Organizado para funcionar.

Itens:

1. **Ranking por classes** — Confrontos equilibrados durante toda a temporada.
2. **Entrada por indicação** — O critério mantém no ranking quem realmente quer participar e jogar.
3. **Frequência de jogo** — A temporada funciona melhor quando todo mundo entra para competir de verdade.

### Área do membro

H2:

> Sua participação, em um só lugar.

Texto:

> Acompanhe sua assinatura, consulte pagamentos e acesse o ranking no Twinner.

CTA:

> Entrar na área do membro

### Entrada

H2:

> Quer jogar no APT?

Texto:

> Faça o requerimento. A gestão analisa o perfil e a disponibilidade na sua classe. Se aprovado, você recebe o link para concluir o cadastro.

CTA:

> Fazer requerimento

### Regras de voz

- frases curtas, voz ativa e português natural;
- usar “ranking”, nunca “barragem”;
- não usar: `elite`, `seleto`, `homens de alto nível`, `networking`, `estilo de vida incomparável`, `transforme seu jogo`, `vá além dos limites`, `desperte seu potencial`;
- não dizer que o APT é “para homens” na landing;
- não prometer benefícios sociais ou profissionais que não possam ser comprovados;
- “Beyond the court” permanece apenas como assinatura oficial da marca, não como argumento repetido na copy.

## 6. Wireframe mobile — 360 a 430 px

```text
┌──────────────────────────────┐
│ logo SVG         Área membro │  header transparente
│                              │
│                              │
│     FOTO FULL-BLEED          │
│     TÊNIS EM AÇÃO            │
│                              │
│ APT · BRASÍLIA               │
│ Um ranking para quem         │
│ leva o tênis a sério.        │
│                              │
│ Jogos equilibrados…          │
│ [ Solicitar entrada  ↗ ]     │
│ [ Já sou membro      → ]     │
└──────────────────────────────┘
┌──────────────────────────────┐
│ Bom tênis começa com         │
│ bons jogos.                  │
│ Texto em 2 frases.           │
│                              │
│ [ foto vertical / blue ]     │
│ legenda                      │
└──────────────────────────────┘
┌──────────────────────────────┐
│ Simples para jogar…          │
│ ──────────────────────────── │
│ 01  Ranking por classes      │
│     frase curta              │
│ ──────────────────────────── │
│ 02  Entrada por indicação    │
│     frase curta              │
│ ──────────────────────────── │
│ 03  Frequência de jogo       │
│     frase curta              │
└──────────────────────────────┘
┌──────────────────────────────┐
│ [ foto ritual ]              │
│                              │
│ Sua participação, em         │
│ um só lugar.                 │
│ texto + link                 │
└──────────────────────────────┘
┌──────────────────────────────┐
│ logo oficial completa        │
│ Quer jogar no APT?           │
│ texto curto                  │
│ [ Fazer requerimento ↗ ]     │
└──────────────────────────────┘
│ footer                       │
└──────────────────────────────┘
```

### Regras mobile

- hero entre `min-height: 44rem` e `100svh`;
- conteúdo respeita `env(safe-area-inset-*)`;
- H1 entre 48 e 64 px, máximo de 3 linhas em 390 px;
- margem lateral de 16 px; 20 px a partir de 430 px;
- botões com 48 px de altura mínima e largura total quando necessário;
- nenhum texto abaixo de 14 px; corpo em 16 px;
- a imagem nunca cria rolagem horizontal;
- o logo deve permanecer legível sem fundo próprio.

## 7. Wireframe desktop — 1280 a 1600 px

```text
┌────────────────────────────────────────────────────────────────────┐
│ LOGO        O APT   COMO FUNCIONA   ÁREA MEMBRO   [SOLICITAR]     │
│                                                                    │
│                  FOTO FULL-BLEED DE TÊNIS                          │
│                                                                    │
│ APT · BRASÍLIA                                                     │
│ UM RANKING PARA QUEM                                               │
│ LEVA O TÊNIS A SÉRIO.        apoio curto      [CTA] [membro]       │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ BOM TÊNIS COMEÇA COM BONS JOGOS.              [FOTO VERTICAL]      │
│ texto curto                                                        │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ SIMPLES PARA JOGAR.       01 ranking      | texto                  │
│ ORGANIZADO PARA           02 indicação    | texto                  │
│ FUNCIONAR.                03 frequência    | texto                  │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ [FOTO RITUAL 50%]        SUA PARTICIPAÇÃO, EM UM SÓ LUGAR.         │
│                          texto + link                              │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ [LOGO COMPLETA]           QUER JOGAR NO APT?  texto + [CTA]         │
└────────────────────────────────────────────────────────────────────┘
```

### Regras desktop

- conteúdo principal com largura máxima entre 1280 e 1360 px;
- margens fluidas: `clamp(2rem, 6vw, 6.5rem)`;
- grid de 12 colunas somente para alinhamento macro;
- hero full-bleed; texto preso à grade, não centralizado na tela;
- H1 máximo de 92 px e `letter-spacing` nunca menor que `-0.04em`;
- seções com 96–128 px de respiro vertical, alternando agrupamentos mais compactos;
- imagem e texto nunca ficam com pesos visuais idênticos por acidente: a foto lidera no hero, a copy lidera na explicação.

## 8. Tokens da landing

Reutilizar tokens existentes. Não instalar tema, biblioteca visual ou nova dependência.

```css
/* aliases locais da landing; não alterar o produto inteiro */
--lp-navy: var(--navy);              /* oklch(25% 0.055 255) */
--lp-navy-deep: var(--navy-deep);    /* oklch(18% 0.038 255) */
--lp-mineral: var(--mineral);        /* oklch(97% 0.004 255) */
--lp-surface: var(--surface);        /* oklch(100% 0 0) */
--lp-clay: var(--clay);              /* oklch(57% 0.17 38) */
--lp-clay-dark: var(--clay-dark);    /* oklch(44% 0.145 36) */
--lp-ink: var(--ink);                /* oklch(21% 0.035 255) */
--lp-muted: var(--muted);            /* oklch(43% 0.026 255) */
--lp-line: var(--line);              /* oklch(84% 0.009 255) */
```

### Uso de cor

- navy/deep navy: hero, seção “Como funciona” e estrutura;
- mineral: leitura e respiro;
- clay: CTA principal, foco e uma grande superfície no fechamento, se o contraste passar;
- olive: proibido na landing; fica reservado a estados positivos do produto;
- verde de quadra pode aparecer dentro da fotografia, nunca como cor de interface;
- nenhum gradiente colorido; apenas overlay tonal navy sobre foto para legibilidade.

### Tipografia

- display: `Avenir Next Condensed`, pesos 760–820;
- corpo/UI: `Avenir Next`, pesos 400–760;
- uma família visual, com contraste por largura, peso e escala;
- H1: `clamp(3rem, 8vw, 5.75rem)`, linha `0.92–0.98`, tracking `-0.035em`;
- H2: `clamp(2.25rem, 5vw, 4.5rem)`, linha `0.96–1.02`;
- corpo: 16–18 px, linha `1.5–1.65`, máximo de 65 caracteres;
- labels: 12–14 px, sem repetir caixa-alta rastreada em todas as seções;
- `text-wrap: balance` em títulos e `text-wrap: pretty` em parágrafos.

### Forma e espaçamento

- escala: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px;
- raio de controles: 8 px;
- seções e imagens: sem raio, salvo necessidade real de recorte;
- sem card grid;
- separadores hairline completos;
- botões sólidos ou links sublinhados; sem sombra decorativa.

## 9. Componentes de implementação

Implementar dentro do componente existente `LandingPage`, reutilizando `Brand`.

- `LandingHeader` — pode permanecer JSX local; não criar abstração se usado uma vez.
- `Hero` — imagem, overlay, contexto, H1, apoio e CTAs.
- `PromiseSection` — copy + fotografia.
- `HowItWorks` — 3 linhas sem cards.
- `MemberSection` — fotografia + acesso ao portal.
- `EntrySection` — fechamento e CTA.
- `LandingFooter` — identidade e 2 links.

Ponytail: não criar arquivo por seção, CMS, array de configuração, biblioteca de motion, carrossel ou componente genérico. A landing é estática e cabe em um JSX sem abstrações prematuras. Substituir o bloco atual da landing e remover o CSS antigo não utilizado no mesmo trabalho.

## 10. Estados e interações

### Links e botões

- `hover`: aumento de contraste, mudança de fundo ou sublinhado; duração 150–180 ms;
- `active`: `transform: translateY(1px)` apenas no botão;
- `focus-visible`: outline clay de 3 px com offset de 3 px;
- nunca usar `transition: all`;
- setas decorativas com `aria-hidden="true"`;
- links de navegação continuam sendo `<a>`, não elementos com `onClick`.

### Header

- sem entrada animada obrigatória;
- no desktop, links recebem underline curto ou mudança de opacidade no hover;
- no mobile, não adicionar drawer nesta versão.

### Movimento

- sem parallax, cursor customizado ou animação de scroll;
- opcional: uma única revelação do hero em 300–450 ms, sem ocultar o conteúdo por padrão;
- toda animação deve ter alternativa em `prefers-reduced-motion: reduce`;
- animações somente em `opacity` e `transform`.

## 11. Fotografia e identidade

### Assets autorizados

- hero: `/apt-editorial-clay.jpeg`;
- alternativa de hero: `/apt-editorial-hero.jpeg`;
- seção O APT: `/apt-editorial-blue.jpeg`;
- seção membro: `/apt-editorial-ritual.jpeg`;
- reserva: `/apt-editorial-ocean.jpeg`.

### Regras

- somente homens nas imagens atuais do APT;
- tênis próprios para quadra, raquete, bola, linhas e superfície coerentes;
- não gerar ou substituir imagens nesta etapa: já existem assets reais e adequados;
- preservar proporção e definir `width` e `height` para evitar CLS;
- hero com `fetchPriority="high"`; demais com `loading="lazy"`;
- alt text descreve a ação real, sem repetir “imagem de”;
- não aplicar blur artificial que esconda o equipamento;
- não usar PNGs `apt-logo-light.png` ou `apt-logo-navy.png`;
- logos obrigatórias: `logo-apt1*.svg`, `logo-apt2*.svg` e `logo-apt3*.svg`, sempre transparentes.

## 12. Acessibilidade e responsividade

- manter `skip-link` apontando para `#main-content`;
- apenas um `h1`; hierarquia sem saltos;
- todos os alvos interativos com pelo menos 44 × 44 px;
- contraste WCAG AA: 4.5:1 para texto e 3:1 para texto grande;
- não desabilitar zoom;
- links âncora com `scroll-margin-top`;
- imagens com dimensões explícitas;
- conteúdo não pode depender de hover;
- testar teclado completo e foco visível;
- testar 360 × 800, 390 × 844, 430 × 932, 768 × 1024, 1280 × 800 e 1440 × 900;
- testar Safari iOS e Chrome desktop;
- nenhum overflow horizontal em 320 px;
- respeitar safe areas no hero e header.

## 13. Critérios de aceite

### Mensagem

- [ ] A promessa “Um ranking para quem leva o tênis a sério” aparece inteira acima da dobra em 390 px.
- [ ] O visitante entende ranking por classes, indicação e frequência sem ler mais de 3 seções.
- [ ] “Área do membro” está acessível no header e na seção própria.
- [ ] Nenhuma frase soa como coaching, clube secreto ou networking aspiracional.

### Visual

- [ ] A direção é reconhecível como inspirada no Tenvibe pela fotografia dominante, contraste e hierarquia — não por cópia de componentes.
- [ ] Logo oficial SVG aparece sem retângulo, fundo azul, halo ou recriação tipográfica.
- [ ] Navy, mineral e clay respondem por toda a interface; verde não é cor estrutural.
- [ ] Não há glass cards, gradiente de texto, mockup falso, monograma gigante ou grade de cards iguais.
- [ ] Todas as fotografias mostram tênis masculino real e tecnicamente plausível.
- [ ] O hero mantém legibilidade em todas as larguras definidas.

### UX e engenharia

- [ ] CTAs levam a `/requerimento` e `/entrar` corretamente.
- [ ] Rotas `/requerimento`, `/cadastro`, `/portal` e `/gestao` continuam intactas.
- [ ] Nenhuma dependência nova é adicionada.
- [ ] Imagens abaixo da dobra usam lazy loading e todas têm dimensões.
- [ ] Navegação por teclado, foco visível e reduced motion passam na revisão.
- [ ] Build e testes existentes passam.
- [ ] CSS antigo e não utilizado da landing é removido; não empilhar uma terceira versão sobre as anteriores.

## 14. Anti-padrões — reprovação imediata

- logo oficial dentro de quadrado, círculo, cartão ou fundo azul não pertencente ao SVG;
- hero com texto genérico como “além das quadras”, “eleve seu jogo” ou “onde campeões se encontram”;
- dizer que a comunidade é “para homens de alto nível”;
- usar verde como cor principal por associação automática ao tênis;
- bolas, raquetes e linhas de quadra como ícones decorativos repetidos;
- tênis de corrida, anatomia incorreta, raquete deformada ou cena de IA evidente;
- mais de 2 CTAs competindo na mesma dobra;
- cards excessivamente arredondados, sombras largas ou glassmorphism;
- título maior que 96 px ou tracking abaixo de `-0.04em`;
- texto centralizado em todas as seções;
- número, depoimento, parceiro, preço ou benefício inventado;
- mostrar CPF, pagamento ou cadastro financeiro na jornada pública de requerimento;
- adicionar funcionalidades do portal à landing antes de acertar esta página.

## 15. Ordem de implementação

1. substituir somente o JSX de `LandingPage`;
2. substituir os blocos CSS antigos da landing por um único namespace;
3. validar logo e crop do hero em 390 px;
4. validar desktop em 1440 px;
5. testar links, foco, contraste, reduced motion e CLS;
6. executar build e testes;
7. publicar uma prévia real somente após confirmação de deploy concluído.

A implementação só avança para portal e gestão depois que esta landing for aprovada visualmente.

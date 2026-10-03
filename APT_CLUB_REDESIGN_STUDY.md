# APT — estudo de direção para o clube

Data: 03/10/2026. Escopo escolhido por Gabriel: landing, entrada, cadastro, acesso, calendário e área dos jogadores. A gestão permanece com o dashboard, tema e organização atuais.

## Direção humana e limites

O APT deve comunicar um clube mais exclusivo e sóbrio. As referências da coleção [tennis](https://dribbble.com/gabrielraiid/collections/7959780-tennis) são o ponto de partida para composição e atmosfera, inclusive aplicações de saibro, quadra rápida e grama.

As quatro imagens de marca fornecidas são referências de identidade/cor. Gabriel esclareceu: “a logo em destaque é só um aplicacao pra instagram, ignore usar sempre assim” e “gosto das outras variazoes que ja usamos”. Preservar as variantes oficiais existentes e ajustar escala ao contexto. Não usar a prancha de Instagram como regra de header, hero ou footer.

O estudo conserva a inspeção das seis fontes e as recomendações iniciais. A escolha humana posterior de **16th Hole / Conceptzilla** passa a orientar a landing e a identidade pública/do jogador. A composição implementada foi publicada por autorização explícita no domínio oficial. A escolha da referência e a autorização de release não significam aceite estético da página inteira.

## Direção V3 e evolução publicada

Gabriel escolheu explicitamente a referência 05: “gosto dessa referencia do golf 16th hole” e “pode copiar sem dó”. Fonte: [16th Hole — Website For Private Golf Club, Conceptzilla](https://dribbble.com/shots/27168502-Website-For-Private-Golf-Club). A hero limpa está em `outputs/apt-club-redesign/assets/ref-05.jpg`; as três construções adicionais estão em `ref-05-print-01.jpg` a `ref-05-print-03.jpg` no mesmo diretório.

| Revisão local do clube | Decisão e situação |
|---|---|
| V1 | Rejeitada por Gabriel: “nao gostei da hero e senti que ficou tudo mto quadrado e simples dms, longe das referencias”. Correção aplicável à landing e às jornadas públicas/do jogador: aproximar composição, respiro e fotografia das fontes, sem reduzir sobriedade a caixas rígidas. |
| V2 | Iteração intermediária guiada pelo 16th Hole. A hero desta iteração é substituída pela V3. A direção de clube, os fluxos e o escopo dos jogadores permanecem; a gestão continua intacta. |
| V3 | Referência humana 16th Hole + Hero 10 para o leque e Animated Hero para a troca de palavras. Composição da hero aprovada explicitamente. A copy foi reaberta depois pelo proprietário para maior sobriedade; direção atual está no fechamento abaixo. |
| Acabamento atual | Stack Spread no meio, Glyph Portal no fechamento, FAQ/scroll e copy dos capítulos explicativos. Novos frames fotográficos do manifesto preservam seu texto e disposição aprovados. Publicação autorizada e executada; revisão estética do conjunto permanece com o proprietário. |

Esses nomes distinguem revisões visuais locais deste estudo. Eles não renomeiam nem apagam o histórico da V2 financeira/operacional do sistema, sua evidência de publicação ou o tema Amber Hearth da gestão.

A hero V3 conserva logo oficial pequena e central em desktop/tablet, lettering original do APT em Georgia e uma expressão em itálico sobre faixa oliva clara. A copy original continha “Seu tênis, em boa companhia.” e “Um clube para” com competir./evoluir./pertencer.; o proprietário rejeitou essas frases depois. A versão publicada usa “Um clube de tênis. Por indicação.” e “Para jogar com” critério./constância./respeito. O conteúdo acessível permanece estático. Navegação, requerimento e calendário usam destinos reais. Em mobile, a composição se adapta para preservar alvos e leitura.

O leque reúne três fotografias de tênis: saibro, jogador junto à rede e raquete na quadra verde. Sua composição deriva do Hero 10; a marcação e o CSS são originais do APT. A transição vertical de palavras é adaptada do Hero5 MIT de Tommy, com spring stiffness 50, damping 18 e ciclo de 2 segundos. O damping é ajuste APT; a fonte declara apenas stiffness 50. Cleanup do timer e redução de movimento são preservados.

### Proveniência dos dois componentes e limite de instalação

As duas chamadas `npx` exatas solicitadas foram executadas pelo agente principal; ambas retornaram `AuthRequired`, sem arquivos ou dependências instalados. Essa limitação não foi contornada. A recuperação alternativa consultou fontes públicas dos próprios autores; ela não comprova igualdade byte a byte com o registry autenticado atual.

- **Hero 10 / Felipe Menezes:** [fonte oficial ui-flx, SHA 8bc30df](https://github.com/felipemenezes098/ui-flx/blob/8bc30df9a0cbd0967f6256001fe559f4c1b1cf87/registry/blocks/hero/hero-10/hero-10.tsx). A licença encontrada é AGPL-3.0. APT utiliza composição visual e CSS próprio; código ui-flx, CTA, react-wrap-balancer e dependências do exemplo não foram incorporados. Isso não é uma instalação do componente licenciado. A licença específica da versão no endpoint 21st permanece sem confirmação.
- **Animated Hero / Tommy Jepsen:** [página 21st solicitada](https://21st.dev/community/components/tommyjepsen/animated-hero) e [Hero5 oficial, SHA ff88cb9](https://github.com/tommyjepsen/twblocks/blob/ff88cb951dab0dc01198b6570ec5f5cf21250d45/blocks/hero/hero5.tsx). Fonte MIT, copyright 2024 Tommy Jepsen. A transição foi adaptada no componente existente do APT, com notice integral em `THIRD_PARTY_NOTICES.md`.

A consulta, os arquivos recuperados e as diferenças de implementação estão documentados em `outputs/apt-club-redesign/21st/SOURCE-REVIEW.md`. Não transformar referência, reprodução visual autorizada ou adaptação MIT em promessa de funcionalidade, imagens de membros ou instalações próprias.

## Cobertura da inspeção

| Fonte | Material visual examinado | Alcance da evidência |
|---|---|---|
| Montreval / home | Capa composta e print da página inteira: abertura, manifesto, benefícios, membership, identidade, convite e footer | Composição e sequência completas; não há app funcional ou responsividade demonstrada |
| Montreval / partnership | Capa e página inteira: abertura aérea, contexto, níveis, benefícios, depoimentos, processo, parceiros, convite e footer | Sequência completa; promessas/nomes pertencem à referência |
| DIGI.CO | Vídeo de 11,1s observado em quadros, print vertical completo ampliado e mockup final | Layout completo; observação amostral do movimento, não auditoria quadro a quadro |
| Shakuro | Capa composta e quatro prints da galeria, selecionados individualmente | Todas as miniaturas; colagens têm trechos de telas adjacentes cortados |
| Conceptzilla | Hero, três prints da galeria e mockup de apresentação | Todas as miniaturas; curva de momentos do dia é narrativa, não calendário funcional |
| Courtix | Header em imagem inteira, inclusive ampliação sem menu sobreposto | Referência de primeira dobra; não há página completa, cadastro ou portal |

Capturas e notas de inspeção: `outputs/apt-club-redesign/reference-review/`. Chamadas dos autores e projetos recomendados pelo Dribbble foram distinguidos das telas da coleção. Nenhuma fonte demonstra um portal funcional completo. As propostas para formulários e membros são adaptações ao fluxo real do APT.

## Referência por referência

### 01 · Montreval — home

[Fonte LAIN](https://dribbble.com/shots/27438119-Montreval-Luxury-Clean-Elegant-Golf-Sport-Club-Website-Design).

A abertura combina paisagem ampla, um gesto esportivo pequeno no enquadramento, luz baixa e texto contido. O print completo muda para base clara, manifesto deslocado à direita e espaço amplo à esquerda. Benefícios aparecem em faixas com fotografia, depois membership ocupa uma imagem aérea com painel central. Uma pausa de identidade precede o convite dividido entre texto e pessoas; o footer organiza navegação e uma última fotografia.

A força está na sequência: apresentar um universo, explicar o modo de participar e só então convidar. O clube é comunicado por luz, espaço, pessoas e edição; o logo acompanha a composição.

Aplicar ao APT: fotografia dominante, manifesto factual de clube, capítulos com ritmos diferentes e convite claro. Adaptar o verde e os tons terrosos à identidade recebida. Evitar envelhecimento artificial excessivo, microtexto, ornamentos de heráldica ou a promessa de instalações e privilégios da referência. O tênis e a participação real devem sustentar a narrativa.

### 02 · Montreval — partnership

[Fonte LAIN](https://dribbble.com/shots/27450997-Montreval-Elegant-Luxury-Golf-Club-Partnership-Website-Design).

Uma vista aérea abre a página; na sequência, título curto e texto levam a um painel dividido entre copy e fotografia de objetos. Três níveis variam a altura e a cor mantendo alinhamento. A lista de benefícios usa linhas e espaço em vez de ícones em cada item. A página alterna base clara, fotografia escura, processo numerado e convite com imagem, concluindo com navegação agrupada.

Aplicar ao APT: clareza de hierarquia, informação em linhas, assimetria controlada e uma explicação de entrada visualmente simples. A alternância de navy, verde e material claro pode dar continuidade entre landing e formulários.

A tela é de parceria comercial. Não criar níveis de sócio, concierge, parceiros, depoimentos ou benefícios a partir dela. Para os Courts existentes, aproveitar organização e contraste sem tratá-los como pacotes comerciais. O processo de entrada deve representar requerimento, análise, convite e cadastro reais.

### 03 · DIGI.CO — Golf Club Corporate Website

[Fonte DIGI.CO](https://dribbble.com/shots/25637564-Golf-Club-Corporate-Website).

A página reúne título em sans condensada muito grande, recorte de jogador, navegação horizontal e três painéis fotográficos de igual largura. Depois passa por apresentação central com objeto isolado, mosaico de ambiente/pessoas e fotografia imersiva; o encerramento escuro transforma um equipamento em composição para cadastro de e-mail. O vídeo mostra o movimento e a transição entre partes; o print vertical confirma a construção, e o último anexo a apresenta em mockup.

É a referência mais gráfica e expressiva da seleção. Aproveitar fotografia em escala grande, contraste entre capítulos e coordenação de recortes humanos e ambiente.

Para o APT, reduzir o tamanho do display, a quantidade de comandos no menu e o protagonismo de objetos decorativos. A tipografia em caixa alta, o objeto flutuante e o efeito contínuo seriam escolhas a avaliar, não fundamentos da sobriedade. Restaurante, campo próprio, reservas e newsletter pertencem à referência; não entram na oferta do APT.

### 04 · Shakuro — Golf Club Landing Page Design

[Fonte Shakuro](https://dribbble.com/shots/27212780-Golf-Club-Landing-Page-Design).

Print 1: fotografia humana, headline serifada estreita e navegação discreta. Print 2: manifesto central em superfície clara, rodeado por pequenas fotografias irregulares. Print 3: paisagem aérea contínua com faixa compacta de informação; aparece também o começo de uma aplicação, sem formulário completo legível. Print 4: sequência vertical de recortes, texto deslocado e CTA pequeno. A capa complementa o conjunto com parceiros em monocromia e encerramento escuro.

Aplicar ao APT: uma ideia por trecho, alternância entre fotografia e respiro e texto suficiente para orientar. É especialmente útil para tirar a landing do ritmo repetido de título, cards e botão.

Evitar copiar a dispersão de fotos, CTA quase invisível, microtexto, nomes de parceiros ou história centenária. O refinamento precisa sobreviver ao celular, com ordem de leitura clara e alvos confortáveis. O footer grande da referência não substitui as variantes de logo aprovadas pelo usuário.

### 05 · Conceptzilla — Website For Private Golf Club

[Fonte Conceptzilla](https://dribbble.com/shots/27168502-Website-For-Private-Golf-Club).

A capa usa creme, título central serifado, logo pequena e pessoas em fotografias com alturas diferentes. O mockup explora copy à esquerda e imagem dominante à direita. Print 1: uma curva organiza momentos do dia com fotografias circulares. Print 2: entrada, CTA e fotos inclinadas reforçam convivência. Print 3: uma faixa com três rituais desemboca em encerramento claro com equipamento diagonal, navegação e contato contidos.

Aplicar ao APT: exclusividade acolhedora, pessoas como protagonistas e composições que mudam sem perder identidade. Essa referência lembra que curadoria não precisa comunicar distância.

Evitar linguagem de sociedade secreta, centralização em todas as seções, itálico obrigatório e colagem em cada tela. A curva é narrativa, não demonstra agenda operacional. Campos, cobranças e datas do membro precisam de alinhamento e leitura direta; os tratamentos decorativos da landing não devem disputar a tarefa.

### 06 · Courtix — Tennis Website Header

[Fonte Muha Omar Faruk](https://dribbble.com/shots/27007878-Courtix-Tennis-Website-Header).

Uma quadra de saibro aérea ocupa o eixo central, envolvida por vegetação escura. Branco quente, oliva e terracota vêm da fotografia. Navegação e CTA contornado ficam no topo; texto curto e miniatura de vídeo ocupam as laterais; a palavra em sans cobre a base.

Aplicar ao APT: relação entre cor, material, sombra e geometria real da quadra. É a referência mais direta para estudar saibro e vegetação, mantendo a assinatura navy do APT em outras superfícies.

Evitar converter a palavra gigante em regra para o logo, trocar a identidade oficial por lettering ou transferir a oferta de academia/treinamento. A miniatura de vídeo exige conteúdo e função reais. O print prova apenas uma primeira dobra; construção de calendário, cadastro e portal precisa partir das jornadas existentes.

## Diagnóstico da base anterior à repaginação

A landing pública anterior à repaginação foi aberta no início desta sessão. A hero visível apresenta “Um ranking para quem quer” e alterna competir, evoluir e pertencer; o título estático para tecnologias assistivas é “Um ranking para quem leva o tênis a sério”. A copy de apoio enfatiza jogos, calendário e nível. O produto possui esses atributos, mas o ranking organiza a percepção inicial. A mudança solicitada pede que clube e participação organizem essa informação.

O tema Amber Hearth foi aplicado globalmente: branco, amber, teal, Outfit, pills, cantos arredondados, cartões e vidro. A combinação é coerente com a gestão escolhida ontem. Na landing e no portal, sua repetição aproxima a linguagem de um produto digital. A solução envolve hierarquia e ritmo, além de cor.

A fotografia atual de saque na quadra azul, a galeria e os SVGs oficiais são materiais reutilizáveis. Os três tipos de superfície entram como linguagem de cor/fotografia; a existência de quatro Courts competitivos não comprova quadras físicas próprias do APT.

## Sistema de cor a estudar

| Papel | Base disponível | Aplicação recomendada |
|---|---|---|
| Tinta e assinatura | Navy exato dos SVGs: `#1F2E50` | Texto principal, navegação, botões sólidos e um capítulo de encerramento |
| Superfície clara | Tons claros exatos dos SVGs existentes: `#F8F2EF` / `#F8F7F2` | Fundo predominante proposto em formulários e portal; respiro entre fotografias |
| Grama / oliva fechado | Amostra aproximada: `#3B4831` | Um capítulo amplo, pequenas marcações e fotografia; evitar aplicar a todos os controles |
| Saibro / terracota | Amostra aproximada: `#B96F49` | Material, detalhes e fotografia; papel de ação exige variação com contraste validado |
| Quadra rápida | Navy da marca e azul das fotografias | Atmosfera esportiva; não transformar o app em interface de azul elétrico |

Os RGB extraídos das capturas não são especificação oficial. A pequena prancha Pantone não permite ler seu código com segurança. Preservar os SVGs; não recolorir a marca para coincidir com pixels de screenshot.

O navy com branco quente oferece aproximadamente 12:1. O terracota amostrado com branco quente fica próximo de 3,5:1: bom ponto de estudo para grandes superfícies, insuficiente para decidir texto comum ou botão sem ajuste. Cor de quadra e cor de status devem ter funções distintas; manter rótulos textuais de pago, pendente, vencido e erro.

## Tradução para cada jornada

| Tela | Composição proposta | Conteúdo e estados preservados |
|---|---|---|
| Landing | Navegação leve; imagem ampla; clube apresentado antes do ranking; capítulos editoriais; temporada em agenda clara; convite e footer contidos | Masculino, Brasília, indicação, classes, Courts e calendário verdadeiros; destinos existentes |
| Requerimento | Conversa privada, uma pergunta por vez, base clara e controles navy; fotografia lateral só onde ajuda | 18 perguntas no total, sendo uma condicional; 17 quando não frequenta clube. Anterior/próximo, consentimento, validação, envio, erro e sucesso; sem CPF ou pagamento |
| Cadastro/recadastro | Acolhimento curto, etapa visível e campo com espaço; clara separação entre dados e ativação financeira | Convite/grupo/direto, acesso inválido/expirado, valor não configurado, Pix, hosted checkout e callbacks |
| Entrar/recuperar/redefinir | Moldura comum do clube, variantes oficiais de logo em escala contextual; tarefa direta no mobile | Login, link inválido, feedback neutro de recuperação, foco e estados de envio; acesso administrativo conserva intenção própria |
| Área do membro | Identidade e participação primeiro; ação contextual; navegação e histórico legíveis; menor aparência de CRM | Início, pagamentos e cadastro; situação real, renovação, Pix, cancelamento, perfil e links autorizados |
| Calendário | Agenda da temporada com contraste, divisões e datas fortes; imagem em papel secundário | Datas 2026–2027 e seleção real de quarter; sem reservas, disponibilidade ou sincronização inventadas |
| Gestão | Composição atual | Dashboard, gráficos, tabela, Kanban, tema, comportamento e dados permanecem fora do redesign |

No código, o menor caminho é escopar tokens e apresentação nos contêineres públicos/do membro existentes. `:root`, sidebar, botões e tabela financeira são compartilhados com a gestão: alterações globais causariam regressão. Reusar componentes/API; não adicionar UI kit, backend, calendário de reservas ou novos serviços.

## Composição inicial recomendada — histórico substituído no escopo público

1. Abertura com fotografia de tênis ampla e uma proposição de clube legível; evitar depender de efeito para explicar o APT.
2. Manifesto curto com atmosfera humana, explicando regularidade, competição e participação.
3. Funcionamento do ranking organizado em linhas e níveis, sem sequência de cartões coloridos equivalentes.
4. Temporada e calendário com datas e próximo passo claros, em linguagem de clube.
5. Entrada por indicação: requerimento → análise → convite → cadastro, usando somente passos reais.
6. Convite final e footer com variantes oficiais, contraste e destinos existentes.

Esta recomendação inicial do executor combinava Montreval para sequência, Shakuro para ritmo, Conceptzilla para acolhimento e Courtix para material/fotografia. **A seleção humana posterior do 16th Hole substitui essa combinação como direção principal da landing e identidade pública/do jogador.** Não é uma colagem das quatro identidades. Novas escolhas de fonte serão avaliadas por catálogo e aplicações reais; os campos/dados conservam leitura direta. O tratamento dos efeitos atuais será decidido na prévia completa, preservando as correções já registradas de loop, redução de movimento e recorte do vidro enquanto esses elementos existirem.

## Skills e base consultadas

Impeccable (brand/product), frontend-design, Brand Review, Bencium Controlled/Innovative, UI/UX Pro Max, Landing Page, SaaS Landing Pages, Accessibility Audit e 21st Explore/Build/Review forneceram critérios complementares. Receitas automáticas de vermelho esportivo, layout de fórum, Barlow e coreografia ScrollTrigger foram rejeitadas por incompatibilidade com o pedido e as fontes. Não adicionar dependências para cumprir templates das skills.

Marketing Brain: `vision-board-essencia-codigos-aplicacoes`, `sistema-cromatico-em-quatro-etapas`, `guia-fotografico-em-sete-decisoes` e `coerencia-com-adequacao-por-canal`, mais estado/correções específicos do APT. As notas são métodos compilados; as referências Dribbble foram abertas diretamente. Correções de footer, loop contínuo e contenção do vidro foram recuperadas. Copy Anatomy e Copywriting também foram invocadas e aplicadas: análise/template em `outputs/apt-club-redesign/APT_COPY_ANATOMY.md`, sustentados por `direcional-verbal-em-quatro-dimensoes` e a lente candidata `auditoria-de-naturalidade-preserva-estrutura-e-voz-candidata`. Esta última não foi promovida a regra humana.

## Evidência e validação atual

O estudo das seis fontes e a implementação das jornadas públicas/do jogador estão na prévia local. A gestão conserva a V2 operacional e o tema escolhido. Supabase, Auth, Asaas, calendário verdadeiro e fluxos existentes permanecem os limites do produto.

Build webpack final com TypeScript e 27 rotas, 28 checks de produto, um check de calendário e diff check passaram. ESLint focal: zero erros; 19 avisos de imagens nativas/navegação já identificados, sem aviso de alt ausente. O novo componente passa lint estrito. Revisão independente de correção/segurança e ponytail-review não encontrou P0/P1/P2; comparação com HEAD confirma funções/tokens/CSS da gestão preservados e manifests sem mudanças.

Inspeção real em 1280/768/390: enquadramentos do manifesto, mockup integral, pilha fechada/aberta, galeria móvel com seis fotos carregadas e ausência de overflow horizontal. Glyph medido/ativo percorre p=0 até p=1 e revela o convite; Enter no link nativo foca o conteúdo e deixa CTA visível/legível no celular. FAQ alterna pelo clique e Enter com foco de 3px e múltiplas respostas abertas. Requerimento/erros, convite válido/inválido, login/recuperação, portal ativo/Pix/cancelamento/pagamentos e calendário também foram exercitados com dados fictícios nesta revisão.

Redução de movimento e falha de Canvas possuem alternativas verificadas por SSR, CSS e smoke dos efeitos com matchMedia/DOM simulados; não foi alterada a preferência global do Mac. Não se declara sessão real de Safari/JS desativado ou nova integração de produção. Nenhuma publicação, migração, cobrança ou contato externo ocorreu neste redesign. O audit estrutural da V2 é reaproveitado: estrutura Next/API/database e dependências permanecem; o widget se aloja no diretório UI existente.

### Efeitos enviados depois da hero

O vídeo QClay27731698 foi inspecionado em quadros amostrais; leitura em `outputs/apt-club-redesign/wealth-motion-analysis.md`. A adaptação usa a geometria fina das linhas de quadra e a passagem de escala/cor, sem inferir que o vídeo original seja controlado pelo scroll.

Os comandos exatos Glyph Portal/Stack Spread retornaram autenticação obrigatória, sem instalação. O CLI conectado identificou o autor legítimo, mas a cota gratuita de recuperação estava esgotada; nenhum bloqueio foi contornado. Depois, Gabriel forneceu os dois códigos completos. Glyph MIT foi adaptado em `components/ui/glyph-portal.tsx`, com notice preservado, poster em falha, português e foco antes de inert. Fonte Georgia local, fundo navy e SVG de quadra; sem fonte remota, shader, WebGL ou dependência nova. O menor percurso configurado ocupa aproximadamente duas alturas de viewport e pode ser avançado pelo link nativo.

Stack Spread usa markup/CSS originais e view timeline nativa: seis fotografias locais abrem a pilha entre Courts e temporada. Sem suporte, abaixo de 768px ou com movimento reduzido, a mesma galeria permanece estática e legível. A fonte Hyperiux recebida não declara licença; não se atribui MIT nem incorpora seu JavaScript.

Correção final aplicada literalmente: “eu gostei da disposicao do texto e tudo, oq mais me incomodou foram as fotos do jeito que ta.” Texto, ordem e disposição central do manifesto preservados; recortes circulares substituídos por frames verticais levemente inclinados. A hero aprovada e o mockup completo permanecem.

## Fechamento técnico publicado —03/10/2026

Courts alterna o destaque a cada seis segundos quando a seção e a aba estão visíveis, com seleção manual preservada. Court2 usa saibro escuro. Stack mantém exatamente “Beyond the Court.” e seu parágrafo, por correção humana: pilha central sobre o texto, abertura para cantos, foto sem borda branca, etapa móvel/tablet curta e mouse após abertura. Sem suporte à timeline ou com redução de movimento, exibe fotografia/texto estáticos.

Copy reformulada com Copy Anatomy/Copywriting/Copy Editing e consulta seletiva às notas de promessa verificável, tom de voz e contexto do público: indicação/análise/convite, ranking masculino, quatro divisões, rodadas quinzenais e quatro ciclos; sem elegibilidade de renda/infraestrutura/networking inventados. A referência de público orienta voz e critérios, não adiciona oferta. Metadata acompanha a versão. Calendário confirma ciclos, não trimestre civil.

31checks focais e build remotoNext/TypeScript27rotas passaram; revisão independente focal/Ponytail incluiu correção de nitidez no fallback responsivo. Browser da produção em390/768/1280 confirmou abertura, manual/autoCourt e mouse, sem overflow nas telas verificadas. Mockup3painéis integral, fotoBW e artePS preservados. Runtime final5c95d19252f51936f16b4c547bb41422566e5743, deployREADYdpl_3LSiiXESwQvJfw9BLLoV5kwaBNmQ, aliaswww.apttennis.com.br. Recibo de arquivos/SHAs e inspect em `outputs/apt-club-redesign/release`.

LighthouseCLI13.5.0 executado depois do primeiro release refinado: mobile98/100/100/100 e desktop100/100/100/100. Oportunidade concreta de313KiB estimados em imagens levou ao `next/image` já instalado, com sizes conforme CSS, prioridade alta única na hero e lazyabaixo; sem alterar arquivos originais ou artePS/BW. Relatórios de comparação posterior ficam em `outputs/apt-club-redesign/lighthouse`. Pontuação de laboratório e checks técnicos não representam aprovação estética humana ou dados de campo.

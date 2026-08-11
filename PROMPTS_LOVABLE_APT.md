# APT Tennis Club — prompts sequenciais para Lovable

> Cole os prompts abaixo na ordem. Antes do primeiro, envie ao Lovable as logos oficiais em SVG e as fotos de referência do APT. Não peça para ele gerar uma nova logo.

## Prompt 1 — Fundação, identidade e landing page

```text
Vamos construir o APT Tennis Club Hub, um produto web mobile-first para uma comunidade masculina de tênis em Brasília. O Twinner será usado apenas para ranking e partidas; este produto será a operação externa de curadoria de entrada, cadastro, cobrança recorrente, gestão de membros e saída.

Primeiro, crie apenas a fundação visual e a landing pública `/`. Não construa ainda checkout, dados financeiros, formulários completos ou painel administrativo.

REFERÊNCIAS VISUAIS — use como nível de qualidade, composição e UX; não copie layouts literalmente:
- Referência principal: Courts & Co. https://www.behance.net/gallery/246286435/Courts-Co-Sports-Club-Brand-Identity-Design
- Referência principal complementar: The Courtline https://www.behance.net/gallery/251908123/THE-COURTLINE-Identity-of-a-Tennis-Club-Academy
- Terra Sorella Tennis Club: https://www.behance.net/gallery/250911011/Terra-Sorella-Tennis-Club-Brand-Identity-Design
- Courto Tennis Club: https://www.behance.net/gallery/249341271/Courto-Tennis-Club-Padel-WordPress-Theme
- TennisLab Landing Page: https://www.behance.net/gallery/249554923/TENNISLAB-Landing-page-for-tennis-club-Case-study
- Tennis Club App UI/UX: https://www.behance.net/gallery/250651535/Tennis-Club-App-UXUI
- Shevchenko Tennis Club: https://www.behance.net/gallery/253680435/SHEVCHENKO-TENNIS-CLUB-UIUX-Design
- Tennis Club Website: https://www.behance.net/gallery/231972499/Tennis-Club-Website-UXUI-Design
- Tennis Sports Mobile App: https://dribbble.com/shots/26952390-Tennis-Sports-Mobile-App-Match-Track-Compete
- Tennis Social Network: https://dribbble.com/shots/25694824-Sports-Platform-Tennis-Social-Network
- Tennis Training / Live Matches / Social: https://dribbble.com/shots/27262429-Sports-App-UI-Tennis-Training-Live-Matches-Social-Feed
- Referência de atmosfera: https://br.pinterest.com/pin/492649955166171/
- Referência de navbar: https://21st.dev/community/components/featured?preview=%2F%40preetsuthar17%2Fcomponents%2Fnavbar-1
- Referência de liquid glass: https://21st.dev/community/components?q=glass&preview=%2F%40suraj-xd%2Fcomponents%2Fliquid-glass

DIREÇÃO CRIATIVA
- A estética deve ser o ponto médio entre Courts & Co. e Courtline: exclusiva, sóbria, sexy, contemporânea e editorial.
- Não criar app esportivo genérico, fintech, dashboard SaaS comum, identidade infantil, country club clichê ou visual verde “Wimbledon”.
- Use as logos oficiais enviadas. Não recriar tipograficamente a marca.
- Somente homens nas fotos, refletindo a composição atual do APT.
- Fotos precisam parecer tênis real: raquetes, empunhaduras, tênis de quadra, superfícies, rede e gestos tecnicamente coerentes. Nunca usar tênis de corrida, acessórios inventados ou pose de moda desconectada do jogo.
- Preferir saque, split step, pés, mãos, sombra, rede, pausa entre pontos, saibro e hard court; fotografia documental/cinematográfica, grão, contraste e movimento.

DESIGN SYSTEM
- Fundo mineral: `oklch(98% 0.004 255)`.
- Navy profundo: `oklch(29% 0.055 255)` para tipografia, painéis e presença institucional.
- Clay: `oklch(59% 0.145 42)` para CTA, progresso e atenção.
- Olive: `oklch(38% 0.055 119)` somente para confirmação/sucesso.
- Fundo mineral secundário: `oklch(94% 0.006 255)`.
- Mineral e navy estruturam; clay ativa; olive confirma. Verde nunca é dominante.
- Interface em Avenir Next ou fallback premium equivalente; headlines em grotesca pesada e condensada; serif apenas em pequenas notas editoriais.
- Escala de espaçamento: 4, 8, 12, 16, 24, 32, 48, 64px. Bordas hairline. Raio de 8px em controles. Alvos de toque de pelo menos 44px.
- Usar liquid glass apenas de modo discreto em navbar e camadas flutuantes pontuais, nunca como card genérico repetido.
- Mobile primeiro. Desktop pode ter grids editoriais assimétricos. Movimento entre 150 e 300ms; respeitar `prefers-reduced-motion`.

CRIAR A LANDING `/`
Navbar: logo oficial clara sobre hero; links “A experiência” e “Como entrar”; CTA “Solicitar entrada”. A navbar pode usar vidro sutil apenas sobre imagem.

Hero com foto grande de jogador masculino em quadra, logo oficial, e:
- Eyebrow: “Brasília · por indicação”
- Headline: “O jogo começa na quadra. O clube continua depois.”
- Apoio: “Uma comunidade masculina de tênis feita de competição, constância e relações que atravessam o placar.”
- CTA principal: “Fazer meu requerimento” → `/requerimento`
- CTA secundário: “Descobrir o APT” → seção de experiência
- Rodapé visual: “APT Tennis Club / Beyond the court / 25—45 anos”

Seções da landing:
1. Manifesto com a logo oficial: “O APT não nasceu para ser mais um ranking.” / “Nasceu para reunir homens que levam o jogo a sério sem fazer da vida apenas o jogo.”
2. Experiência: explicar ranking por classes no Twinner, curadoria, sorteios, confrontos equilibrados, encontros e conexões que seguem depois da partida.
3. Entrada cuidadosa em três etapas: Requerimento → Análise → Ativação. Deixar explícito que o primeiro formulário não pede CPF nem cartão; quem for aprovado recebe outro link privado para cadastro e assinatura.
4. Critérios: entrada por indicação, homens entre 25 e 45 anos, prática recorrente de tênis e interesse real em comunidade.
5. CTA final: “Se o APT faz sentido para você, conte por quê.” / “Solicitar entrada”.

Não criar links públicos para cadastro, portal ou gestão. Entregar landing responsiva, acessível e com acabamento profissional antes de seguir para a próxima etapa.
```

## Prompt 2 — Supabase, autenticação e requerimento Typeform

```text
Continue exatamente o projeto APT Tennis Club Hub já criado. Preserve integralmente a identidade, as cores, as logos e a direção visual da etapa anterior. Agora implemente Supabase, autenticação e o fluxo real de requerimento. Não implementar ainda Asaas, portal do membro ou gestão completa.

REFERÊNCIAS TÉCNICAS
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Resend: https://resend.com/docs

SUPABASE
Conecte o projeto ao Supabase. Criar tabelas e políticas RLS adequadas:

`applications`
- id UUID
- name, email, whatsapp, age, city, profession, class_level, referrer
- answers JSONB
- consent_at
- status: new, in_review, awaiting_info, approved, invite_sent, rejected, registered
- email_status
- created_at, updated_at

`admin_notes`
- id, application_id, member_id opcional, body, created_by, created_at

`audit_logs`
- id, actor, action, entity_type, entity_id, metadata JSONB, created_at

Desde já, criar as tabelas futuras `members`, `invites`, `subscriptions`, `payments`, `webhook_events`, mas não construir a UI delas ainda.

RLS
- Não permitir acesso público direto às tabelas.
- Apenas Edge Functions/servidor com service role podem criar requerimentos e tratar integrações.
- Apenas administradores em allowlist poderão ler aplicações e dados operacionais.
- Nunca expor service role no cliente.

AUTENTICAÇÃO
- Criar `/entrar` com e-mail e senha usando Supabase Auth.
- Administração será protegida por allowlist de e-mails administrativos em configuração segura.
- Membros serão autenticados depois, no cadastro aprovado.

CRIAR `/requerimento`
Construir formulário realmente parecido com Typeform:
- uma pergunta por tela;
- navegação voltar/continuar;
- barra de progresso sofisticada;
- transição suave entre perguntas;
- controles grandes, confortáveis no mobile;
- Enter avança em campos adequados;
- não concentrar tudo numa página longa;
- em desktop, composição editorial com foto masculina de tênis; no mobile, foco total na pergunta.

Perguntas exatas:
1. “Como você gosta de ser chamado?” — nome completo.
2. “Qual é o seu melhor e-mail?”
3. “E o seu WhatsApp?”
4. “Qual é a sua idade?” — permitir apenas entre 25 e 45 anos.
5. “Onde você mora?” — cidade e bairro.
6. “O que você faz da vida?” — profissão ou área.
7. “Onde você costuma jogar tênis hoje?” — opcional.
8. “Você é sócio de algum clube ou espaço esportivo?” — Sim / Não.
9. Se respondeu Sim: “Qual clube você frequenta?”
10. “Com qual classe você mais se identifica hoje?”
   - 5ª classe — construindo base técnica
   - 4ª classe — regularidade e leitura de jogo
   - 3ª classe — controle, ritmo e competitividade
   - 2ª classe — ritmo alto e consistência
   - 1ª classe — técnica refinada e estratégia
11. “Há quanto tempo você joga tênis?”
12. “Como você descreveria seu momento no jogo?”
13. “O que mais chamou sua atenção no APT?” — múltipla escolha, no máximo 3 respostas.
14. “Como o tênis entra na sua vida?”
15. “O que não pode faltar em uma comunidade para você permanecer nela?”
16. “Quem indicou você para o APT?”
17. “Por que faz sentido estar no APT agora?”
18. Consentimento obrigatório: “Sim, autorizo o uso para análise e contato.”

Ao finalizar:
- validar idade, campos obrigatórios e limite de três opções;
- persistir a candidatura e `consent_at`;
- registrar auditoria;
- enviar e-mail via Resend para a gestão com as respostas, se as variáveis estiverem configuradas;
- mostrar página de sucesso: “Requerimento enviado. Agora, a análise é nossa.” e explicar que o aprovado receberá outro link exclusivo para cadastro e assinatura.

Não pedir CPF, cartão ou senha nesse fluxo.
```

## Prompt 3 — Gestão, aprovação, convites e Resend

```text
Continue o APT Tennis Club Hub sem alterar a estética existente. Agora implemente a área de gestão `/gestao`, totalmente protegida para administradores. Use Supabase real; nenhuma ação pode ser apenas visual ou simulada.

PÁGINA `/gestao`
Criar layout mobile-first e, no desktop, sidebar navy persistente com logo oficial. No mobile, usar navegação inferior ou abas claras.

Abas:
1. Visão geral
2. Membros e cobranças
3. Formulários

VISÃO GERAL
- cards/painéis editoriais, sem aparência SaaS genérica;
- métricas reais: membros ativos, inativos/cancelados, requerimentos em análise, MRR ativo;
- status real da integração Asaas;
- fila de requerimentos recentes.

FILA DE REQUERIMENTOS
Mostrar nome, cidade, classe, indicação, data e status.

Ações reais:
- “Não aprovar”
- “Pedir informação”
- “Aprovar e gerar convite”

Quando o administrador aprovar:
1. Criar token aleatório, longo e de uso único.
2. Salvar somente o hash na tabela `invites`.
3. Associar ao requerimento.
4. Expirar em 7 dias.
5. Criar link privado: `/cadastro?convite=TOKEN`.
6. Enviar e-mail via Resend ao candidato: “Seu cadastro APT foi aprovado”, com o link privado e prazo de 7 dias.
7. Se o Resend não estiver configurado ou falhar, mostrar claramente “Aprovado. Copie o link individual de cadastro.” e permitir copiar o link. Nunca afirmar que e-mail foi enviado se não foi.
8. Atualizar status para `invite_sent` apenas se o e-mail foi realmente enviado; caso contrário, manter `approved`.
9. Criar registro de auditoria.

Criar possibilidade de gerar novo convite para um aprovado, invalidando ou expirando o anterior de forma segura.

MEMBROS E COBRANÇAS
Mesmo que ainda não existam membros, criar tabela real com busca por nome e campos: integrante, e-mail, classe, participação, assinatura, próximo vencimento e atraso.
Não exibir CPF completo em nenhuma tela administrativa.

FORMULÁRIOS
Criar a base de um editor real para o futuro:
- tabelas `forms`, `form_versions`, `form_questions`, `form_submissions`;
- rascunho editável;
- publicação gera versão imutável;
- o requerimento atual deve aparecer como formulário publicado;
- exibir as perguntas existentes.

Se não for possível terminar o builder nesta etapa, exibir apenas a lista real de perguntas ativas e uma mensagem honesta de que a edição centralizada depende da publicação de uma nova versão. Não criar botões de salvar ou publicar falsos.
```

## Prompt 4 — Cadastro aprovado, Asaas e webhooks

```text
Continue o APT Tennis Club Hub. Preserve todo o design. Agora implemente o fluxo privado de cadastro aprovado e a integração real com Asaas. Não criar formulário próprio de cartão.

REFERÊNCIAS TÉCNICAS
- Asaas: https://docs.asaas.com/docs/introduction-1
- Cancelamento de assinatura Asaas: https://docs.asaas.com/reference/remove-subscription

CONFIGURAÇÃO SEGURA
Usar Edge Functions/servidor e variáveis de ambiente, nunca o front-end:
- ASAAS_API_KEY
- ASAAS_API_BASE_URL
- ASAAS_CHECKOUT_BASE_URL
- ASAAS_MONTHLY_VALUE
- ASAAS_WEBHOOK_TOKEN
- APT_PUBLIC_URL
- CPF_HASH_SECRET

TABELAS
`members`
- id, application_id único, auth_user_id, name, email único, whatsapp
- cpf_hash, cpf_last4, class_level
- participation_status: awaiting_payment, active, pending_payment, delinquent, cancellation_requested, cancelled, courtesy, inactive
- twinner_url, whatsapp_community_url, joined_at, created_at, updated_at

`subscriptions`
- id, member_id único
- asaas_customer_id, asaas_subscription_id, asaas_checkout_id
- status: pending_configuration, awaiting_payment, active, past_due, cancel_at_period_end, cancelled, courtesy
- amount_cents, billing_cycle, next_due_date, overdue_since, current_period_end, cancel_at_period_end

`payments`
- id, member_id, subscription_id
- asaas_payment_id único, status, value_cents, due_date, paid_at, invoice_url, payload JSONB

`webhook_events`
- id do evento Asaas como chave única, event_type, payload, processed_at

CADASTRO PRIVADO `/cadastro?convite=TOKEN`
- Só abrir com convite válido, não usado e dentro de 7 dias.
- Campos: nome completo, CPF, e-mail, WhatsApp, senha e consentimento obrigatório para administração, comunicação e cobrança recorrente.
- Validar CPF corretamente.
- Nunca guardar CPF puro: guardar hash com segredo e apenas os últimos quatro dígitos para exibição mascarada.
- Impedir CPF ou e-mail duplicados.
- Criar usuário com Supabase Auth.
- Criar membro com status `awaiting_payment`.
- Se uma tentativa anterior falhar no checkout após criar o membro, permitir retomar com segurança sem duplicar membro ou autenticação.

ASAAS CHECKOUT
- Criar checkout hospedado recorrente de cartão de crédito.
- Usar valor configurável por variável de ambiente.
- Não usar URL de produção hardcoded quando estiver em Sandbox.
- Usar `externalReference` com o ID do membro.
- Configurar callbacks de sucesso, cancelamento e expiração para o domínio público.
- Após criar checkout, redirecionar o candidato para o ambiente seguro do Asaas.
- O redirecionamento sozinho não pode ativar membro.

WEBHOOK `/api/webhooks/asaas`
- Validar o header/token do webhook.
- Processar e deduplicar pelo ID do evento.
- Importante: só registrar um evento como processado depois de reconciliar pagamento, assinatura e membro; uma falha precisa poder ser reenviada pelo Asaas.
- Persistir `asaas_subscription_id` assim que chegar no evento.
- Tratar PAYMENT_RECEIVED e PAYMENT_CONFIRMED: membro `active`, assinatura `active`, pagamento registrado.
- Tratar PAYMENT_OVERDUE: membro `pending_payment`, assinatura `past_due`.
- Tratar PAYMENT_REFUNDED e PAYMENT_DELETED: ajustar acesso/participação para pendente conforme regra.
- Registrar todos os pagamentos e links de fatura.

Somente depois da confirmação por webhook o membro entra como ativo.
```

## Prompt 5 — Portal do membro, cancelamento, qualidade e entrega

```text
Continue o APT Tennis Club Hub. Preserve a direção visual premium e implemente o portal do membro `/portal`, finalizando segurança, estados e responsividade. Nada pode ser falso ou apenas demonstrativo.

AUTENTICAÇÃO E ACESSO
- `/portal` exige Supabase Auth.
- Cada membro só pode ler seus próprios dados, pagamentos e assinatura.
- Admin continua com acesso operacional em `/gestao`.
- Nunca expor service role, token de webhook, chave Asaas ou CPF completo.

PORTAL `/portal`
Criar visual limpo, premium e funcional. No desktop, trilho lateral navy; no mobile, navegação inferior elegante.

Abas:
1. Início
2. Pagamentos
3. Meu cadastro

INÍCIO
- saudação personalizada;
- próxima mensalidade;
- situação da participação;
- últimos movimentos financeiros;
- botão “Abrir ranking no Twinner”, abrindo em nova aba; o link deve vir da gestão;
- exibir link de comunidade WhatsApp somente se o membro estiver ativo.

PAGAMENTOS
- status da assinatura;
- histórico real de cobranças;
- valor, vencimento, situação e link de fatura quando existir;
- texto claro: “Cartão protegido pelo Asaas. Os dados completos nunca ficam no APT.”
- Para troca de cartão, usar portal/link seguro do Asaas apenas se estiver disponível. Se não houver integração pronta, explicar honestamente que a troca será feita no ambiente seguro do Asaas; não criar botão falso.

MEU CADASTRO
- nome, e-mail, WhatsApp, classe e CPF mascarado (`***.***.***-1234`);
- seção “Encerrar participação”;
- exigir confirmação antes de cancelar;
- ao confirmar, chamar Asaas para cancelar a assinatura recorrente e só atualizar banco local após confirmação do Asaas;
- se ainda não existir uma assinatura ativa no Asaas, explicar que ainda não há renovação recorrente a cancelar;
- após sucesso: “Renovação cancelada. Nenhuma nova cobrança será criada.”;
- acesso permanece até o fim do período já pago, quando aplicável.

ESTADOS E QUALIDADE
- Criar estados reais de loading, vazio, erro, sucesso e indisponibilidade em todas as páginas.
- Botões devem ter labels claros, feedback após ação e prevenção contra duplo clique.
- Foco visível, contraste adequado, labels semânticos, navegação por teclado e targets de 44px.
- Não utilizar qualquer dado financeiro fictício no produto final.
- Em preview, se usar dados de demonstração, marcá-los claramente como demonstração.
- Revisar toda a experiência em mobile antes de concluir.
- Atualizar título, descrição e metadados sociais com APT Tennis Club — Beyond the Court.

Ao final, entregar um produto navegável com landing, requerimento, gestão, convite, cadastro privado, checkout Asaas, webhook, portal do membro e Supabase configurados. Não alterar a identidade aprovada e não substituir logos ou fotos oficiais.
```

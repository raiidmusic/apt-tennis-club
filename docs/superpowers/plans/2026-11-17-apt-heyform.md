# APT HeyForm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalar HeyForm na VPS Azure aprovada e integrar pesquisa identificada, com leitura na gestão APT.

**Architecture:** HeyForm oficial em Docker na VM existente, MongoDB e KeyDB internos, Caddy para HTTPS. APT/Next.js em Vercel identifica o membro e emite contexto assinado; webhook autenticado persiste snapshot no Supabase. Gestão acessa os resultados pelo backend APT.

**Tech Stack:** HeyForm v3.0.7, Docker Compose, MongoDB, KeyDB, Caddy, Next16.3.1, React19, Supabase Postgres. Não adicionar dependências à aplicação APT.

**Spec:** `docs/superpowers/specs/2026-11-17-apt-heyform-design.md`.

## Global Constraints

- Usuário aprovou desenho, instalação e integração e confirmou novamente a VPS atual em17/11/2026. Manter limite do crédito Azure; sem upgrade de assinatura, resize ou novo serviço pago.
- Respostas identificadas; autorização deriva de sessão APT e cadastro por auth_user_id, inclusive administrador que também seja membro.
- Código base deve preservar a produção421bfc9. Checkout original tem mudanças financeiras anteriores e não será usado para publicar esta feature.
- HeyForm sem fork. Autenticação Basic do emissor e contexto assinado do membro são verificações distintas. Se Basic não funcionar na versão fixada, parar e revisar essa fronteira.
- Não coletar CPF, dados financeiros ou IP no questionário. Segredos não entram em Git, logs ou frontend.
- Supabase server-only conforme D-016. Uma resposta por membro/campanha, entrega idempotente, sem overwrite silencioso.
- Nenhum convite real será enviado neste ciclo. Cadastro administrativo com nova senha exige participação do usuário se feito pela UI.
- DNS/firewall somente para HTTPS do serviço aprovado. MongoDB/KeyDB e9157 não são publicados.

## Review Focus

- Contexto válido enviado diretamente por membro sem segredo do emissor deve falhar sem escrita.
- Administrador atleta participa como seu próprio cadastro; administrador sem cadastro elegível não responde como outro membro.
- Dois eventos concorrentes não duplicam nem substituem respostas; indisponibilidade de banco não gera confirmação falsa.
- Credencial Basic e token não podem aparecer no formulário público, exportações ou logs.
- Fechar o formulário fonte impede nova resposta; reenvios autenticados válidos têm janela de72h e exclusão/correção exige os dois bancos.

## Task 1: Runtime e prova do protocolo

**Files:** `infra/heyform/compose.yaml`, `infra/heyform/compose.local.yaml`, `infra/heyform/Caddyfile`, `infra/heyform/.env.example`, `infra/heyform/README.md`.

**Interfaces:** Produz serviço HeyForm oficial e URL protegida; segredo Basic configurado somente no editor. Não depende das rotas da aplicação.

- [x] Preparar Compose com versões/digests fixados, volumes persistentes, redes internas, limites de memória e logs rotacionados; validar com `docker compose config -q`.
- [x] Inicializar localmente em porta19157 com credenciais sintéticas geradas em arquivo privado; observar health e acesso à UI.
- [x] Provar webhook Basic usando a biblioteca da imagem fixada e o mesmo caminho de URL do app; receiver local registra apenas se o header confere, sem imprimir segredo.
- [x] Conferir payload, fila e configuração de IP; prova de recuperação real permanece no gate de integração da Task4.
- [x] Revalidar spendingLimit do Azure: API confirmou On/FreeTrial/Enabled. Instalação remota de runtime pertence ao rollout da Task4; bootstrap Docker iniciado sem portas públicas.

## Task 2: Contrato identificado e persistência privada

**Files:** `lib/member-survey.ts`, `app/api/pesquisas/route.ts`, `app/api/webhooks/heyform/route.ts`, `tests/member-survey.test.mjs`, nova migração em `supabase/migrations/`, `.env.example`.

**Interfaces:** `issueSurveyContext(input, secret)` e `verifySurveyContext(token, secret, now)` vinculam versão, membro, campanha e formulário; `receiveHeyFormEvent(request)` valida Basic, contrato e grava atomicamente. GET `/api/pesquisas?survey=experiencia-2026` retorna URL de formulário e estado somente do membro autenticado. GET com autorização administrativa retorna respostas/CSV.

- [x] Escrever e rodar testes RED com Request/Response reais e transporte Supabase simulado, sem dados ou chamadas reais: Basic ausente/incorreto, token alterado/vencido, payload inválido, admin+membro, admin sem cadastro, campanha fechada, duplicação e falha de banco.
- [x] Implementar contexto HMAC com segredo dedicado, comparação segura e validade de campanha+72h; não emitir depois do encerramento.
- [x] Implementar parser pelo snapshot de IDs/tipos de campo, seleções e limites de texto. Aceitar apenas o formulário configurado e validar todos os valores, sem usar rótulos como identidade.
- [x] Criar migração com CLI oficial; tabelas `member_surveys` e `member_survey_responses`, restrições únicas e grants/RLS server-only. Campanha contém público elegível congelado, questionário e datas.
- [x] Implementar inserção transacional via unicidade e tratamento de conflito: evento idêntico200, novo201, conflito sem overwrite409, falha recuperável503. Apenas persistência concluída permite confirmação.
- [x] Rodar testes GREEN e TypeScript. Validar migração/concorrência em banco isolado antes da aplicação no projeto exato.

## Task 3: Página e gestão

**Files:** `app/pesquisa/[slug]/page.tsx`, componente de experiência da pesquisa, `app/gestao/pesquisas/page.tsx`, estilos locais, `app/apt-app.tsx`, `next.config.ts`.

**Interfaces:** Consome `/api/pesquisas` e o snapshot persistido. Incorpora somente a origem HeyForm configurada. Gestão exige a mesma autorização administrativa do backend atual.

- [ ] Reutilizar login com retorno seguro, identidade e estilos APT. Página mostra aviso de identificação, formulário, já respondida, encerrada, pendência e erro.
- [ ] Ajustar CSP para iframe somente da origem HeyForm aprovada, sem liberar scripts externos ou frame-ancestors da APT.
- [ ] Criar gestão com participação sobre público congelado, distribuições, prioridades e respostas identificadas; exportação CSV com neutralização de fórmulas.
- [ ] Acrescentar links de pesquisa na área de membro e gestão usando os componentes existentes. Não modificar cobrança para permitir pesquisa.
- [ ] Rodar testes, build e navegador mobile/desktop/teclado; confirmar retorno de login, iframe e confirmação por estado persistido.

## Task 4: Instalação, integração e publicação verificadas

**Files:** registro operacional em `infra/heyform/README.md`, evidências privadas em `outputs/heyform/`, `APT_BRAIN.md`.

**Interfaces:** Consome runtime, migração e páginas dos passos anteriores. Produz serviço com HTTPS e uma pesquisa de teste integrada; pesquisa real só fica aberta após validação.

- [ ] Configurar DNS no provedor existente e liberar somente80/443 após confirmar regras atuais. Gerar e manter segredos em armazenamento privado, sem valores em evidências.
- [ ] Criar acesso administrativo protegido e recuperação; bloquear cadastro público. Se faltar autenticação humana, concluir todo o restante independente antes de pedir esse acesso.
- [ ] Criar pesquisa teste, snapshot e público sintético; configurar Basic, campo `apt_context`, horários e reenvios. Confirmar Mongo→webhook→Supabase e edição/erro sem falsa sincronização.
- [ ] Preparar backup externo protegido e testar restauração. Medir recursos/latência preservando OpenBot; não aumentar VM automaticamente.
- [ ] Revisão independente final de correção/segurança/Ponytail e auditoria proporcional à nova estrutura. Corrigir findings importantes com regressões.
- [ ] Rodar suite apropriada, TypeScript/build, diffcheck e browser. Registrar falhas preexistentes com comparação de baseline.
- [ ] Publicar somente código da worktree aprovada, preservar deployment rollback confirmado imediatamente antes, verificar domínio/fluxo real e atualizar status com evidências.

## Ledger

- Pré-execução: usuário reafirmou VPS atual; hospedagem alternativa foi esclarecimento, não mudança de escopo. Base421bfc9 corresponde ao domínio oficial observado.
- Ruling: execução nativa com revisão independente final — tarefas partilham contrato e não serão implementadas em paralelo.
- Task1→2: snapshot de campos e Basic devem refletir a imagem testada; não pressupor HMAC nativo.
- Task2→3: UI só confirma estado persistido, nunca apenas mensagem do iframe.
- Task3→4: publicação usa branch isolada da revisão produtiva, sem copiar alterações financeiras do checkout original.

- Task1: configuração válida, HeyForm local healthy/HTTP200, Basic real e rejeição de auth incorreta PASS; Mongo193,5MiB, HeyForm156,7MiB e KeyDB20,8MiB em repouso.
- Ruling: finalizar runtime local/protocolo na Task1 e verificar instalação remota na Task4 — o contrato local independe da provisão Azure em andamento. Nenhuma publicação antecipada.
- Baseline421bfc9: TypeScript sem erros após gerar next-env local; testes210/221,11falhas preexistentes registradas em /private/tmp/apt-heyform-baseline-tests.log.

- Task2:14testes de contrato/autorização PASS, TypeScript PASS; Postgres17 descartável provou grants/RLS, insert service_role, imutabilidade e unicidade. Migração produtiva ainda não aplicada.
- Task2: regressão RED→GREEN da assinatura Route Handler: wrapper ignora o segundo argumento Next para preservar o relógio de expiração.
- Runtime Azure: Docker29.10.0/Compose5.8.0 instalados; OpenBot active;2.606MiB disponíveis após bootstrap; sem mudança de assinatura ou portas públicas.

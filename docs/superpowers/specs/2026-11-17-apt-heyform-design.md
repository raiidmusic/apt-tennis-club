# HeyForm na infraestrutura APT

Data: 17/11/2026. Estado: desenho aprovado pelo usuário, incluindo instalação/integração na VPS atual e preservação do limite Azure; execução iniciada. Respostas identificadas confirmadas. Evidências de instalação e publicação serão registradas separadamente.

## Decisões do usuário

- Usar HeyForm para a pesquisa de satisfação dos membros.
- Hospedar e integrar na infraestrutura da APT.
- Respostas identificadas, vinculadas ao cadastro, para acompanhamento individual. Não anunciar anonimato.
- A escolha do HeyForm não autoriza upgrade de plano, novas despesas recorrentes ou envio de convites.

## Evidência atual

| Componente | Verificado em 17/11 |
| --- | --- |
| Vercel | Projeto pessoal `apt-tennis-club`, ID `prj_gnjjgijeXutKy5vZM5Q0nn9hXnx3`, framework Next.js, domínio oficial `www.apttennis.com.br`. |
| Supabase | `APT TENNIS CLUB`, projeto `cjwxqfxrkdgmqbomzhkm`, região `sa-east-1`, estado `ACTIVE_HEALTHY`. |
| DNS | Nameservers `a.sec.dns.br` e `b.sec.dns.br`; zona externa à Vercel. Novo subdomínio exige alteração no provedor da zona. |
| Azure | VM existente `apt-openbot`, grupo `APT-OPENBOT-RG`, Ubuntu 24.04 x64, West US 2, 2 vCPUs e 4 GiB. Estado Running. |
| Capacidade da VM | Diagnóstico pelo Run Command: 3.856 MiB totais, 2.733 MiB disponíveis, swap de 2.047 MiB sem uso e 22 GiB livres em disco. É uma amostra em repouso, não um teste com HeyForm. |
| Serviços da VM | Docker não instalado. Serviço `openbot.service` habilitado. Nenhum listener nas portas 80/443 no diagnóstico. Regras efetivas de entrada ainda precisam ser inspecionadas antes da publicação. |
| Crédito Azure | Portal mostrou Free Trial com crédito disponível e vencimento em 16/12/2026. A continuidade após o trial não está contratada nem autorizada. Revalidar limite de gastos antes de instalar. |
| HeyForm | Release oficial `v3.0.7`, commit `dd3b8c9250db345f288d936f549888e94d4ddfd2`. Manifesto Docker consultado: imagem oficial disponível para linux/amd64 e linux/arm64. |
| Docker local | Docker 29.5.2 disponível. Nenhum container HeyForm iniciado. |

Fontes: conectores Vercel e Supabase, portal Azure autenticado, dois diagnósticos de leitura na VM e checkout temporário do código oficial em `/private/tmp/apt-heyform-v3.0.7`.

## Abordagens e recomendação

1. **Reutilizar a VM Azure existente — proposta recomendada para o piloto.** Aproveita o crédito e evita provisionar outra máquina. Os números em repouso justificam um teste com limites de recursos; não comprovam capacidade simultânea com o OpenBot. Preservar o serviço e a pausa do atendimento existentes.
2. **VM exclusiva — alternativa se o teste mostrar contenção.** Isola falhas e consumo, mas cria outro custo. Só cotar e provisionar depois de autorização específica.

O usuário aprovou este desenho e confirmou novamente a VPS atual após esclarecer alternativas gerenciadas. A aplicação oficial usa MongoDB e Redis/KeyDB; não pode substituir MongoDB pelo Supabase por configuração. Vercel continua servindo a aplicação APT. HeyForm roda como serviço separado.

## Experiência proposta

1. Membro abre `/pesquisa/experiencia-2026` no site APT.
2. A página usa o login APT existente. Se necessário, encaminha para `/entrar?next=/pesquisa/experiencia-2026` e retorna após autenticar.
3. Backend valida a sessão APT e resolve o cadastro pelo `auth_user_id` validado. Membros comuns já têm `getSession(request).memberId`; administradores podem também ser atletas, mas a sessão administrativa não inclui esse campo. Fazer a consulta focal na rota da pesquisa, sem alterar a autorização global. Não aceitar o identificador declarado pelo navegador como prova de identidade. Administrador sem cadastro elegível pode gerir a pesquisa, mas não responder em nome de um membro.
4. Backend emite contexto assinado e limitado à pesquisa, ao membro e ao prazo. HeyForm recebe esse contexto em um campo oculto `apt_context`.
5. Formulário informa: “Esta pesquisa é identificada. A gestão da APT poderá consultar suas respostas vinculadas ao seu cadastro.”
6. A experiência usa incorporação em página inteira, identidade APT e dez perguntas da redação já proposta. Campo oculto não substitui autenticação: é apenas transporte de um contexto assinado.
7. O site distingue “resposta recebida pelo formulário” de “resposta integrada à APT”. Consulta de estado no backend confirma a segunda etapa. Timeout de sincronização mostra pendência e não convida o membro a enviar outra resposta.

Proposta: participação permitida aos membros da campanha, independentemente da cobrança. Não usar o fluxo financeiro de `/api/portal` para carregar a pesquisa. Cadastro sem acesso Auth concluído exige tratar o acesso antes de incluir na distribuição; não inventar associação pelo nome.

## Hospedagem proposta

- Subdomínio sugerido: `pesquisas.apttennis.com.br`, apontando para a VM. Nome ainda não criado.
- Docker Engine e Compose pelo canal oficial para Ubuntu.
- Projeto Compose próprio em `/opt/apt-heyform`, sem alterar arquivos do OpenBot.
- Serviços: HeyForm oficial, MongoDB, KeyDB e proxy HTTPS Caddy.
- Fixar versões e digests revisados. Não usar `latest` em produção. Imagem amd64 observada: `heyform/community-edition:v3.0.7`, digest `sha256:89a509c50def38420657ba0d5b268f92ebee74a0bf5861422e3b6d8810fa54fe`.
- Persistir banco, uploads, dados do KeyDB e certificados. Redes internas sem publicação das portas do banco/cache. Porta 9157 acessível somente ao proxy.
- Começar o teste com limites conservadores por serviço e medir memória, reinícios, latência e impacto no OpenBot. Valores finais dependem do teste; não fazer resize automático.
- Permitir entrada pública somente em 80/443 para o proxy, após revisar NSG e firewall. Não publicar SSH, MongoDB, KeyDB ou interfaces internas do OpenBot.
- Configurar `APP_HOMEPAGE_URL`, `NODE_ENV=production`, origens CORS exatas e `TRUST_PROXY` compatível com um único proxy imposto pela rede.
- Manter `ALLOW_PRIVATE_OUTBOUND=false`. A versão fixada usa esse nome; notas antigas do Context7 ainda citam `HEYFORM_ALLOW_PRIVATE_OUTBOUND`.
- Gerar segredos próprios para `SESSION_KEY` e `FORM_ENCRYPTION_KEY`. Nunca reutilizar chaves de Supabase, Asaas, CPF ou OpenBot.
- Criar o acesso administrativo inicial em ambiente protegido e desabilitar cadastro público com `APP_DISABLE_REGISTRATION=true` antes de disponibilizar o serviço. Configurar recuperação de acesso antes da abertura; não usar valores de exemplo.
- Desabilitar coleta de IP nas respostas com `DISABLE_SUBMISSION_IP=true`. Resposta identificada não exige guardar IP ou copiar CPF, cobrança e outros dados do membro.
- Não configurar Stripe, OpenAI ou integrações pagas para esta pesquisa.

## Integração com APT e Supabase

Reutilizar `lib/auth.ts`, `lib/supabase-server.ts`, `lib/request-security.ts` e a autorização administrativa existentes. O formulário de candidatura e sua tabela `applications` permanecem com sua finalidade atual.

### Dados mínimos propostos

- `member_surveys`: campanha, identificador do formulário HeyForm, datas, versão/snapshot do questionário e público elegível.
- `member_survey_responses`: campanha, membro, identificador da submissão HeyForm, respostas normalizadas, resumo necessário para a gestão e data de integração.
- Uma restrição única por campanha e membro; outra para o identificador externo da submissão. A unicidade deve ser transacional no banco, não check-then-insert na API.
- Preservar o questionário da rodada e mapear respostas por IDs de campo; rótulos editáveis não são chaves estáveis. A primeira resposta integrada é um snapshot imutável. O editor de respostas nativo não reenfileira webhook: correção ou exclusão exige procedimento administrativo coordenado nos dois bancos, com auditoria; edição isolada no HeyForm não é uma atualização da gestão APT.
- Supabase é a base canônica da gestão APT. MongoDB é a persistência operacional do HeyForm. A integração precisa demonstrar consistência entre ambas; o embed sozinho não integra os dados.
- Tabelas privadas seguem D-016: RLS, grants revisados e operações somente pelo backend autorizado. Chave administrativa Supabase não é entregue ao HeyForm nem ao navegador.

### Fluxo e limite de confiança do webhook

`HeyForm → POST /api/webhooks/heyform → validação → Supabase → GET administrativo → gestão APT`.

O código oficial de `v3.0.7` oferece somente `endpointUrl` na configuração do webhook. Não há assinatura HMAC nem campo de header de autenticação nesse app. Não tratar um JSON com `formId` válido como evento autenticado.

A solução proposta sem fork exige duas verificações independentes:

- **Servidor emissor:** autenticação HTTP Basic com segredo de integração dedicado, configurado como userinfo no `endpointUrl` HTTPS e conferido no header `Authorization` do receptor. A validação de URL e a rotina de outbound do HeyForm preservam userinfo; `got` 11.8.5, fixado nessa release, converte essas credenciais em autenticação HTTP. Isso é evidência de código, não teste de interoperabilidade. É obrigatório provar na imagem fixada que a UI aceita a configuração, que o header chega e que o segredo não aparece na página pública, payload de resposta, exportações de membros ou logs. Guardar a URL completa somente na configuração administrativa protegida do HeyForm; não em querystring pública, frontend, Git ou logs. Se o teste falhar, interromper essa integração e revisar o desenho; nunca remover a autenticação do servidor para fazê-la funcionar.
- **Membro autorizado:** contexto assinado `apt_context`, emitido exclusivamente pelo backend APT após login. Vincular assinatura a membro, campanha, formulário, emissão, validade e finalidade; usar outro segredo dedicado e comparação segura. Limitar o token à submissão dessa pesquisa, sem dar acesso ao perfil ou a outros dados.

O contexto do membro sozinho não prova que houve submissão no HeyForm. Uma requisição que tenha apenas o contexto, sem autenticação do servidor, deve ser rejeitada. O endpoint recebe entrada não confiável e valida todo o conteúdo mesmo depois das duas verificações.

No recebimento:

1. Limitar tamanho do corpo e verificar tipos, quantidade de perguntas, notas, seleção máxima e tamanho dos textos.
2. Validar primeiro a autenticação do emissor, depois assinatura e validade do contexto, campanha permitida, formulário exato e cadastro elegível. Não usar nome/e-mail/`memberId` avulsos como autorização.
3. Ignorar dados extras que não pertencem ao contrato. Não persistir IP, user agent ou o token em logs e respostas normalizadas.
4. Inserir atomicamente. Repetição idêntica retorna sucesso sem duplicar. Nova submissão para membro que já respondeu não sobrescreve a anterior silenciosamente.
5. Retornar sucesso somente depois da persistência. Falha temporária retorna erro recuperável; resposta da UI APT consulta estado persistido.
6. Encerrar novos envios também nas configurações do HeyForm: `CompleteSubmissionResolver` verifica `assertFormIsAcceptingSubmissions` no servidor. Não emitir contextos após o encerramento. Proposta: contexto válido até 72 horas depois do encerramento para receber entregas autenticadas atrasadas. Reenvios além dessa janela exigem recuperação administrativa explícita; não alterar timestamps, estender tokens silenciosamente ou orientar o membro a reenviar. Provar encerramento na fonte, entrega tardia com Basic válido e rejeição de contexto sem autenticação do emissor.

O HeyForm tem fila Bull e registro de entregas, tentativas e reenvio. Avaliar backoff exponencial para indisponibilidade curta. Testar a recuperação de falhas além da janela automática pelo mecanismo nativo de reenvio, comparando contagens e IDs nos dois bancos. Cadastro do webhook e fixtures não comprovam integração real.

Não inserir CPF, tokens Auth, chaves administrativas ou dados de pagamento em campos ocultos. Usar política de referência restritiva na página APT e excluir URLs com contexto e corpos de respostas dos logs operacionais.

### Gestão inicial

- Uma seção de pesquisa na gestão com totais, distribuições de notas, prioridades e comentários identificados.
- Detalhe de resposta acessível somente a administradores, com ligação ao cadastro existente.
- CSV com proteção contra fórmulas em comentários e nomes.
- Totais de participação usam público da campanha definido no lançamento; não inferir falta de resposta a partir de consultas parciais.
- Edição de perguntas acontece no editor HeyForm. Não construir outro editor na gestão APT.

## Backup, encerramento e reversão

- Backup consistente de MongoDB, uploads e segredos antes de atualizações; definir destino protegido fora da VM e testar restauração antes de coletar respostas reais. O destino ainda não foi aprovado.
- Documentar exclusão de resposta nos dois bancos e exportação com acesso administrativo. Não prometer exclusão integral apagando apenas a cópia Supabase.
- Revalidar a continuidade de hospedagem antes de 16/12/2026; o trial pode desativar o serviço no vencimento ou esgotamento do crédito. Não converter assinatura nem remover limite de gastos automaticamente.
- Reversão do piloto: fechar a campanha, remover o convite da interface, parar somente o projeto Compose HeyForm e manter volumes/dados para recuperação. Não executar `down -v` nem apagar respostas como rollback.
- Reverter a publicação APT para o deployment confirmado imediatamente antes da mudança, registrado no momento da execução. Não reutilizar um ID histórico como se fosse o alvo atual.

## Ciclo de implementação e validação

1. Aprovar este desenho e a reutilização da VM. Registrar APT-HF-001 como READY e a escolha do usuário antes de editar código.
2. Criar worktree isolada da integração. O checkout atual já tem mudanças financeiras anteriores; preservar e mapear a base efetivamente em produção.
3. Preparar Compose e configuração protegida; validar estrutura, versões e topologia em ambiente isolado.
4. Provar primeiro a autenticação Basic nativa com a imagem fixada. Depois construir a rota, contexto assinado, parser e tabelas em ambiente não produtivo. Testes mínimos: ausência de Basic, contexto válido com emissor falso, falsificação/troca de membro, administrador que também é membro, administrador sem cadastro elegível, token vencido, encerramento com reenvio atrasado, payload inválido, duplicação concorrente, falha temporária e autorização administrativa.
5. Revisões de correção/segurança e Ponytail. Rerodar auditoria estrutural somente quando a mudança de estrutura/dependências justificar; a instalação inclui novos serviços e deve revisar essa fronteira.
6. Instalar o piloto no host aprovado, configurar HTTPS, administrador e recuperação; validar carga e isolamento antes de abrir a pesquisa.
7. Criar pesquisa de teste com dados sintéticos, enviar pela UI real, confirmar registro MongoDB, entrega, linha Supabase e apresentação identificada na gestão.
8. Confirmar estado de sessão, mobile, teclado, retorno de login, sucesso, pendência, duplicata e erro de integração. Uma URL respondendo não atende o gate visual.
9. Revisar migração, variáveis, DNS e diff concretos antes da autorização de publicação. Convites a membros exigem autorização própria de envio.

## Revisão do desenho

Revisão independente de construção, correção/segurança e Ponytail feita em 17/11. Quatro ajustes incorporados: autenticação do emissor além do membro, janela explícita de reenvio, snapshot imutável com correções coordenadas e participação de administradores que também são membros. O parecer considera o desenho viável após esses ajustes. Container, Basic Auth, DNS, firewall, carga e integração real permanecem sem teste.

## Fontes

- https://docs.heyform.net/open-source/self-hosting
- https://docs.heyform.net/open-source/configuration/environment-variables
- https://docs.heyform.net/features/embed-your-form
- https://docs.heyform.net/features/hidden-fields
- https://docs.heyform.net/integrations/webhook
- https://github.com/heyform/heyform/releases/tag/v3.0.7
- https://github.com/heyform/heyform/blob/v3.0.7/packages/server/src/apps/webhook.ts
- https://github.com/heyform/heyform/blob/v3.0.7/packages/server/src/queue/integration-queue.ts
- https://github.com/heyform/heyform/blob/v3.0.7/packages/server/.env.example
- https://raw.githubusercontent.com/sindresorhus/got/v11.8.5/source/core/utils/url-to-options.ts
- https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/avoid-charges-free-account
- Código local APT: `lib/auth.ts`, `lib/supabase-server.ts`, `lib/request-security.ts`, `app/apt-app.tsx`, `app/api/portal/route.ts` e decisões D-001, D-008 e D-016 de `APT_BRAIN.md`.

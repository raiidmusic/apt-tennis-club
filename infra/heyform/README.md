# HeyForm da APT

HeyForm oficial v3.0.7, sem fork, na VM Azure existente. MongoDB/KeyDB são internos. Somente o Caddy recebe tráfego público80/443. Supabase continua sendo o banco canônico da aplicação APT.

## Estado verificado em17/11/2026

- Azure FreeTrial Enabled, spendingLimit On; sem resize ou contratação adicional. Docker29.10.0 e Compose5.8.0 instalados. OpenBot permanece ativo; o conector permanece pausado por decisão anterior.
- Compose local healthy; prova do webhook nativo Basic na imagem fixada passou. ALLOW_PRIVATE_OUTBOUND permanece false em produção.
- Conta e rascunho locais foram exportados em arquivo privado, com autorização explícita para transferência à VPS. Restauração local separada preservou o hash da senha e as17telas. O arquivo não integra este repositório.
- As tabelas privadas foram aplicadas ao Supabase APT (`cjwxqfxrkdgmqbomzhkm`). RLS e grants foram conferidos remotamente; anon/authenticated não podem ler e service_role não pode editar/apagar respostas.
- O rollout dos containers na VPS, DNS/TLS, recuperação de acesso e integração remota ainda não foram verificados. Não abrir a campanha antes dos gates abaixo.

## Instalação e segredos

Diretório no host: `/opt/apt-heyform`, proprietário root, modo0700. Copiar `compose.yaml` e `Caddyfile`. Gerar cada segredo separadamente em `.env`, modo0600, usando aleatoriedade criptográfica. Usar os nomes de `.env.example`; nunca executar `docker compose config` sem `-q` em logs compartilhados. Não reutilizar segredos de cobrança, Supabase ou autenticação APT.

Antes do proxy público, subir apenas MongoDB/KeyDB, restaurar as coleções autorizadas da conta/projeto/rascunho e iniciar HeyForm com cadastro público bloqueado. Transferência exclui sessões, tokens de aplicação e integrações de terceiros. Chaves de sessão novas exigem novo login, preservando o mesmo e-mail/senha.

```sh
cd /opt/apt-heyform
docker compose --env-file .env config -q
docker compose --env-file .env up -d --wait mongo keydb
# Restaurar o arquivo privado de conta/rascunho antes de iniciar o app.
docker compose --env-file .env up -d --wait heyform
docker compose --env-file .env ps
```

Criar DNS A `pesquisas.apttennis.com.br` para o IP observado da VM (`20.236.49.135` em17/11). Conferir DNS autoritativo e NSG antes de liberar80/443. Não expor22/9157/27017/6379. Iniciar Caddy depois do DNS; validar certificado público, redirect HTTPS, login, cadastro bloqueado e ausência de IP nas respostas. Configurar SMTP/recuperação e provar recuperação sem enviar pesquisa a membros.

## Questionário e integração

`questionnaire.json` reúne rascunho e snapshot correspondente. Dez temas estratégicos viram15campos de resposta porque a avaliação de experiência contém seis aspectos. Os dois textos finais são opcionais. O rascunho permanece fechado e explicita identificação. Não alterar IDs depois de congelar a campanha.

1. No backend APT, configurar `APT_HEYFORM_URL`, `APT_SURVEY_CONTEXT_SECRET` e `APT_HEYFORM_WEBHOOK_SECRET`, estes dois últimos distintos, aleatórios e com32caracteres ou mais. Valores ficam somente no armazenamento secreto Vercel; não usar NEXT_PUBLIC.
2. Definir no HeyForm o campo oculto `apt_context`, ID/nome homônimos. APT fornece esse contexto após validar sessão/cadastro/público elegível.
3. Configurar webhook nativo para `https://apt-heyform:SEGREDO@www.apttennis.com.br/api/webhooks/heyform`. O userinfo vira Basic na imagem testada. Colar valor somente no editor autenticado. Nunca publicar essa URL em documentação, screenshots ou logs.
4. Congelar no Supabase o snapshot de campos, público elegível e datas. Primeiro piloto usa público restrito; não alterar registros financeiros. A campanha real continua inativa.
5. Programar abertura/encerramento também no HeyForm. A APT não emite novos contextos após o fechamento; entregas autenticadas válidas têm até72h de tolerância.
6. Provar envio real pela UI: MongoDB, fila/entrega, resposta identificada no Supabase e gestão. Repetir mesmo evento deve retornar200 sem duplicar. Corpo alterado deve retornar409; Basic ausente401; banco indisponível deve permitir retry e não confirmar registro.

HeyForm não emite webhook ao editar uma resposta existente. Os snapshots APT são imutáveis. Correção/exclusão exige procedimento administrativo coordenado nos dois bancos, com autorização e evidência, sem alterar timestamps para contornar validação. Depois de72h, recuperação administrativa deve ser explícita; não orientar o membro a reenviar como solução para falha de entrega.

## Backup e recuperação

Não executar `docker compose down -v`, `docker volume rm` ou limpeza destrutiva como rollback. Antes de respostas reais, guardar backup privado fora da VM e testar restauração. O teste de conta/rascunho local não comprova restauração da VPS nem backup recorrente.

Backup mínimo: dump MongoDB gzip, uploads e configuração; `.env` contém segredos e exige armazenamento privado/protegido. Copiar também as respostas canônicas Supabase pelo mecanismo administrativo do projeto. Não colocar backup ou `.env` no Git, bucket público ou logs.

Na VM, um dump privado pode ser produzido sem imprimir a senha:

```sh
umask 077
mkdir -p /opt/apt-heyform/backups
cd /opt/apt-heyform
docker compose exec -T mongo sh -ec 'mongodump --quiet --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db heyform --archive --gzip' > backups/heyform.archive.gz
```

Verificar exit code e tamanho antes da cópia externa. Restaurar em destino isolado com `mongorestore --archive --gzip`, conferir conta, campos, IDs e contagens sem imprimir dados pessoais. Só então definir rotina externa/retensão e abrir o piloto. Não apagar a origem para testar restauração.

## Operação e reversão

- `docker stats --no-stream` e `free -m`: acompanhar RAM; não aumentar a VM automaticamente.
- `docker compose ps`: todos healthy. Conferir fila e status das entregas nativas; não confundir HTTP200 do site com integração.
- `systemctl is-active openbot`: deve continuar ativo; não reativar o conector pausado.
- Confirmar periodicamente spendingLimit On e data de expiração do crédito. O limite evita cobrança após crédito; não garante continuidade após a expiração.
- Em falha: fechar campanha no HeyForm e Supabase, remover acesso novo da UI, parar somente os serviços HeyForm; preservar volumes e backups. Reverter aplicação para o deployment confirmado imediatamente antes do rollout.

## Validação executável

`tests/member-survey.test.mjs`: contrato/autorização/idempotência/CSP. `tests/member-survey-ui.test.mjs`: falha transitória preserva iframe; sessão expirada remove formulário/resultados. `tests/member-survey-schema.sql`: executar somente contra banco descartável com roles de teste. `protocol-check.cjs`: executar dentro da imagem fixada com loopback descartável; a configuração produtiva não permite outbound privado.

A suíte base421bfc9 tinha11falhas preexistentes em Kanban e expectativas antigas da landing. Comparar nomes com o baseline, sem tratar falhas anteriores como teste aprovado nem ampliar esta tarefa para finanças.

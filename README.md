# APT Hub

Antes de alterar o sistema, leia [`APT_BRAIN.md`](APT_BRAIN.md). O protocolo obrigatório de execução está em [`AGENTS.md`](AGENTS.md).

Sistema do APT Tennis Club para candidatura, aprovação, convite, cadastro, assinatura recorrente e gestão financeira fora do Twinner.

## Jornadas

- `/` — landing pública.
- `/requerimento` — candidatura sem CPF ou pagamento.
- `/cadastro?convite=...` — cadastro privado do aprovado.
- `/entrar` — acesso Supabase Auth.
- `/portal` — área do integrante.
- `/gestao` — painel administrativo protegido por allowlist.

## Serviços

- Supabase Postgres + Auth: dados e identidade.
- Asaas Checkout + Webhooks: assinatura recorrente.
- Resend: aviso de nova candidatura.
- Twinner: ranking esportivo, acessado por link.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor e execute, em ordem, as migrations de [`supabase/migrations`](supabase/migrations):
   - `202608070001_apt_hub.sql` — ciclo de candidatura, membros e cobrança.
   - `202608110001_form_versioning.sql` — formulários, versões publicadas, perguntas e envios.
   - `202608110002_invite_revocation.sql` — invalidação segura de convites substituídos.
3. Copie `.env.example` para um arquivo local de ambiente e preencha:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `APT_ADMIN_EMAILS` com os e-mails administrativos separados por vírgula.
   - `CPF_HASH_SECRET` com um valor longo e aleatório.
4. Crie no Supabase Auth os usuários administrativos presentes em `APT_ADMIN_EMAILS`.

As chaves secretas e a service role nunca podem ser expostas em variáveis `NEXT_PUBLIC_*`.

## Configuração do Asaas

Preencha `ASAAS_API_KEY`, `ASAAS_MONTHLY_VALUE` e `ASAAS_WEBHOOK_TOKEN`. Cadastre no Asaas o endpoint:

```text
https://SEU-DOMINIO/api/webhooks/asaas
```

Use o mesmo `ASAAS_WEBHOOK_TOKEN` como `authToken` do webhook. O sistema valida o header `asaas-access-token` e deduplica eventos pelo ID.

## Desenvolvimento

O projeto usa vinext/Cloudflare. Neste workspace, o Node pode ser chamado pelo runtime do Codex:

```bash
node node_modules/vinext/dist/cli.js dev
node node_modules/vinext/dist/cli.js build
node node_modules/typescript/bin/tsc --noEmit
node --test tests/rendered-html.test.mjs
```

## Segurança do MVP

- CPF completo não é persistido; fica apenas hash com segredo e os quatro últimos dígitos.
- Dados de cartão são informados somente no checkout hospedado do Asaas.
- Convites são de uso único, expiram em sete dias e são armazenados como hash.
- As tabelas do Supabase usam RLS e não concedem acesso direto a `anon` ou `authenticated`.
- A ativação do integrante depende de webhook financeiro confirmado, não do redirecionamento do checkout.

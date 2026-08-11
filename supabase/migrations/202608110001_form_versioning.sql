create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (form_id, version_number)
);

create table if not exists public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_version_id uuid not null references public.form_versions(id) on delete cascade,
  question_key text not null,
  position integer not null check (position > 0),
  title text not null,
  helper text,
  question_type text not null check (question_type in ('text','email','tel','number','choice','multi','textarea')),
  required boolean not null default true,
  options jsonb not null default '[]'::jsonb,
  condition jsonb,
  created_at timestamptz not null default now(),
  unique (form_version_id, question_key),
  unique (form_version_id, position)
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_version_id uuid not null references public.form_versions(id) on delete restrict,
  application_id uuid unique references public.applications(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index if not exists form_versions_form_status_idx on public.form_versions(form_id, status, version_number desc);
create index if not exists form_questions_version_position_idx on public.form_questions(form_version_id, position);
create index if not exists form_submissions_version_submitted_idx on public.form_submissions(form_version_id, submitted_at desc);

alter table public.forms enable row level security;
alter table public.form_versions enable row level security;
alter table public.form_questions enable row level security;
alter table public.form_submissions enable row level security;

revoke all on public.forms, public.form_versions, public.form_questions, public.form_submissions from anon, authenticated;
grant select, insert, update, delete on public.forms, public.form_versions, public.form_questions, public.form_submissions to service_role;

with inserted_form as (
  insert into public.forms (slug, name, description)
  values (
    'requerimento-de-entrada',
    'Requerimento de entrada',
    'Formulário público de candidatura ao APT Tennis Club.'
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    updated_at = now()
  returning id
), target_form as (
  select id from inserted_form
  union all
  select id from public.forms where slug = 'requerimento-de-entrada'
  limit 1
)
insert into public.form_versions (form_id, version_number, status, published_at)
select id, 1, 'published', now()
from target_form
on conflict (form_id, version_number) do nothing;

with published_version as (
  select fv.id
  from public.form_versions fv
  join public.forms f on f.id = fv.form_id
  where f.slug = 'requerimento-de-entrada' and fv.version_number = 1
)
insert into public.form_questions (
  form_version_id, question_key, position, title, helper, question_type, required, options, condition
)
select published_version.id, question.question_key, question.position, question.title, question.helper,
  question.question_type, question.required, question.options::jsonb, question.condition::jsonb
from published_version
cross join (values
  ('nome', 1, 'Como você gosta de ser chamado?', 'Comece pelo seu nome completo.', 'text', true, '[]', null),
  ('email', 2, 'Qual é o seu melhor e-mail?', 'É por aqui que você recebe as próximas etapas.', 'email', true, '[]', null),
  ('whatsapp', 3, 'E o seu WhatsApp?', 'Inclua o DDD. Usaremos apenas quando necessário.', 'tel', true, '[]', null),
  ('idade', 4, 'Qual é a sua idade?', 'O APT recebe integrantes entre 25 e 45 anos.', 'number', true, '[]', null),
  ('cidade', 5, 'Onde você mora?', 'Cidade e bairro ajudam a criar conexões locais.', 'text', true, '[]', null),
  ('profissao', 6, 'O que você faz da vida?', 'Profissão ou área de atuação.', 'text', true, '[]', null),
  ('onde_joga', 7, 'Onde você costuma jogar tênis hoje?', 'Esta resposta é opcional.', 'text', false, '[]', null),
  ('socio', 8, 'Você é sócio de algum clube ou espaço esportivo?', null, 'choice', true, '["Sim","Não"]', null),
  ('clube', 9, 'Qual clube você frequenta?', null, 'text', true, '[]', '{"question":"socio","equals":"Sim"}'),
  ('classe', 10, 'Com qual classe você mais se identifica hoje?', 'Não precisa ser exato. Queremos uma percepção honesta.', 'choice', true, '["5ª classe — construindo base técnica","4ª classe — regularidade e leitura de jogo","3ª classe — controle, ritmo e competitividade","2ª classe — ritmo alto e consistência","1ª classe — técnica refinada e estratégia"]', null),
  ('tempo', 11, 'Há quanto tempo você joga tênis?', null, 'choice', true, '["Menos de 1 ano","Entre 1 e 3 anos","Mais de 3 anos","Voltei recentemente"]', null),
  ('nivel', 12, 'Como você descreveria seu momento no jogo?', null, 'choice', true, '["Recreativo com frequência","Competitivo casual","Treino regular com foco em evolução","Alto rendimento ou torneios"]', null),
  ('atracao', 13, 'O que mais chamou sua atenção no APT?', 'Escolha até três pontos.', 'multi', true, '["A curadoria dos membros","O estilo de vida ao redor do jogo","O nível técnico e o formato","As conexões e o networking","A sensação de pertencer","A estética e a experiência"]', null),
  ('tenis', 14, 'Como o tênis entra na sua vida?', null, 'choice', true, '["Um esporte","Um ritual","Um meio de conexão","Equilíbrio entre mente e corpo","Um espaço de performance"]', null),
  ('comunidade', 15, 'O que não pode faltar em uma comunidade para você permanecer nela?', null, 'textarea', true, '[]', null),
  ('indicacao', 16, 'Quem indicou você para o APT?', 'Informe o nome completo de quem já faz parte da comunidade.', 'text', true, '[]', null),
  ('agora', 17, 'Por que faz sentido estar no APT agora?', null, 'textarea', true, '[]', null),
  ('consent', 18, 'Podemos usar suas respostas para analisar seu requerimento e entrar em contato?', 'Se aprovado, o cadastro financeiro acontece em outro link, separado desta etapa.', 'choice', true, '["Sim, autorizo o uso para análise e contato"]', null)
) as question(question_key, position, title, helper, question_type, required, options, condition)
on conflict (form_version_id, question_key) do nothing;

insert into public.form_submissions (form_version_id, application_id, answers, submitted_at)
select fv.id, a.id, a.answers, a.created_at
from public.applications a
join public.forms f on f.slug = 'requerimento-de-entrada'
join public.form_versions fv on fv.form_id = f.id and fv.version_number = 1
on conflict (application_id) do nothing;

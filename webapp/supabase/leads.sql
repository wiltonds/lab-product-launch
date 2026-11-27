-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- Leads (quem trocou o contato pelo plano em PDF) e eventos do funil.
-- Qualquer visitante pode INSERIR, ninguém pode LER pelo app: a equipe lê pelo painel do Supabase
-- (Table Editor), que usa a chave de serviço e ignora o RLS.

create table if not exists public.leads (
  id bigint generated always as identity primary key,
  nome text not null check (char_length(nome) between 2 and 80),
  whatsapp text not null check (whatsapp ~ '^[1-9][0-9]9[0-9]{8}$'),
  municipio text check (char_length(municipio) <= 80),
  municipio_codigo text check (municipio_codigo ~ '^[0-9]{7}$'),
  uf text check (char_length(uf) <= 2),
  bairro text check (char_length(bairro) <= 80),
  atividade text check (char_length(atividade) <= 60),
  motivacao text check (char_length(motivacao) <= 80),
  fase text check (char_length(fase) <= 80),
  capital numeric,
  indice smallint check (indice between 0 and 100),
  origem text check (char_length(origem) <= 60),
  aceita_contato boolean not null,
  aceita_marketing boolean not null default false,
  sessao text check (char_length(sessao) <= 40),
  status text not null default 'novo' check (status in ('novo', 'contatado', 'conversou', 'cliente', 'descartado')),
  criado_em timestamptz not null default now()
);
create index if not exists leads_criado_em on public.leads (criado_em desc);
create index if not exists leads_whatsapp on public.leads (whatsapp);

alter table public.leads enable row level security;
drop policy if exists "lead: qualquer um cria" on public.leads;
create policy "lead: qualquer um cria" on public.leads for insert to anon, authenticated
  with check (aceita_contato = true and status = 'novo');

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  sessao text not null check (char_length(sessao) <= 40),
  evento text not null check (evento in ('abriu', 'comecou', 'resultado', 'abriu_plano', 'pediu_pdf', 'lead', 'teste_clientes')),
  origem text check (char_length(origem) <= 60),
  atividade text check (char_length(atividade) <= 60),
  municipio_codigo text check (char_length(municipio_codigo) <= 7),
  criado_em timestamptz not null default now()
);
create index if not exists eventos_criado_em on public.eventos (criado_em desc);

alter table public.eventos enable row level security;
drop policy if exists "evento: qualquer um cria" on public.eventos;
create policy "evento: qualquer um cria" on public.eventos for insert to anon, authenticated with check (true);

-- Projetos novos do Supabase não dão permissão automática: visitantes só INSEREM (não leem nada).
grant insert on public.leads, public.eventos to anon, authenticated;

-- Funil por origem (rode no SQL Editor quando quiser ver os números).
create or replace view public.funil as
select coalesce(origem, '(direto)') as origem,
       count(distinct sessao) filter (where evento = 'abriu')     as abriram,
       count(distinct sessao) filter (where evento = 'comecou')   as comecaram,
       count(distinct sessao) filter (where evento = 'resultado') as viram_resultado,
       count(distinct sessao) filter (where evento = 'pediu_pdf') as pediram_pdf,
       count(distinct sessao) filter (where evento = 'lead')      as viraram_lead
from public.eventos group by 1 order by abriram desc;
revoke all on public.funil from anon, authenticated;

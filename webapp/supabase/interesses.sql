-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pedidos de quem clicou em "Quero meu plano". Cada usuário só cria e lê os próprios;
-- a equipe vê todos pelo painel do Supabase (Table Editor), que usa a chave de serviço.
create table if not exists public.interesses (
  id bigint generated always as identity primary key,
  usuario uuid not null references auth.users (id) on delete cascade,
  email text,
  produto text not null,
  atividade text,
  municipio text,
  municipio_codigo text,
  valor_em_jogo numeric,
  status text not null default 'novo' check (status in ('novo', 'contatado', 'pagou', 'desistiu')),
  criado_em timestamptz not null default now()
);

alter table public.interesses enable row level security;

drop policy if exists "interesse: criar o proprio" on public.interesses;
drop policy if exists "interesse: ler o proprio" on public.interesses;
create policy "interesse: criar o proprio" on public.interesses for insert with check (auth.uid() = usuario);
create policy "interesse: ler o proprio" on public.interesses for select using (auth.uid() = usuario);

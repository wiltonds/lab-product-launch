-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- Tabela de perfis do Lab do Meu Negócio. Cada usuário só lê e grava o próprio perfil (RLS).
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nome text not null,
  whatsapp text not null check (whatsapp ~ '^[1-9][0-9]9[0-9]{8}$'),
  municipio text,
  municipio_codigo text,
  motivacao text,
  fase text,
  experiencia text,
  aceita_marketing boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

drop policy if exists "perfil: ler o proprio" on public.perfis;
drop policy if exists "perfil: criar o proprio" on public.perfis;
drop policy if exists "perfil: editar o proprio" on public.perfis;
create policy "perfil: ler o proprio" on public.perfis for select using (auth.uid() = id);
create policy "perfil: criar o proprio" on public.perfis for insert with check (auth.uid() = id);
create policy "perfil: editar o proprio" on public.perfis for update using (auth.uid() = id);

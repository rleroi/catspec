create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can view projects in their team"
  on public.projects for select
  using (
    team = (select team from public.profiles where id = auth.uid())
  );

create policy "Users can create projects in their team"
  on public.projects for insert
  with check (
    team = (select team from public.profiles where id = auth.uid())
  );

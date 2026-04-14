create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

create policy "Users can view their own team"
  on public.teams for select
  using (
    id in (
      select team from public.profiles where id = auth.uid()
    )
  );

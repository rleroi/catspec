create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  team uuid references public.teams(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view profiles in their team"
  on public.profiles for select
  using (
    team = (select team from public.profiles where id = auth.uid())
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

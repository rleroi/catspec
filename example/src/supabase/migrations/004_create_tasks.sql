create type task_status as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee uuid not null references public.profiles(id),
  project uuid not null references public.projects(id) on delete cascade,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  due_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),

  constraint assignee_same_team check (
    (select team from public.profiles where id = assignee) =
    (select team from public.profiles where id = created_by)
  )
);

alter table public.tasks enable row level security;

create policy "Users can view tasks in their team"
  on public.tasks for select
  using (
    project in (
      select id from public.projects
      where team = (select team from public.profiles where id = auth.uid())
    )
  );

create policy "Users can create tasks in their team"
  on public.tasks for insert
  with check (
    project in (
      select id from public.projects
      where team = (select team from public.profiles where id = auth.uid())
    )
  );

create policy "Users can update tasks in their team"
  on public.tasks for update
  using (
    project in (
      select id from public.projects
      where team = (select team from public.profiles where id = auth.uid())
    )
  );

-- In-app notifications (LLM decision: q1=pick → in-app DB notifications)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  task_id uuid references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can mark their notifications as read"
  on public.notifications for update
  using (user_id = auth.uid());

create index idx_tasks_project_status on public.tasks(project, status);
create index idx_tasks_assignee on public.tasks(assignee);
create index idx_notifications_user_unread on public.notifications(user_id) where not read;

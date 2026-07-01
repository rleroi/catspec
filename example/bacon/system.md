---
name: TaskFlow
stack:
  framework:  Next.js (App Router)
  language:   TypeScript
  database:   Supabase
  auth:       Supabase Auth
  styling:    Tailwind + shadcn/ui
  deploy:     Vercel
---

A simple task management app for small teams.
Create projects, assign tasks, track progress.

All database access MUST use Row Level Security.
Users MUST only access data within their own team.

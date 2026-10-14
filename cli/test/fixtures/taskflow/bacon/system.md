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

## Purpose

A simple task management app for small teams. Create projects, assign
tasks, track progress.

## Requirements

### Requirement: Row Level Security
All database access MUST go through Row Level Security policies.

#### Scenario: Direct table query without a session
- **WHEN** a request reaches any table without a valid session
- **THEN** the database returns zero rows

### Requirement: Team scoping
WHEN a user queries any table, the system MUST return only rows that belong
to that user's team.

#### Scenario: Member of another team
- **GIVEN** a user in Team A
- **WHEN** they request a Task that belongs to Team B
- **THEN** the response contains no Task
- **AND** the status code is 404

### Requirement: Unauthenticated requests
IF a request carries no valid session, THEN the system MUST respond with
401 and MUST NOT reveal whether the resource exists.

#### Scenario: Protected route without session
- **WHEN** a visitor with no session opens /dashboard
- **THEN** they are redirected to /login
- **AND** no data is rendered

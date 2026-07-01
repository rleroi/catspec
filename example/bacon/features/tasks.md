---
feature: Task Management
using: [Supabase]
---

Users can create, assign, and track tasks within their team.

Team is shared with other features — see `bacon/models.md`.

## Model: Project

| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| name | text | |
| team | Team | |
| created_at | timestamp | auto |

## Model: Task

| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| title | text | |
| description | text | nullable |
| assignee | Profile | |
| project | Project | |
| status | todo, in_progress, done | |
| priority | low, medium, high, urgent | |
| due_date | date | nullable |
| created_by | Profile | |
| created_at | timestamp | auto |

Invariants:
- The assignee MUST belong to the same team as created_by.

## Model: Notification

| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| user | Profile | recipient |
| message | text | |
| read | boolean | default false |
| task | Task | nullable |
| created_at | timestamp | auto |

Notifications are in-app only, stored and read from this table. Users MUST
only read their own notifications.

## Flow: Create Task

1. User clicks "New Task"
2. User fills in title, description, assignee, and priority
3. Task is saved with status "todo"

## Flow: Update Status

1. User drags task to a new column or clicks a status button
2. Status changes to the selected value

## Flow: Assign Task

1. User picks a team member from a dropdown
2. System updates the assignee
3. System notifies the new assignee

## View: Dashboard

Show tasks grouped by status in a kanban board. User can filter by assignee
and priority. Show overdue tasks highlighted in red. The dashboard SHOULD
load in under 1 second with up to 500 tasks.

The kanban board's drag-and-drop MUST use @hello-pangea/dnd.

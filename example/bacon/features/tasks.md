---
feature: Task Management
using: [Supabase]
references: [design-tokens]
---

## Purpose

Users create, assign, and track tasks within their team. Team and Profile
are shared with other features, see `bacon/models.md`.

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
| priority | low, medium, high, urgent | default medium |
| due_date | date | nullable |
| created_by | Profile | |
| created_at | timestamp | auto |

Invariants:
- The assignee MUST belong to the same team as created_by.
- The project MUST belong to the same team as created_by.

## Model: Notification

| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| user | Profile | recipient |
| message | text | |
| read | boolean | default false |
| task | Task | nullable |
| created_at | timestamp | auto |

Notifications are in-app only, stored and read from this table.

Invariants:
- A user MUST only read notifications where user is themselves.

## Requirements

### Requirement: New task status
WHEN a task is created, the system MUST set its status to `todo`.

#### Scenario: Create with defaults
- **WHEN** a user creates a task with only a title
- **THEN** the task is saved with status `todo`
- **AND** priority `medium`

### Requirement: Cross-team assignment
IF a task is assigned to a Profile outside the creator's team, THEN the
system MUST reject the change.

#### Scenario: Assignee from another team
- **GIVEN** a user in Team A
- **AND** a Profile in Team B
- **WHEN** the user assigns a task to the Team B profile
- **THEN** the task is not saved
- **AND** an error explains the assignee must be in the same team

### Requirement: Assignment notification
WHEN a task's assignee changes, the system MUST create a Notification for
the new assignee that references the task.

#### Scenario: Reassignment
- **GIVEN** a task assigned to alice
- **WHEN** it is reassigned to bob
- **THEN** one new Notification exists for bob referencing the task

#### Scenario: Reassignment to the same person
- **GIVEN** a task assigned to alice
- **WHEN** it is reassigned to alice
- **THEN** no new Notification is created

### Requirement: Overdue highlight
WHILE a task's due_date is in the past and its status is not `done`, the
dashboard MUST render it with a red highlight.

#### Scenario: Overdue open task
- **GIVEN** a task due yesterday with status `in_progress`
- **WHEN** the dashboard renders
- **THEN** that task card has the overdue highlight

#### Scenario: Overdue but done
- **GIVEN** a task due yesterday with status `done`
- **WHEN** the dashboard renders
- **THEN** that task card has no overdue highlight

### Requirement: Dashboard load time
The dashboard SHOULD load in under 1 second with up to 500 tasks.

#### Scenario: Five hundred tasks
- **GIVEN** a team with 500 tasks
- **WHEN** a member opens the dashboard
- **THEN** the board is interactive within 1 second

## Flow: Create Task

1. User clicks "New Task"
2. User fills in title, description, assignee, and priority
3. Task is saved with status `todo`

## Flow: Update Status

1. User drags task to a new column or clicks a status button
2. Status changes to the selected value

## Flow: Assign Task

1. User picks a team member from a dropdown
2. System updates the assignee
3. System notifies the new assignee

## View: Dashboard

Show tasks grouped by status in a kanban board. User can filter by assignee
and priority. Overdue tasks are highlighted with the `color.overdue` token.

The kanban board's drag-and-drop MUST use `@hello-pangea/dnd`.

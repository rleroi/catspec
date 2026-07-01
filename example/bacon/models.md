Models referenced by more than one feature.

## Model: Team

| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| name | text | |
| created_at | timestamp | auto |

## Model: Profile

| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| display_name | text | |
| avatar_url | text | nullable |
| team | Team | |
| created_at | timestamp | auto |

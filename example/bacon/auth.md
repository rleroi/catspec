---
feature: Authentication
using: [Supabase Auth]
---

Users can sign up with email or Google OAuth. After first login, a Profile
is created automatically. Passwords MUST be at least 10 characters. Session
duration SHOULD be 7 days.

Profile is shared with other features — see `bacon/models.md`.

## Flow: Sign Up

1. User enters email and password, or clicks "Sign in with Google"
2. System creates auth account
3. System sends verification email (email signup only)
4. On first login, system creates a Profile row

## Flow: Sign In

1. User enters credentials or uses Google
2. System redirects to /dashboard

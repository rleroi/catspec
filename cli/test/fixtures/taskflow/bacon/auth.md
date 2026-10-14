---
feature: Authentication
using: [Supabase Auth]
---

## Purpose

Users sign up with email or Google OAuth. A Profile is created on first
login. Profile is shared with other features, see `bacon/models.md`.

## Requirements

### Requirement: Verification email
WHEN a user completes email sign-up, the system MUST send a verification
email.

#### Scenario: Email sign-up
- **WHEN** a visitor signs up with email and password
- **THEN** a verification email is sent to that address
- **AND** the account is not usable until verified

#### Scenario: Google sign-up
- **WHEN** a visitor signs up with Google
- **THEN** no verification email is sent

### Requirement: Profile on first login
WHEN a user signs in for the first time, the system MUST create a Profile
row linked to the auth account.

#### Scenario: First login creates Profile
- **GIVEN** a verified account with no Profile
- **WHEN** the user signs in
- **THEN** a Profile row exists for that account
- **AND** the user lands on /dashboard

### Requirement: Password length
Passwords MUST be at least 10 characters.

#### Scenario: Password too short
- **WHEN** a visitor submits a password of 9 characters
- **THEN** sign-up is rejected
- **AND** the message "Password must be at least 10 characters" is shown

### Requirement: Session length
Sessions SHOULD last 7 days.

#### Scenario: Return within a week
- **GIVEN** a user who signed in 6 days ago
- **WHEN** they open the app
- **THEN** they are still signed in

### Requirement: Account lockout
IF sign-in fails three times within 10 minutes, THEN the system MUST lock
the account for 15 minutes.

#### Scenario: Third failure locks
- **GIVEN** an account with 2 failed sign-in attempts in the last 10 minutes
- **WHEN** a third attempt fails
- **THEN** the account is locked for 15 minutes
- **AND** further attempts are rejected without checking the password

### Requirement: Protected routes
WHILE a user is signed out, WHEN they open any route under /dashboard or
/tasks, the system MUST redirect to /login.

#### Scenario: Signed-out user opens dashboard
- **GIVEN** a visitor with no session
- **WHEN** they open /dashboard
- **THEN** they are redirected to /login

## Flow: Sign Up

1. User enters email and password, or clicks "Sign in with Google"
2. System creates the auth account
3. System sends a verification email (email sign-up only)
4. On first login, system creates a Profile row

## Flow: Sign In

1. User enters credentials or uses Google
2. System redirects to /dashboard

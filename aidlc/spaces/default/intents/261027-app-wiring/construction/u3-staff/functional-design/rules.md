# Business Rules — u3-staff

> Source of truth for U3's decision logic. Groups: BR1 delegation, BR2 invitations, BR3 accepting,
> BR4 resets, BR5 recovery, BR6 the terminal command, BR7 links and tokens, BR8 audit, BR9 screens,
> BR10 role table and allow-list. Sources: ACs in `../../../inception/user-stories/stories.md`, contracts
> C1, C5, C6, C9, decisions Q1–Q12 in `functional-design-questions.md`.

```yaml
rules:
  # ---------------------------------------------------------------- BR1 delegation
  - id: BR1.1
    statement: "Only Owners and Managers reach the staff routes."
    category: authorization
    applies_to: "GET /api/staff, POST /api/staff/invitations, POST /api/staff/:userId/reset-links, /staff"
    trigger: "request or route open"
    logic: "IF the session's role lacks staff.invite THEN 403 (lock screen in the app); /staff is not in that role's navigation."
    violation: "403 forbidden"
    source: [AC1.5.6, Q12]
  - id: BR1.2
    statement: "The Owner invites manager, sales_staff or accountant; a Manager invites sales_staff or accountant."
    category: authorization
    applies_to: "POST /api/staff/invitations"
    trigger: "request"
    logic: "IF the caller is a Manager AND the role is manager THEN refuse. owner is never invitable (schema)."
    violation: "403 forbidden"
    source: [AC1.5.1, Q1]
  - id: BR1.3
    statement: "Reset links: the Owner for any active non-owner member; a Manager for sales_staff and accountant only; never the Owner, never oneself."
    category: authorization
    applies_to: "POST /api/staff/:userId/reset-links"
    trigger: "request"
    logic: "IF target is the Owner OR target is the caller OR (caller is Manager AND target is a Manager) THEN 403; IF target is not in the caller's business or does not exist THEN 404; IF target is inactive THEN 409 conflict."
    violation: "403 / 404 / 409"
    source: [AC1.6.4, Q1]

  # ---------------------------------------------------------------- BR2 invitations
  - id: BR2.1
    statement: "An invitation returns its link once and stores only the token hash."
    category: constraint
    applies_to: "POST /api/staff/invitations"
    trigger: "request"
    logic: "Create a 32-byte token, store SHA-256 hex, return {invitation, link} with 201; no email is sent."
    violation: "n/a"
    source: [AC1.5.1, AC1.5.2, Q2]
  - id: BR2.2
    statement: "An invitation lasts 7 days."
    category: constraint
    applies_to: "Invitation"
    trigger: "creation"
    logic: "expiresAt = now + 7 days; at or after expiresAt it is expired."
    violation: "410 gone on accept"
    source: [AC1.5.5, Q4]
  - id: BR2.3
    statement: "An email that already belongs to a member cannot be invited."
    category: validation
    applies_to: "POST /api/staff/invitations"
    trigger: "request"
    logic: "IF a user of this business has that email, ignoring case, THEN refuse."
    violation: "409 conflict"
    source: [C6, Q5]
  - id: BR2.4
    statement: "A new invitation supersedes a pending one for the same email."
    category: policy
    applies_to: "POST /api/staff/invitations"
    trigger: "a pending invitation exists for the email"
    logic: "In the same transaction set the old row's usedAt to now before inserting the new one."
    violation: "n/a (the old link answers 410)"
    source: [Q5]
  - id: BR2.5
    statement: "The staff list shows members and pending invitations, capped at 200 each."
    category: policy
    applies_to: "GET /api/staff"
    trigger: "request"
    logic: "Return members of the session's business and pending invitations; truncated true above 200; canReset and invitableRoles from BR1.2/BR1.3."
    violation: "n/a"
    source: [C6, Q9]

  # ---------------------------------------------------------------- BR3 accepting
  - id: BR3.1
    statement: "Accepting a valid invitation creates the user in the inviter's business with the invited role and signs them in."
    category: policy
    applies_to: "POST /api/invitations/accept"
    trigger: "request"
    logic: "Lock the invitation by token hash; insert the user (businessId and role from the invitation, active); mark used; audit; commit; then create a session (201, Set-Cookie)."
    violation: "n/a"
    source: [AC1.5.3, AC1.5.4, Q6]
  - id: BR3.2
    statement: "An unknown, used or expired invitation token is refused identically."
    category: validation
    applies_to: "POST /api/invitations/accept"
    trigger: "request"
    logic: "IF no row, OR usedAt set, OR now >= expiresAt THEN 410 {error: gone}."
    violation: "410 gone"
    source: [AC1.5.5, C6 token_outcomes]
  - id: BR3.3
    statement: "Accepting refuses an email that has become a user meanwhile."
    category: constraint
    applies_to: "POST /api/invitations/accept"
    trigger: "request"
    logic: "IF a user with that email exists THEN refuse and leave the invitation unused."
    violation: "409 email_taken"
    source: [Q6]
  - id: BR3.4
    statement: "The new password follows the sign-up rule."
    category: validation
    applies_to: "POST /api/invitations/accept, POST /api/auth/reset"
    trigger: "request"
    logic: "IF the password has fewer than 10 characters THEN refuse before touching the token."
    violation: "400 password_too_short"
    source: [C6, U1 BR2.5]
  - id: BR3.5
    statement: "A staff session carries the business's real id; nothing is ever written with the all-zero id."
    category: constraint
    applies_to: "sessions and audit rows from accept and sign-in"
    trigger: "write"
    logic: "businessId always comes from the invitation or the user row; the all-zero fallback does not exist."
    violation: "test fails"
    source: [AC1.5.4, FR2.6]

  # ---------------------------------------------------------------- BR4 resets
  - id: BR4.1
    statement: "A staff reset link returns its link once, lasts 30 minutes and stores only the hash."
    category: constraint
    applies_to: "POST /api/staff/:userId/reset-links"
    trigger: "request allowed by BR1.3"
    logic: "Create a 32-byte token, store SHA-256 hex, expiresAt = now + 30 minutes, return {link, expiresAt} with 201."
    violation: "n/a"
    source: [AC1.6.4, Q2, Q4]
  - id: BR4.2
    statement: "An unknown, used or expired reset token, or one for an inactive user, is refused identically."
    category: validation
    applies_to: "POST /api/auth/reset"
    trigger: "request"
    logic: "IF no row, OR usedAt set, OR now >= expiresAt, OR the user is inactive THEN 410 {error: gone}."
    violation: "410 gone"
    source: [AC1.6.5, Q7]
  - id: BR4.3
    statement: "Completing a reset sets the password, closes every open reset of that user and ends every session of that user."
    category: policy
    applies_to: "POST /api/auth/reset"
    trigger: "valid token"
    logic: "In one transaction: audit; update the password hash; mark this and every other unused reset of the user used; delete every session of the user. 204; no new session."
    violation: "n/a"
    source: [AC1.6.6, Q7]

  # ---------------------------------------------------------------- BR5 recovery
  - id: BR5.1
    statement: "Recovery answers identically for every email and does nothing else."
    category: policy
    applies_to: "POST /api/auth/recover"
    trigger: "request"
    logic: "Parse the body; take one hash-gate slot so timing matches; return 202 with an empty body. No token, no audit row, no log of the email."
    violation: "n/a"
    source: [AC1.6.1, AC1.6.2, Q3]

  # ---------------------------------------------------------------- BR6 terminal command
  - id: BR6.1
    statement: "The terminal command prints a 30-minute reset link for any active user."
    category: policy
    applies_to: "bun run reset-password <email>"
    trigger: "run on this machine"
    logic: "Find an active user by email ignoring case; create the reset as BR4.1; audit with actor null and via terminal; print one line with the link; exit 0. Unknown or inactive: message on stderr, exit 1, nothing written."
    violation: "exit 1"
    source: [AC1.6.3, Q8]

  # ---------------------------------------------------------------- BR7 links and tokens
  - id: BR7.1
    statement: "Tokens travel only in the URL hash and are removed from the address bar before any request."
    category: constraint
    applies_to: "/accept-invite and /reset screens"
    trigger: "screen load"
    logic: "Read t from the hash query; history.replaceState to drop it; keep it in component memory; never store or log it."
    violation: "test fails"
    source: [AC1.5.3, AC1.6.7, Q10]
  - id: BR7.2
    statement: "Links are never logged and never re-read."
    category: constraint
    applies_to: "server and client"
    trigger: "any log write or later request"
    logic: "The logger redacts link and t (U1); no route returns a stored link; the database holds only hashes."
    violation: "no-secret walk fails"
    source: [AC1.5.2, C6 link_carve_out]

  # ---------------------------------------------------------------- BR8 audit
  - id: BR8.1
    statement: "Every invitation, acceptance, reset link and reset writes one audit row first, without email, token or hash."
    category: constraint
    applies_to: "invite, accept, reset-link (staff and terminal), reset"
    trigger: "write"
    logic: "auth.invite_created {invitationId, role, by}; auth.invite_accepted {invitationId, role, userId}; auth.reset_link_created {targetUserId, by|null, via}; auth.password_reset {userId}; written in the same transaction before the change."
    violation: "test fails"
    source: [AC1.5.7, AC1.6.6, Q11]

  # ---------------------------------------------------------------- BR9 screens
  - id: BR9.1
    statement: "The staff screen lists members and pending invitations and offers only allowed actions."
    category: policy
    applies_to: "/staff"
    trigger: "render"
    logic: "Members table, invitations table, invite form whose role select lists invitableRoles, reset button only where canReset."
    violation: "n/a"
    source: [AC1.5.1, AC1.6.4, Q9]
  - id: BR9.2
    statement: "A created link is shown once with a copy button and discarded on close."
    category: constraint
    applies_to: "LinkSheet"
    trigger: "201 from either link route"
    logic: "Show the link, a copy button and 'এই লিংক একবারই দেখানো হবে'; closing clears it from memory."
    violation: "n/a"
    source: [AC1.5.1, AC1.6.4]
  - id: BR9.3
    statement: "A refused link says to ask for a new one."
    category: policy
    applies_to: "/accept-invite, /reset"
    trigger: "410"
    logic: "Show 'লিংকটি আর কাজ করে না; নতুন লিংক চান'."
    violation: "n/a"
    source: [AC1.5.5, AC1.6.5]
  - id: BR9.4
    statement: "Recovery shows the neutral message for every answer."
    category: policy
    applies_to: "/recover"
    trigger: "submit"
    logic: "After any 202 (or network failure) show 'আপনার মালিক বা এই কম্পিউটারের টার্মিনাল থেকে রিসেট লিংক নিন'; never a link."
    violation: "n/a"
    source: [AC1.6.1]
  - id: BR9.5
    statement: "After accepting, the person is signed in; after a reset, they are sent to sign in."
    category: policy
    applies_to: "/accept-invite, /reset"
    trigger: "success"
    logic: "Accept 201 → /orders with the session; reset 204 → /sign-in with the password-changed message."
    violation: "n/a"
    source: [AC1.5.3, Q10]

  # ---------------------------------------------------------------- BR10 role table and allow-list
  - id: BR10.1
    statement: "U3's routes join the role table, the public allow-list and the link allow-list."
    category: policy
    applies_to: "tests/spec/role-table.ts, src/server/routes.ts"
    trigger: "U3 ships"
    logic: "API rows for the three staff routes (owner, manager) and three public routes; screen row /staff (owner, manager) with nav 'কর্মী'; LINK_ALLOW_LIST = the two staff POST routes; PUBLIC_ALLOW_LIST gains the three public routes."
    violation: "walks fail"
    source: [AC1.5.6, Q12, C5]
```

## Rules summary

| Group | Rules | What they decide |
|-------|-------|------------------|
| BR1 Delegation | BR1.1–BR1.3 | Who reaches staff routes, who may invite which role, who may reset whom |
| BR2 Invitations | BR2.1–BR2.5 | Link once, 7 days, no duplicate member, supersede, the staff list |
| BR3 Accepting | BR3.1–BR3.5 | Creates the user and session, identical 410s, email race, password rule, real business id |
| BR4 Resets | BR4.1–BR4.3 | 30-minute links, identical 410s, every session and open reset closed |
| BR5 Recovery | BR5.1 | Identical neutral answer, nothing written |
| BR6 Terminal | BR6.1 | The command for any active user |
| BR7 Tokens | BR7.1–BR7.2 | Hash fragment only, removed before requests, never logged |
| BR8 Audit | BR8.1 | Four actions, audit-first, no email or token |
| BR9 Screens | BR9.1–BR9.5 | Staff screen, link sheet, refusals, recovery message, after success |
| BR10 Walks | BR10.1 | Role table, public and link allow-lists |

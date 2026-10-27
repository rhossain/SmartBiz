# Interaction Specification — App Wiring (B6)

> Screens: `mockups.md`. Stories: `../user-stories/stories.md`. Component specs follow
> `.claude/knowledge/aidlc-design-agent/component-spec-template.md`. The app uses the existing hash
> router (`src/router/hash-router.ts`), so every route below is written as its hash path (`#/customers`).

## Layout

| Width | Behaviour |
|-------|-----------|
| < 768 px (design floor 360 px) | Single column; Shell navigation is a bottom bar with the first 4 items plus "আরও" (More) for the rest; page gutter `--space-4`; nothing scrolls sideways (AC1.7.5) |
| ≥ 768 px | Shell navigation becomes a left column (220 px); content column max 960 px, centred; lists keep one row per item |

Touch targets are at least 44 × 44 px; adjacent targets have `--space-2` between them.

## Flows

### F1 First run (US1.2)
Persona: Owner. Trigger: opening the app on a database with no business.
1. Any route → app asks the server whether a business exists → none → `#/sign-up`.
2. Fill business name, email, password → "অ্যাকাউন্ট তৈরি করুন" → 201 → signed in → `#/orders` with toast "স্বাগতম".

Error paths: 409 `business_exists` → panel pointing to the Owner and `#/sign-in`; 400 → per-field errors; 503 / unreachable → banner, values kept.

### F2 Sign in and session expiry (US1.3, US1.4)
1. `#/sign-in` → email + password → 200 → saved route or `#/orders`.
2. Later any request answers 401 → the app saves the current route → `#/sign-in` with "আবার সাইন ইন করুন" → after 200 returns to the saved route (AC1.3.5).
3. "সাইন আউট" in the header → 204 → `#/sign-in`; the in-memory stores are cleared.

Error paths: 401 → one generic message, password cleared; 429 → message with minutes, button disabled until the time passes (a countdown is not shown; the button re-enables on the next attempt after the time).

### F3 Invite a member (US1.5)
Persona: Owner or Manager.
1. `#/staff` → "+ আমন্ত্রণ" → inline panel: email, role radio (Manager, Sales Staff, Accountant).
2. "আমন্ত্রণ তৈরি করুন" → 201 with `link` → link sheet opens, focus on "কপি করুন".
3. Copy → "কপি হয়েছে" announced → close → the pending invitation row appears with "৭ দিন বাকি".
4. Invitee opens the link → `#/accept-invite` → the app reads the token, replaces the address with `#/accept-invite` before any request → sets email + password → 201 → signed in.

Error paths: 403 → lock screen; 409 (email already a member) → under the email field; 410 on accept → expired/used panel.

### F4 Password recovery (US1.6)
- Staff member: Owner/Manager on `#/staff` → "রিসেট লিংক" on the member row → 201 → link sheet ("৩০ মিনিট") → member opens `#/reset` → new password twice → 200 → `#/sign-in` with toast. All of that member's sessions end.
- Owner: `#/recover` shows the neutral panel naming the terminal command; the Owner runs it, opens the printed link, and continues as above.

### F5 Record a customer and a note (US3.1, US3.2)
1. `#/customers` → "+ নতুন" → `#/customers/new`.
2. Phone blur → normalised and shown in Bangla digits; a duplicate shows the non-blocking warning with a link.
3. "সংরক্ষণ করুন" → 201 → `#/customers/:id` with toast.
4. On the detail, "+ নোট যোগ করুন" → inline textarea → save → the note list re-renders newest first. "সংশোধন" on a note opens the textarea pre-filled; saving creates a new note that references the old one.

Error paths: 400 → field errors; 403 → lock; 404 on detail → not-found.

### F6 Record a product with variants (US3.4, US3.6)
1. `#/products` → "+ নতুন" → `#/products/new`.
2. Typing axis values updates the preview list (debounced 200 ms); a third axis cannot be added.
3. Each preview row takes stock and minimum (default 0 and 0).
4. "সংরক্ষণ করুন" → 201 → `#/products/:id`.

Error paths: 409 SKU (case-insensitive) → under SKU; 400 → field errors.

### F7 Keep stock right (US3.5)
1. `#/products/:id` → choose an axis value chip → its variants list with stock inputs.
2. Edit stock values → "স্টক সংরক্ষণ" → one request per changed variant; rows that saved show a check, rows that failed keep the typed value and show their error.
3. `#/low-stock` lists every variant with stock < minimum, each with its supplier call link or "সরবরাহকারী দেওয়া নেই".

### F8 Accountant edits cost (US3.7)
`#/products/:id` → "বদলান" next to purchase cost → inline number field → save → PATCH cost → the figure updates; no other field is editable for this role.

### F9 Take an order for a real customer (US4.1, US2.1b)
On the existing order input screens, the customer field becomes a search box over `#/customers` data (same 4-digit rule) and the item field a search over products that then asks for a variant; the order list shows the names.

## Components

### ApiState (new)

| Field | Value |
|---|---|
| Component | `ApiState` |
| Description | Wraps a screen body and renders loading, error and empty states from one request status |
| Category | feedback |

| State | Description | Trigger |
|---|---|---|
| idle/loading | nothing for 300 ms, then 3 skeleton rows | request started |
| ready | renders children | 2xx |
| empty | message + optional primary action | 2xx with zero items |
| unreachable | banner with retry | network error |
| unavailable | banner with retry | 503 |
| forbidden | `LockSheet` | 403 |
| notFound | not-found card | 404 |

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| status | `RequestStatus` (union of the states above) | yes | — | current status |
| empty | `{ message: LKey; action?: { label: LKey; to: RoutePath } }` | no | — | empty-state content |
| onRetry | `() => void` | no | — | retry handler for the banners |
| children | `ReactNode` | yes | — | populated body |

Accessibility: banners use `role="alert"`; skeletons carry `aria-busy="true"` on the region and a visually hidden "লোড হচ্ছে"; focus is not moved by state changes except to the lock screen heading.

### LinkSheet (new)

| Field | Value |
|---|---|
| Component | `LinkSheet` |
| Description | Shows a one-time invitation or reset link with a copy button |
| Category | feedback |

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| link | string | yes | — | the raw link from the response |
| kind | `"invite" \| "reset"` | yes | — | heading and lifetime text (7 days / 30 minutes) |
| onClose | `() => void` | yes | — | drops the link from component state |

Accessibility: `role="dialog"`, `aria-modal="true"`, labelled by its heading; focus moves to "কপি করুন" on open, is trapped inside, Escape closes, focus returns to the opening button; "কপি হয়েছে" is announced via `aria-live="polite"`. If the clipboard API is refused, the field text is selected and the hint "Ctrl+C চাপুন" shows.

### Field (extend existing)
Add `type: "tel" | "number"`, `error?: string` rendered under the input with `id` referenced by `aria-describedby` and `aria-invalid="true"`, `hint?: string`, and `onBlur`. The label stays above the input.

### RiskChip (new, on `Pill`)
Maps 0–3 to `Pill` kind and label: 0 `neutral` "ঝুঁকি নেই", 1 `success` "কম ঝুঁকি", 2 `warning` "মাঝারি ঝুঁকি", 3 `danger` "বেশি ঝুঁকি". The label is always rendered.

### LowStockMark (new, on `Pill`)
`warning` kind, label "কম মজুদ", shown only when stock < minimum.

### SearchBox (new)
Text input with a search icon, `type="search"`, label visually hidden but present; debounces 300 ms; Escape clears it.

### Shell (extend existing)
Navigation items come from one typed list filtered by the user's capabilities (AC5.1.5); the header shows email + role name + "সাইন আউট"; the active item has `aria-current="page"`; a skip link "মূল অংশে যান" is the first focusable element.

## Copy rules
- Every user-facing string is an `LKey` with Bangla and English values in `src/i18n`; Bangla is the default locale.
- Figures and dates use Bangla digits in the Bangla locale (AC3.3.4); typed input accepts both digit sets.
- Error messages say what happened and what to do; no error code is shown to the user.

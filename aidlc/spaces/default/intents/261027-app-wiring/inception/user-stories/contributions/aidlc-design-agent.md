**Collaborator:** aidlc-design-agent

## Contribution

Lens: UX and persona fidelity. The draft gets the security and server behaviour right. For most stories it does not yet say what the person **sees**, though: the screen, the Bangla message, and what they can do next. These are the new states this intent creates, because every screen now waits on a network call that can be slow, fail, or be refused. Below are additions the lead can merge, keyed to existing IDs. The Bangla copy is a proposal for the Owner to confirm. Message keys follow the existing `L(bn, en)` table in `src/i18n/L.ts`.

Evidence from the current code, which these ACs close:
- `src/pres/Shell.tsx`: all five nav links, and the language selector's `<label>`, render `common.save` ("সংরক্ষণ"). The Shell has no phone layout (no media query), and it shows every link to every role.
- `src/router/screens/Recover.tsx`: the submit button says "সংরক্ষণ / Save". The field label is the raw English string `email`.
- `src/router/screens/Accept.tsx`: the invitee has to paste a raw token into a field labelled `token`. Copying a link only works if opening the link fills the token in.
- `src/router/screens/Lock.tsx`: renders `LockSheet` with no `onDismiss`, so a refused person is stuck on the lock screen with no way back or out.
- `src/router/routes.ts`: has no route for customers, products, low stock, suppliers, or creating invitations. `/business` needs `business.edit` (Owner only), yet the US5.1 table lets the Manager create invitations.

### 1. Personas (personas.md)

- **P-1 Karim's context conflicts with the deployment rule.** The persona says "Phone or shop laptop". The server listens on `127.0.0.1` only (team.md §Deployment), so in this intent Karim can only use the shop laptop, and only by signing in on it. Proposed context: "Uses the shop laptop that everyone shares, and types orders copied from Facebook Messenger and WhatsApp, often in Bangla with an Avro or Ridmik phonetic keyboard, or in Banglish. Phone use comes later, when LAN access is decided." Phone-width layout still matters, because the laptop window is often narrow and phone use is the stated next step. See §6.
- **P-2 A shared laptop is the norm, so add it to Rahima's pain points and context.** The Owner and staff share one machine. That is why sign-out (US1.4), the 12-hour idle expiry (AC1.3.3), and "the header shows who is signed in" (AC1.7.3) matter to the persona, not only to security. Proposed addition to Rahima's context: "Staff use the same laptop; she must see at a glance who is signed in and sign out in one step."
- **P-3 Customers are identified by phone number.** For Karim, a customer *is* their mobile number, because that is what arrives in Messenger. This supports making phone the main search key (AC3.3.1) and the customer picker in §5.
- **P-4 Tanvir:** add "visits monthly, so he forgets the UI between visits". Clear labels and read-only fields that explain themselves (AC3.4.4) matter more for him than shortcuts.

### 2. Screen and route inventory (new AC on US5.1, and the stories that own each screen)

US5.1's walk covers every registered route, so the new routes must be named. Proposed **AC5.1.4**: Given the app is built, when the route table is read, then it contains these screens with these capabilities, and the absence walk covers them.

| Route | Screen | Read | Change |
|-------|--------|------|--------|
| `/customers` | Customer list and search (US3.3) | all roles | — |
| `/customers/new` | Customer form (US3.1) | — | Owner, Manager, Sales Staff |
| `/customers/:id` | Customer detail, notes, history (US3.2, US3.3) | all roles | notes: Owner, Manager, Sales Staff |
| `/products` | Product list (US3.4) | all roles | — |
| `/products/new` | Product form with variant builder (US3.4) | — | Owner, Manager |
| `/products/:id` | Product detail, variant matrix, stock (US3.4, US3.5) | all roles | stock: Owner, Manager; cost: plus Accountant |
| `/low-stock` | Low-stock list (US3.5) | all roles | — |
| `/suppliers` | Supplier list and form (US3.6) | all roles | Owner, Manager |
| `/staff` | Invitations: create, list, copy link (US1.5) | Owner, Manager (`staff.invite`) | Owner, Manager |

Invitations belong on `/staff`, gated by `staff.invite`, and not inside `/business`. Otherwise the Manager, who the table allows to invite, can never reach the screen.

### 3. States every networked screen needs (new cross-cutting story)

Proposed **US5.3 — Know what the app is doing.** As any signed-in person, I want every screen to show when it is loading, when it fails, and what to do next, in my language, so that I never lose work or wonder whether a save went through. Must. Requirements: FR4.2, NFR7, NFR9.
- **AC5.3.1 Loading.** Given a request takes longer than 300 ms, when I wait, then the screen shows `common.loading` in a `role="status"` region. The submit button is disabled and says what it is doing ("সংরক্ষণ হচ্ছে…"). A second press sends no second request, so a double tap can never create two orders or two customers.
- **AC5.3.2 Server not running.** Given the browser cannot reach the server, when any call fails, then a banner says "SmartBiz সার্ভার চালু নেই। কম্পিউটারে সার্ভার চালু করে আবার চেষ্টা করুন।" with a "আবার চেষ্টা করুন" button. Typed form content stays in the form.
- **AC5.3.3 Database down (503, AC1.1.4).** Given the API answers 503, when the screen renders, then the banner says "ডাটাবেসের সাথে যোগাযোগ হচ্ছে না। একটু পরে আবার চেষ্টা করুন।" Form content is kept, and the user sees no raw error code or English stack text.
- **AC5.3.4 Session ended (401, AC1.3.3).** Given my session expired while I was on a screen, when my next call gets 401, then I land on sign-in with the message "আপনার সেশন শেষ হয়েছে। আবার সাইন ইন করুন।" After I sign in, I return to the route I was on. Unsaved form content is not written to browser storage, because it can hold customer PII on a shared laptop. The message says so honestly: "সংরক্ষণ না করা তথ্য হারিয়ে গেছে". Only show it when there was a dirty form.
- **AC5.3.5 Refused action inside an allowed screen (403).** Given I can open a screen but the API refuses an action on it (for example the Accountant saving a non-cost field), when the 403 returns, then an inline `role="alert"` message near the action says "এই কাজটি আপনার ভূমিকার জন্য অনুমোদিত নয়।" This is not the full lock screen, and I stay where I am.
- **AC5.3.6 Validation (400).** Given the server refuses my input, when the form re-renders, then each field error shows beside its field in Bangla. Focus moves to the first invalid field, and my typed values are kept.
- **AC5.3.7 Success.** Given a save succeeds, when it returns, then a `Toast` (`role="status"`) confirms it in Bangla ("গ্রাহক সংরক্ষিত হয়েছে"), and the new record appears in its list without a page reload.

### 4. Auth flows (Epic 1)

- **US1.2, first run.** Proposed **AC1.2.5**: Given no business exists, when I open the app, then I land on sign-up with the heading "আপনার ব্যবসা তৈরি করুন", not on sign-in. Once a business exists, the sign-in screen does not offer "নতুন ব্যবসা রেজিস্টার করুন" (the wireframe S1 link). It says "অ্যাকাউন্ট নেই? মালিকের কাছে আমন্ত্রণ লিংক চান।" instead. The AC1.2.2 409 message: "এই ব্যবসা আগেই তৈরি হয়েছে। যোগ দিতে মালিকের কাছে আমন্ত্রণ লিংক চান।"
- **US1.3, sign-in screen.** Proposed **AC1.3.6**: the field labels, placeholder and button come from the L table (ইমেইল, পাসওয়ার্ড, "সাইন ইন করুন"). The password field has a show/hide toggle with an accessible name. Focus lands on the email field. Enter submits. The generic failure in AC1.3.4 reads "ইমেইল বা পাসওয়ার্ড সঠিক নয়।" and never says which one was wrong. Proposed **AC1.3.7**: Given the sign-in rate limit is hit (`src/auth/rate-limit.ts`: 5 per 15 minutes), when I try again, then I see "অনেকবার ভুল চেষ্টা হয়েছে। {n} মিনিট পরে আবার চেষ্টা করুন।" with Bangla digits. The API status for this case (429, or 403 per FR3.4) needs a decision. I am flagging it, not choosing it.
- **US1.4, sign-out.** Proposed **AC1.4.3**: sign-out is one press from the header on every screen, on desktop and phone layouts. Afterwards the sign-in screen shows "আপনি সাইন আউট করেছেন।" and pressing the browser's Back button shows no record data from the cache. API responses already carry `no-store` (team.md); the app must also clear its in-memory stores.
- **US1.5, invitation create (screen `/staff`).** Proposed ACs:
  - **AC1.5.5** The form asks for email and role. The role options are Manager, Sales Staff and Accountant, shown in Bangla (ম্যানেজার, বিক্রয়কর্মী, হিসাবরক্ষক). Owner is not an option.
  - **AC1.5.6** After creation, the screen shows the full link in a read-only text field, the expiry date and time in Bangla, and a "লিংক কপি করুন" button. Pressing the button announces "লিংক কপি হয়েছে" in a `role="status"` region. If the clipboard is not available, the text field is focused and its text selected so Ctrl+C works. The screen states: "এই লিংক একবারই দেখানো হবে। হারালে নতুন আমন্ত্রণ তৈরি করুন।"
  - **AC1.5.7** The screen lists invitations with status (অপেক্ষমাণ / গৃহীত / মেয়াদোত্তীর্ণ), email and role. The token is never shown again (FR2.8).
- **US1.5, invitation accept (screen `/accept`).** Proposed ACs:
  - **AC1.5.8** Given I open the copied link, then the token is read from the link, and no token field is shown. The token is removed from the address bar (`history.replaceState`) so it does not stay in history on a shared laptop. The link should carry the token in the hash fragment, which is never sent in a request or a Referer header.
  - **AC1.5.9** The screen shows the business name, my email (read-only) and the role I am invited as, before I choose a password. The password rules are shown before I type, not after a failure. After success I am signed in and land on my role's home screen.
  - **AC1.5.10** An expired or used link (AC1.5.4) shows "এই আমন্ত্রণ লিংকের মেয়াদ শেষ অথবা আগে ব্যবহার হয়েছে। মালিকের কাছে নতুন লিংক চান।" with no form.
- **US1.6, recovery.** See OBJECT below. The flow as drafted fails for its own persona, and AC1.6.1 and AC1.6.2 contradict each other. Whatever flow is chosen, the reset screen (`/reset`) follows the same pattern as AC1.5.8–AC1.5.10: token read from the link and removed from the address bar, a Bangla expired-link message, and a submit button labelled "পাসওয়ার্ড বদলান", not "Save".

### 5. Catalog and orders (Epics 3 and 4)

- **AC3.1.2, phone entry.** Extend it: Given I type the phone with Bangla digits (০১৭…), spaces, hyphens, or a `+880` / `880` prefix, when I save, then it is normalised to `01XXXXXXXXX` before validation. Bangla phonetic keyboards produce Bangla digits, so refusing them would refuse the main persona's normal typing. The refusal shows beside the field: "ফোন নম্বর ১১ সংখ্যার হতে হবে, যেমন ০১৭১২৩৪৫৬৭৮।" The field uses `inputmode="tel"`.
- **AC3.1.3, risk chip.** The chip carries a text label (নেই / কম / মাঝারি / বেশি), not colour alone (WCAG 1.4.1), with contrast from the tokens. Level 0 shows no chip in lists, so the list is not cluttered with "none". The picker is a labelled radio group reachable by arrow keys.
- **Open question for the Owner, not added as a requirement:** two customers with the same phone. FR5 says nothing about it. The UX recommendation is a non-blocking warning on save, "এই নম্বরে আগে থেকেই একজন গ্রাহক আছেন: {name}", with a link to that customer. This prevents the commonest duplicate. It needs the Owner's decision and an FR before it becomes an AC.
- **US3.3, list and search.** Proposed ACs:
  - **AC3.3.4 Empty state.** With no customers, the list shows "এখনো কোনো গ্রাহক নেই।" and a "প্রথম গ্রাহক যোগ করুন" button. People who may only read see the text without the button.
  - **AC3.3.5 No results.** A search with no matches says "“{q}” এর সাথে কোনো গ্রাহক মেলেনি", which is distinct from the empty state. Search runs as I type, after a short pause, and phone search accepts Bangla digits as in AC3.1.2.
- **AC3.3.2, "not available yet".** Dues and payments must render as the text "এখনো চালু হয়নি", never as `৳০` or a blank. A zero would tell Karim the customer owes nothing, which is a false money figure (C-6 spirit: every money figure states its basis). The wireframe S3 "বাকি" column follows the same rule. A customer with no orders shows "এই গ্রাহকের কোনো অর্ডার নেই।"
- **US3.2, notes.** The note list shows the author and a Bangla date. A revised note shows "সংশোধিত" and keeps earlier versions collapsed behind "আগের সংস্করণ দেখুন". That is progressive disclosure, with nothing hidden or deleted.
- **US3.4, product form.** Proposed ACs:
  - **AC3.4.5 Money entry.** Cost and price are typed in taka (৳). Bangla or Latin digits are accepted, and so are up to two decimal places. They are stored as paise, which keeps FR6.2. The display uses ৳ with Bangla digits in the bn locale.
  - **AC3.4.6 Variant preview.** Before saving, the builder shows how many variants will be created ("১২টি ভ্যারিয়েন্ট তৈরি হবে") and their SKU suffixes, so a mistyped axis value is caught before it creates a dozen wrong variants. An axis with no values is shown as an inline error before submit, and is also refused by the server (AC3.4.3).
  - **AC3.4.7 Accountant (AC3.4.4).** The Accountant sees non-cost fields as plain text, not as disabled inputs, with one line: "আপনি শুধু ক্রয়মূল্য বদলাতে পারেন।" Only the cost field is editable.
  - **AC3.4.8 Empty product list.** "এখনো কোনো পণ্য নেই।" plus a "পণ্য যোগ করুন" button for Owner and Manager. The S4 count "কম মজুদ: {n}" links to `/low-stock`.
- **US3.5, stock and low stock.** Proposed ACs:
  - **AC3.5.4** "Low" is shown with text and an icon ("কম মজুদ"), not colour alone. A negative stock value is refused inline.
  - **AC3.5.5** The supplier's phone shows as selectable text with a copy button, beside the `tel:` link. On the shop laptop, which is the only device in this intent, `tel:` usually does nothing.
  - **AC3.5.6** With nothing below minimum, the low-stock screen says "কোনো পণ্যের মজুদ কম নেই।" as a positive state, not an empty table.
- **US4.1, picking a customer and a variant.** Proposed ACs:
  - **AC4.1.4** On the order screens, the customer picker searches by phone or name as I type, using AC3.1.2 normalisation. If there is no match, it offers "নতুন গ্রাহক যোগ করুন", prefilled with the typed phone, without leaving the order. Busy, interrupted work (persona) should not lose the order in progress.
  - **AC4.1.5** The variant picker shows the product name, the variant (for example "লাল / XL") and the current stock. A low or zero stock variant is marked with text but can still be chosen, because stock movements from orders are out of scope.
  - **AC4.1.6** (with AC4.1.3) When a parsed item matches more than one product, the paste-parse screen asks me to choose, and lists only the candidates from that item's own words. When it matches none, the item stays in the existing unattached state (`paste-unattached`) with a "পণ্য বেছে নিন" action.

### 6. Shell, lock screen, phone width, keyboard (US1.7 and US5.1)

- **AC1.7.3, extended.** Nav labels are the module names from the wireframe navigation (অর্ডার, গ্রাহক, পণ্য, সরবরাহকারী, …). The language selector is labelled "ভাষা / Language", and its options read "বাংলা" and "English", not `bn` and `en`. The header shows the role in the current language (মালিক / ম্যানেজার / বিক্রয়কর্মী / হিসাবরক্ষক). The language choice survives a reload. That is a per-viewer convenience; nothing sensitive is stored.
- **Proposed AC5.1.5 (absence in the nav).** Given a role, when the Shell renders, then nav links to routes that role cannot open are absent, not shown with a lock. This is the "gating by absence" rule (team.md §Testing Posture), applied to the nav as well as to routes.
- **Proposed AC5.1.6 (lock screen is never a dead end).** Given I open a forbidden route by URL or Back, when the lock screen shows, then it says `lock.message`, focus moves to its heading, and it offers "হোমে ফিরে যান" (my role's first allowed route) and "সাইন আউট". It contains no data from the forbidden screen; no data is fetched before the gate.
- **Proposed AC1.7.5 (phone width).** Given a 360 × 640 viewport, when each U1, U3 and new catalog route renders in the real-browser harness, then there is no horizontal page scroll, and the nav collapses to the wireframe's menu or bottom tabs. Tables of five or more columns (the wireframe S3 and S4 lists, the variant matrix) become one card per row with label–value pairs. The variant matrix becomes a list with one variant per line. Touch targets are at least 44 × 44 px. This is geometry, so it belongs in the real-browser harness and not in happy-dom (team.md: real-browser harnesses do geometry and layout).
- **Proposed AC1.7.6 (keyboard).** On every route change, focus moves to the page `h1`, and the title is announced. A "মূল অংশে যান" skip link precedes the nav. Every action in §§3–5 can be reached and used with Tab, Enter, Space and the arrow keys, with the focus ring from `--focus-ring`.

### 7. Suggested mapping to the US5.2 check

AC5.2.2 renders U1 and U3 routes for the Owner. Extend it to the §2 catalog routes, and to the lock screen for one forbidden route per non-Owner role, so the visible refusal is checked as well as the 403.

## Positions

- AGREE: Four role personas with the Owner primary (Q1) — the role × capability matrix is the binding model, matching the MVP's learned rule. The persona details above are enrichments, not a new persona.
- AGREE: Copy-the-link invitations with no email (Q5, AC1.5.1) — this is believable for a single shop on one laptop, where the Owner hands staff the link through Messenger or WhatsApp. It is usable only once AC1.5.6 and AC1.5.8 hold; today's `Accept.tsx` raw-token field defeats it.
- AGREE: Manual risk level 0–3 shown as a chip (Q3) and the call-link supplier action (Q4) — both are honest minima. The chip must carry text, and the phone must be copyable on a laptop (AC3.5.5).
- OBJECT: US1.6 recovery as drafted — Rahima has forgotten her password and cannot sign in. Under AC1.6.1, whoever is at the shared laptop and types her email gets a reset link on screen, which is account takeover by anyone in the shop. AC1.6.1 (a known email shows a link) also contradicts AC1.6.2 (an unknown email gives the same response). My proposal: (a) a signed-in Owner or Manager can create a reset link for a staff member from `/staff`, using the same copy-link pattern; (b) the Owner's own reset runs from a local terminal command that prints the link, which is the same trust boundary as access to the database and `.env`; (c) `/recover` then tells staff "মালিকের কাছে রিসেট লিংক চান" and tells the Owner the command to run. Architect and compliance should confirm, and this needs to go back to the Owner because it changes the Q5 answer.
- OBJECT: No route for invitations, catalog screens or low stock — US1.5, US3.x and US5.1 cannot be checked by absence over routes that are not named. Invitations on `/business` would lock out the Manager, whom the role table allows to invite. Add AC5.1.4 and a `/staff` route gated by `staff.invite`.
- OBJECT: Missing loading, failure, session-expiry and refused-action states — this intent is the first one where every screen depends on a network call. Without US5.3, double submits create duplicate orders, and a 503 or 401 drops the person's typed work with no Bangla explanation. These are user-visible outcomes of FR4.2 and NFR7, not new scope.
- OBJECT: Karim's context "Phone or shop laptop" — it contradicts the `127.0.0.1`-only deployment rule. Change it to the shared shop laptop, and keep the phone-width AC (AC1.7.5) as the forward-compatible layout requirement.
- OBJECT: AC3.3.2 leaves "not available yet" open to rendering as zero — dues must render as text and never as `৳০`, because a zero is a false money figure to the person reading it.

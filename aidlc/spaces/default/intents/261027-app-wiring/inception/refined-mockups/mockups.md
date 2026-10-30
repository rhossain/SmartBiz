# Refined Mockups — App Wiring (B6)

> Source: `../user-stories/stories.md` (US1.1–US5.4), `../requirements-analysis/requirements.md`,
> answers in `refined-mockups-questions.md`. Layout reference: `prototype/js/screens-catalog.js` and
> `screens-system.js` (read-only guidance). Rough mockups were skipped in Ideation, so nothing here
> is carried from a wireframe. Mid-fidelity: real Bangla labels, real structure, token colours named
> rather than drawn. Every screen is drawn at 360 px; wider layouts follow `interaction-spec.md` §Layout.
> Text fallback: each mockup is followed by its element list, so the box drawing is never the only description.

## Screen inventory

| Route | Screen | Bolt | Stories | Gate (capability) | Status today |
|-------|--------|------|---------|-------------------|--------------|
| `/sign-up` | First-run sign-up | 1 | US1.2 | public, only while no business exists | `SignUp.tsx` exists, not mounted |
| `/sign-in` | Sign-in | 1 | US1.3 | public | `SignIn.tsx` exists |
| `/recover` | Forgot password | 1 | US1.6 | public | `Recover.tsx` (to change: neutral message) |
| `/reset` | Set a new password | 1 | US1.6 | public, token in hash | `Reset.tsx` exists |
| `/accept-invite` | Accept invitation | 1 | US1.5 | public, token in hash | `Accept.tsx` exists |
| `/staff` | Staff and invitations | 1 | US1.5, US1.6 | `staff.invite` | new |
| `/orders`, order screens | Orders | 1 | US2.1b | `business.view` / mutate | B2 screens, mounted |
| `/customers` | Customer list | 2 | US3.3 | `business.view` | new (prototype `customers`) |
| `/customers/new` | New customer | 2 | US3.1 | order mutate set | new |
| `/customers/:id` | Customer detail | 2 | US3.2, US3.3 | `business.view` | new (prototype `customer`) |
| `/products` | Product list | 2 | US3.4 | `business.view` | new (prototype `products`) |
| `/products/new` | New product | 2 | US3.4 | `money.mutate.full` | new (prototype `newProduct`) |
| `/products/:id` | Product detail | 2 | US3.4, US3.5, US3.7 | `business.view`; edit by role | new |
| `/low-stock` | Low stock | 2 | US3.5 | `business.view` | new (prototype `inventory/low`) |
| `/suppliers` | Suppliers | 2 | US3.6 | `business.view`; edit `money.mutate.full` | new |
| any | Lock screen | 1 | US5.1 | — | `LockSheet.tsx` |
| any | Not found, server down | 1 | US1.7, US5.4 | — | new states |

## 1. First-run sign-up — `/sign-up` (US1.2)

```
┌──────────────────────────────────┐
│ SmartBiz                          │
│                                   │
│ আপনার ব্যবসা শুরু করুন              │  h1
│ এই কম্পিউটারে প্রথমবার — মালিকের       │
│ অ্যাকাউন্ট তৈরি হবে।                  │
│                                   │
│ ব্যবসার নাম                         │
│ [______________________________]  │
│ ইমেইল                              │
│ [______________________________]  │
│ পাসওয়ার্ড (কমপক্ষে ১০ অক্ষর)          │
│ [______________________________]  │
│                                   │
│ [   অ্যাকাউন্ট তৈরি করুন   ] primary │
└──────────────────────────────────┘
```
Elements: heading; one explanatory line; three labelled fields; one primary button. Shown instead of
sign-in whenever `GET /api/health`'s companion check reports no business (AC1.2.1).
- **409 `business_exists`:** the form is replaced by "এই ব্যবসা আগেই তৈরি হয়েছে। মালিকের কাছে আমন্ত্রণ লিংক চান।" with a link to `/sign-in` (AC1.2.3).
- **503:** the server-down banner (§14) above the form; typed values stay (AC1.2.5).

## 2. Sign-in — `/sign-in` (US1.3)

```
┌──────────────────────────────────┐
│ SmartBiz                          │
│ সাইন ইন                            │  h1
│ ইমেইল        [__________________]  │
│ পাসওয়ার্ড     [__________________]  │
│ [        সাইন ইন করুন        ]      │
│ পাসওয়ার্ড ভুলে গেছেন?  → /recover      │
│ ┌ ইমেইল বা পাসওয়ার্ড ভুল ─────────┐   │  error, shown after 401
│ └──────────────────────────────┘   │
└──────────────────────────────────┘
```
Elements: heading; two fields; primary button; recover link; one error region (`role="alert"`).
- **401:** one message for wrong password and unknown email (AC1.3.6); the password field is cleared, the email kept.
- **429:** "অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন।" with the minutes from the response (AC1.3.7); the button is disabled until then.
- **After sign-in:** returns to the route saved when the 401 happened (AC1.3.5), else `/orders`.

## 3. Forgot password — `/recover` (US1.6)

```
┌──────────────────────────────────┐
│ পাসওয়ার্ড ভুলে গেছেন                  │
│ ইমেইল  [________________________]  │
│ [      রিসেট লিংক চান       ]       │
├──────────────────────────────────┤
│ ⓘ আপনার মালিক বা এই কম্পিউটারের       │  after submit, always
│   টার্মিনাল থেকে রিসেট লিংক নিন।         │
│   মালিক: টার্মিনালে লিখুন              │
│   bun run reset-password <ইমেইল>     │
└──────────────────────────────────┘
```
The same panel follows any email (AC1.6.1); no link ever appears here. The command line is shown in a
`<code>` element with `lang="en"`.

## 4. Set a new password — `/reset` and accept invitation — `/accept-invite` (US1.5, US1.6)

```
┌──────────────────────────────────┐
│ নতুন পাসওয়ার্ড দিন                   │  /accept-invite: "দলে যোগ দিন"
│ (accept only) আপনাকে "বিক্রয়কর্মী"    │
│  হিসেবে আমন্ত্রণ জানানো হয়েছে          │
│ ইমেইল (accept only) [___________]   │
│ নতুন পাসওয়ার্ড [_________________]   │
│ আবার লিখুন   [_________________]   │
│ [        সংরক্ষণ করুন        ]       │
└──────────────────────────────────┘
```
- The token is read from the hash and the address bar is replaced with the bare route before the first request (AC1.5.3, AC1.6.7).
- **410:** "লিংকটির মেয়াদ শেষ বা আগেই ব্যবহার হয়েছে। নতুন লিংক চান।" and no form (AC1.5.5, AC1.6.5).
- **Success:** reset goes to `/sign-in` with a toast "পাসওয়ার্ড বদলানো হয়েছে"; accept signs the new member in and opens `/orders`.

## 5. Staff and invitations — `/staff` (US1.5, US1.6)

```
┌──────────────────────────────────┐
│ ← সদস্য ও দায়িত্ব                   │
│ [ + আমন্ত্রণ ] primary               │
│ ┌──────────────────────────────┐ │
│ │ রহিমা · মালিক                  │ │
│ │ owner@…            (আপনি)     │ │
│ ├──────────────────────────────┤ │
│ │ করিম · বিক্রয়কর্মী              │ │
│ │ karim@…   [রিসেট লিংক]          │ │
│ ├──────────────────────────────┤ │
│ │ অপেক্ষমাণ আমন্ত্রণ                │ │
│ │ nadia@… · ম্যানেজার · ৬ দিন বাকি   │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```
- **Invite form** (inline panel under the button): email; role as radio buttons (Manager, Sales Staff, Accountant — never Owner); "আমন্ত্রণ তৈরি করুন". On 201 the one-time link sheet (§13) opens.
- **Reset link** button per member: hidden on the Owner's row for a Manager (AC1.6.4); opens the same sheet.
- **Empty:** "এখনো কোনো সদস্য নেই। প্রথম আমন্ত্রণ পাঠান।"
- Not in navigation for Sales Staff and the Accountant (AC1.5.6).

## 6. Customer list — `/customers` (US3.3)

```
┌──────────────────────────────────┐
│ ক্রেতা          ১২ জন     [+ নতুন]  │
│ 🔍 [নাম বা মোবাইল নম্বর_________]   │
│ ┌──────────────────────────────┐ │
│ │ (স) সালমা বেগম       [বেশি ঝুঁকি] › │ │
│ │     ০১৭১১…৪৫৬৭ · মিরপুর         │ │
│ ├──────────────────────────────┤ │
│ │ (আ) আরিফ হোসেন [কোনো ঝুঁকি নেই] › │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```
- Search runs 300 ms after typing stops; digits-only input under 4 digits searches names only (AC3.3.1), with the hint "নম্বর দিয়ে খুঁজতে কমপক্ষে ৪টি সংখ্যা লিখুন".
- Risk chip: text label always, colour secondary (AC3.1.4).
- **Empty (no customers):** "এখনো কোনো ক্রেতা নেই" + "প্রথম ক্রেতা যোগ করুন" (hidden for the Accountant). **Empty (no match):** "এই নামে বা নম্বরে কেউ নেই" + "খোঁজ মুছুন".
- "+ নতুন" hidden for the Accountant (AC3.1.5).

## 7. New customer — `/customers/new` (US3.1)

```
┌──────────────────────────────────┐
│ ← নতুন ক্রেতা                        │
│ নাম *            [______________]  │
│ মোবাইল নম্বর *     [______________]  │
│  উদাহরণ: ০১৭১১২২৩৩৪৪               │
│ ⚠ এই নম্বরে আগে থেকেই আছেন: সালমা বেগম → │  non-blocking (AC3.1.3)
│ ঠিকানা           [______________]  │
│ ঝুঁকি (•) কোনো ঝুঁকি নেই ( ) কম        │
│       ( ) মাঝারি ( ) বেশি              │
│ নোট (ঐচ্ছিক)      [______________]  │
│ [       সংরক্ষণ করুন       ]         │
└──────────────────────────────────┘
```
- The phone is normalised on blur and shown back in Bangla digits (AC3.1.2); an invalid one gets "সঠিক মোবাইল নম্বর দিন (০১ দিয়ে শুরু, ১১ সংখ্যা)".
- Risk defaults to "কোনো ঝুঁকি নেই" (0); the radio labels use AC3.1.4's words (কোনো ঝুঁকি নেই / কম / মাঝারি / বেশি).
- **Success:** opens `/customers/:id` with the toast "ক্রেতা যোগ হয়েছে".

## 8. Customer detail — `/customers/:id` (US3.2, US3.3)

```
┌──────────────────────────────────┐
│ ← ক্রেতা                 [সম্পাদনা] │
│        (স)                        │
│     সালমা বেগম                     │
│  ০১৭১১২২৩৩৪৪ · মিরপুর ১০            │
│  [বেশি ঝুঁকি]                       │
│  [ কল করুন ]  [ নতুন অর্ডার ]         │
├──────────────────────────────────┤
│ লেনদেন ও বাকি                        │
│  এখনো চালু হয়নি                     │  never ৳০ (AC3.3.3)
├──────────────────────────────────┤
│ নোট              [+ নোট যোগ করুন]   │
│  ২৬ অক্টো · অগ্রিম নিয়ে পাঠাবেন        │
│   ↳ আগের নোট সংশোধন: ১২ অক্টো …       │
├──────────────────────────────────┤
│ অর্ডারের ইতিহাস  ৩                    │
│  ORD-0042 · ডেলিভারি হয়েছে [অর্জিত]    │
│  ORD-0031 · ফেরত      [বিক্রি হয়নি]   │
└──────────────────────────────────┘
```
- Status-bucket labels use the existing `BasisPill` (earned / realized / pipeline / no sale) (AC3.3.2).
- A note revision is written as a new note; the old one is shown under it as "আগের নোট" (AC3.2.1, AC3.2.2).
- **404:** the not-found state (§14) (AC3.3.5). **No orders:** "এখনো অর্ডার নেই — এই ক্রেতা যোগ হয়েছেন কিন্তু কিছু কেনেননি।"
- "সম্পাদনা" and "নতুন অর্ডার" hidden for the Accountant.

## 9. Product list — `/products` (US3.4)

```
┌──────────────────────────────────┐
│ পণ্য          ৮টি পণ্য     [+ নতুন]  │
│ 🔍 [পণ্যের নাম বা কোড____________]   │
│ ┌──────────────────────────────┐ │
│ │ 🏷 সুতি থ্রি-পিস  [২টি কম]      › │ │
│ │   TP-01 · ৬ ধরন · স্টক ৪২  ৳১,২৫০ │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```
- The price shows for roles that see price; "ক্রয় ৳৮০০" (cost) shows for Owner, Manager, Accountant only.
- **Empty:** "এখনো কোনো পণ্য নেই" + "প্রথম পণ্য যোগ করুন" (Owner and Manager only).

## 10. New product — `/products/new` (US3.4, US3.6)

```
┌──────────────────────────────────┐
│ ← নতুন পণ্য                         │
│ নাম *       [____________________] │
│ কোড (SKU) * [________]             │
│ বিক্রয়মূল্য ৳ * [______] ক্রয়মূল্য ৳ [____] │
│ সরবরাহকারী  [▾ বেছে নিন / নেই      ]  │
│ ধরন (ঐচ্ছিক, সর্বোচ্চ ২টি)              │
│  নাম [সাইজ ]  মান [S, M, L     ]     │
│  নাম [রং   ]  মান [লাল, নীল     ]     │
│  [+ আরেকটি ধরন] (disabled at 2)     │
│ ┌ ৬টি ধরন তৈরি হবে ─────────────┐   │
│ │ TP-01-S-লাল  স্টক [0] ন্যূনতম [2] │   │
│ │ …                              │   │
│ └──────────────────────────────┘   │
│ [       সংরক্ষণ করুন       ]         │
└──────────────────────────────────┘
```
- Preview list updates as values are typed; each row has stock and minimum (AC3.4.1).
- **409 SKU:** under the SKU field "এই কোড আগেই ব্যবহার হয়েছে" (AC3.4.2). **400:** per-field errors (AC3.4.3); the third axis button is disabled, not erroring.

## 11. Product detail — `/products/:id` (US3.4, US3.5, US3.7)

```
┌──────────────────────────────────┐
│ ← পণ্য                   [সম্পাদনা] │
│ সুতি থ্রি-পিস · TP-01               │
│ বিক্রয় ৳১,২৫০ · ক্রয় ৳৮০০ [বদলান]    │  [বদলান] = cost only (Accountant)
│ সরবরাহকারী: রহমান ট্রেডার্স ☎ কল       │
├──────────────────────────────────┤
│ ধরন: সাইজ  [S] [M] [L]              │  one axis value at a time
│  M-লাল   স্টক [ 1 ]  ন্যূনতম ২ [কম মজুদ]│
│  M-নীল   স্টক [ 5 ]  ন্যূনতম ২         │
│                [স্টক সংরক্ষণ]          │
└──────────────────────────────────┘
```
- Low is stock < minimum, shown with the text "কম মজুদ" (AC3.5.2).
- No supplier: "সরবরাহকারী দেওয়া নেই" + "সরবরাহকারী বেছে নিন" (AC3.5.4).
- **Role variants:** Owner/Manager edit everything including stock; the Accountant sees only "ক্রয়মূল্য [বদলান]" editable (AC3.7.2); Sales Staff see read-only.

## 12. Low stock — `/low-stock` (US3.5) and suppliers — `/suppliers` (US3.6)

```
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│ কম মজুদ          ৪টি ধরন            │   │ সরবরাহকারী        [+ নতুন]          │
│ সুতি থ্রি-পিস · M-লাল                 │   │ রহমান ট্রেডার্স                      │
│  স্টক ১ / ন্যূনতম ২                   │   │  ০১৮১১…  ☎ কল · ৩টি পণ্য           │
│  রহমান ট্রেডার্স ☎ কল      [পণ্য ›]   │   │ নতুন সরবরাহকারী (inline form)        │
│ লন কুর্তি · L                         │   │  নাম [_____] মোবাইল [_____]         │
│  সরবরাহকারী দেওয়া নেই  [বেছে নিন ›]    │   │  [সংরক্ষণ]                         │
└──────────────────────────────────┘   └──────────────────────────────────┘
```
- **Low-stock empty:** "সব ধরনের মজুদ ঠিক আছে" (a positive empty state, no action).
- **Suppliers empty:** "এখনো কোনো সরবরাহকারী নেই" + add form opened. The phone uses the customer phone rule.

## 13. One-time link sheet (US1.5, US1.6; Q7)

```
┌──────────────────────────────────┐
│ আমন্ত্রণ লিংক                     ✕  │  role="dialog" aria-modal
│ এই লিংকটি একবারই দেখানো হবে।          │
│ [http://127.0.0.1:5173/#/accept…] │  read-only
│ [ কপি করুন ]   → "কপি হয়েছে" (live)   │
│ ৭ দিন পর মেয়াদ শেষ হবে।               │  reset: "৩০ মিনিট"
│ [ বন্ধ করুন ]                         │
└──────────────────────────────────┘
```

## 14. Shared states (US5.4, US5.1, US1.7)

| State | Look | Copy (Bangla) | Action |
|-------|------|---------------|--------|
| Loading (> 300 ms) | 3 skeleton rows in the card | (screen reader) "লোড হচ্ছে" | — |
| Server unreachable | banner at top, error colour + icon | "সার্ভারের সাথে যোগাযোগ হচ্ছে না" | [আবার চেষ্টা করুন] |
| 503 | same banner | "ডাটাবেস চালু নেই। কিছুক্ষণ পর আবার চেষ্টা করুন।" | [আবার চেষ্টা করুন] |
| 401 | redirect to `/sign-in` | "আবার সাইন ইন করুন" | returns to saved route |
| 403 / lock | `LockSheet` full screen | "এই অংশ আপনার দায়িত্বের বাইরে" + what is missing | [হোমে যান] (never a dead end, AC5.1.6) |
| 404 / unknown route | card with icon | "পাওয়া যায়নি" | [হোমে যান] |
| 409 conflict | inline under the form | the specific message per kind | keep values |
| Saving | button shows "সংরক্ষণ হচ্ছে…", disabled | — | prevents double submit (AC5.4.4) |
| Saved | toast, `aria-live="polite"`, 5 s | e.g. "সংরক্ষণ হয়েছে" | — |

## 15. Shell navigation by role (AC5.1.5, AC1.7.3)

> **Updated 2026-10-30** to the shipped list (`navFor` in `src/router/App.tsx`, asserted in
> `tests/unit/shell.test.tsx`). The order below is the sidebar and drawer order.

| Nav item | Owner | Manager | Sales Staff | Accountant |
|----------|:-----:|:-------:|:-----------:|:----------:|
| অর্ডার (Orders) | ✓ | ✓ | ✓ | ✓ |
| ক্রেতা (Customers) | ✓ | ✓ | ✓ | ✓ |
| পণ্য (Products) | ✓ | ✓ | ✓ | ✓ |
| কম মজুদ (Low stock) | ✓ | ✓ | ✓ | ✓ |
| সরবরাহকারী (Suppliers) | ✓ | ✓ | ✓ | ✓ |
| দৈনিক কার্ড (Daily card) | ✓ | — | — | — |
| বিশ্লেষণ (Insights) | ✓ | — | — | — |
| অডিট ট্রেইল (Audit trail) | ✓ | ✓ | — | ✓ |
| কর্মী (Staff) | ✓ | ✓ | — | — |
| ব্যবসা (Business) | ✓ | — | — | — |
| সেটিংস (Settings) | ✓ | ✓ | ✓ | ✓ |

The account block shows the signed-in email, the role name and a "সাইন আউট" button (US1.4).
Where it sits on each screen size is in §18.1.

## 16. Visual refresh, as built (2026-10-28)

> **Superseded on look by §18 (2026-10-30).** The layouts below still hold for structure, copy and
> states; colours, the header and the phone layout follow §18.

> Added after the pre-demo review found the screens plain and, in places, run together ("2Mনীল",
> "লাইন 1পণ্য"). These mockups record the shipped look at desktop width (≥ 760 px); below 760 px every
> multi-column row stacks into one column (verified at 360 px by `scripts/browser-check.ts`, 16
> screens). Tokens and the visual language are in `design-system-mapping.md` §Tokens used. Where this
> section and §1–§15 differ on *look*, this section wins; behaviour, copy and states in §1–§15 are
> unchanged.
>
> **Screenshots:** [`screenshots/`](screenshots/README.md) now holds the §18 redesign (2026-10-30);
> the 2026-10-28 captures of this section are in git history.

### 16.1 Shell header (every signed-in screen)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [৳] SmartBiz BD  (অর্ডার) দৈনিক কার্ড  অডিট ট্রেইল  কর্মী  ব্যবসা  সেটিংস    ভাষা [বাংলা ▾]  owner@… (মালিক) [সাইন আউট] │
└──────────────────────────────────────────────────────────────────────────────────────┘
  ink bar, sticky, 64 px     (…) = current page: filled --color-header-active, 600 weight
```
Elements: brand tile (`৳` on brand green) + name; nav links (muted; the current page is filled and
marked `aria-current="page"`, including its sub-pages such as `/orders/new`); language label and
select grouped with a gap; email in muted text; role as a green pill badge; sign-out as a quiet
outlined button.

### 16.2 Orders list — `/orders`

```
┌ screen card (white, radius 16) ─────────────────────────────────────────────────────┐
│ অর্ডার                                                                     28 px    │
│ [নতুন অর্ডার]  [মেসেজ থেকে]  [আগের অর্ডার থেকে]     first = filled brand, others outline │
│ ┌──────────────────────┬──────────────────────┬──────────────────────┐              │
│ │ আয় (অর্জিত)           │ হাতে এসেছে             │ চলমান                 │  stat tiles │
│ │ ৳১৫,০৬০.০০            │ ৳১২,৫৯০.০০            │ ৳২১,১৮০.০০            │  26 px      │
│ │ ●earned ●partial      │ ●realized ●partial    │ ●pipeline ●partial    │             │
│ └──────────────────────┴──────────────────────┴──────────────────────┘              │
│ ┌ canvas panel ───────────────────────────────────────────────────────────────────┐ │
│ │ অবস্থা        কাস্টমার আইডি     শুরুর তারিখ      শেষ তারিখ                        │ │
│ │ [সব     ▾]   [__________]   [dd/mm/yyyy]   [dd/mm/yyyy]   [   ছাঁকুন   ]       │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌ table ──────────────────────────────────────────────────────────────────────────┐ │
│ │ #          অবস্থা              উৎস          মোট                                   │ │
│ │ ORD-1016   ●টাকা পাওয়া গেছে    manual       ৳৫,৮৬০.০০ ●realized ●complete  [খুলুন] │ │
│ │ ORD-1015   ●ফেরত               paste-parse  ৳১,৪৭০.০০ ●no sale ●unknown    [খুলুন] │ │
│ │ ORD-1013   ●আংশিক              manual       ৳২,৩৪০.০০ ●pipeline ●partial   [খুলুন] │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌ canvas panel ───────────────────────────────────────────────────────────────────┐ │
│ │ দ্রুত অর্ডার                                                                       │ │
│ │ পণ্য           পরিমাণ          দাম (৳)         ডেলিভারি চার্জ (৳)                   │ │
│ │ [__________]  [1_______]    [________]     [0_________]     [  সংরক্ষণ  ]        │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
Elements: title; three action links styled as buttons; the summary as three stat tiles (label over
figure over basis and completeness pills, tiles split by a rule); filter and quick-add as one-row
canvas panels (labels above controls); the table with uppercase heads, the order number in 600
weight, the status as a tone-coded pill (green settled/delivered, red cancelled/returned, amber
partial, neutral otherwise) and a small row button at the far end; rows tint brand on hover.

### 16.3 Order detail — `/orders/:id`

```
┌ screen card ───────────────────────────────────────────────────────────────────────┐
│ (← অর্ডারে ফিরুন)                                            pill-shaped back link   │
│ ORD-1013                                                                            │
│ ●আংশিক   উৎস: manual                                                               │
│ ┌ contact (canvas) ─────────────┐                                                   │
│ │ যোগাযোগ                       │                                                   │
│ │ Sadia Afrin          (600)    │                                                   │
│ │ 01922113344                   │                                                   │
│ │ Mymensingh Sadar              │                                                   │
│ └───────────────────────────────┘                                                   │
│ পণ্যসমূহ                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────────────┐   │
│ │ 1   Kids' panjabi set        2   ৳১,৯৮০.০০ ●pipeline ●partial               │   │
│ │ 2   Tupi cap                 2   ৳২৪০.০০   ●pipeline ●partial               │   │
│ └──────────────────────────────────────────────────────────────────────────────┘   │
│                                              ┌ totals (canvas) ──────────────────┐ │
│                                              │ ছাড়              ৳০.০০            │ │
│                                              │ ডেলিভারি চার্জ      ৳১২০.০০          │ │
│                                              │ ─────────────────────────────────  │ │
│                                              │ মোট  (700)        ৳২,৩৪০.০০        │ │
│                                              └────────────────────────────────────┘ │
│ ───────────────────────────────────────────────────────────────────────────────── │
│ অবস্থা বদলান  [ডেলিভারি হয়েছে] [টাকা পাওয়া গেছে] [ফেরত] [বাতিল]     [আবার অর্ডার করুন] │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
Elements: back link; order number as title; status pill + source; contact card; bordered items
table; right-aligned totals panel with the total row ruled off and bold; action bar under a rule
with the status moves as outline buttons and Repeat as the one filled button at the far end.

### 16.4 New order — `/orders/new`

```
┌ screen card ─────────────────────────────────────────┐
│ (← অর্ডারে ফিরুন)                                     │
│ নতুন অর্ডার                                           │
│ ┌ line card (canvas) ───────────────────────────────┐ │
│ │ লাইন 1                       brand, uppercase 13 px │ │
│ │ পণ্য                                               │ │
│ │ [_______________________________________________] │ │
│ │ ভ্যারিয়েন্ট (ঐচ্ছিক)        পরিমাণ                    │ │
│ │ [____________________]   [1___________________]   │ │
│ │ দাম (৳)                  লাইনের ছাড় (৳)             │ │
│ │ [____________________]   [0___________________]   │ │
│ │ পণ্য, পরিমাণ ও দাম ঠিকভাবে লিখুন      quiet hint     │ │
│ └───────────────────────────────────────────────────┘ │
│ [লাইন যোগ করুন]                                        │
│ অর্ডারের ছাড় (৳)  [__________]                          │
│ ডেলিভারি চার্জ (৳) [__________]                          │
│ [   সংরক্ষণ   ]  primary                               │
└───────────────────────────────────────────────────────┘
```
Elements: each line is its own card — heading, description across the card, then a two-column
grid (variant | quantity, price | line discount), then the line total or the hint; the "Line n"
heading no longer runs into the first label.

### 16.5 Order from a message — `/orders/new/paste-parse` (after "পড়ুন")

```
┌ screen card ───────────────────────────────────────────────────────────────────────┐
│ (← অর্ডারে ফিরুন)                                                                    │
│ মেসেজ থেকে অর্ডার                                                                     │
│ মেসেজ                                                                                │
│ [ the pasted message, 160 px min ............................................ ]     │
│ [  পড়ুন  ]  primary                                                                   │
│ ──────────────────────────────────────────────────────────────────────────────────  │
│ ▌মিতু দাস · 01811002233 · গুলশান ২, ঢাকা           brand-tint strip, brand left rule │
│ ●ক্যাশ অন ডেলিভারি                                                                    │
│ ┌ item card (amber border: incomplete) ──────────────────────────────────────────┐ │
│ │ [লাল বা কালো শাড়ি ১টা                                                       ]   │ │
│ │ (পরিমাণ 1) (সাইজ —) (রং —) ●বিস্তারিত বেছে নিন              দাম (৳)            │ │
│ │                                                          [__________]        │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌ item card ─────────────────────────────────────────────────────────────────────┐ │
│ │ [নীল কুর্তি M সাইজ ২টা                                                      ]   │ │
│ │ (পরিমাণ 2) (সাইজ M) (রং নীল)                               দাম (৳)             │ │
│ │                                                          [__________]        │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
│ ডেলিভারি চার্জ (৳)  [0_______]                                                        │
│ [  সংরক্ষণ  ]  primary, disabled until every item has a price                        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
Elements: contact strip; cash-on-delivery pill when detected; one card per item — its own words in
an editable field, then quantity, size and colour as labelled chips (`(label value)`; `—` when the
parser left it empty), the "pick the details" warning pill when incomplete, and a labelled price
input. These chips replace the run-together "2Mনীল" text.

### 16.6 Signed-out screens — `/sign-up`, `/sign-in`, `/recover`, `/reset`, `/accept-invite`

The form sits in a 480 px card centred 48 px below the header (no nav in the header), with the same
44 px fields and one filled primary button. Layout and copy otherwise follow §1–§4.

### 16.7 Lists with a row action — repeat a past order, staff

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ORD-1016  ৳৫,৮৬০.০০ ●realized ●complete                          [বেছে নিন]  │
│ ORD-1015  ৳১,৪৭০.০০ ●no sale ●unknown                             [বেছে নিন]  │
└──────────────────────────────────────────────────────────────────────────────┘
```
Elements: a bordered list; each row spaces its figures with a gap, puts its button at the far end
and tints brand on hover. Staff and audit tables use the §16.2 table style.

## 17. Daily card, Business and Settings — redrawn for B5 (2026-10-28)

> **Status (updated 2026-10-30):** built — daily card, Business and Settings ship on `main`; the AI
> and debug switches were left out (no such features). Their look now follows §18.
> **Original status:** design ready, not built. Today these three routes render the "not available yet"
> screen (U2 functional-spec, B5). This section redraws the MVP mockups S12 (Daily card), S2
> (Business setup) and S14 (Settings) from
> `../../../261004-mvp/inception/refined-mockups/mockups.md` in the §16 visual language, and
> resolves their overlap:
> - **Business** (`/business`, `business.edit`, Owner) owns the business profile.
> - **Settings** (`/settings`, `settings.edit.own`, every role) owns *my* settings, plus the
>   Owner-only business toggles.
> - The staff-invite table drawn in MVP S2 is dropped: inviting staff lives on `/staff` (§5).
>
> Decisions taken on the Owner's standing instruction ("decide for me"), recorded so later stages
> do not read them as the Owner's own wording:
> - **D17-1** A figure whose source is not recorded yet (payments, expenses, dues: later Bolts)
>   is shown as a tile with **no amount**, the `unknown` completeness value and the line
>   "এখনো রেকর্ড শুরু হয়নি" (not recorded yet). It is never shown as ৳০, because a zero would
>   claim a complete figure (recognition-basis invariant: every money figure states basis and
>   completeness).
> - **D17-2** "Today" is the business day in Asia/Dhaka (UTC+6), taken from the live "now" in
>   `src/data/clock.ts`. The clock has no business-day helper yet; B5 adds one, tested on the
>   frozen test clock across midnight Dhaka time.
> - **D17-3** Business profile fields beyond `name` and `locale` (address, phone, currency) need a
>   migration (`businesses` has only `name`, `locale` today); currency is BDT-only, shown
>   read-only, until a second currency is in scope.

### 17.1 Daily card — `/daily-card` (US3.1; MVP S12)

> **Built 2026-10-28** (`src/daily-card/`, tests in `tests/unit/daily-card.test.tsx`), ahead of the
> rest of B5, for the demo, outside the per-unit Construction stages. As built: the title is
> "দৈনিক কার্ড", the same words as the nav link; the route is gated on the Owner-only `business.edit`,
> so other roles see neither the link nor the money; the status-strip pills are not links yet.

```
┌ screen card ───────────────────────────────────────────────────────────────────────┐
│ আজকের কার্ড                                                     [↻ রিফ্রেশ]          │
│ বুধবার, ২৮ অক্টোবর ২০২৬ · সর্বশেষ হালনাগাদ ১৪:০৫                     text-2, 14 px     │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐            │
│ │ আজকের অর্ডার                     │ │ আজকের আয় (হাতে এসেছে)              │            │
│ │ ৳৮,৪৫০.০০              26 px     │ │ ৳৫,৮৬০.০০                         │            │
│ │ ৬টি অর্ডার                        │ │ ২টি অর্ডারের টাকা                  │            │
│ │ ●earned ●complete       [কেন?]  │ │ ●realized ●partial      [কেন?]   │            │
│ └─────────────────────────────────┘ └─────────────────────────────────┘            │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐            │
│ │ বকেয়া                            │ │ আজকের খরচ                         │            │
│ │ —                    (no amount) │ │ —                                │            │
│ │ এখনো রেকর্ড শুরু হয়নি               │ │ এখনো রেকর্ড শুরু হয়নি                │            │
│ │ ●realized ●unknown      [কেন?]  │ │ ●realized ●unknown      [কেন?]   │            │
│ └─────────────────────────────────┘ └─────────────────────────────────┘            │
│ ┌ today's orders by status (canvas panel) ──────────────────────────────────────┐ │
│ │ ●নতুন ৩   ●নিশ্চিত ১   ●প্যাক করা ১   ●পাঠানো হয়েছে ১   ●টাকা পাওয়া গেছে ২             │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
│ [সব অর্ডার দেখুন →]                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
Elements:
- **Header row:** title; the date and last-refreshed time; a secondary refresh button (announces
  "হালনাগাদ হয়েছে" through `aria-live="polite"`).
- **Four tiles** in a 2 × 2 grid (one column below 760 px), each a white panel with a
  `--color-line` border and radius 12: label (13 px / 600, text-2), figure (26 px / 700, tabular
  numerals), one supporting line (count of orders, or the D17-1 line), then `BasisPill` +
  `CompletenessControl` and a "কেন?" (why) button opening the why-missing sheet.
  - Today's orders: count and total of orders created today; basis `earned` (AC3.1.1).
  - Today's income: total of orders settled today; basis `realized`. While payments and expenses
    are not recorded, completeness is `partial` and the sheet says which sources are missing
    (AC3.1.2).
  - Dues and today's expenses: D17-1 until their Bolts land (AC3.1.3).
- **Status strip:** today's orders counted per status as `statusTone` pills (§16 visual language);
  each pill links to `/orders` filtered by that status.
- **Link** to the full orders list.

States:
- **Loading:** four skeleton tiles (`api-state__skeleton`), "লোড হচ্ছে" for screen readers.
- **No orders today:** tiles show ৳০.০০ with `complete` (a true zero: the day is recorded and empty)
  and the line "আজ এখনো কোনো অর্ডার নেই"; the status strip is hidden.
- **Error / 503:** the §14 server banner above the tiles, with [আবার চেষ্টা করুন].

Role gate: route `business.view`, but the **money tiles render for the Owner only** (US3.1
persona). Any other role opening `/daily-card` gets the lock screen (§14 403 row); the absence test
asserts no money figure and no `data-money` element in the body (NFR6.6, AC5.1.2).
Accessibility: h2 title; each tile is a `<section>` with its label as `aria-labelledby`; the "কেন?"
button has `aria-haspopup="dialog"`; colour never carries meaning alone.

### 17.2 Business — `/business` (US1.5 AC1.5.1, AC1.5.4; MVP S2 without the invite table)

```
┌ screen card ───────────────────────────────────────────────────────────────────────┐
│ ব্যবসা                                                                               │
│ আপনার ব্যবসার তথ্য — রসিদ ও কুরিয়ারে এগুলো দেখানো হবে।                    text-2        │
│ ┌ panel ──────────────────────────────────────────────────────────────────────┐   │
│ │ ব্যবসার তথ্য                                                    h3, 17 px      │   │
│ │ ব্যবসার নাম                                                                    │   │
│ │ [রহিম ফ্যাশন হাউস_________________________________________]                    │   │
│ │ ফোন                                 মুদ্রা                                     │   │
│ │ [01711-000000______________]        [BDT (৳)            ] read-only (D17-3)    │   │
│ │ ঠিকানা                                                                         │   │
│ │ [বাড়ি ১২, রোড ৫, মিরপুর ১০, ঢাকা_________________________]                     │   │
│ │ ডিফল্ট ভাষা                                                                    │   │
│ │ (●) বাংলা   ( ) English                                                        │   │
│ └──────────────────────────────────────────────────────────────────────────────┘   │
│ [  পরিবর্তন সংরক্ষণ করুন  ]  primary, disabled until a field changes                      │
│ সর্বশেষ পরিবর্তন: owner@smartbiz.test · ২৮/১০/২০২৬ ১৩:৪৭ → অডিট ট্রেইলে দেখুন             │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
Elements: title and one explanatory line; a canvas panel with the profile form in a two-column
grid on desktop (name and address span both columns); default language as a radio group; one
primary save, enabled only when the form differs from the saved values; a "last changed" line
linking to the audit trail filtered to `business.update`.

States:
- **Saving:** the button reads "সংরক্ষণ হচ্ছে…" and is disabled (AC5.4.4).
- **Saved:** toast "ব্যবসার তথ্য সংরক্ষণ হয়েছে"; one audit row `business.update` naming the
  changed fields, never their old values (AC1.5.4).
- **Invalid:** field errors under the field (name 1–120 characters; phone 11 digits starting 01);
  values are kept.
- **Unsaved changes:** leaving the page asks "পরিবর্তনগুলো সংরক্ষণ হয়নি। তবুও যাবেন?".

Role gate: `business.edit` (Owner). Others get the lock screen; there is no read-only view of the
profile for them in B5.

### 17.3 Settings — `/settings` (US1.5 AC1.5.2–AC1.5.3, US3.4; MVP S14 split)

```
┌ screen card ───────────────────────────────────────────────────────────────────────┐
│ সেটিংস                                                                               │
│ ┌ panel: আমার সেটিংস (every role) ────────────────────────────────────────────┐   │
│ │ আমার ভাষা                                                                      │   │
│ │ (●) বাংলা   ( ) English          এই ভাষায় আপনার স্ক্রিন খুলবে                      │   │
│ │ ইমেইল                                                                          │   │
│ │ owner@smartbiz.test   (মালিক)    read-only; role shown as the §16.1 badge       │   │
│ │ পাসওয়ার্ড                                                                       │   │
│ │ [পাসওয়ার্ড বদলান]  secondary → the reset flow (§4)                               │   │
│ └──────────────────────────────────────────────────────────────────────────────┘   │
│ ┌ panel: ব্যবসার সুইচ (Owner only) ────────────────────────────────────────────┐   │
│ │ AI সহকারী                                                    [ ○━━ ] বন্ধ      │   │
│ │ মেসেজ থেকে অর্ডার পড়তে AI সাহায্য নেবে। চালু করলে মেসেজের লেখা                     │   │
│ │ বাইরের সেবায় যেতে পারে।                                       text-2, 13 px     │   │
│ │ ───────────────────────────────────────────────────────────────────────────   │   │
│ │ ডিবাগ স্ক্রিন                                                  [ ━━● ] চালু     │   │
│ │ শুধু সমস্যা খোঁজার জন্য। চালু থাকলে মেনুতে "ডিবাগ" দেখা যাবে।                          │   │
│ └──────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
Elements:
- **My settings** (every signed-in role, AC1.5.2): display language as a radio group that saves on
  change (toast "ভাষা বদলানো হয়েছে"; the header switch follows); email and role read-only; a
  secondary "change password" button into the existing reset flow. The MVP's "default role for new
  sessions" is not drawn: a user holds exactly one role in this build, so there is nothing to
  choose (to revisit if multi-role users are introduced).
- **Business switches** (Owner only, US3.4): two switches, each a `<button role="switch"
  aria-checked>` with a visible text state ("চালু" / "বন্ধ") beside the track, so the state is
  never colour alone, and a 13 px explanation under its label.
  - AI assistant opt-in (AC3.4.1). Off by default; turning it on asks for confirmation because
    message text may leave the machine (zero-spend rule: only a free, optional service, and the
    app works with it off).
  - Debug screen (AC1.5.3, AC3.4.2). When on, a "ডিবাগ" link appears in the nav for the Owner.
  - Each flip saves at once, shows a toast, and appends one audit row (`settings.toggle`, with the
    switch name and its new value) (AC3.4.3).

States: loading (skeleton rows in each panel); a failed save puts the switch back to its previous
state and shows the §14 banner; never an optimistic state that the server did not confirm.

Role gate: the route is `settings.edit.own` (every role). The "business switches" panel is
**absent**, not disabled, for every role except the Owner, and the server refuses the toggle
endpoint with 403 (absence-asserted like §15).

### 17.4 Navigation and states summary

| Route | Nav label | Owner | Manager | Sales staff | Accountant | Needs before build |
|-------|-----------|:-----:|:-------:|:-----------:|:----------:|--------------------|
| `/daily-card` | দৈনিক কার্ড | ✓ (tiles) | lock | lock | lock | today's-orders query by Dhaka day; why-missing sheet copy |
| `/business` | ব্যবসা | ✓ | lock | lock | lock | migration: address, phone, currency on `businesses` + `app_role` grant + realdb exact-set assertion |
| `/settings` | সেটিংস | ✓ (+ switches) | ✓ | ✓ | ✓ | migration: `business_settings` (ai_opt_in, debug_flows) + user locale update endpoint |

Classes these screens add (for the `classes` harness): `day-tile`, `day-tile__figure`,
`day-tile__note`, `status-strip`, `switch`, `switch__track`, `switch__state`, `settings-panel`.

## 18. Premium redesign — phone first (2026-10-30)

> **Why:** the Owner asked for a full redesign, "more premium, elegant and modern, also mobile
> friendly". On a phone the 2026-10-28 look wrapped the header's eleven links over three lines and
> squeezed the orders table until order numbers broke one letter per line (old phone screenshot
> 01). Decisions below were taken on the Owner's standing instruction ("decide for me").
>
> **Scope:** look and layout only. Copy, states, role gates, the recognition-basis pills and every
> behaviour in §1–§17 are unchanged. Where §16/§17 and this section differ on look, this section
> wins. Built on branch `redesign`; screenshots of every screen are in
> [`screenshots/`](screenshots/README.md). Tokens are in `design-system-mapping.md` §Tokens used.
> Text fallback: each drawing is followed by its element list.

Decisions (chosen on the Owner's standing instruction):
- **D18-1** Navigation moves from a top bar to a **left sidebar** on wide windows (≥ 960 px), and to
  a **bottom tab bar + drawer** on phones and tablets. A top bar cannot hold eleven Bangla labels.
- **D18-2** The tab bar shows at most **four** places plus "আরও" (more). They are picked from the
  links the role was given, in this order of preference: দৈনিক কার্ড, অর্ডার, ক্রেতা, পণ্য, কম মজুদ.
  The bar never adds a link a role was not given (BR2.1 stays with App's `navFor`).
- **D18-3** Below 720 px, list tables become **one card per row** with each value labelled from
  its column name. Tables whose cells are inputs (product variants) keep a horizontal scroll
  inside their own box (BR9.1), with a 600 px minimum so columns stay readable.
- **D18-4** Every money figure keeps its basis and completeness pills at every width (team.md:
  recognition-basis invariant). Nothing is hidden on a phone to save space.
- **D18-5** No hosted font, no icon font, no new dependency: icons are twelve inline 24 px stroke
  SVGs drawn for this app; Inter is used only if it is installed, then the offline Bangla chain.

### 18.1 Shell — sidebar, top bar, drawer, tab bar

Desktop (≥ 960 px):

```
┌────────────────────┬──────────────────────────────────────────────────────────────┐
│ [৳] SmartBiz BD    │                                                              │
│                    │   ┌ screen card (white, radius 20, soft shadow) ───────────┐ │
│ ▌▣ অর্ডার    (lit) │   │ অর্ডার                                          30 px  │ │
│  ☺ ক্রেতা          │   │ …                                                      │ │
│  ◇ পণ্য            │   └────────────────────────────────────────────────────────┘ │
│  △ কম মজুদ         │                                                              │
│  ⛟ সরবরাহকারী      │                                                              │
│  ▦ দৈনিক কার্ড      │                                                              │
│  ▮ বিশ্লেষণ         │                                                              │
│  ⛉ অডিট ট্রেইল      │                                                              │
│  ☺+ কর্মী          │                                                              │
│  ⌂ ব্যবসা          │                                                              │
│  ≡ সেটিংস          │                                                              │
│                    │                                                              │
│ ভাষা     [বাংলা ▾] │                                                              │
│ ┌────────────────┐ │                                                              │
│ │(O) owner@…     │ │                                                              │
│ │    মালিক       │ │                                                              │
│ │ [ সাইন আউট ]   │ │                                                              │
│ └────────────────┘ │                                                              │
└────────────────────┴──────────────────────────────────────────────────────────────┘
  264 px ink-green sidebar, fixed     content max 1240 px, 40 px padding
```
Elements: gold brand tile (`৳`) and name; one row per nav link, icon then label; the current page
has a lit row, a gold icon and a 3 px gold bar at the sidebar edge, and `aria-current="page"`
(also on its sub-pages); at the foot the language select, then an account card with a gold
initial, the email, the role and a full-width sign-out button.

Phone and tablet (< 960 px):

```
┌──────────────────────────────┐      ┌──────────────────────┬───────┐
│ [৳] SmartBiz            [≡]  │ 56px │ [৳] SmartBiz BD       │  [×]  │
├──────────────────────────────┤      │ ▌▣ অর্ডার             │░░░░░░░│
│                              │      │  ☺ ক্রেতা             │░scrim░│
│  content on the canvas       │      │  … every link …       │░░░░░░░│
│  (no outer card; each part   │      │ ভাষা       [বাংলা ▾]  │░░░░░░░│
│   carries its own surface)   │      │ (O) owner@… মালিক     │░░░░░░░│
│                              │      │ [ সাইন আউট ]          │░░░░░░░│
├──────────────────────────────┤      └──────────────────────┴───────┘
│  ▦     (▣)     ☺     ◇    ⋯  │ 64px   drawer: min(86vw, 320 px), slides from the start edge
│ দৈনিক  অর্ডার  ক্রেতা  পণ্য  আরও │
└──────────────────────────────┘
```
Elements: ink top bar with the brand and a 44 px menu button (`aria-expanded`, label "মেনু" /
"মেনু বন্ধ করুন"); a white bottom tab bar, icon over label, the current tab in brand green with a
pale pill behind its icon; "আরও" opens the drawer and is marked current when the page is not one of
the four tabs. The drawer is the same header element as the desktop sidebar. Escape, a tap on the
scrim, a tap on a link, or any route change closes it. The tab bar respects the phone's safe area.

Tab bar by role (D18-2):

| Role | Tab 1 | Tab 2 | Tab 3 | Tab 4 | Tab 5 |
|------|-------|-------|-------|-------|-------|
| Owner | দৈনিক কার্ড | অর্ডার | ক্রেতা | পণ্য | আরও |
| Manager, Accountant, Sales staff | অর্ডার | ক্রেতা | পণ্য | কম মজুদ | আরও |

Save toast: floats top-right on desktop (under the top bar on phones), white with a green border
and text, and never pushes the page down.

### 18.2 Signed-out screens

```
┌──────────────────────────────────────────────────────────────┐
│ [৳] SmartBiz BD                              ভাষা [বাংলা ▾]  │  ink bar
├──────────────────────────────────────────────────────────────┤
│                 ┌ card, max 440 px ──────────┐               │
│                 │ সাইন ইন                     │               │
│                 │ ইমেইল    [________________] │               │
│                 │ পাসওয়ার্ড [________________] │               │
│                 │ [      সাইন ইন করুন      ]  │ full width    │
│                 └────────────────────────────┘               │
└──────────────────────────────────────────────────────────────┘
```
Same for sign-up, recover, reset and accept-invite: no navigation, no tab bar; the one action
spans the card.

### 18.3 Lists — desktop table, phone cards

```
desktop                                            phone (< 720 px)
┌──────┬───────────────┬────────┬────────┬───────┐ ┌──────────────────────────────┐
│ #    │ ক্রেতা ও পণ্য  │ অবস্থা │ উৎস    │ মোট   │ │ ORD-1010             (নতুন) │
├──────┼───────────────┼────────┼────────┼───────┤ │ ক্রেতা ও পণ্য                │
│ORD-… │ জুবায়ের আহমেদ │ (নতুন) │ manual │ ৳১,৪১০│ │ জুবায়ের আহমেদ · টি-শার্ট      │
│      │ টি-শার্ট        │        │        │ pills │ │ উৎস          মোট            │
└──────┴───────────────┴────────┴────────┴───────┘ │ quick-add    ৳১,৪১০ (pills)  │
                                                   │ [          খুলুন          ]  │
                                                   └──────────────────────────────┘
```
Elements: on desktop a hairline table in a rounded box, quiet 12 px column heads, the key column
heavier, row hover in pale green; on a phone each row is a white card: the key at top-left, a
status or chip at top-right (`data-cell="corner"`), then each value under its column name
(`data-label`), short values in two columns (`data-cell="half"`), and the row action full width.
Applies to orders, customers, products, low stock, suppliers, staff (members, invitations) and the
audit trail (`.table--stack`).

Orders list extras: on a phone the three start-order links become one full-width "+ নতুন অর্ডার"
over two half-width buttons; the three totals stack as rows, each with its pills; the filter is a
2 × 2 grid (status, customer / from, to) with the button across the foot.

### 18.4 Order detail

```
[← অর্ডারে ফিরুন]
ORD-1010                    (নতুন) উৎস: quick-add
┌ যোগাযোগ ───────────────┐
│ জুবায়ের আহমেদ           │
│ 01399001122             │
└─────────────────────────┘
পণ্যসমূহ
┌───────────────────────────────────┐     phone: one row per line
│ 1  টি-শার্ট                    × 3 │       1  টি-শার্ট           × 3
│    ৳১,৩৫০ (pipeline)(partial)      │          ৳১,৩৫০ (pills)
└───────────────────────────────────┘
                 ┌ ছাড় / ডেলিভারি / মোট ─┐
                 │ মোট     ৳১,৪১০ (pills) │
                 └────────────────────────┘
[⎙ ইনভয়েস ও স্লিপ প্রিন্ট]
অবস্থা বদলান [নিশ্চিত] [বাতিল] [আংশিক]          [আবার অর্ডার করুন]
```
Elements: the print link is a quiet secondary button with a printer mark; the status moves are
secondary buttons; "আবার অর্ডার করুন" is the one primary (full width on a phone).

### 18.5 Daily card

```
┌ hero: deep emerald gradient ─────┐ ┌ white tile ─────────────────────┐
│ আজকের অর্ডার                      │ │ আজকের আয় (হাতে এসেছে)            │
│ ৳১৭,৯৭০.০০       (white, 32 px)   │ │ ৳৭,০৩০.০০                        │
│ (pipeline)(complete)              │ │ (realized)(partial)              │
│ ১০টি অর্ডার, বাতিল ও ফেরত বাদে মূল্য │ │ …                                │
└───────────────────────────────────┘ └──────────────────────────────────┘
┌ বকেয়া  —  এখনো রেকর্ড শুরু হয়নি ──┐ ┌ আজকের খরচ  —  … ─────────────────┐
```
Elements: the first tile is the hero (white figure, pale green labels on the gradient, both
measured above 6:1); the rest are white tiles, one column on a phone; the not-recorded tiles still
show a dash, never ৳০ (D17-1); loading tiles pulse gently (off under reduced motion).

### 18.6 Forms

Inputs are 46 px tall with 10 px corners and a green focus ring; groups (`fieldset`) are quiet
rounded panels with a bold legend; radio choices sit side by side; manual order lines and
paste-parsed items are cards (an incomplete item gets an amber edge); the primary submit spans the
width on a phone.

### 18.7 Screens added after §17 (product photo, insights, business, settings, invoice)

- **Product detail:** the photo card shows the photo (hidden until it loads, so no broken image)
  and a styled file picker; the variant table scrolls inside its box on a phone.
- **Insights (Owner):** the period switch (৭ দিন / ৩০ দিন / ৯০ দিন / সব সময়) is a segmented
  control, the chosen period raised in white; each section is a white panel.
- **Business and Settings:** one white panel per group; the two-column field row stacks on a phone.
- **Invoice and slip:** two white sheets on the canvas, the back link as a pill and "প্রিন্ট করুন"
  as the primary button. In print only the sheets remain (sidebar, top bar, tab bar, drawer and
  toast are all hidden) and the slip starts a new page.

### 18.8 Acceptance checks for this section

- No sideways scroll at 390 px on any of the 19 captured screens (`scrollWidth` = window width;
  `scripts/browser-check.ts` keeps checking 360 px in the gate).
- `tests/unit/stylesheet.test.ts`: no literal colour outside `tokens.css`; no fixed width above
  360 px outside `.scroll-x`; one `:focus-visible` rule from the token.
- `tests/unit/contrast.test.ts`: every colour token in at least one measured pair, all ≥ 4.5:1
  for text (≥ 3:1 for the control border and focus outline).
- `tests/unit/shell.test.tsx`: the sidebar links are exactly the given list; the tab bar picks the
  first four by preference and marks "আরও" for other pages; the drawer opens from the menu and
  "আরও" and closes on Escape, the scrim, a link and a route change.

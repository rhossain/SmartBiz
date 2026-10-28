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

| Nav item | Owner | Manager | Sales Staff | Accountant |
|----------|:-----:|:-------:|:-----------:|:----------:|
| অর্ডার (Orders) | ✓ | ✓ | ✓ | ✓ |
| ক্রেতা (Customers) | ✓ | ✓ | ✓ | ✓ |
| পণ্য (Products) | ✓ | ✓ | ✓ | ✓ |
| কম মজুদ (Low stock) | ✓ | ✓ | ✓ | ✓ |
| সরবরাহকারী (Suppliers) | ✓ | ✓ | ✓ | ✓ |
| সদস্য (Staff) | ✓ | ✓ | — | — |
| হিসাবের খাতা (Audit trail) | ✓ | ✓ | — | ✓ |
| সেটিংস (Settings) | ✓ | — | — | — |

The header shows the signed-in email and role name, and a "সাইন আউট" button (US1.4).

## 16. Visual refresh, as built (2026-10-28)

> Added after the pre-demo review found the screens plain and, in places, run together ("2Mনীল",
> "লাইন 1পণ্য"). These mockups record the shipped look at desktop width (≥ 760 px); below 760 px every
> multi-column row stacks into one column (verified at 360 px by `scripts/browser-check.ts`, 16
> screens). Tokens and the visual language are in `design-system-mapping.md` §Tokens used. Where this
> section and §1–§15 differ on *look*, this section wins; behaviour, copy and states in §1–§15 are
> unchanged.

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

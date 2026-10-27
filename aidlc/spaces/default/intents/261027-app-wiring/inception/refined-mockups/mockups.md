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

# Frontend Components — U1-foundation (B1)

> Brownfield run (SmartBiz BD). The UI primitive
> hierarchy for U1-foundation. The hierarchy is
> **Shell → Screen → Field → Pill** (Q8=A from
> functional-design-questions). Each level is a typed
> primitive; the prototype's 30 components map onto
> the Field and Pill levels. The hierarchy is the
> source of truth for the U1 UI surface; U2-U5
> screens compose these primitives.

## Sources

- [entities] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/entities.md`
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md`
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md`
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — PresentationComponent
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [team-rules] `aidlc/spaces/default/memory/team.md` — basis pill + completeness control, role × capability lock sheet, TypeScript strict
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill, completeness control, status chip
- [frontend-hierarchy-stage] `.claude/aidlc-common/stages/construction/functional-design.md` (frontend-components.md conditional)

## Hierarchy

```
Shell
  ├── Header (logo, business name, locale switcher, user menu)
  ├── Nav (role-filtered; only shows routes the role can reach)
  └── LockSheet (full-screen overlay; renders on three-layer-gate failure)
Screen
  ├── /sign-up, /sign-in, /recover, /reset, /accept
  ├── /onboarding (Owner first run)
  ├── /settings/business, /settings/staff, /settings/locale
  ├── (U2-U5 screens — composed from U1 primitives)
  └── /lock (three-layer-gate failure screen)
Field
  ├── TextField (input[type=text])
  ├── NumberField (input[type=number]; renders Bangla digits for bn)
  ├── MoneyField (composes NumberField; renders MoneyFigure with basis pill + completeness control)
  ├── DateField (date input; renders locale-formatted date)
  ├── SelectField (select; options list)
  ├── TextAreaField (textarea)
  ├── PasswordField (password input with show/hide toggle)
  └── EmailField (email input; BR1.1 validation)
Pill
  ├── BasisPill (renders MoneyFigure.recognition: "Earned" / "Realized"; BR6.1)
  ├── CompletenessControl (renders MoneyFigure.completeness: nothing for full, warning for partial, muted for stub; BR6.2)
  ├── StatusChip (renders OrderStatus: 9 typed values from team.md#Testing Posture §TP-4; the production order status enum)
  ├── RoleLockSheet (full-screen overlay on three-layer-gate failure; renders the reason)
  └── PackSlip (PDF / printable view; renders order details for fulfillment)
```

## Component contracts (typed)

### Shell

```typescript
type ShellProps = {
  business: Business;
  currentUser: User;
  locale: Locale;
  routes: ReadonlyArray<Route>;
  children: ReactNode; // the active Screen
};

const Shell: ComponentType<ShellProps>;
```

**Behaviour.**
- Renders the chrome: Header + Nav + the active Screen.
- The Nav is role-filtered: only routes the current
  User's role can reach (matrix.get(role) has
  route.requiredCapability) are shown.
- The locale switcher in the Header updates
  `Business.locale` (BR6.3); the change applies
  immediately to the current session.
- The user menu in the Header shows the current
  User's display_name + role + sign-out.

### Screen

```typescript
type ScreenProps = {
  route: Route;
  state: State;
  session: Session;
};

const Screen: ComponentType<ScreenProps>;
```

**Behaviour.**
- The Screen is mounted by the RouterComponent after
  the three-layer gate passes (BR2.4).
- The Screen reads state via the typed state container
  (BR1 in functional-spec).
- The Screen mutates state via the typed state
  container + the AuditService (per UC-1.9).
- The Screen composes Field + Pill primitives.

### Field

```typescript
type TextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label: Translation;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  validate?: (value: string) => Result<void, ValidationError>;
};

type MoneyFieldProps = {
  value: MoneyFigure;
  onChange: (value: MoneyFigure) => void;
  label: Translation;
  required?: boolean;
};

type DateFieldProps = {
  value: Date;
  onChange: (value: Date) => void;
  label: Translation;
  required?: boolean;
};

// ... NumberField, SelectField, TextAreaField, PasswordField, EmailField
```

**Behaviour.**
- Each Field is a controlled input; the value is typed.
- Each Field renders in the active locale (BR6.5).
- The MoneyField composes NumberField + BasisPill +
  CompletenessControl.
- The DateField renders the date in the active locale
  (bn-BD or en-US).

### Pill

```typescript
type BasisPillProps = {
  recognition: Recognition;
};

const BasisPill: ComponentType<BasisPillProps>;
// renders "Earned" for 'earned', "Realized" for 'realized' (BR6.1)

type CompletenessControlProps = {
  completeness: Completeness;
};

const CompletenessControl: ComponentType<CompletenessControlProps>;
// renders nothing for 'full', warning icon for 'partial', muted style for 'stub' (BR6.2)

type StatusChipProps = {
  status: OrderStatus; // 9 typed values from team.md#Testing Posture §TP-4
};

const StatusChip: ComponentType<StatusChipProps>;
// exhaustive switch on OrderStatus; the chip's color maps to the status

type RoleLockSheetProps = {
  reason: BusinessRuleError;
};

const RoleLockSheet: ComponentType<RoleLockSheetProps>;
// full-screen overlay; renders the reason.message_key translated

type PackSlipProps = {
  order: Order;
};

const PackSlip: ComponentType<PackSlipProps>;
// printable view; renders order details for fulfillment
```

**Behaviour.**
- BasisPill always renders; absence fails the
  cross-cutting CI gate (BR6.1).
- CompletenessControl's style matches the completeness
  value (BR6.2).
- StatusChip uses an exhaustive switch with a
  `never`-asserted default so a future addition to
  OrderStatus is caught at compile time (per
  `team.md#Testing Posture §TP-4`).
- RoleLockSheet renders the BusinessRuleError's
  message_key translated to the active locale.

## Mapping the prototype's 30 components

The prototype's 30 components map onto the
Shell/Screen/Field/Pill levels as follows:

| Prototype component | Production level | Production name |
|---------------------|------------------|-----------------|
| App-header | Shell | Shell.Header |
| App-nav | Shell | Shell.Nav |
| App-lock | Shell | Shell.LockSheet |
| App-screen-* | Screen | Screen.{name} |
| App-input-text | Field | TextField |
| App-input-number | Field | NumberField |
| App-input-money | Field | MoneyField |
| App-input-date | Field | DateField |
| App-input-select | Field | SelectField |
| App-input-textarea | Field | TextAreaField |
| App-input-password | Field | PasswordField |
| App-input-email | Field | EmailField |
| App-basis-pill | Pill | BasisPill |
| App-completeness | Pill | CompletenessControl |
| App-status-chip | Pill | StatusChip |
| App-role-lock | Pill | RoleLockSheet |
| App-pack-slip | Pill | PackSlip |
| (etc.) | ... | ... |

The 30-component mapping is exhaustive; every
prototype component has a production-level and name.
The production names are typed React component
contracts; the prototype's IIFE / window.App global
is replaced with the typed registry pattern from
`team.md#Code Style §CS-6`.

## Per-Field / per-Pill validation

- **MoneyField** validates that `value.value_paise` is
  an integer (BR5.1).
- **EmailField** validates that `value` is a valid
  RFC 5322 address (BR1.1).
- **PasswordField** validates that `value.length >= 8`
  (BR1.2).
- **BasisPill** validates that `recognition` is
  `'earned' | 'realized'` (TypeScript discriminated
  union).
- **StatusChip** validates that `status` is one of
  the 9 typed values (exhaustive switch with
  `never`-asserted default).

## What this component set does NOT cover

- **U2-U5 UI.** The Catalog / Orders / Money /
  Operate unit screens are produced in their
  functional-design passes. The U1 primitives are
  the cross-cutting base; U2-U5 screens compose them.
- **Page-level composition.** The per-route
  composition of Field + Pill into a Screen is in
  each unit's functional-spec. U1's Screen-level
  composition is in `functional-spec.md` (the use
  cases).
- **Visual design tokens.** The CSS / tokens (colors,
  spacing, fonts) are in
  `aidlc/spaces/default/memory/project.md` and the
  prototype's `tokens.css`. The component contracts
  above are the typed shapes; the visual styling is
  in tokens.css.

## Cross-references

- `entities.md` — the entities the Fields and Pills
  read (MoneyField reads MoneyFigure; StatusChip
  reads OrderStatus)
- `rules.md` — the business rules the Fields and
  Pills enforce (BR1.1, BR1.2, BR5.1, BR6.1, BR6.2,
  BR6.5)
- `functional-spec.md` — the use cases that compose
  the Fields and Pills into Screens
- `traceability.json` — the per-component coverage
  against stories / FR / NFR / CC-AC

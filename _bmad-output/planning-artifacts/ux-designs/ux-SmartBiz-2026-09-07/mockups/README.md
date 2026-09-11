---
name: SmartBiz BD mockups
description: Index of the captured mock set, and the pointer to the interactive prototype that is the actual mock coverage.
status: final
created: 2026-09-08
updated: 2026-09-08
---

# Mockups

**The mock set is the interactive prototype, not this folder.** Open [prototype/index.html](../../../../../prototype/index.html) directly in a browser — no build step, no server. It carries **58 navigable routes** across **24 screens**, and every screen can be reached from another by navigation, in either language, on either device width, under any of the five Roles.

The images here are stills captured from that prototype at the states worth arguing about. They exist so a reviewer can see the design without opening it, and so a later change has something to be compared against. They are generated, not drawn: if a still and the prototype disagree, the prototype is right, and if either disagrees with [DESIGN.md](../DESIGN.md) or [EXPERIENCE.md](../EXPERIENCE.md), the spines are right.

## Coverage

The prototype's own screen index groups its routes into eight sections — Onboarding, Daily, Orders, Customers, Catalogue, Money, Insight, System — matching the Information Architecture in [EXPERIENCE.md](../EXPERIENCE.md). Every group is reachable from the chrome's screen picker, and the stills below sample each one.

| Still | Surface | What it is there to show |
| --- | --- | --- |
| `phone-splash.png` | Onboarding · language choice | Bangla offered first, and the chosen card carrying the only tick |
| `desktop-home.png` | Daily · Dashboard (desktop) | The cash strip and the attention list beside the sidebar rail |
| `phone-home-en.png` | Daily · Dashboard (phone, English) | The same layout holding in the shorter script |
| `phone-sheet.png` | Daily · completeness explanation | "Based on N of M" opened up: the gap named as courier custody |
| `desktop-orders.png` | Orders · list | Status chips as a legible state machine across a long list |
| `phone-paste-parsed.png` | Orders · paste & parse result | What was found, counted openly — and each item's own colour, not its neighbour's |
| `phone-voice-live.png` | Orders · voice capture, listening | A progressive enhancement mid-flight, with the manual field still present |
| `phone-slip.png` | Orders · pack slip | The deliberate money exception: a Packer sees the COD amount |
| `phone-grid.png` | Catalogue · variant matrix | Stock across two axes without a horizontal scroll trap |
| `phone-custody.png` | Money · COD in custody | Amber doing the work: earned, not collected |
| `desktop-settle.png` | Money · settlement run | Declared against matched, with the unresolved rows waiting |
| `phone-gated.png` | Money · gated for a Packer | Absence, not a disabled control — and who to ask |
| `phone-ai-answer.png` | Insight · answered question | Two figures, two bases, separated; violet nowhere near a number |
| `phone-audit.png` | System · audit entry | Who, what, when, in the seller's own numerals |
| `desktop-flows.png` | System · flow diagrams | The three process diagrams the PRD references |

Four things the stills cannot show, and which need the prototype: navigation between screens, the Role and language switches, the bottom sheets opening, and the async assisted-routing and refusal states.

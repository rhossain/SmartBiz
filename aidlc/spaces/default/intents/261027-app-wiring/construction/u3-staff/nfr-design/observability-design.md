# Observability Design — u3-staff

> Designs for NFR8.16–NFR8.19. U3 adds O15–O18.

| ID | Requirement | Design |
|----|-------------|--------|
| O15 | NFR8.16 staff actions in the audit trail | the four actions with Bangla labels in the audit trail screen's label map ("আমন্ত্রণ তৈরি", "আমন্ত্রণ গ্রহণ", "রিসেট লিংক তৈরি", "পাসওয়ার্ড রিসেট"); `via: "terminal"` rows show "টার্মিনাল" as the actor |
| O16 | NFR8.17 refusals in the request log only | 410/403/429 on U3 routes write the standard request line; no audit row on a refusal; the log-capture test asserts no token, link, password or email in any U3 line |
| O17 | NFR8.18 coverage | the new modules (`one-time-token.ts`, `delegation.ts`, `retry.ts`, the rewritten auth files, the staff screens, `staff-api.ts`) are imported by `import-all.test.ts` |
| O18 | NFR8.19 skeleton check | the wiring check invites a Sales Staff member, accepts (signed in), creates a reset link as the Owner, resets, and asserts the staff member's old cookie gets 401 |

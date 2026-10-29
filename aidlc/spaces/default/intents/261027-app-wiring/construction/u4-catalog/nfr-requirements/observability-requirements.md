# Observability Requirements — u4-catalog

> Local, zero-spend observability as in U1–U3. IDs continue U3's.

| ID | Requirement | Detail |
|----|-------------|--------|
| NFR8.20 | Every catalog change is in the audit trail | the nine actions of BR10.2 show on `/audit-trail` with the actor's email and a Bangla action label (ক্রেতা যোগ, ক্রেতা সম্পাদনা, নোট যোগ, সরবরাহকারী যোগ, সরবরাহকারী সম্পাদনা, পণ্য যোগ, পণ্য সম্পাদনা, ক্রয়মূল্য বদল, মজুদ বদল) |
| NFR8.21 | Refusals are request-log lines, not change-log rows | 400s, 403s, 404s and 409s on catalog routes appear in the request log with status; nothing typed is kept |
| NFR8.22 | Coverage floor | ≥ 80 % lines over every `src` file, including `src/catalog/**`; `src/money/low-variants.ts` and its test are removed together |
| NFR8.23 | The scripted check covers the catalog | the wiring check runs BR15.1's steps (supplier, product with two axes, stock below minimum seen on `/api/low-stock`, a customer with a Bangla-digit phone); U5 adds the order step |
| NFR8.24 | Mutants for the new invariants | the committed mutant list gains: products writable by Sales Staff; cost included for Sales Staff; business filter dropped from a catalog read; customer name in a change-log payload; a note revision issued as UPDATE; low computed as `<=` |

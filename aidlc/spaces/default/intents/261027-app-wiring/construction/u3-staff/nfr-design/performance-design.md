# Performance Design — u3-staff

> Designs for NFR6.19–NFR6.21 and NFR9.10–NFR9.11. U3 adds P15–P17.

| ID | Requirement | Design |
|----|-------------|--------|
| P15 | NFR6.19 staff routes ≤ 300 ms p95 | one query each for members and invitations (`LIMIT 201`); invite and reset-link are one short transaction each; the benchmark seeds 20 members and 50 invitations and times the four routes |
| P16 | NFR6.20 accept/reset ≤ 1.5 s; unknown token without hashing | S19 order: the token lookup runs before the hash, so an unknown token costs one index probe; the benchmark times 10 valid accepts and resets and asserts a gate spy saw no call for 10 unknown tokens |
| P17 | NFR6.21 recover parity (report-only) | S21 makes both paths identical code; the benchmark prints the median difference over 50 calls each |
| — | NFR9.10, NFR9.11 screens | Bangla copy keys; `.scroll-x` tables; focus moves to the link element when the sheet opens; the copy button is a native button (Enter works); the browser check adds `/staff` at 360 px |

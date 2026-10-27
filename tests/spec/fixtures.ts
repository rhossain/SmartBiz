/**
 * tests/spec/fixtures.ts — one recorded success body per API route (D-04; S11, S14).
 *
 * The client walk answers its stubbed `fetch` from these bodies, and each body is parsed
 * with the route's shared zod response schema in the test before use, so an invalid
 * fixture fails the test instead of silently rendering an error view.
 *
 * The bodies are added in U2 Code Generation step 10.
 */
export {};

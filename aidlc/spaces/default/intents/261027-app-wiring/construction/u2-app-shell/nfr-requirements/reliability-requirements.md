# Reliability Requirements — u2-app-shell

> Derived from inception NFR7. U1's server-side reliability (503 on outage, recovery, restart-safe
> sessions) is unchanged; U2 makes the screens tell the person what happened and never lose their input.

| ID | Requirement | Target | Verification |
|----|-------------|--------|--------------|
| NFR7.9 | With the server unreachable, every data screen says "সার্ভারের সাথে যোগাযোগ হচ্ছে না" with a retry button, and retry works once the server answers | one retry loads the data | happy-dom test with a client stub that fails then succeeds (BR5.2, BR5.3) |
| NFR7.10 | With the database down (503), every data screen says the database is not reachable, with retry | as above | happy-dom test per kind |
| NFR7.11 | A failed save never loses what the person typed and is never resent automatically | fields unchanged after any error kind; exactly one request per submit | happy-dom tests over the save guard (BR6.1, BR6.3) |
| NFR7.12 | A session that expires while a screen is open returns the person to the same screen after sign-in, without the query string | route restored, `?t=` dropped | client unit test (BR5.4, F-06) |
| NFR7.13 | A conflict (409) shows the conflict message with reload, and the form keeps its values | reload fetches the current record | happy-dom test |

**Availability:** unchanged from U1 (no percentage SLO in this intent). **Graceful degradation:** every screen degrades to a plain message plus retry; the Shell and navigation keep working while the database is down.

# User Stories Assessment — App Wiring (B6)

- **Decision:** Execute.
- **Rationale:**
  - The work is user-facing: sign-in, every screen mounted, new customer and product screens.
  - Four roles see different things.
  - The catalog has business rules: append-only notes, variant matrices, SKU uniqueness, low stock.
- **Factors considered:**
  - Brownfield project; two Bolts.
  - Four roles with different capabilities.
  - Security-critical sessions.
  - Requirements review findings R-02 (catalog roles undefined) and R-03 (risk score and supplier action undefined), which stories can settle as acceptance criteria.
- **Where stories add the most value:**
  - the per-role allow and deny table for every API and screen route (closes R-02);
  - sign-in and session behaviour as observable criteria;
  - the catalog's business rules;
  - the end-to-end "real customer and variant on an order" path.

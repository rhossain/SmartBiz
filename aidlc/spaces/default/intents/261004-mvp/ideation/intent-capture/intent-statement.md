# Intent Statement

## Project
SmartBiz BD — Bangla-first SME Business & Order Management Platform.

## Problem Statement
Small businesses in Bangladesh run their daily operations across notebooks, spreadsheets, messaging apps, courier portals, and manual calculations. [Q1] This fragmented approach causes missed or duplicate orders, incorrect stock information, poor customer history tracking, COD reconciliation issues, expense and profit tracking failures, unmanaged customer dues, high return/cancellation rates, a lack of useful business reports, and limited visibility into business performance. [Q1] The existing workflow is inefficient and error-prone for the owner-operator who is the sole decider. [Q5]

## Target Customer
The primary customer is the owner of a small Bangladeshi SME who runs the business with one or two employees (owner + sales/inventory staff). [Q2] The first actual day-one user is the owner themselves, with up to two staff members joining shortly after. [Q2] The owner's interests center on profit visibility and low cost. [Q5]

## Success Metrics
The MVP will be considered successful when 10 SMEs complete onboarding and process ≥50 orders within 60 days. [Q3]

## Initiative Trigger
The initiative starts now to replace the scattered notebook/spreadsheet/courier-portal workflow that owners have asked to consolidate. [Q4]

## Initial Scope Signal
**Workflow-selected scope**: `mvp` (Standard depth, 23 stages, brownfield). [scope]

**User-confirmed product boundary**: Ship every §5 module in `docs/scope.md` as one MVP — full breadth, each module at Standard depth. [Q1] The product boundary was broadened to all twelve modules: authentication & business setup, customer management, product management, inventory management, order management, COD & delivery management, expense management, customer due management, supplier management, dashboard, reports, and AI-assisted business insights. [Q1]

**Workflow-selected scope after user-confirmed override**: `feature` (Standard depth, 33 stages, all phases execute). [Q8] The user-confirmed product boundary is `feature` scope with all twelve modules from §5 of the source document.

## Sources
- [Q1] Product boundary — ship every §5 module
- [Q2] Primary customer & first user
- [Q3] Success metrics — 10 SMEs × 50 orders
- [Q4] Initiative trigger — replace scattered workflow
- [Q5] Stakeholders & what each cares about
- [Q8] Workflow-selected scope — `feature`
- [scope] Workflow-selected scope
- [memory:M1] Way of working — trunk-based development, squash-merge to `main`
- [memory:M2] Deployment — deploy on merge to staging, manual approval for production

## Assumptions & Open Questions
None.

[assumption]: The customer's clarified answers cover every required field; no assumptions remain open at intent capture.
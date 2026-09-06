# SmartBiz BD — Scope

## 1. Project Overview

**SmartBiz BD** is a Bangla-first SME Business & Order Management Platform designed for small and medium businesses in Bangladesh.

The platform will help businesses manage **customers, products, inventory, orders, COD, expenses, suppliers, dues, payments, reports, and business insights** from one centralized system.

The initial target users are small businesses, Facebook/WhatsApp sellers, boutiques, retailers, wholesalers, and small ecommerce operators.

---

## 2. Business Problem

Many small businesses manage daily operations using notebooks, spreadsheets, messaging apps, courier portals, and manual calculations.

This creates problems such as:

- Missed or duplicate orders
- Incorrect stock information
- Poor customer history tracking
- COD reconciliation issues
- Difficulty tracking expenses and profit
- Unmanaged customer dues
- High return/cancellation rates
- Lack of useful business reports
- Limited visibility into business performance

---

## 3. Business Goal

Create a simple and affordable platform that enables SMEs to:

- Centralize daily business operations
- Reduce manual work and errors
- Track sales, inventory, expenses, and dues accurately
- Improve order and COD management
- Understand actual profit and business performance
- Make better decisions using reports and AI-assisted insights

---

## 4. Target Users / Stakeholders

### Primary Users

- Business Owner
- Business Manager
- Sales Staff
- Inventory Staff
- Accountant / Finance Staff

### External Stakeholders

- Customers
- Suppliers
- Courier / Delivery Providers
- Payment Service Providers

### System Stakeholder

- Platform Administrator

---

## 5. MVP Scope

### 5.1 Authentication & Business Setup

- User registration and login
- Business profile creation
- Employee invitation
- Role-based access control
- User and business settings

### 5.2 Customer Management

- Customer profile
- Phone and address
- Order history
- Payment history
- Outstanding dues
- Return/cancellation history
- Customer notes
- Basic customer risk score

### 5.3 Product Management

- Product creation
- Categories
- SKU
- Product variants
- Purchase cost
- Selling price
- Stock quantity
- Minimum stock level
- Supplier association

### 5.4 Inventory Management

- Stock-in
- Stock-out
- Inventory adjustments
- Returned stock
- Damaged stock
- Low-stock alerts
- Inventory transaction history

### 5.5 Order Management

- Create and edit orders
- Order source tracking
- Order items
- Discounts
- Delivery charges
- Order status management
- Cancellation and return handling

Suggested order flow:

**New → Confirmed → Packed → Shipped → Delivered**

Additional statuses:

**Cancelled / Returned / Failed Delivery**

### 5.6 COD & Delivery Management

- Courier information
- Delivery status
- COD amount
- Courier charge
- COD collection status
- Settlement status
- Manual settlement reconciliation

### 5.7 Expense Management

- Expense entry
- Expense categories
- Date and amount
- Notes
- Business expense history

Example categories:

- Product Purchase
- Advertising
- Courier
- Packaging
- Salary
- Rent
- Utilities
- Other

### 5.8 Customer Due Management

- Customer outstanding balance
- Partial payment
- Payment history
- Due collection status

### 5.9 Supplier Management

- Supplier profile
- Supplier products
- Purchase history
- Supplier payments
- Supplier outstanding balance

### 5.10 Dashboard

Show key business KPIs:

- Total sales
- Total orders
- Delivered orders
- Pending orders
- Returned orders
- Total expenses
- Gross profit
- Estimated net profit
- Outstanding customer dues
- Low-stock products

### 5.11 Reports

Initial reports:

- Sales Report
- Order Report
- Product Sales Report
- Inventory Report
- Expense Report
- Profit Summary
- Customer Due Report
- Supplier Due Report
- COD Settlement Report

Export:

- CSV
- PDF

### 5.12 AI-Assisted Business Insights

The MVP may include a lightweight AI assistant for questions such as:

- What were today's sales?
- Which products sold most this month?
- Why did profit decrease?
- Which products may require restocking?
- Which customers have high return rates?

AI should only use authorized business data available within the platform.

---

## 6. Core Business Rules

- Every transaction belongs to a specific business/organization.
- Users can access only businesses they are authorized to access.
- Inventory must change when relevant order or stock transactions occur.
- Returned products should restore inventory only when physically received.
- Cancelled orders must not count as completed sales.
- Delivered COD orders must remain unsettled until payment reconciliation is completed.
- Customer dues must update after payments or order adjustments.
- Expenses must be included in profitability calculations.
- Audit records should be maintained for important financial and inventory changes.
- Role permissions must control sensitive actions.

---

## 7. Out of Scope for Initial MVP

The following are excluded from the first version:

- Direct Facebook Messenger integration
- Direct Instagram integration
- WhatsApp Business API
- Live bKash integration
- Live Nagad integration
- Live payment gateway integration
- Direct Pathao integration
- Direct RedX integration
- Direct Steadfast integration
- Marketplace integrations
- Full ecommerce storefront
- Advanced accounting / ERP
- Payroll
- Tax/VAT automation
- GPS delivery tracking
- Native Android/iOS applications
- Advanced machine-learning prediction models

These can be considered in later phases.

---

## 8. Assumptions

- Businesses have internet access.
- Users can operate a web-based application.
- Orders can initially be entered manually.
- Courier and payment settlement information can initially be entered manually.
- Business owners will provide accurate product cost and expense data.
- External integrations can be added later through APIs.
- Bangla and English language support may be introduced progressively.

---

## 9. Constraints

- The project should be developed using free/open-source or free-tier tools where possible.
- No mandatory paid third-party service should be required for the MVP.
- AI usage should remain optional and must not block core business functionality.
- External APIs may have access, approval, or usage limitations.
- The assignment should remain within a medium-complexity implementation scope.

---

## 10. Key Risks

- Incorrect inventory caused by improper order/return handling
- Incorrect profit due to missing expense or purchase-cost data
- Inconsistent COD settlement records
- Unauthorized access to financial data
- Data loss or accidental deletion
- Users avoiding the system due to complexity
- Incorrect AI-generated interpretations
- Dependency on external APIs in future integrations

---

## 11. Initial Success Criteria

The MVP will be considered successful when a small business can:

1. Register and configure its business.
2. Add users with appropriate roles.
3. Add customers, suppliers, and products.
4. Manage product stock.
5. Create and process orders.
6. Track delivery and COD status.
7. Record expenses and payments.
8. Track customer and supplier dues.
9. View business KPIs and reports.
10. Identify low-stock products and high-risk customers.
11. Use basic AI-assisted business queries.
12. Complete the above without depending on paid third-party services.

---

## 12. Suggested Business Analysis Focus

During BMAD Business Analysis, validate:

- Who is the primary target customer?
- What business size should the MVP support?
- How are orders currently received?
- How is stock currently tracked?
- How are COD settlements currently reconciled?
- How are expenses and profit currently calculated?
- How are customer dues managed?
- What are the most common operational errors?
- Which reports are most important to owners?
- Which roles need access to which modules?
- Which processes need approval?
- What data must be retained for audit purposes?
- Which Bangla/local workflows are missing from existing systems?
- What would convince a business to pay for the product?

---

## 13. BRD Areas to Define

The Business Requirements Document should expand this scope into:

- Business Background
- Problem Statement
- Business Objectives
- Stakeholder Analysis
- Current State (As-Is)
- Future State (To-Be)
- Business Requirements
- Business Rules
- Functional Scope
- Non-Functional Business Needs
- In Scope / Out of Scope
- Assumptions
- Constraints
- Dependencies
- Risks
- KPIs / Success Metrics
- Acceptance Criteria
- Process Flows
- Edge Cases
- Open Questions
- Future Enhancements

---

## 14. Future Scope

Possible future versions may include:

- Courier API integration
- bKash/Nagad/payment gateway integration
- Facebook/WhatsApp order capture
- Ecommerce storefront
- Purchase order management
- Barcode support
- Multi-branch management
- Advanced accounting
- Mobile applications
- Automated customer notifications
- Advanced forecasting
- AI product recommendations
- AI sales forecasting
- Automated fraud/risk scoring
- Marketplace integrations
- Subscription and billing management

---

## 15. Recommended MVP Positioning

> **SmartBiz BD is a Bangla-first business operations platform for Bangladeshi SMEs and online sellers to manage orders, inventory, customers, COD, expenses, dues, suppliers, and business performance from one place.**

The first release should prioritize **simplicity, accuracy, local business workflows, and zero dependency on paid integrations**.

# RBAC policy (internal)

This app uses role-based access control enforced on API routes via `requireAuth` + `requireRole`.

## Roles

- **ADMIN**: full access (users, org policies, sites/products, dashboards).
- **OPS**: order acceptance workflow, batch creation/start/dispatch/complete, ops dashboards.
- **FINANCE**: invoices, payments verification/history, receivables/aging, finance dashboards.
- **BUYER**: create/view own org orders, view own org invoices (including security deposit), buyer dashboards.

## Entity scoping rules

- **BUYER org scoping**: any BUYER access to orders/invoices must be restricted to `session.orgId`.
- **Non-buyer roles**: may access across orgs based on route role gates (e.g. FINANCE receivables).

## API enforcement pattern

- Route must export `requireAuth(requireRole(..., handler))`.
- When a single route supports multiple methods with different roles, wrap per-method:
  - Example:
    - `GET` → `requireRole(["ADMIN","OPS"], handler)`
    - `POST` → `requireRole("ADMIN", handler)`


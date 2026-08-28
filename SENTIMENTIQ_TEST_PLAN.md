# SentimentIQ Dashboard Test Plan

**Scope:** Dashboard layout management and VADER disagreement workflows  
**Audience:** Engineers, QA, product owners, and release stakeholders  
**Test basis:** Current React/Vite frontend implementation with localStorage and IndexedDB persistence

## 1. Objectives

This test plan verifies that dashboard layouts remain deterministic, role-safe, persistent, and usable across input methods, and that the VADER disagreement workflow correctly identifies, presents, and exports reviews whose independent sentiment labels differ from the effective primary model label.

The suite prioritizes behavior that can silently damage analyst trust: incorrect model counts, stale filters, reordered widgets being lost, viewers gaining management controls, protected presets being deleted, and exports that do not match the visible result set.

## 2. Test layers

| Layer | Purpose | Primary tools |
|---|---|---|
| Unit | Verify pure sentiment, disagreement, CSV, layout, preset, and URL-state functions. | Vitest, Node environment |
| Integration | Verify aggregation and filter composition against representative review records. | Vitest |
| Component/UI seam | Verify event-oriented behavior such as reorder operations, permission gating, and export row composition without relying on brittle DOM snapshots. | Vitest plus shared pure helpers |
| Browser smoke | Verify actual navigation, responsive rendering, drag affordances, dialogs, IndexedDB loading, and console errors. | Manus browser preview or a future Playwright job |
| Build regression | Ensure the testable source remains type-safe and deployable. | `pnpm run check`, `pnpm run build` |

## 3. Test data policy

Use deterministic, synthetic fixtures that represent review shapes but do not claim to be real customer reviews, ratings, testimonials, or production data. Fixtures should cover positive, neutral, negative, overridden, missing-rating, and model-disagreement cases. No fixture should be presented in product UI as customer-generated content.

## 4. VADER disagreement scenarios

| ID | Scenario | Expected result |
|---|---|---|
| VADER-001 | Primary positive and VADER positive | Not a disagreement. |
| VADER-002 | Primary negative and VADER negative | Not a disagreement. |
| VADER-003 | Primary neutral and VADER positive | Disagreement. |
| VADER-004 | Primary positive with a negative override and VADER positive | Compare against the effective override; disagreement is true. |
| VADER-005 | Review has no stored VADER label | Compute VADER from review text deterministically. |
| VADER-006 | Filter contains mixed agreement and disagreement records | Return only disagreement records without mutating input. |
| VADER-007 | Empty review set | Return zero results, zero disagreement count, and a valid empty CSV. |
| VADER-008 | CSV text contains quotes, commas, and line breaks | Escape fields according to CSV rules and preserve values after parsing. |
| VADER-009 | Exported rows contain model metadata | Include primary/effective sentiment, confidence, VADER label, compound score, themes, and source. |
| VADER-010 | Active dashboard filters combine with disagreement filter | Apply all filters conjunctively and report the visible count. |

## 5. Layout and preset scenarios

| ID | Scenario | Expected result |
|---|---|---|
| LAYOUT-001 | Move a widget down one position | Only the selected widget and adjacent item exchange positions. |
| LAYOUT-002 | Move first widget up or last widget down | Order remains unchanged; no out-of-range mutation occurs. |
| LAYOUT-003 | Drag source onto target | Source is removed from its original position and inserted at target position. |
| LAYOUT-004 | Drop a widget onto itself | Order remains unchanged. |
| LAYOUT-005 | Unknown drag source or target | Order remains unchanged and drag state clears. |
| LAYOUT-006 | Hidden widget is shown | Widget is appended without duplicating an existing visible widget. |
| LAYOUT-007 | Visible widget is hidden | Widget is removed from the visible order while remaining available to restore. |
| LAYOUT-008 | Apply a role preset | Personal widget order becomes the preset order; shared preset data is not mutated. |
| LAYOUT-009 | Viewer applies a shared preset | Apply is allowed; create, rename, delete, and restore are denied. |
| LAYOUT-010 | Administrator manages a custom preset | Create, rename, delete, and restore are allowed. |
| LAYOUT-011 | Built-in preset management | Rename and delete are denied for built-ins. |
| LAYOUT-012 | Mobile long press | Drag mode activates after the configured hold threshold and shows a drop target placeholder. |
| LAYOUT-013 | Touch release over target | Widget order persists and drag state clears. |
| LAYOUT-014 | Cancelled touch drag | Original order is preserved. |
| LAYOUT-015 | Save and reload preferences | Widget order and visibility restore without duplicates or loss. |
| LAYOUT-016 | IndexedDB preset save/load | Shared presets survive a reload in the same browser origin. |
| LAYOUT-017 | Preset version restore | Selected historical order is applied, a new version is created, and a restore audit event is recorded. |
| LAYOUT-018 | URL preset search and role filters | Query parameters restore visible search/filter state without a full reload. |

## 6. Accessibility and responsive scenarios

The browser smoke suite should confirm that icon-only controls have accessible names, dialogs have `role="dialog"` and labels, filter inputs have labels, keyboard arrow buttons remain available when drag is unavailable, focus is visible, and reduced-motion preferences suppress non-essential animation. At mobile widths, verify that the placeholder does not obscure the target widget and that controls remain reachable without horizontal overflow.

## 7. Regression and release gates

A pull request is ready for review when the automated suite passes, TypeScript checking passes, and the production build completes. A release candidate additionally requires browser smoke verification for login, navigation, disagreement filtering/export, preset permissions, URL restoration, IndexedDB loading, desktop reorder, mobile long press, confirmation dialogs, and version restore.

## 8. Coverage targets

The initial automated suite should target all exported pure helpers and the critical branches listed above. The recommended minimum is 100% branch coverage for disagreement detection and layout reorder helpers, at least 90% line coverage for the data helpers, and explicit browser coverage for the small number of behaviors that depend on pointer, touch, IndexedDB, or browser download APIs.

## 9. Known limitations

The current repository does not include a configured browser automation runner or a server-side persistence layer. The first suite therefore emphasizes deterministic pure functions and integration behavior, while the browser checklist documents the flows that should be automated with Playwright once the project adopts a browser-test dependency. IndexedDB tests should use a real browser or an IndexedDB polyfill in CI rather than assuming Node has a native implementation.

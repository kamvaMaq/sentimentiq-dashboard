# SentimentIQ enhancement checklist

The requested enhancement pass is complete. Upload parsing now exposes staged progress, animated loading dots, and per-phase labels; natural-language search interprets sentiment, themes, ratings, products, and recency; VADER scores are attached to imported reviews and summarized in the dashboard and detail drawer; and the profile page persists identity, default filters, starting page, theme, widget visibility, and widget order.

## Completed revision

- [x] Add a Reviews Explorer filter for VADER/original-model disagreement.
- [x] Add export for the disagreement result set and audit the export action.
- [x] Add pointer drag-and-drop ordering for dashboard widgets.
- [x] Persist the drag-and-drop order through profile preferences and keep keyboard move controls as an accessible fallback.
- [x] Run type checks, production build, browser verification, and save a new checkpoint.

TypeScript checking, the production build, browser navigation through dashboard, reviews, upload, profile, and dark-mode states, preference save/restore interaction, and browser-console verification have been completed. The natural-language search is implemented as a privacy-preserving local intent interpreter in the current frontend-only project; a server-side LLM route can be connected later without exposing credentials in the browser.

## Completed revision

- [x] Add role-based saved layout presets with quick apply and save-as-preset actions.
- [x] Add mobile long-press drag behavior for dashboard widgets while preserving desktop drag and keyboard arrows.
- [x] Create a reusable skill capturing this dashboard enhancement workflow, implementation patterns, and validation checklist.
- [x] Validate the skill and run web project checks before delivery.

## Completed revision

- [x] Move layout presets into a shared workspace-level store keyed by analyst role, with per-user custom overrides preserved.
- [x] Add a visual placeholder that tracks the mobile widget drop target during long-press dragging.
- [x] Update the reusable skill with shared role presets and mobile placeholder guidance, then validate it.
- [x] Run web checks, responsive verification, and save a new checkpoint.

## Completed revision

- [x] Replace shared preset localStorage persistence with an IndexedDB workspace store and a resilient loading fallback.
- [x] Persist and load custom presets across sessions with visible loading/saving states.
- [x] Restrict shared preset edit and delete actions by role while protecting built-in presets.
- [x] Run IndexedDB behavior checks, TypeScript, production build, and save a new checkpoint.

## Completed revision

- [x] Add a search field and role filter for shared workspace presets.
- [x] Add an animated administrator-only delete confirmation modal with a warning message.
- [x] Update and validate the reusable dashboard enhancement skill with preset safety and search patterns.
- [x] Run type checks, production build, browser verification, and save a new checkpoint.

## Completed revision

- [x] Sync preset search and role filter state with URL query parameters and restore it on load.
- [x] Record preset create, rename, delete, and restore events with actor and role metadata.
- [x] Add audit-log filters for action, actor, role, and preset name.
- [x] Store shared preset versions and expose a restore flow with confirmation.
- [x] Run URL sharing, audit, restore, TypeScript, production build, and browser verification before checkpointing.

## Documentation and stakeholder communication

- [ ] Inspect the current source, scripts, project metadata, live domain, and frontend-only deployment boundary.
- [ ] Write a comprehensive deployment, configuration, security, operations, troubleshooting, and production-hardening guide.
- [ ] Prepare stakeholder slide content summarizing the master prompt, product scope, architecture, current limitations, and roadmap.
- [ ] Generate and review the stakeholder slide deck.
- [ ] Deliver the documentation and presentation files.

## Completed automated testing revision

- [x] Inspect the current Vitest configuration, package scripts, and testable data/UI boundaries.
- [x] Write a comprehensive test plan covering layout behavior, VADER disagreement logic, persistence, permissions, export, accessibility, and responsive interaction risks.
- [x] Implement automated unit and integration tests for sentiment disagreement and layout state behavior.
- [x] Add UI-focused tests or test seams for widget reorder, preset permissions, and disagreement filtering/export.
- [x] Run tests, TypeScript checks, and production build; fix regressions and record results.

## Attached overhaul specification

- [ ] Extract actionable requirements from pasted_content_2.txt and map them to the existing SentimentIQ implementation.
- [ ] Support fast multi-format import requirements, including TXT/JSON where compatible, progress feedback, column mapping, post-import redirect, and transparent diagnostics.
- [ ] Add a safe public-source collection boundary or clearly label the current local-only analysis path where external source ingestion needs backend/API credentials.
- [ ] Improve chart clarity and specialized dashboard visualizations without replacing working VADER and layout features.
- [ ] Add regression coverage for the new import and visualization behavior.
- [ ] Run TypeScript, tests, production build, browser verification, and save a checkpoint.

## Completed attached overhaul implementation

The actionable requirements from the attached specification are implemented: TXT and JSON import support, explicit post-import chart navigation, transparent import diagnostics, a public-source request boundary that does not fabricate external results, Products & Menu, and Insights & Alerts views grounded in current review aggregates and VADER agreement.

Validation passed with `pnpm run check`, `pnpm run test` (22 tests), and `pnpm run build`. The development preview verified the expanded navigation and empty states. The production build retains the existing non-blocking large-chunk warning from PDF/Recharts dependencies.

# SentimentIQ Dashboard
## Deployment, Operations, and Production Hardening Guide

**Document owner:** Manus AI  
**Product:** SentimentIQ Customer Signal Dashboard  
**Current deployment domain:** [sentimentiq-vlydrwan.manus.space](https://sentimentiq-vlydrwan.manus.space)  
**Current project type:** React/Vite static frontend with browser-local persistence  
**Last reviewed:** August 2026

> **Scope note:** This guide documents the implementation currently delivered in the SentimentIQ project. The dashboard is a frontend-only application. Its local accounts, imported reviews, preferences, shared presets, audit records, and preset versions are stored in the browser. IndexedDB simulates a workspace persistence layer, but it is not a secure cross-device backend.

## 1. Executive overview

SentimentIQ is an analyst workspace for importing customer reviews, interpreting sentiment, comparing an original classifier with VADER, exploring evidence, managing dashboard layouts, and recording workspace actions. It supports administrator and viewer roles, staged document parsing, natural-language review search, role-specific shared layout presets, mobile widget reordering, URL-shareable preset filters, audit filtering, and restorable preset version history.

The current deployment is suitable for product demos, internal prototypes, UX validation, and single-browser analyst workspaces. It is not yet suitable for regulated or multi-device production use because identity, review data, audit records, and workspace presets are not protected by a server-side authorization boundary.

## 2. Current architecture

### 2.1 Runtime topology

```text
Browser
  │
  ├── React 19 application
  │     ├── Wouter client-side navigation
  │     ├── Tailwind 4 + shadcn/ui primitives
  │     ├── Recharts analytics visualizations
  │     ├── Papa Parse / Mammoth / PDF.js document parsing
  │     ├── keyword sentiment classifier
  │     └── vader-sentiment comparison model
  │
  ├── localStorage
  │     ├── demo users and session
  │     ├── imported review records
  │     ├── personal preferences and theme
  │     └── legacy shared preset migration source
  │
  └── IndexedDB: sentimentiq-workspace
        ├── layout-presets
        └── layout-versions
```

### 2.2 Source layout

| Location | Responsibility |
|---|---|
| `client/src/App.tsx` | Authenticated shell, page composition, dashboard widgets, uploads, profile, presets, audit UI, and routing state. |
| `client/src/data.ts` | Review, user, session, audit, sentiment, VADER, aggregation, and local persistence helpers. |
| `client/src/parsers.ts` | CSV, DOCX, and PDF parsing plus review normalization and sentiment enrichment. |
| `client/src/index.css` | Editorial Signal Console tokens, responsive layout, accessibility states, motion, and feature styling. |
| `client/src/components/` | Reusable UI primitives and template components. |
| `client/index.html` | Document metadata, favicon, fonts, analytics script, and application entry point. |
| `server/index.ts` | Template-compatible static file server used by the build/start scripts; it does not provide application APIs or authentication. |
| `package.json` | Dependency manifest and local/build commands. |
| `ideas.md` | Chosen design direction and accepted visual review decisions. |
| `sentimentiq-master-prompt.md` | Consolidated product and implementation brief. |

## 3. Prerequisites

Use the Node.js and pnpm versions supported by the project environment. The repository declares an ESM package and a pnpm package manager. Confirm the toolchain before installing dependencies.

```bash
node --version
pnpm --version
```

A current checkout should also contain the lockfile. Install from the lockfile to keep builds deterministic:

```bash
pnpm install --frozen-lockfile
```

If the lockfile and manifest have intentionally changed together, use `pnpm install` once, review the diff, and commit both `package.json` and `pnpm-lock.yaml`.

## 4. Local development

Start the Vite development server with:

```bash
pnpm run dev
```

The template binds Vite to the host interface. Open the URL printed by Vite, normally `http://localhost:3000/`.

For a production-like local preview, first build and then run the preview server:

```bash
pnpm run build
pnpm run preview
```

The available package scripts are summarized below.

| Command | Purpose |
|---|---|
| `pnpm run dev` | Starts the Vite development server. |
| `pnpm run check` | Runs `tsc --noEmit` without emitting files. |
| `pnpm run build` | Builds the Vite frontend and bundles the template-compatible server entry. |
| `pnpm run preview` | Serves the compiled frontend for local preview. |
| `pnpm run start` | Starts the compiled Express static server with `NODE_ENV=production`. |
| `pnpm run format` | Formats project files with Prettier. |

## 5. Build and release procedure

Use the following sequence for every release candidate:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run build
```

The build creates the deployable frontend under `dist/public` and bundles the compatibility server to `dist/index.js`. Vite’s production build is the source of the static assets used by deployment.[1] The build currently reports a chunk-size warning because PDF parsing and analytics dependencies create large browser bundles. This is a warning, not a build failure, but code-splitting PDF parsing is a recommended optimization before high-traffic production use.

After the build passes, exercise the release candidate in a browser. Verify login, the dashboard, Reviews Explorer, Upload Data, Reports, Admin Settings, Profile & Preferences, light/dark themes, and responsive mobile behavior. Save a recoverable project checkpoint only after these checks pass.

## 6. Deployment on Manus hosting

The project is already configured as a Manus web project and uses built-in hosting. The current public domain is:

```text
https://sentimentiq-vlydrwan.manus.space
```

The recommended Manus deployment flow is:

1. Make changes inside `/home/ubuntu/sentimentiq-dashboard`.
2. Run `pnpm run check`.
3. Run `pnpm run build`.
4. Open the live preview and verify the important flows.
5. Save a project checkpoint through the project management workflow.
6. Treat the resulting checkpoint version as the release artifact and confirm the generated public domain.

The project is currently configured for autoscale hosting. Because this application is a static frontend and does not require a continuously running worker, autoscale is appropriate for the current implementation. A persistent hosting mode would be justified only after adding a long-lived backend, worker, streaming process, or other workload that cannot tolerate scale-to-zero behavior.

## 7. Environment and configuration

The template receives several environment values automatically from the Manus project configuration. The application should treat these values as deployment configuration, not source-controlled secrets.

| Variable family | Use |
|---|---|
| `VITE_APP_TITLE` and `VITE_APP_LOGO` | Application branding metadata. |
| `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID` | Analytics script configuration in `client/index.html`. |
| `VITE_FRONTEND_FORGE_API_URL` and `VITE_FRONTEND_FORGE_API_KEY` | Frontend integration configuration supplied by the platform. Do not expose new private credentials through Vite variables. |
| `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` | Platform-provided integration values. They are not a substitute for a product backend. |
| `JWT_SECRET`, `OAUTH_SERVER_URL`, `OWNER_NAME`, and `OWNER_OPEN_ID` | Template/platform values. The current SentimentIQ UI does not turn them into a complete production auth boundary. |

Do not place credentials in `client/src`, `client/index.html`, localStorage, IndexedDB, URL parameters, exported CSV files, or browser console output. Any real LLM, storage, authentication, notification, or third-party API integration should be routed through a server-side feature with secrets stored in the project’s secret manager.

## 8. Data model and browser persistence

The current application has two persistence layers.

| Store | Data | Operational implication |
|---|---|---|
| `localStorage` | Users, session, reviews, audit log, personal preferences, theme, and legacy preset migration data. | Simple and convenient, but origin-scoped, synchronous, size-limited, and user-editable. |
| IndexedDB database `sentimentiq-workspace` | Shared layout presets and preset versions. | Better suited to structured browser data, but still local to the browser profile and origin. IndexedDB supports structured records and indexes for browser-side storage.[2] |

The IndexedDB database includes `layout-presets` and `layout-versions`. Database version upgrades are handled in the application open routine. The current version-history implementation records preset ID, name, role, widget order, author, timestamp, and change description.

IndexedDB should be treated as a prototype persistence layer. Browser data can be cleared, unavailable in private browsing, isolated by origin, lost when a user changes devices, or inaccessible to another team member. It must not be represented as a secure source of truth. Browser storage persistence is origin-scoped; Web Storage has the same-origin behavior documented by MDN.[3]

### 8.1 Clearing local demo data

To reset a local demo workspace, use the browser’s site-data controls or the browser console only in a development environment. Do not run a destructive reset against a user’s browser without explicit confirmation. A safe product reset control should be added before distributing the demo widely.

## 9. Authentication and authorization boundary

The current demo includes seeded administrator and viewer accounts for local evaluation. These credentials are intentionally demo-only and must be changed or removed before any external distribution.

Current role behavior is enforced in the React UI and local data helpers:

- Administrators can manage users and shared presets.
- Viewers can apply shared presets but cannot create, rename, delete, or restore them.
- Built-in presets are protected from destructive management actions.
- Audit entries identify the current local user.

This is not a production authorization boundary. A user can modify browser state or application code locally. Production deployment requires server-side sessions, password hashing with a vetted password library, role checks on every protected request, CSRF protection where applicable, rate limiting, secure cookies, account recovery, and an audit store that users cannot rewrite.

## 10. Import and analytics operations

Upload parsing is performed in the browser. CSV parsing uses Papa Parse, DOCX extraction uses Mammoth, and PDF extraction uses PDF.js. Each imported review is normalized, analyzed by the primary classifier, and enriched with VADER fields. The dashboard aggregates the imported reviews into sentiment, rating, product, theme, trend, keyword, and agreement metrics.

For production workloads, evaluate file size and memory limits carefully. Browser parsing can block or pressure the main thread for large documents. Recommended hardening includes file-size limits, worker-based parsing, chunked CSV processing, server-side malware scanning, content-type validation, duplicate detection at ingestion, and an import job status endpoint.

## 11. Natural-language search

The current natural-language search is implemented as a privacy-preserving local intent interpreter. It maps user language to supported review filters such as sentiment, theme, rating, product, recency, and VADER disagreement, then routes the result into Reviews Explorer.

It is not currently a server-side LLM feature. To add an actual AI model in production:

1. Add a secure backend route.
2. Validate and rate-limit user queries.
3. Send only the minimum necessary data to the model.
4. Require structured output such as filters, confidence, and explanation.
5. Validate the structured output against a schema.
6. Apply server-side authorization and data scoping.
7. Log model usage without storing unnecessary review text.
8. Provide a deterministic fallback when the model is unavailable.

Never place an LLM API key in a `VITE_*` variable or browser bundle.

## 12. Preset operations

Shared presets are role-scoped layouts containing widget order. The profile interface provides search, role filtering, URL query synchronization, apply controls, administrator management controls, history access, and restore actions.

A shareable filtered profile URL follows this pattern:

```text
https://sentimentiq-vlydrwan.manus.space/?presetSearch=QA&presetRole=admin
```

URL parameters are useful for sharing a view, but they are not authorization. The application must still enforce role permissions when a user attempts to apply or manage a preset.

The current preset lifecycle is:

| Action | Allowed role | Audit event | Version behavior |
|---|---|---|---|
| Create custom preset | Admin | `CREATE_PRESET` | Creates an initial version. |
| Rename custom preset | Admin | `RENAME_PRESET` | Creates a renamed version. |
| Apply preset | Admin or eligible Viewer | Optional future event | Changes personal widget state. |
| Delete custom preset | Admin | `DELETE_PRESET` | Historical versions remain in browser storage unless explicitly purged. |
| Restore a version | Admin | `RESTORE_PRESET` | Restored state is saved as a new version. |

For a production backend, add optimistic concurrency control, immutable version rows, retention policy, permission checks, and conflict handling when two administrators edit the same preset.

## 13. Audit operations

Admin Settings exposes a local audit view with free-text search, action filtering, and target-role filtering. Preset actions include actor email, target role, details, and timestamp.

The current audit log is browser-local and therefore not tamper-resistant. Production audit logging should be append-only from the client’s perspective, written by a server after authorization, timestamped server-side, retained according to policy, and exportable only to authorized roles. Consider adding request IDs, IP/device context where appropriate and lawful, before/after summaries, and a clear retention policy.

## 14. Security hardening before production

The following changes are required before treating SentimentIQ as a multi-user production system:

| Area | Required hardening |
|---|---|
| Identity | Replace local demo auth with managed authentication or a vetted server-side identity system. |
| Passwords | Store only slow salted password hashes; never store plaintext or reversible credentials. |
| Sessions | Use secure, HTTP-only, same-site cookies or a vetted token strategy with expiration and rotation. |
| Authorization | Enforce role and workspace membership on the server for every read and write. |
| Reviews | Store reviews server-side with tenant/workspace isolation and access checks. |
| Files | Validate file type and size, scan uploads, isolate processing, and remove temporary files. |
| LLM | Keep model credentials server-side, validate structured outputs, and minimize data sent. |
| Audit | Write server-side append-only events and protect export access. |
| Browser storage | Treat localStorage and IndexedDB as caches, not authoritative data stores. |
| Exports | Apply authorization, redaction, rate limits, and download auditing. |
| Headers | Configure HTTPS, content security policy, frame restrictions, referrer policy, and MIME protections. |
| Dependencies | Run dependency review and update parsers, PDF libraries, and UI packages regularly. |

## 15. Observability and support

The current project includes browser and development-server logging through the Manus environment. For a production deployment, add structured server logs and client error reporting with privacy controls. Monitor:

- Build failures and deployment version.
- JavaScript runtime errors.
- Import success, partial-failure, and failure rates.
- Median and maximum parsing duration.
- VADER and primary-model disagreement rates.
- Search no-match and fallback rates.
- IndexedDB availability and migration failures.
- Preset create, restore, and delete events.
- Authentication failures and suspicious access patterns.

Avoid sending full customer review text to logs unless explicitly required and governed. Prefer review IDs, workspace IDs, counts, and error categories.

## 16. Backup and recovery

The current browser-local system does not provide a dependable central backup. Users can lose local reviews and layouts by clearing site data, changing devices, or using a different browser profile.

For production, implement:

1. Server-side review and workspace storage.
2. Scheduled encrypted backups.
3. Restore tests, not only backup creation.
4. Preset version retention and export.
5. Audit retention and immutable archival.
6. Recovery-point and recovery-time objectives.
7. A documented incident procedure.

Until then, treat the current deployment as a disposable demo workspace and do not use it as the only copy of business-critical feedback.

## 17. Performance and scaling roadmap

The current production build is valid, but the build reports large chunks. Prioritize the following improvements before significant traffic or large imports:

- Lazy-load PDF.js only when a PDF is selected.
- Move parsing into Web Workers.
- Stream or chunk large CSV files.
- Virtualize long review lists.
- Memoize expensive aggregate calculations for large datasets.
- Add pagination or server-side filtering.
- Split dashboard routes and report modules.
- Add browser performance budgets to CI.
- Measure time-to-interactive on representative mobile devices.

## 18. Troubleshooting

### The app loads but shows a blank page

Run `pnpm run check`, inspect the browser console, and confirm the compiled asset paths are served from the configured static root. If the issue follows a recent change, use the most recent known-good project checkpoint rather than destructive Git reset operations.

### Users cannot see saved presets

Confirm that the browser is using the same origin and profile, that IndexedDB is available, and that the database upgrade completed. Check the browser’s Application/Storage panel for `sentimentiq-workspace`. A different domain, private browsing context, or cleared site data will not have the same records.

### A Viewer sees no management controls

This is expected. Viewers can apply eligible shared presets but cannot create, rename, delete, or restore them. Confirm the local session role and avoid interpreting hidden controls as a rendering failure.

### A shared URL does not show the expected filtered catalog

Check that the URL uses `presetSearch` and `presetRole`, that the role value is `admin`, `viewer`, or omitted, and that the URL is loaded on the same application origin. URL state does not bypass role filtering or authorization.

### An import fails or stalls

Test with a small valid file first. Confirm the format is supported, the file is not empty, and the browser has enough memory. Inspect the stage label and skipped-row message. For large files, use the server-side ingestion roadmap rather than increasing browser limits blindly.

### The production build warns about chunk size

The warning is currently caused primarily by document parsing and analytics dependencies. Confirm that the build still completes, then plan route-level code splitting and lazy PDF loading.

## 19. Recommended CI pipeline

A minimal CI pipeline should run on every pull request:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run build
pnpm run format -- --check
```

Add browser smoke tests for authentication, dashboard navigation, upload validation, VADER disagreement filtering, preset permissions, URL restoration, audit filtering, version restore, and mobile layout behavior. Add an accessibility scan and a dependency vulnerability review before release.

## 20. Release checklist

| Check | Status to require before release |
|---|---|
| Dependency installation | Lockfile install succeeds. |
| TypeScript | `pnpm run check` passes. |
| Production build | `pnpm run build` passes. |
| Browser smoke test | Login, navigation, upload, reviews, reports, admin, profile, and sign-out pass. |
| Data safety | No fabricated customer reviews, ratings, or testimonials are present. |
| Role safety | Viewer cannot manage shared presets; built-ins are protected. |
| Persistence | IndexedDB migration and fallback behavior are tested. |
| URL sharing | Search and role query parameters restore correctly. |
| Auditability | Preset changes record actor, action, timestamp, and target role. |
| Versioning | Previous layout can be restored and creates a new version. |
| Responsive UX | Desktop and mobile states are checked, including touch drag affordance. |
| Accessibility | Focus, labels, dialog semantics, contrast, and reduced motion are checked. |
| Recovery | A project checkpoint is saved after verification. |

## 21. Production migration plan

The recommended migration sequence is to keep the current UI and replace only the browser-local authority layer. First, add a backend workspace model for users, memberships, reviews, presets, preset versions, audit events, and imports. Next, move authentication and authorization to the backend. Then replace local persistence helpers with typed API calls while keeping localStorage and IndexedDB as optional offline caches. Finally, add server-side ingestion, LLM orchestration, scheduled backups, and audit retention.

This approach preserves the current product language and interaction design while removing the primary security and durability limitations.

## References

[1]: https://vite.dev/guide/build "Vite — Building for Production"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API "MDN — IndexedDB API"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API "MDN — Web Storage API"

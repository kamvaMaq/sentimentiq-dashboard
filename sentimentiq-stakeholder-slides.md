# SentimentIQ Stakeholder Brief

## Cover
SentimentIQ
Customer signal, without the fog.
Stakeholder architecture and deployment brief · August 2026

## Slide 1
### Turn feedback into an operating signal
- SentimentIQ converts imported customer reviews into a calm, traceable workspace for product, support, and QA teams.
- The dashboard connects sentiment, themes, ratings, products, time, evidence, and model cross-checks in one view.
- The design principle is simple: **precise, calm, actionable**.

## Slide 2
### The product closes the evidence gap
- Teams often have review volume but lack a fast path from “what happened?” to “why?”
- SentimentIQ keeps every insight close to its review text, source context, confidence, and model label.
- Analysts can move from aggregate signal to review-level evidence without losing scope.

## Slide 3
### One workspace, four operating surfaces
- **Dashboard:** trends, distribution, themes, product heatmap, keywords, evidence, and VADER comparison.
- **Upload Data:** staged CSV, DOCX, and PDF parsing with mapping, progress, and validation states.
- **Reviews Explorer:** search, natural-language intent, filters, overrides, disagreement queue, and export.
- **Governance:** profiles, role presets, audit filters, version history, and administrator controls.

## Slide 4
### The architecture is intentionally lightweight
- React 19 and Vite provide the application shell and production build.
- Wouter handles client-side navigation; Tailwind 4, shadcn/ui, and Lucide provide the interface system.
- Recharts powers analytics visualization; Papa Parse, Mammoth, and PDF.js support browser-side ingestion.
- The current project is frontend-only, with no application API or authoritative server database.

## Slide 5
### A review gains two independent signals
- The existing keyword/rating-aware classifier supplies the primary label and confidence.
- VADER adds lexicon-based polarity, compound score, and positive/neutral/negative components.
- Disagreement becomes a first-class QA workflow: filter it, inspect the review, override when justified, and export the queue.
- This is a comparison aid, not a claim of ground-truth sentiment.

## Slide 6
### The workspace is built for analyst control
- Dashboard widgets can be reordered by desktop drag-and-drop, mobile long press, or keyboard arrow controls.
- Mobile dragging provides a visible insertion placeholder so the destination is clear before release.
- Role presets let teams start from QA, executive, evidence-first, or voice-of-customer layouts.
- Personal preferences remain separate from shared role layouts.

## Slide 7
### Governance is visible in the interface
- Admins can publish layouts to the Admin or Viewer team; viewers can apply but not manage them.
- Built-in presets are protected from rename and delete actions.
- Destructive deletes require an explicit warning modal naming the preset and affected role.
- Audit events record actor, action, timestamp, details, and target role for preset changes.

## Slide 8
### Shared views are easy to pass around
- Preset search and role filters synchronize to URL parameters such as `presetSearch=QA&presetRole=admin`.
- A copied URL restores the filtered catalog when opened on the same application origin.
- IndexedDB stores shared presets and preset versions in the current browser workspace.
- The URL is a sharing convenience, not an authorization mechanism.

## Slide 9
### Version history makes layout changes reversible
- Custom shared presets record timestamped versions with author, role, widget order, and change description.
- Administrators can inspect history and restore an earlier layout.
- Restore preserves historical records, creates a new current version, and adds a `RESTORE_PRESET` audit event.
- The workflow is designed to migrate cleanly to immutable server-side version rows.

## Slide 10
### Deployment is ready for demos and pilot use
- Run `pnpm install --frozen-lockfile`, `pnpm run check`, and `pnpm run build` before a release.
- Deploy through Manus built-in hosting; the current public domain is `sentimentiq-vlydrwan.manus.space`.
- Validate authentication, uploads, analytics, role permissions, URL state, IndexedDB persistence, audit filters, version restore, and mobile behavior.
- Save a recoverable project checkpoint after verification.

## Slide 11
### Production readiness requires a server boundary
- Current localStorage and IndexedDB behavior is browser-scoped and user-editable; it is not cross-device persistence or secure authorization.
- Production needs managed identity, server-side workspace membership, review storage, role checks, immutable audit events, and encrypted backups.
- Large imports should move toward worker or server-side processing, with file validation and malware scanning.
- A secure backend LLM route can replace the local natural-language interpreter without exposing credentials.

## Slide 12
### Recommended path from pilot to product
- **Now:** use the current polished frontend for stakeholder alignment, UX testing, and pilot workflows.
- **Next:** add backend auth, workspace APIs, review ingestion, server-side preset/audit/version stores, and team membership management.
- **Then:** add server-side AI orchestration, model evaluation, permissions, observability, backups, and performance budgets.
- Success means faster evidence-to-action cycles with traceable, reversible workspace decisions.

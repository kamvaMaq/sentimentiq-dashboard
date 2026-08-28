# SentimentIQ Dashboard — Consolidated Master Prompt

## Role

Act as a senior product engineer and design engineer. Complete and improve the unfinished SentimentIQ customer-feedback analytics dashboard from the supplied ZIP folder and pasted product brief. Preserve useful existing code and behavior, but fix incomplete flows, weak UX, missing states, and integration issues. Build a polished, responsive, production-oriented frontend rather than a collection of placeholders.

## Product concept

SentimentIQ is a customer-feedback intelligence workspace for importing reviews, analyzing sentiment, exploring evidence, comparing sentiment models, managing dashboard layouts, and keeping workspace actions traceable.

The product should help analysts answer three questions quickly:

1. What are customers feeling?
2. Why are they feeling that way?
3. What changed, who changed it, and can the analysis be trusted?

Use the positioning: **Customer signal, without the fog.** The product should feel precise, calm, actionable, evidence-led, and operational rather than decorative or generic.

## Existing product to complete

Start from the unfinished dashboard implementation in the supplied ZIP folder and its pasted requirements. Inspect the existing project structure, reusable data model, parsers, sentiment engine, authentication flow, dashboard pages, and styling before making changes.

Preserve and finish these primary areas:

- Authentication with local demo access, administrator and viewer roles, sign-in, sign-out, account creation, password reset, and protected admin access.
- Persistent dashboard shell with responsive sidebar navigation, top bar, page metadata, theme toggle, import action, notifications affordance, and profile access.
- Dashboard analytics for satisfaction score, review count, average rating, negative share, sentiment trend, sentiment distribution, themes, product heatmap, keyword language, recent evidence, and model comparison.
- Upload Data view for CSV, DOCX, and PDF review imports.
- Column mapping and source-aware parsing.
- Review Explorer with search, filters, review detail, sentiment override, QA actions, and evidence context.
- Reports view with current-scope summaries and CSV export.
- Admin Settings for user management and workspace governance.
- Profile & Preferences for identity, default filters, theme, default starting page, widget visibility, widget ordering, and layout presets.

## Upload and parsing experience

Upgrade document uploads with clear staged feedback. During parsing, show a per-file progress bar, animated loading state, current processing phase, progress percentage, and readable status transitions. Use stages such as:

- File accepted.
- Reading file.
- Detecting format.
- Extracting rows or document text.
- Mapping columns.
- Analyzing sentiment.
- Calculating VADER comparison.
- Saving imported reviews.
- Complete or validation error.

Support CSV, DOCX, and PDF parsing. Handle empty files, unsupported formats, missing text columns, malformed rows, duplicate IDs, and partial imports with explicit messages. Do not fail silently. Keep source file metadata and skipped-row counts visible. Use loading animations that respect reduced-motion preferences.

## Sentiment analysis and VADER comparison

Keep the existing original sentiment classifier and add VADER as an independent comparison model for every imported review.

Each review should expose, where available:

- Original sentiment label.
- Original confidence.
- Effective sentiment after any analyst override.
- VADER sentiment label.
- VADER compound score.
- VADER positive, neutral, and negative scores.
- Agreement or disagreement state.

Add a dashboard VADER comparison card showing model agreement and independent sentiment split. Add VADER details to the review detail drawer so analysts can inspect disagreements at the source level.

Add a Reviews Explorer filter for reviews where the original/effective sentiment and VADER sentiment disagree. Show the active filter state and disagreement count. Add an export action for the disagreement result set. The exported CSV should include review text, rating, date, product, customer, original/effective sentiment, original confidence, VADER label, VADER compound score, themes, and source.

Never fabricate customer reviews, ratings, testimonials, or user-generated content. Empty states are acceptable and preferred when no real review data has been imported.

## Natural-language search

Add a natural-language search surface that allows users to query reviews and sentiment analytics using phrases such as:

- “Show negative shipping reviews.”
- “Find low-rated reviews about packaging.”
- “What are customers saying about the price?”
- “Show recent positive reviews for Product A.”
- “Find reviews where VADER disagrees.”

Interpret intent across sentiment, themes, product, ratings, recency, and model disagreement. Route matching queries to Reviews Explorer with filters applied. In the current frontend-only version, implement a privacy-preserving local intent interpreter and deterministic fallback. Do not expose secrets in the browser. Design the interface so a secure server-side LLM route can be connected later without rewriting the UI.

Provide useful empty and no-match states. Make the query interpretation transparent enough that users understand the applied scope.

## Dashboard widgets and layout management

Make dashboard widgets reorderable as one coherent layout, not only as a list in Profile & Preferences. Support:

- Desktop native drag-and-drop.
- Mobile long-press dragging.
- Touch movement across valid drop targets.
- A visible mobile insertion placeholder that follows the active drop target.
- Teal outline, dashed insertion guide, elevated drag state, and “Release to place” or equivalent guidance.
- Keyboard-accessible arrow controls as a fallback.
- Widget visibility toggles.
- Immediate or clearly indicated persistence of order changes.
- Reduced-motion support.

Keep drag state and drop target state visually distinct. Avoid layout jumps and accidental clicks. Make touch targets large enough for mobile.

## Shared role-based layout presets

Create built-in and custom dashboard layout presets for different analyst roles.

At minimum support:

- Admin role.
- Viewer role.

Built-in presets should include useful role-specific examples such as QA command center, Executive brief, Evidence first, and Voice of customer. Built-ins must be protected from edit and delete operations.

Administrators can:

- Create a shared preset.
- Choose whether it is for the Admin team or Viewer team.
- Rename custom shared presets.
- Delete custom shared presets.
- View preset version history.
- Restore an earlier version.

Viewers can:

- See presets available to their role, subject to the shared catalog rules.
- Apply presets.
- Not create, rename, edit, delete, or restore shared presets.

Preserve each user’s personal widget layout and preferences separately from shared team presets.

## IndexedDB workspace persistence

Simulate backend workspace persistence with IndexedDB in the frontend-only project. Use a named database and stores for:

- Shared layout presets.
- Preset version history.

Handle database version upgrades safely. Migrate legacy localStorage preset data when available. Use transaction-safe writes and visible loading/saving states. Keep the app usable if IndexedDB is unavailable by providing a graceful fallback.

Store enough metadata for shared presets and versions to include:

- Preset ID.
- Preset name.
- Target team role.
- Widget order.
- Author or last editor.
- Saved timestamp.
- Change description.
- Version ID.

## Preset safety and confirmation behavior

When an administrator attempts to delete a custom shared preset, show an animated confirmation modal with:

- The preset name.
- The affected team role.
- A clear warning that the shared layout will be removed for that team.
- A note that personal layouts will not be changed.
- A safe cancellation action.
- A clearly destructive confirmation action.

Never allow built-in presets to be deleted or renamed. Do not use an unannounced destructive action.

## Preset search and URL sharing

Add a preset management search and filter bar with:

- Text search by preset name.
- Role filter: All roles, Admin, Viewer.
- Visible result count.
- Clear no-match state.

Synchronize the preset search and role filter state with URL query parameters, for example:

- `presetSearch=QA`
- `presetRole=admin`

Restore these values when the view loads so a user can copy and share a filtered view. Preserve unrelated query parameters and avoid full page reloads when the controls change.

## Audit log and governance

Track workspace actions in an audit log. At minimum record:

- Actor user ID.
- Actor email.
- Action.
- Details.
- Timestamp.
- Target team role when relevant.

Record preset creation, rename, delete, and restore actions, in addition to existing import, access, and sentiment override events.

In Admin Settings, add audit filtering by:

- Free-text actor/details search.
- Action type.
- Target role.

Show readable action labels, actor identity, target team role, details, and timestamp. Provide a clear no-match state. Keep the audit log traceable and do not fabricate event history beyond legitimate app initialization or user actions.

## Version history and restore

Add version history for custom shared presets. A version entry should show:

- Saved date and time.
- Author.
- Change description.
- Target role.
- Preset layout state.

Allow administrators to restore a previous version. Restoring should:

1. Replace the current shared layout with the selected historical widget order and name.
2. Save the current result as a new version.
3. Add a RESTORE_PRESET audit event.
4. Preserve the historical version rather than overwriting it.
5. Show a confirmation or clear success state.

Keep the version-history UI readable on narrow screens.

## Visual design direction

Use the **Editorial Signal Console** direction.

Design movement: Swiss editorial operations console with quiet data-room precision.

Core principles:

- Strong editorial hierarchy with confident headlines and compact mono utility labels.
- Hairline rules, disciplined alignment, asymmetry, and worksheet-like structure.
- Warm parchment and ink foundation with sea-glass teal as the ownable signal color.
- Flat, deliberate surfaces and restrained elevation instead of cushiony SaaS cards.
- Signal-oriented visual motifs such as arcs, plotted points, confidence cues, audit markers, chart geometry, and rules.

Color philosophy:

Use a warm paper base, deep ink text, muted mineral neutrals, sea-glass teal for primary actions and positive signal, coral for negative or destructive signal, and a restrained lavender accent for governance or secondary emphasis. Ensure text contrast against the actual rendered background.

Typography system:

Use a display face with editorial personality for large headlines and a readable sans-serif for body copy. Use IBM Plex Mono or a similar mono face for utility labels, metadata, audit timestamps, states, and compact controls. Do not use Inter as the only font.

Brand voice:

Precise, calm, actionable, operational, and evidence-led. Avoid filler such as “Welcome to our website” or “Get started today.” Prefer copy such as:

- “Read the signal before it becomes a problem.”
- “Trace the label back to the evidence.”
- “A clear operating view of how customers are feeling across the feedback you have imported.”

Logo and mark:

Use a bold graphic signal mark without text, suitable for the header and favicon. It should suggest a plotted signal, an arc, or a calm diagnostic instrument. Do not use a default-font wordmark as the primary brand mark.

Animation:

Keep interface transitions under 300ms where practical. Use snappy ease-out motion. Animate opacity and transform rather than layout properties. Use scale around 0.95 rather than scale 0. Do not animate keyboard-driven actions unnecessarily. Respect `prefers-reduced-motion`. Use richer motion for modals, staged upload progress, drag states, and rare confirmation moments only.

## Accessibility and responsive behavior

Build mobile-first and validate desktop and mobile layouts. Ensure:

- Keyboard reachability.
- Visible focus states.
- Semantic buttons and labels.
- Accessible names for icon buttons.
- Dialog roles and modal labels.
- Readable contrast in both light and dark themes.
- Large enough touch targets.
- Keyboard reordering fallback for widgets.
- Reduced-motion support.
- No nested anchors or invalid form controls.

## Technical constraints

Use the existing React, TypeScript, Vite, Tailwind, shadcn/ui, Lucide, Recharts, Wouter, and local persistence setup where appropriate. Evaluate existing template components before reimplementing primitives.

Keep the project frontend-only unless explicitly instructed otherwise. Do not modify backend endpoints, database schemas, or server logic for this scope. If a feature would benefit from a backend, make the UI extensible and document the secure backend follow-up.

Keep static assets outside the project’s public source directories according to the hosting workflow. Use uploaded asset URLs rather than storing large media in the project.

Use existing project conventions and avoid destructive repository operations. Preserve recoverability with checkpoints after meaningful revisions.

## Validation checklist

Before delivery:

- Run TypeScript checking.
- Run the production build.
- Confirm the dev server starts cleanly.
- Check browser console for runtime errors.
- Verify login, sign-out, and protected admin behavior.
- Verify CSV, DOCX, PDF, empty-file, and malformed-file upload states.
- Verify staged parsing progress and loading animation.
- Verify natural-language search interpretation and no-match state.
- Verify original sentiment versus VADER comparison.
- Verify disagreement filtering and CSV export.
- Verify widget ordering on desktop.
- Verify long-press touch dragging and visible mobile insertion placeholder.
- Verify keyboard widget movement.
- Verify preset creation, role targeting, apply behavior, search, role filtering, URL restoration, and protected built-ins.
- Verify administrator-only rename/delete/restore controls.
- Verify animated delete confirmation cancellation and confirmation.
- Verify IndexedDB save/load behavior across refresh or sessions.
- Verify audit events and audit filters.
- Verify preset version creation and restoration.
- Verify light and dark theme contrast.
- Capture representative desktop and mobile screenshots before delivery.
- Save one final recoverable checkpoint and report its version ID.

## Delivery requirements

Deliver a concise summary of what changed compared with the previous checkpoint. Mention known frontend-only limitations honestly, especially that IndexedDB simulates workspace persistence within a browser and that secure cross-device persistence requires a backend. Include practical next-step suggestions such as backend synchronization, richer model comparison, version diff previews, or team membership management.

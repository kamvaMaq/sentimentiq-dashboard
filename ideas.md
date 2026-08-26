# SentimentIQ Dashboard — Design Direction

## Approach 1
**Theme Name:** Editorial Signal Console

**Very Brief Intro:** A refined analytics workspace inspired by Swiss editorial systems and premium operations software. It uses a quiet graphite-and-ivory foundation with a clear sea-glass accent so the data feels calm, legible, and decisive.

**Probability:** 0.07

## Approach 2
**Theme Name:** Soft Metric Atelier

**Very Brief Intro:** A warm, light-first studio dashboard with paper-like surfaces, generous whitespace, and color-coded insight cards. The mood is approachable and collaborative, with more emphasis on gentle guidance than command-center density.

**Probability:** 0.03

## Approach 3
**Theme Name:** Nightline Observatory

**Very Brief Intro:** A dark, high-contrast monitoring interface with signal colors, subtle glows, and an observatory-like sense of live movement. It is energetic and technical, designed for teams who watch changes in real time.

**Probability:** 0.09

## Selected Approach: Editorial Signal Console

### Design Movement
Contemporary Swiss editorial design blended with premium B2B operations software: rigorous typographic hierarchy, asymmetric compositions, tight alignment, and generous breathing room.

### Core Principles
1. **Signal over decoration:** Color is reserved for sentiment, status, and action; the interface stays quiet so the insight leads.
2. **Editorial hierarchy:** Strong headings, small utility labels, and clear section rhythm make dense analytics feel scanned rather than crowded.
3. **Structured flexibility:** Cards and charts use a measured grid, but the dashboard avoids a repetitive collection of identical tiles by mixing wide trend views with focused detail panels.
4. **Trust through clarity:** Empty states, confidence values, filter summaries, and audit trails explain what the system knows and what it inferred.

### Color Philosophy
The foundation is an ink-black and warm parchment pairing. The light theme uses a soft paper background and ink text; the dark theme reverses this into charcoal surfaces and warm white text. A signature **sea-glass teal** identifies healthy signal and primary actions, while coral, saffron, and lilac distinguish negative, neutral, and secondary analytics. These colors are semantic rather than ornamental, helping users form reliable visual associations.

### Layout Paradigm
A fixed left rail establishes orientation, while the main workspace is a left-aligned editorial canvas with a compact utility bar. Overview uses a wide trend story followed by asymmetric supporting modules; detail views prioritize tables, filters, and contextual panels over centered marketing compositions. On mobile, the rail becomes a drawer and the content keeps the same hierarchy through stacked sections.

### Signature Elements
- A compact **signal mark** built from an arc and a central point, used in the brand lockup and empty states.
- Uppercase mono utility labels with short rules and hairline dividers, echoing an analyst’s printed worksheet.
- Soft paper grain and restrained elevation: cards feel layered without becoming glossy or over-rounded.

### Interaction Philosophy
Interactions should feel deliberate and observable. Hover states reveal affordances through a slight lift and accent border, not flashing color. Filters update all visible analytics together and always show the active scope. Drawer, modal, toast, and table interactions should be keyboard reachable and confirm completion with concise feedback.

### Animation
Use short 160–220ms ease-out transitions for buttons, nav states, chips, and table rows. Drawer and modal entrances may use a 260ms slide/fade from their trigger edge. Chart blocks should fade up with a 40ms stagger only on initial view; repeated filter updates should be instant enough to preserve analytical focus. Respect `prefers-reduced-motion` by disabling non-essential transforms and entrance motion.

### Typography System
Use **DM Sans** for readable interface text and **IBM Plex Mono** for utility labels, data values, timestamps, and filter metadata. Page titles use DM Sans 700 at 30–38px; section headings use 15–18px at 650; body copy uses 13–14px with 1.55 line-height; utility labels use 10–11px mono with 0.12em letter spacing. Avoid Inter and avoid using mono for long-form copy.

### Brand Essence
SentimentIQ turns scattered customer feedback into a clear operating signal for product, support, and growth teams—without burying the evidence under dashboards. **Precise. Calm. Actionable.**

### Brand Voice
Headlines are direct and observant; CTAs are specific verbs; microcopy explains status in plain language and never overpromises.

Example lines:
- “Read the signal before it becomes a problem.”
- “Import feedback, then trace what changed.”

### Wordmark & Logo
The logo is a compact teal square containing a white upward arc intersected by a single signal point. The wordmark is set in a custom-spaced DM Sans lockup with “Sentiment” in ink and “IQ” in teal; the mark remains recognizable without the wordmark at small sizes.

### Signature Brand Color
**Sea-glass teal — `#12A79B`**. It is ownable because it sits between clinical cyan and traditional enterprise green: clear enough for data, warm enough to feel human.

## Style Decisions
- Use the selected Editorial Signal Console direction across the entire product.
- Prefer semantic teal/coral/saffron/lilac over decorative gradients.
- Keep charts responsive and data-dense, but preserve generous panel padding and readable labels.
- Use dark mode as a first-class theme, not a color inversion afterthought.
- Keep imported and demo data clearly labeled so mock data is not mistaken for production data.

## Style Decisions

- Authentication and empty states use signal-native geometry—arcs, plotted points, hairline rules, and audit language—instead of botanical or lifestyle ornament.
- Login surfaces are flatter and more deliberate, with a crisp border and offset worksheet shadow rather than a soft floating SaaS card.
- The first visible access copy emphasizes imported reviews, traceable labels, confidence, and auditability.

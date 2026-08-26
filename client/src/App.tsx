// Editorial Signal Console: Swiss editorial hierarchy, sea-glass teal signal color, DM Sans + IBM Plex Mono, quiet surfaces, semantic motion.
import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import {
  Activity, ArrowDown, ArrowUp, BarChart3, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, CloudUpload, FileBarChart, FileText, Filter, FolderUp, Gauge, Info, LayoutDashboard, LogOut, Menu, Moon, MoreHorizontal, PieChart as PieChartIcon, Plus, Radar as RadarIcon, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Tag, Trash2, TrendingDown, TrendingUp, UploadCloud, Users, X, Zap,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  addAuditEntry, addReviews, analyzeSentiment, applyRatingBias, computeStats, createUser, getAuditLog, getCurrentUser, getEffectiveSentiment, getReviews, getUniqueProducts, getUsers, login, logout, resetPassword, saveReviews, seedIfEmpty, updateUserRole, deleteUser, type AggStats, type AppFilters, type AuditEntry, type Page, type Review, type Role, type Sentiment, type User,
} from "./data";
import { autoDetectColumns, importRows, parseFile, type ColumnMap, type ParseResult } from "./parsers";

const LOGO_URL = "/manus-storage/sentimentiq-mark_e5f8e08f.png";
const DARK_TEXTURE_URL = "/manus-storage/signal-ribbon-texture_713025f9.png";

const EMPTY_FILTERS: AppFilters = { dateFrom: "", dateTo: "", product: "all", sentiment: "all", rating: "all" };
const SENTIMENT_COLORS: Record<Sentiment, string> = { positive: "#12A79B", neutral: "#C9963E", negative: "#DB6B67" };
const THEME_LABELS: Record<string, string> = { shipping: "Shipping", quality: "Quality", price: "Price", service: "Support", usability: "Usability", packaging: "Packaging", general: "General" };

const pageMeta: Record<Page, { label: string; eyebrow: string; title: string; description: string }> = {
  dashboard: { label: "Dashboard", eyebrow: "Workspace / Overview", title: "Read the signal before it becomes a problem.", description: "A clear operating view of how customers are feeling across the feedback you have imported." },
  upload: { label: "Upload Data", eyebrow: "Workspace / Ingest", title: "Bring feedback into focus.", description: "Import CSV, Word, or PDF feedback, confirm the fields, and keep the source visible." },
  reviews: { label: "Reviews Explorer", eyebrow: "Workspace / QA", title: "Trace every conclusion back to the evidence.", description: "Search, inspect, and correct sentiment labels where human judgment should lead." },
  reports: { label: "Reports", eyebrow: "Workspace / Output", title: "Turn the current view into a useful brief.", description: "Export a filtered snapshot for product, support, and growth conversations." },
  admin: { label: "Admin Settings", eyebrow: "Workspace / Governance", title: "Keep the workspace accountable.", description: "Manage access, inspect audit events, and make the source of every import clear." },
};

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className={`brand-lockup ${compact ? "brand-lockup-compact" : ""}`}><img src={LOGO_URL} alt="" /><span>Sentiment<span>IQ</span></span></div>;
}

function IconButton({ label, children, onClick, className = "" }: { label: string; children: ReactNode; onClick?: () => void; className?: string }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "teal" | "negative" | "neutral" | "lavender" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function SentimentBadge({ sentiment, compact = false }: { sentiment: Sentiment; compact?: boolean }) {
  const icon = sentiment === "positive" ? <ArrowUp size={compact ? 11 : 12} /> : sentiment === "negative" ? <ArrowDown size={compact ? 11 : 12} /> : <Activity size={compact ? 11 : 12} />;
  return <span className={`sentiment-badge sentiment-${sentiment} ${compact ? "sentiment-badge-compact" : ""}`}>{icon}{sentiment}</span>;
}

function EmptyChart({ label, detail = "Charts will appear once reviews are imported." }: { label: string; detail?: string }) {
  return <div className="empty-chart"><div className="empty-chart-mark"><Activity size={17} /></div><strong>{label}</strong><span>{detail}</span></div>;
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><div className="eyebrow">{eyebrow ?? "Signal"}</div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; dataKey?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><div className="tooltip-label">{label}</div>{payload.map((item) => <div className="tooltip-row" key={`${item.dataKey}-${item.name}`}><span className="tooltip-dot" style={{ background: item.color }} />{item.name ?? item.dataKey}<b>{item.value}</b></div>)}</div>;
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return <button type="button" className="theme-toggle" onClick={onToggle} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}><span className={dark ? "" : "active"}><Sun size={14} /></span><span className={dark ? "active" : ""}><Moon size={14} /></span></button>;
}

function Sidebar({ page, user, dark, mobileOpen, onToggleTheme, onNavigate, onLogout, onClose }: { page: Page; user: User; dark: boolean; mobileOpen: boolean; onToggleTheme: () => void; onNavigate: (page: Page) => void; onLogout: () => void; onClose: () => void }) {
  const links: Array<{ id: Page; label: string; icon: ReactNode }> = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
    { id: "upload", label: "Upload Data", icon: <FolderUp size={17} /> },
    { id: "reviews", label: "Reviews Explorer", icon: <ClipboardList size={17} /> },
    { id: "reports", label: "Reports", icon: <FileBarChart size={17} /> },
    ...(user.role === "admin" ? [{ id: "admin" as Page, label: "Admin Settings", icon: <Settings2 size={17} /> }] : []),
  ];
  return <>
    <div className={`sidebar-backdrop ${mobileOpen ? "is-open" : ""}`} onClick={onClose} />
    <aside className={`app-sidebar ${mobileOpen ? "is-open" : ""}`}>
      <div className="sidebar-top"><Logo /><IconButton label="Close navigation" className="mobile-close" onClick={onClose}><X size={18} /></IconButton></div>
      <div className="workspace-chip"><span className="live-dot" /><span>Live workspace</span><MoreHorizontal size={14} /></div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        <div className="nav-label">Workspace</div>
        {links.map((link) => <button type="button" className={`nav-item ${page === link.id ? "active" : ""}`} key={link.id} onClick={() => { onNavigate(link.id); onClose(); }}><span className="nav-icon">{link.icon}</span><span>{link.label}</span>{page === link.id && <span className="nav-indicator" />}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip"><Sparkles size={15} /><div><strong>Signal note</strong><span>Import is the first step. Interpretation stays traceable.</span></div></div>
        <div className="sidebar-mode"><span>Appearance</span><ThemeToggle dark={dark} onToggle={onToggleTheme} /></div>
        <button type="button" className="profile-button" onClick={() => user.role === "admin" && onNavigate("admin")}><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span className="profile-copy"><strong>{user.name}</strong><small>{user.role === "admin" ? "Administrator" : "Viewer"}</small></span><ChevronDown size={15} /></button>
        <button type="button" className="logout-button" onClick={onLogout}><LogOut size={15} /> Sign out</button>
      </div>
    </aside>
  </>;
}

function LoginView({ dark, onToggleTheme, onLogin }: { dark: boolean; onToggleTheme: () => void; onLogin: () => void }) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("admin@sentimentiq.com");
  const [password, setPassword] = useState("Admin123!");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (mode === "login") {
      const result = login(email, password);
      if (!result.ok) setError(result.error ?? "Unable to sign in."); else onLogin();
      return;
    }
    if (mode === "signup") {
      if (password.length < 8) { setError("Use at least 8 characters for a password."); return; }
      const result = createUser(email, password, name || email.split("@")[0], "viewer");
      if (!result.ok) setError(result.error ?? "Unable to create account."); else { setMessage("Account created. You can sign in now."); setMode("login"); }
      return;
    }
    const result = resetPassword(email, password);
    if (!result.ok) setError(result.error ?? "Unable to reset password."); else { setMessage("Password updated locally. Sign in with the new password."); setMode("login"); }
  };
  return <div className="login-screen" style={{ backgroundImage: dark ? `url(${DARK_TEXTURE_URL})` : undefined }}>
    <div className="login-topbar"><Logo /><div className="login-top-actions"><span className="status-copy"><span className="live-dot" /> Private workspace</span><ThemeToggle dark={dark} onToggle={onToggleTheme} /></div></div>
    <div className="login-layout">
      <div className="login-copy"><div className="eyebrow">Customer signal, without the fog</div><h1>Know what customers mean, not just what they say.</h1><p>SentimentIQ brings imported reviews, traceable labels, and human QA into one calm operating surface.</p><div className="login-proof"><span><ShieldCheck size={16} /> Traceable labels</span><span><Zap size={16} /> Fast first import</span><span><Activity size={16} /> Live aggregates</span></div></div>
      <div className="login-card-wrap"><div className="login-signal-grid" aria-hidden="true"><span className="signal-arc signal-arc-one" /><span className="signal-arc signal-arc-two" /><span className="signal-point signal-point-one" /><span className="signal-point signal-point-two" /></div><div className="login-card"><div className="card-kicker">{mode === "login" ? "Workspace access" : mode === "signup" ? "Viewer invite" : "Account recovery"}</div><h2>{mode === "login" ? "Welcome back." : mode === "signup" ? "Create a viewer account." : "Reset your password."}</h2><p>{mode === "login" ? "Review the current scope, inspect traceable labels, and audit every import." : mode === "signup" ? "Viewer accounts can explore analytics and inspect reviews." : "Set a new password for this local workspace account."}</p>
        <form onSubmit={submit} className="auth-form">{mode === "signup" && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}<label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label><label>{mode === "reset" ? "New password" : "Password"}<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></label>{error && <div className="form-message error"><Info size={14} />{error}</div>}{message && <div className="form-message success"><Check size={14} />{message}</div>}<button className="primary-button full-width" type="submit">{mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Update password"}<ChevronRight size={16} /></button></form>
        <div className="auth-links">{mode === "login" ? <><button type="button" onClick={() => setMode("reset")}>Forgot password?</button><button type="button" onClick={() => setMode("signup")}>Create viewer account</button></> : <button type="button" onClick={() => setMode("login")}>Back to sign in</button>}</div>
        {mode === "login" && <div className="demo-note"><span>Local demo access · change before production</span><code>admin@sentimentiq.com</code><code>Admin123!</code></div>}
      </div></div>
    </div>
  </div>;
}

function FiltersBar({ filters, products, onChange, onReset }: { filters: AppFilters; products: string[]; onChange: (next: AppFilters) => void; onReset: () => void }) {
  const set = (key: keyof AppFilters, value: string) => onChange({ ...filters, [key]: value });
  const hasFilters = Object.values(filters).some((value) => value && value !== "all");
  return <div className="filters-bar"><div className="filters-intro"><Filter size={15} /><span>Scope</span></div><label className="filter-field"><span>From</span><input type="date" value={filters.dateFrom} onChange={(event) => set("dateFrom", event.target.value)} /></label><label className="filter-field"><span>To</span><input type="date" value={filters.dateTo} onChange={(event) => set("dateTo", event.target.value)} /></label><label className="filter-field"><span>Product</span><select value={filters.product} onChange={(event) => set("product", event.target.value)}><option value="all">All products</option>{products.map((product) => <option key={product} value={product}>{product}</option>)}</select></label><label className="filter-field"><span>Rating</span><select value={filters.rating} onChange={(event) => set("rating", event.target.value)}><option value="all">All ratings</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select></label><label className="filter-field"><span>Sentiment</span><select value={filters.sentiment} onChange={(event) => set("sentiment", event.target.value)}><option value="all">All sentiment</option><option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option></select></label>{hasFilters && <button type="button" className="text-button" onClick={onReset}><RefreshCw size={13} /> Clear</button>}</div>;
}

function StatCard({ label, value, detail, icon, tone, empty }: { label: string; value: string; detail: string; icon: ReactNode; tone: string; empty?: boolean }) {
  return <div className={`stat-card stat-${tone}`}><div className="stat-top"><span className="stat-label">{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><span className={`stat-detail ${empty ? "muted" : ""}`}>{detail}</span></div>;
}

function DashboardPage({ reviews, stats, filters, products, onFiltersChange, onReset, onNavigate }: { reviews: Review[]; stats: AggStats; filters: AppFilters; products: string[]; onFiltersChange: (filters: AppFilters) => void; onReset: () => void; onNavigate: (page: Page) => void }) {
  const pieData = [{ name: "Positive", value: stats.positive, sentiment: "positive" as Sentiment }, { name: "Neutral", value: stats.neutral, sentiment: "neutral" as Sentiment }, { name: "Negative", value: stats.negative, sentiment: "negative" as Sentiment }];
  const trend = stats.byDate.slice(-14).map((item) => ({ ...item, date: new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }));
  const radar = Object.entries(stats.byTheme).filter(([key]) => key !== "general").map(([theme, value]) => ({ theme: THEME_LABELS[theme] ?? theme, score: value.total ? Math.round(((value.pos + value.neu * 0.5) / value.total) * 100) : 0 }));
  const heatmapProducts = Object.keys(stats.byProduct).slice(0, 6);
  const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const recent = [...reviews].sort((a, b) => b.importedAt.localeCompare(a.importedAt)).slice(0, 4);
  return <div className="page-content dashboard-page"><FiltersBar filters={filters} products={products} onChange={onFiltersChange} onReset={onReset} />
    <div className="dashboard-intro"><div><div className="eyebrow">{stats.total ? "Current signal" : "Ready for your first signal"}</div><h1>Customer sentiment, in context.</h1><p>{stats.total ? `${stats.total.toLocaleString()} reviews are in the current view. Use filters to move from the headline to the evidence.` : "Your workspace is ready. Import a review file to activate the analytics surface without losing the source context."}</p></div><button type="button" className="primary-button" onClick={() => onNavigate("upload")}><UploadCloud size={16} /> Import feedback</button></div>
    <div className="stats-grid"><StatCard label="Satisfaction score" value={stats.total ? `${stats.satisfactionScore}` : "—"} detail={stats.total ? "Weighted positive / neutral" : "Calculated after import"} icon={<Gauge size={17} />} tone="teal" empty={!stats.total} /><StatCard label="Reviews in view" value={stats.total.toLocaleString()} detail={stats.total ? "Across selected scope" : "No source connected yet"} icon={<ClipboardList size={17} />} tone="ink" empty={!stats.total} /><StatCard label="Average rating" value={stats.avgRating ? `${stats.avgRating} / 5` : "—"} detail={stats.avgRating ? "From supplied ratings" : "Waiting for rating fields"} icon={<Activity size={17} />} tone="lavender" empty={!stats.avgRating} /><StatCard label="Negative share" value={stats.total ? `${Math.round((stats.negative / stats.total) * 100)}%` : "—"} detail={stats.total ? `${stats.negative.toLocaleString()} reviews to inspect` : "No negative signal yet"} icon={<TrendingDown size={17} />} tone="coral" empty={!stats.total} /></div>
    <div className="chart-grid chart-grid-primary"><section className="panel trend-panel"><SectionHeading eyebrow="Movement" title="Sentiment trend" detail="Daily review volume in the active scope" action={<Pill tone="teal">{stats.byDate.length ? `${stats.byDate.length} active days` : "No timeline yet"}</Pill>} />{trend.length ? <ResponsiveContainer width="100%" height={250}><AreaChart data={trend} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}><defs><linearGradient id="positiveFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#12A79B" stopOpacity={0.28} /><stop offset="100%" stopColor="#12A79B" stopOpacity={0} /></linearGradient><linearGradient id="negativeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#DB6B67" stopOpacity={0.18} /><stop offset="100%" stopColor="#DB6B67" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="date" tick={{ fill: "var(--muted-text)", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "var(--muted-text)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="positive" name="Positive" stroke="#12A79B" strokeWidth={2.4} fill="url(#positiveFill)" /><Line type="monotone" dataKey="neutral" name="Neutral" stroke="#C9963E" strokeWidth={1.8} strokeDasharray="4 4" dot={false} /><Area type="monotone" dataKey="negative" name="Negative" stroke="#DB6B67" strokeWidth={1.8} fill="url(#negativeFill)" /></AreaChart></ResponsiveContainer> : <EmptyChart label="No trend to draw yet" />}</section>
      <section className="panel sentiment-panel"><SectionHeading eyebrow="Distribution" title="Overall sentiment" detail="A simple pie view of the current scope" />{stats.total ? <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={82} paddingAngle={3} labelLine={false} label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}>{pieData.map((item) => <Cell key={item.name} fill={SENTIMENT_COLORS[item.sentiment]} stroke="var(--surface)" strokeWidth={2} />)}</Pie><Tooltip content={<ChartTooltip />} /><Legend verticalAlign="bottom" iconType="circle" iconSize={7} formatter={(value) => <span className="chart-legend">{value}</span>} /></PieChart></ResponsiveContainer> : <EmptyChart label="No sentiment distribution yet" />}</section>
    </div>
    <div className="chart-grid chart-grid-secondary"><section className="panel"><SectionHeading eyebrow="Themes" title="Theme health" detail="Weighted score by extracted theme" />{radar.length > 2 ? <ResponsiveContainer width="100%" height={250}><RadarChart data={radar} cx="50%" cy="50%" outerRadius="70%"><PolarGrid stroke="var(--line)" /><PolarAngleAxis dataKey="theme" tick={{ fill: "var(--muted-text)", fontSize: 10 }} /><PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} /><Radar dataKey="score" stroke="#12A79B" fill="#12A79B" fillOpacity={0.2} strokeWidth={2} /><Tooltip content={<ChartTooltip />} /></RadarChart></ResponsiveContainer> : <EmptyChart label="Theme health needs more reviews" detail="The radar activates after at least three themes are found." />}</section>
      <section className="panel"><SectionHeading eyebrow="Heatmap" title="Product × sentiment" detail="Positive signal is teal, negative signal is coral" />{heatmapProducts.length ? <div className="heatmap-wrap"><div className="heatmap-labels"><span />{["Positive", "Neutral", "Negative"].map((label) => <span key={label}>{label.slice(0, 3)}</span>)}</div>{heatmapProducts.map((product) => { const item = stats.byProduct[product]; const values = [item.pos, item.neu, item.neg]; return <div className="heatmap-row" key={product}><span title={product}>{product}</span>{values.map((value, index) => <div key={index} className={`heat-cell heat-cell-${index}`} style={{ opacity: Math.max(0.18, value / Math.max(1, item.total)) }} title={`${product}: ${value} reviews`}><b>{value}</b></div>)}</div>; })}<div className="heatmap-legend"><span><i className="legend-teal" /> positive</span><span><i className="legend-coral" /> negative</span></div></div> : <EmptyChart label="No product matrix yet" />}</section>
    </div>
    <div className="lower-grid"><section className="panel keyword-panel"><SectionHeading eyebrow="Language" title="What customers mention" detail="Frequent terms sized by occurrence" />{stats.keywords.length ? <div className="keyword-cloud">{stats.keywords.slice(0, 22).map((item, index) => <span key={item.word} className={`keyword keyword-${item.sentiment}`} style={{ fontSize: `${Math.max(12, 26 - index * 0.55)}px`, opacity: Math.max(0.52, 1 - index * 0.018) }}>{item.word}</span>)}</div> : <EmptyChart label="The word cloud is waiting" detail="Import text-rich reviews to see recurring language." />}</section><section className="panel recent-panel"><SectionHeading eyebrow="Evidence" title="Recent reviews" detail="Latest imported items" action={<button type="button" className="text-button" onClick={() => onNavigate("reviews")}>View explorer <ChevronRight size={14} /></button>} />{recent.length ? <div className="review-list">{recent.map((review) => <div className="review-list-item" key={review.id}><SentimentBadge sentiment={getEffectiveSentiment(review)} compact /><div><strong>{review.product}</strong><p>{review.text}</p><span>{review.customer} · {new Date(review.date).toLocaleDateString()}</span></div></div>)}</div> : <EmptyChart label="No evidence in the workspace" detail="Once reviews are imported, the latest four will appear here." />}</section></div>
  </div>;
}

function UploadPage({ user, onImported, onNavigate }: { user: User; onImported: (reviews: Review[], fileName: string, skipped: number) => void; onNavigate: (page: Page) => void }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [map, setMap] = useState<ColumnMap>({ text: "", rating: "", date: "", product: "", customer: "" });
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "reading" | "mapping" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const acceptFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name); setError(""); setSummary(null); setStage("reading"); setProgress(18);
    try {
      const result = await parseFile(file);
      setProgress(82);
      if (result.error || !result.rows.length) { setError(result.error ?? "No rows found in this file."); setStage("error"); return; }
      setParseResult(result); setMap(autoDetectColumns(result.headers)); setProgress(100); setStage("mapping");
    } catch (caught) { setError(String(caught)); setStage("error"); }
  };
  const onInput = (event: ChangeEvent<HTMLInputElement>) => acceptFile(event.target.files?.[0]);
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files?.[0]); };
  const updateMap = (key: keyof ColumnMap, value: string) => setMap((current) => ({ ...current, [key]: value }));
  const commit = () => {
    if (!parseResult || !map.text) { setError("Choose the column that contains the review text before importing."); return; }
    const result = importRows(parseResult.rows, map, fileName);
    addAuditEntry({ userId: user.id, userEmail: user.email, action: "IMPORT_REVIEWS", details: `${fileName}: ${result.imported.length} imported, ${result.skipped} skipped.` });
    setSummary({ imported: result.imported.length, skipped: result.skipped }); setStage("done"); onImported(result.imported, fileName, result.skipped);
  };
  return <div className="page-content upload-page"><div className="upload-hero"><div><div className="eyebrow">Data ingest</div><h1>Bring feedback into focus.</h1><p>SentimentIQ normalizes CSV, DOCX, and PDF reviews into one review schema. The mapping step stays explicit so imported data never becomes a black box.</p></div><div className="format-row"><Pill tone="teal">CSV</Pill><Pill tone="lavender">DOCX</Pill><Pill tone="neutral">PDF</Pill></div></div>
    <div className={`dropzone ${dragging ? "dragging" : ""} ${stage === "done" ? "complete" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}><input id="review-upload" type="file" accept=".csv,.docx,.pdf" onChange={onInput} /><div className="dropzone-icon">{stage === "done" ? <Check size={25} /> : stage === "error" ? <X size={25} /> : <CloudUpload size={25} />}</div><strong>{stage === "done" ? "Import complete" : stage === "error" ? "We could not read that file" : fileName ? fileName : "Drop a review file here"}</strong><span>{stage === "done" ? "Your data is now part of the workspace signal." : stage === "error" ? error : "or choose a CSV, DOCX, or PDF up to 25 MB"}</span>{stage !== "done" && <label htmlFor="review-upload" className="secondary-button">Choose file</label>}{stage === "reading" && <div className="upload-progress"><div style={{ width: `${progress}%` }} /><span>Reading file… {progress}%</span></div>}</div>
    {stage === "mapping" && parseResult && <section className="panel mapping-panel"><SectionHeading eyebrow="Step 2 / 2" title="Confirm your columns" detail={`${parseResult.rows.length} rows detected in ${fileName}`} action={<Pill tone="teal">Preview</Pill>} /><div className="mapping-layout"><div className="mapping-fields">{([{ key: "text", label: "Review text", required: true }, { key: "rating", label: "Rating", required: false }, { key: "date", label: "Date", required: false }, { key: "product", label: "Product", required: false }, { key: "customer", label: "Customer / ID", required: false }] as Array<{ key: keyof ColumnMap; label: string; required: boolean }>).map((field) => <label className="mapping-field" key={field.key}><span>{field.label}{field.required && <em>required</em>}</span><select value={map[field.key]} onChange={(event) => updateMap(field.key, event.target.value)}><option value="">Not mapped</option>{parseResult.headers.map((header) => <option value={header} key={header}>{header}</option>)}</select></label>)}<button type="button" className="primary-button" onClick={commit}><Check size={16} /> Import {parseResult.rows.length} rows</button></div><div className="preview-table-wrap"><div className="table-caption"><span>First five rows</span><span>{parseResult.headers.length} columns</span></div><div className="preview-table-scroll"><table className="data-table compact"><thead><tr>{parseResult.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{parseResult.rows.slice(0, 5).map((row, index) => <tr key={index}>{parseResult.headers.map((header) => <td key={header}>{row[header] || <span className="empty-value">—</span>}</td>)}</tr>)}</tbody></table></div></div></div></section>}
    {summary && <section className="import-summary"><div className="summary-check"><Check size={20} /></div><div><strong>{summary.imported.toLocaleString()} reviews imported</strong><span>{summary.skipped ? `${summary.skipped} skipped due to missing or invalid text.` : "All rows passed the text validation."}</span></div><button type="button" className="secondary-button" onClick={() => onNavigate("dashboard")}>View dashboard <ChevronRight size={15} /></button></section>}
    <div className="upload-notes"><div><Info size={16} /><span><strong>What happens next</strong> Each review is scored against a transparent keyword model, assigned themes, and saved locally for this workspace.</span></div><div><ShieldCheck size={16} /><span><strong>Source stays visible</strong> Every imported review retains its original file name and the audit log records who imported it.</span></div></div>
  </div>;
}

function ReviewsPage({ reviews, user, onOverride }: { reviews: Review[]; user: User; onOverride: (id: string, sentiment: Sentiment) => void }) {
  const [query, setQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [sort, setSort] = useState<"date" | "rating" | "confidence">("date");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Review | null>(null);
  const perPage = 8;
  const filtered = useMemo(() => reviews.filter((review) => { const haystack = `${review.text} ${review.product} ${review.customer} ${review.source}`.toLowerCase(); return (!query || haystack.includes(query.toLowerCase())) && (sentimentFilter === "all" || getEffectiveSentiment(review) === sentimentFilter); }).sort((a, b) => sort === "rating" ? (b.rating ?? 0) - (a.rating ?? 0) : sort === "confidence" ? b.confidence - a.confidence : b.date.localeCompare(a.date)), [reviews, query, sentimentFilter, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((page - 1) * perPage, page * perPage);
  useEffect(() => setPage(1), [query, sentimentFilter, sort]);
  useEffect(() => { if (selected) setSelected(reviews.find((review) => review.id === selected.id) ?? null); }, [reviews]);
  return <div className="page-content reviews-page"><div className="subpage-heading"><div><div className="eyebrow">Quality assurance</div><h1>Reviews Explorer</h1><p>Search the source, inspect the model’s confidence, and correct labels when the evidence says otherwise.</p></div><Pill tone="teal">{reviews.length.toLocaleString()} total</Pill></div><div className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search review text, product, or customer" /></div><select className="toolbar-select" value={sentimentFilter} onChange={(event) => setSentimentFilter(event.target.value)}><option value="all">All sentiment</option><option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option></select><select className="toolbar-select" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="date">Newest first</option><option value="rating">Highest rating</option><option value="confidence">Highest confidence</option></select></div>{visible.length ? <div className="data-table-scroll"><table className="data-table"><thead><tr><th>Review</th><th>Product</th><th>Rating</th><th>Sentiment</th><th>Confidence</th><th>Themes</th><th>Source</th></tr></thead><tbody>{visible.map((review) => <tr key={review.id} onClick={() => setSelected(review)} className="clickable-row"><td><div className="review-cell"><strong>{review.customer || "Anonymous"}</strong><span>{review.text}</span></div></td><td>{review.product}</td><td><span className="stars">{"★".repeat(review.rating ?? 0)}<span>{"★".repeat(5 - (review.rating ?? 0))}</span></span></td><td><SentimentBadge sentiment={getEffectiveSentiment(review)} compact /></td><td><span className="confidence"><span><i style={{ width: `${review.confidence * 100}%` }} /></span>{Math.round(review.confidence * 100)}%</span></td><td><div className="theme-list">{review.themes.slice(0, 2).map((theme) => <span key={theme}>{THEME_LABELS[theme] ?? theme}</span>)}</div></td><td><span className="source-cell"><FileText size={13} />{review.source}</span></td></tr>)}</tbody></table></div> : <div className="table-empty"><div className="empty-chart-mark"><Search size={17} /></div><strong>{reviews.length ? "No reviews match this search" : "No reviews imported yet"}</strong><span>{reviews.length ? "Try a different query or clear the active filters." : "Use Upload Data to bring a CSV, DOCX, or PDF into the workspace."}</span></div>}<div className="pagination"><span>{filtered.length ? `${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)} of ${filtered.length}` : "0 reviews"}</span><div><IconButton label="Previous page" onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></IconButton><span className="page-count">{page} / {totalPages}</span><IconButton label="Next page" onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={16} /></IconButton></div></div></div>{selected && <ReviewDetail review={selected} user={user} onClose={() => setSelected(null)} onOverride={(sentiment) => { onOverride(selected.id, sentiment); }} />}</div>;
}

function ReviewDetail({ review, user, onClose, onOverride }: { review: Review; user: User; onClose: () => void; onOverride: (sentiment: Sentiment) => void }) {
  const current = getEffectiveSentiment(review);
  return <div className="modal-backdrop" onClick={onClose}><div className="detail-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><div className="eyebrow">Review detail</div><h2>{review.product}</h2></div><IconButton label="Close review detail" onClick={onClose}><X size={18} /></IconButton></div><div className="drawer-meta"><SentimentBadge sentiment={current} /><span>{review.rating ? `${review.rating} / 5 rating` : "No rating supplied"}</span><span>{new Date(review.date).toLocaleDateString()}</span></div><blockquote>“{review.text}”</blockquote><div className="detail-grid"><div><span className="detail-label">Customer</span><strong>{review.customer || "Anonymous"}</strong></div><div><span className="detail-label">Source file</span><strong>{review.source}</strong></div><div><span className="detail-label">Confidence</span><strong>{Math.round(review.confidence * 100)}%</strong></div><div><span className="detail-label">Themes</span><strong>{review.themes.map((theme) => THEME_LABELS[theme] ?? theme).join(", ")}</strong></div></div>{user.role === "admin" ? <div className="override-box"><div><div className="detail-label">Human QA override</div><p>Correct the model label when the review’s context warrants it.</p></div><select value={current} onChange={(event) => onOverride(event.target.value as Sentiment)}><option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option></select></div> : <div className="viewer-note"><ShieldCheck size={16} /> Viewer access is read-only. Ask an administrator to change a label.</div>}<div className="drawer-foot"><span>Imported {new Date(review.importedAt).toLocaleString()}</span><button type="button" className="secondary-button" onClick={onClose}>Done</button></div></div></div>;
}

function ReportsPage({ stats, filters, onExport }: { stats: AggStats; filters: AppFilters; onExport: () => void }) {
  const productRows = Object.entries(stats.byProduct).sort(([, a], [, b]) => b.total - a.total);
  return <div className="page-content reports-page"><div className="subpage-heading"><div><div className="eyebrow">Exportable brief</div><h1>Reports</h1><p>Generate a clean snapshot of the current filtered view for the next product or support conversation.</p></div><button type="button" className="primary-button" onClick={onExport}><FileBarChart size={16} /> Export CSV</button></div><div className="report-scope"><span><SlidersHorizontal size={15} /> Current scope</span><strong>{stats.total.toLocaleString()} reviews</strong><span>{filters.product === "all" ? "All products" : filters.product}</span><span>{filters.sentiment === "all" ? "All sentiment" : filters.sentiment}</span><span>{filters.rating === "all" ? "All ratings" : `${filters.rating} stars`}</span></div><div className="report-grid"><section className="panel report-summary"><SectionHeading eyebrow="Executive summary" title="The numbers behind the narrative" detail="This report mirrors the global dashboard scope." /><div className="report-big-number"><strong>{stats.total ? stats.satisfactionScore : "—"}</strong><span>customer satisfaction score</span></div><div className="report-metrics"><div><span>Positive</span><strong>{stats.total ? `${Math.round((stats.positive / stats.total) * 100)}%` : "—"}</strong></div><div><span>Neutral</span><strong>{stats.total ? `${Math.round((stats.neutral / stats.total) * 100)}%` : "—"}</strong></div><div><span>Negative</span><strong>{stats.total ? `${Math.round((stats.negative / stats.total) * 100)}%` : "—"}</strong></div></div><div className="report-note"><Info size={15} /><span>CSV export includes review-level evidence, sentiment labels, confidence, themes, and source file.</span></div></section><section className="panel report-products"><SectionHeading eyebrow="Product lens" title="Products in scope" detail="Sorted by review volume" />{productRows.length ? <div className="report-product-list">{productRows.map(([product, item]) => <div className="report-product-row" key={product}><div><strong>{product}</strong><span>{item.total} reviews</span></div><div className="mini-bar"><i style={{ width: `${(item.pos / item.total) * 100}%` }} /><i style={{ width: `${(item.neu / item.total) * 100}%` }} /><i style={{ width: `${(item.neg / item.total) * 100}%` }} /></div><strong>{Math.round((item.pos / item.total) * 100)}% positive</strong></div>)}</div> : <EmptyChart label="No product breakdown yet" detail="Import reviews to make a product brief." />}</section></div></div>;
}

function AdminPage({ currentUser, onUserChange }: { currentUser: User; onUserChange: () => void }) {
  const [users, setUsers] = useState<User[]>(getUsers());
  const [audit, setAudit] = useState<AuditEntry[]>(getAuditLog());
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [password, setPassword] = useState("Viewer123!");
  const [notice, setNotice] = useState("");
  const refresh = () => { setUsers(getUsers()); setAudit(getAuditLog()); onUserChange(); };
  const invite = (event: React.FormEvent) => { event.preventDefault(); const result = createUser(email, password, name || email.split("@")[0], role); if (!result.ok) setNotice(result.error ?? "Unable to invite user."); else { addAuditEntry({ userId: currentUser.id, userEmail: currentUser.email, action: "INVITE_USER", details: `${email} invited as ${role}.` }); setNotice(`${email} added as ${role}.`); setEmail(""); setName(""); refresh(); } };
  return <div className="page-content admin-page"><div className="subpage-heading"><div><div className="eyebrow">Governance</div><h1>Admin Settings</h1><p>Access and audit controls for this workspace. For production deployment, move identity and session storage to a secure backend.</p></div><Pill tone="lavender"><ShieldCheck size={13} /> Admin only</Pill></div><div className="admin-grid"><section className="panel invite-panel"><SectionHeading eyebrow="Access" title="Invite a teammate" detail="New self-serve accounts are viewers by default; admins can assign roles here." /><form className="invite-form" onSubmit={invite}><label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" /></label><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alex@company.com" /></label><label>Temporary password<input required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="viewer">Viewer</option><option value="admin">Admin</option></select></label><button type="submit" className="primary-button"><Plus size={16} /> Add user</button></form>{notice && <div className="form-message success"><Check size={14} />{notice}</div>}</section><section className="panel users-panel"><SectionHeading eyebrow="People" title="Workspace users" detail={`${users.length} accounts with local access`} />{users.map((workspaceUser) => <div className="user-row" key={workspaceUser.id}><span className="avatar">{workspaceUser.name.slice(0, 1).toUpperCase()}</span><div><strong>{workspaceUser.name}</strong><span>{workspaceUser.email}</span></div><select value={workspaceUser.role} disabled={workspaceUser.id === currentUser.id} onChange={(event) => { updateUserRole(workspaceUser.id, event.target.value as Role); refresh(); }}><option value="viewer">Viewer</option><option value="admin">Admin</option></select>{workspaceUser.id !== currentUser.id && <IconButton label={`Remove ${workspaceUser.email}`} onClick={() => { deleteUser(workspaceUser.id); refresh(); }}><Trash2 size={15} /></IconButton>}</div>)}</section></div><section className="panel audit-panel"><SectionHeading eyebrow="Audit log" title="Recent workspace events" detail="Imports, access changes, and other traceable actions" />{audit.length ? <div className="audit-list">{audit.slice(0, 10).map((entry) => <div className="audit-row" key={entry.id}><span className="audit-dot" /><div><strong>{entry.action.replaceAll("_", " ")}</strong><span>{entry.details}</span></div><time>{new Date(entry.timestamp).toLocaleString()}</time></div>)}</div> : <div className="table-empty"><strong>No audit events yet</strong><span>Workspace actions will appear here.</span></div>}</section></div>;
}

function AppShell({ user, page, dark, mobileOpen, onToggleTheme, onToggleMobile, onNavigate, onLogout, reviews, setReviews, filters, setFilters, onReset }: { user: User; page: Page; dark: boolean; mobileOpen: boolean; onToggleTheme: () => void; onToggleMobile: () => void; onNavigate: (page: Page) => void; onLogout: () => void; reviews: Review[]; setReviews: (reviews: Review[]) => void; filters: AppFilters; setFilters: (filters: AppFilters) => void; onReset: () => void }) {
  const meta = pageMeta[page];
  const products = useMemo(() => getUniqueProducts(reviews), [reviews]);
  const stats = useMemo(() => computeStats(reviews, filters), [reviews, filters]);
  const handleImport = (incoming: Review[]) => setReviews([...reviews, ...incoming]);
  const handleOverride = (id: string, sentiment: Sentiment) => { const updated = reviews.map((review) => review.id === id ? { ...review, override: sentiment } : review); setReviews(updated); saveReviews(updated); addAuditEntry({ userId: user.id, userEmail: user.email, action: "OVERRIDE_SENTIMENT", details: `Review ${id} corrected to ${sentiment}.` }); };
  const handleExport = () => { const filtered = reviews.filter((review) => { const sentiment = getEffectiveSentiment(review); return (!filters.dateFrom || review.date >= filters.dateFrom) && (!filters.dateTo || review.date <= filters.dateTo) && (filters.product === "all" || review.product === filters.product) && (filters.sentiment === "all" || sentiment === filters.sentiment) && (filters.rating === "all" || review.rating === Number(filters.rating)); }); const header = ["review_text", "rating", "date", "product", "customer", "sentiment", "confidence", "themes", "source"]; const csv = [header, ...filtered.map((review) => [review.text, review.rating ?? "", review.date, review.product, review.customer, getEffectiveSentiment(review), review.confidence, review.themes.join(" | "), review.source])].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `sentimentiq-report-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url); addAuditEntry({ userId: user.id, userEmail: user.email, action: "EXPORT_REPORT", details: `${filtered.length} review rows exported.` }); };
  return <div className={`app-frame ${dark ? "theme-dark" : "theme-light"}`}><Sidebar page={page} user={user} dark={dark} mobileOpen={mobileOpen} onToggleTheme={onToggleTheme} onNavigate={onNavigate} onLogout={onLogout} onClose={() => onToggleMobile()} /><main className="main-area"><header className="topbar"><div className="topbar-left"><IconButton label="Open navigation" className="menu-button" onClick={onToggleMobile}><Menu size={19} /></IconButton><div><span className="breadcrumb">{meta.eyebrow}</span><strong>{meta.label}</strong></div></div><div className="topbar-actions"><span className="topbar-status"><span className="live-dot" /> Synced locally</span><IconButton label="Notifications"><Bell size={17} /></IconButton><button type="button" className="topbar-import" onClick={() => onNavigate("upload")}><Plus size={15} /> Import</button><ThemeToggle dark={dark} onToggle={onToggleTheme} /></div></header><div className="page-header"><div><div className="eyebrow">{meta.eyebrow}</div><h1>{meta.title}</h1><p>{meta.description}</p></div><div className="header-context"><span>{reviews.length.toLocaleString()} reviews stored</span><span className="header-divider" /><span>{user.role === "admin" ? "Admin access" : "Read-only access"}</span></div></div>{page === "dashboard" && <DashboardPage reviews={reviews} stats={stats} filters={filters} products={products} onFiltersChange={setFilters} onReset={onReset} onNavigate={onNavigate} />}{page === "upload" && <UploadPage user={user} onImported={(incoming, fileName, skipped) => { handleImport(incoming); if (skipped) addAuditEntry({ userId: user.id, userEmail: user.email, action: "IMPORT_WARNING", details: `${fileName}: ${skipped} rows skipped.` }); }} onNavigate={onNavigate} />}{page === "reviews" && <ReviewsPage reviews={reviews} user={user} onOverride={handleOverride} />}{page === "reports" && <ReportsPage stats={stats} filters={filters} onExport={handleExport} />}{page === "admin" && user.role === "admin" && <AdminPage currentUser={user} onUserChange={() => undefined} />}</main></div>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [page, setPage] = useState<Page>("dashboard");
  const [dark, setDark] = useState(() => localStorage.getItem("siq_theme") === "dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(() => getReviews());
  const [filters, setFilters] = useState<AppFilters>(EMPTY_FILTERS);
  useEffect(() => { seedIfEmpty(); setUser(getCurrentUser()); setReviews(getReviews()); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("siq_theme", dark ? "dark" : "light"); }, [dark]);
  const handleLogout = () => { logout(); setUser(null); setPage("dashboard"); };
  if (!user) return <LoginView dark={dark} onToggleTheme={() => setDark((value) => !value)} onLogin={() => setUser(getCurrentUser())} />;
  return <AppShell user={user} page={page} dark={dark} mobileOpen={mobileOpen} onToggleTheme={() => setDark((value) => !value)} onToggleMobile={() => setMobileOpen((value) => !value)} onNavigate={setPage} onLogout={handleLogout} reviews={reviews} setReviews={(next) => { setReviews(next); saveReviews(next); }} filters={filters} setFilters={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} />;
}

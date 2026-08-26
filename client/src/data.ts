import { SentimentIntensityAnalyzer } from "vader-sentiment";

export type Sentiment = "positive" | "neutral" | "negative";
export type Role = "admin" | "viewer";
export type Page = "dashboard" | "upload" | "reviews" | "reports" | "admin" | "profile";

export interface Review {
  id: string;
  text: string;
  rating?: number;
  date: string;
  product: string;
  customer: string;
  sentiment: Sentiment;
  confidence: number;
  themes: string[];
  source: string;
  importedAt: string;
  override?: Sentiment;
  vaderSentiment?: Sentiment;
  vaderCompound?: number;
  vaderPositive?: number;
  vaderNeutral?: number;
  vaderNegative?: number;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: number;
}

export interface AppFilters {
  dateFrom: string;
  dateTo: string;
  product: string;
  sentiment: string;
  rating: string;
}

const POS_WORDS = new Set([
  "great", "excellent", "amazing", "love", "perfect", "best", "fantastic", "wonderful", "outstanding", "superb", "happy", "satisfied", "recommend", "fast", "helpful", "responsive", "friendly", "awesome", "brilliant", "exceptional", "delighted", "pleased", "quality", "smooth", "reliable", "easy", "comfortable", "solid", "nice", "good", "impressive", "beautiful", "innovative", "efficient", "professional", "quick", "accurate", "clear", "fresh", "clean", "sturdy", "durable", "worth", "value", "affordable", "premium",
]);

const NEG_WORDS = new Set([
  "bad", "terrible", "awful", "worst", "horrible", "disappointing", "poor", "broken", "damaged", "late", "slow", "useless", "defective", "waste", "refund", "return", "angry", "frustrated", "never", "fail", "failed", "failure", "ugly", "cheap", "flimsy", "inaccurate", "confusing", "complicated", "rude", "unhelpful", "misleading", "wrong", "missing", "lost", "delayed", "expensive", "overpriced", "unsafe", "dangerous", "defect", "shattered", "scratched", "leaking", "noisy", "uncomfortable", "stiff", "annoyed",
]);

const vader = new SentimentIntensityAnalyzer();

const THEME_KEYWORDS: Record<string, string[]> = {
  shipping: ["ship", "deliver", "delivery", "fast", "slow", "package", "tracking", "arrive", "transit", "courier", "postal", "dispatch"],
  quality: ["quality", "material", "build", "durable", "cheap", "premium", "sturdy", "flimsy", "solid", "workmanship", "crafted", "made"],
  price: ["price", "cost", "expensive", "cheap", "value", "worth", "affordable", "overpriced", "budget", "deal", "discount", "money"],
  service: ["service", "support", "help", "staff", "customer", "response", "reply", "agent", "team", "contact", "assist", "resolve"],
  usability: ["easy", "use", "setup", "install", "intuitive", "complicated", "confusing", "simple", "interface", "app", "manual", "instructions"],
  packaging: ["packag", "box", "wrap", "protect", "damage", "open", "unbox", "present", "seal", "bag"],
};

function simpleHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (Math.imul(31, hash) + value.charCodeAt(index)) | 0;
  return Math.abs(hash).toString(16);
}

export function hashPassword(password: string): string {
  return simpleHash(`siq_salt_${password}`);
}

export function analyzeSentiment(text: string): { sentiment: Sentiment; confidence: number; themes: string[] } {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/).filter(Boolean);
  let positive = 0;
  let negative = 0;
  for (const word of words) {
    if (POS_WORDS.has(word)) positive += 1;
    if (NEG_WORDS.has(word)) negative += 1;
  }
  const total = positive + negative;
  let sentiment: Sentiment = "neutral";
  let confidence = 0.55;
  if (total && positive > negative) {
    sentiment = "positive";
    confidence = Math.min(0.97, 0.6 + ((positive - negative) / Math.max(1, words.length)) * 4);
  } else if (total && negative > positive) {
    sentiment = "negative";
    confidence = Math.min(0.97, 0.6 + ((negative - positive) / Math.max(1, words.length)) * 4);
  } else if (total) {
    confidence = 0.52;
  }

  const themes = Object.entries(THEME_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)))
    .map(([theme]) => theme);
  return { sentiment, confidence: Number(confidence.toFixed(2)), themes: themes.length ? themes : ["general"] };
}

export function analyzeVader(text: string): { vaderSentiment: Sentiment; vaderCompound: number; vaderPositive: number; vaderNeutral: number; vaderNegative: number } {
  const scores = vader.polarity_scores(text);
  const vaderSentiment: Sentiment = scores.compound >= 0.05 ? "positive" : scores.compound <= -0.05 ? "negative" : "neutral";
  return { vaderSentiment, vaderCompound: Number(scores.compound.toFixed(3)), vaderPositive: Number(scores.pos.toFixed(3)), vaderNeutral: Number(scores.neu.toFixed(3)), vaderNegative: Number(scores.neg.toFixed(3)) };
}

export function applyRatingBias(analysis: { sentiment: Sentiment; confidence: number; themes: string[] }, rating?: number) {
  if (!rating) return analysis;
  if (rating >= 4 && analysis.sentiment === "negative") return { ...analysis, sentiment: "neutral" as Sentiment, confidence: Math.min(analysis.confidence, 0.65) };
  if (rating <= 2 && analysis.sentiment === "positive") return { ...analysis, sentiment: "neutral" as Sentiment, confidence: Math.min(analysis.confidence, 0.65) };
  if (rating === 5) return { ...analysis, sentiment: "positive" as Sentiment, confidence: Math.max(analysis.confidence, 0.75) };
  if (rating === 1) return { ...analysis, sentiment: "negative" as Sentiment, confidence: Math.max(analysis.confidence, 0.75) };
  return analysis;
}

const KEYS = { reviews: "siq_reviews", users: "siq_users", session: "siq_session", audit: "siq_audit" } as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getReviews() { return load<Review[]>(KEYS.reviews, []); }
export function saveReviews(reviews: Review[]) { save(KEYS.reviews, reviews); }
export function addReviews(incoming: Review[]) {
  const existing = getReviews();
  const existingIds = new Set(existing.map((review) => review.id));
  saveReviews([...existing, ...incoming.filter((review) => !existingIds.has(review.id))]);
}

export function getUsers() { return load<User[]>(KEYS.users, []); }
export function saveUsers(users: User[]) { save(KEYS.users, users); }
export function getUserById(id: string) { return getUsers().find((user) => user.id === id); }

export function getSession(): Session | null {
  const session = load<Session | null>(KEYS.session, null);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    clearSession();
    return null;
  }
  return session;
}

export function setSession(userId: string) {
  const session = { userId, token: Math.random().toString(36).slice(2), expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
  save(KEYS.session, session);
  return session;
}
export function clearSession() { localStorage.removeItem(KEYS.session); }
export function getCurrentUser() { const session = getSession(); return session ? getUserById(session.userId) ?? null : null; }

export function login(email: string, password: string) {
  const user = getUsers().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return { ok: false, error: "No account found with that email." };
  if (user.passwordHash !== hashPassword(password)) return { ok: false, error: "Incorrect password." };
  setSession(user.id);
  return { ok: true };
}
export function logout() { clearSession(); }

export function createUser(email: string, password: string, name: string, role: Role) {
  const users = getUsers();
  if (users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) return { ok: false, error: "An account with this email already exists." };
  const newUser: User = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`, email: email.trim(), passwordHash: hashPassword(password), role, name: name.trim(), createdAt: new Date().toISOString() };
  saveUsers([...users, newUser]);
  return { ok: true, user: newUser };
}
export function updateUserRole(id: string, role: Role) { saveUsers(getUsers().map((user) => user.id === id ? { ...user, role } : user)); }
export function deleteUser(id: string) { saveUsers(getUsers().filter((user) => user.id !== id)); }
export function resetPassword(email: string, newPassword: string) {
  const users = getUsers();
  const index = users.findIndex((user) => user.email.toLowerCase() === email.trim().toLowerCase());
  if (index === -1) return { ok: false, error: "No account found with that email." };
  users[index] = { ...users[index], passwordHash: hashPassword(newPassword) };
  saveUsers(users);
  return { ok: true };
}

export function getAuditLog() { return load<AuditEntry[]>(KEYS.audit, []); }
export function addAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">) {
  const next: AuditEntry = { ...entry, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`, timestamp: new Date().toISOString() };
  save(KEYS.audit, [next, ...getAuditLog()].slice(0, 500));
}

export function seedIfEmpty() {
  if (getUsers().length === 0) {
    createUser("admin@sentimentiq.com", "Admin123!", "Admin User", "admin");
    createUser("viewer@sentimentiq.com", "Viewer123!", "Viewer User", "viewer");
    addAuditEntry({ userId: "system", userEmail: "system", action: "SYSTEM_INIT", details: "Workspace initialized with demo accounts." });
  }
}

export interface AggStats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  avgRating: number;
  nps: number;
  satisfactionScore: number;
  byProduct: Record<string, { pos: number; neu: number; neg: number; total: number }>;
  byTheme: Record<string, { pos: number; neu: number; neg: number; total: number }>;
  byDate: { date: string; positive: number; neutral: number; negative: number }[];
  byDayOfWeek: Record<string, Record<string, number>>;
  keywords: { word: string; count: number; sentiment: Sentiment }[];
  vaderAgreement: number;
  vaderSplit: { name: string; value: number; sentiment: Sentiment }[];
}

export function getEffectiveSentiment(review: Review): Sentiment { return review.override ?? review.sentiment; }

export function computeStats(reviews: Review[], filters?: Partial<AppFilters>): AggStats {
  let filtered = reviews;
  if (filters) {
    if (filters.dateFrom) filtered = filtered.filter((review) => review.date >= filters.dateFrom!);
    if (filters.dateTo) filtered = filtered.filter((review) => review.date <= filters.dateTo!);
    if (filters.product && filters.product !== "all") filtered = filtered.filter((review) => review.product === filters.product);
    if (filters.sentiment && filters.sentiment !== "all") filtered = filtered.filter((review) => getEffectiveSentiment(review) === filters.sentiment);
    if (filters.rating && filters.rating !== "all") filtered = filtered.filter((review) => review.rating === Number(filters.rating));
  }

  const stats: AggStats = { total: filtered.length, positive: 0, neutral: 0, negative: 0, avgRating: 0, nps: 0, satisfactionScore: 0, byProduct: {}, byTheme: {}, byDate: [], byDayOfWeek: {}, keywords: [], vaderAgreement: 0, vaderSplit: [] };
  const dateMap: Record<string, { positive: number; neutral: number; negative: number }> = {};
  const wordMap: Record<string, { count: number; positive: number; negative: number }> = {};
  let ratingTotal = 0;
  let ratingCount = 0;
  let vaderMatches = 0;
  const vaderCounts: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 };

  for (const review of filtered) {
    const sentiment = getEffectiveSentiment(review);
    const vaderResult = review.vaderSentiment ? { vaderSentiment: review.vaderSentiment } : analyzeVader(review.text);
    if (vaderResult.vaderSentiment === sentiment) vaderMatches += 1;
    vaderCounts[vaderResult.vaderSentiment] += 1;
    stats[sentiment] += 1;
    if (review.rating) { ratingTotal += review.rating; ratingCount += 1; }
    const product = stats.byProduct[review.product] ?? { pos: 0, neu: 0, neg: 0, total: 0 };
    product.total += 1;
    if (sentiment === "positive") product.pos += 1;
    else if (sentiment === "negative") product.neg += 1;
    else product.neu += 1;
    stats.byProduct[review.product] = product;

    for (const theme of review.themes) {
      const bucket = stats.byTheme[theme] ?? { pos: 0, neu: 0, neg: 0, total: 0 };
      bucket.total += 1;
      if (sentiment === "positive") bucket.pos += 1;
      else if (sentiment === "negative") bucket.neg += 1;
      else bucket.neu += 1;
      stats.byTheme[theme] = bucket;
    }

    const date = review.date.slice(0, 10);
    const day = dateMap[date] ?? { positive: 0, neutral: 0, negative: 0 };
    day[sentiment] += 1;
    dateMap[date] = day;
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(review.date).getDay()] ?? "Mon";
    stats.byDayOfWeek[dayName] ??= {};
    stats.byDayOfWeek[dayName][review.product] = (stats.byDayOfWeek[dayName][review.product] ?? 0) + (sentiment === "positive" ? 1 : sentiment === "negative" ? -1 : 0);

    for (const word of review.text.toLowerCase().split(/\W+/).filter((value) => value.length > 4)) {
      const item = wordMap[word] ?? { count: 0, positive: 0, negative: 0 };
      item.count += 1;
      if (sentiment === "positive") item.positive += 1;
      if (sentiment === "negative") item.negative += 1;
      wordMap[word] = item;
    }
  }

  const stop = new Set(["that", "this", "with", "have", "from", "they", "been", "their", "which", "were", "will", "about", "would", "there", "these", "those", "when", "what", "your", "just", "into", "than", "then", "them", "also", "some", "more", "most", "over", "after", "said", "such", "even", "here", "well", "only", "each", "much", "same", "does", "very", "could", "still", "first", "made", "back", "other", "people", "because", "come", "since", "give", "know", "like", "make", "need", "take", "want", "year", "good", "time"]);
  stats.keywords = Object.entries(wordMap).filter(([word]) => !stop.has(word)).sort(([, a], [, b]) => b.count - a.count).slice(0, 50).map(([word, value]) => ({ word, count: value.count, sentiment: value.positive > value.negative ? "positive" : value.negative > value.positive ? "negative" : "neutral" }));
  stats.byDate = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, ...value }));
  stats.avgRating = ratingCount ? Number((ratingTotal / ratingCount).toFixed(1)) : 0;
  const promoters = filtered.filter((review) => (review.rating ?? 3) >= 4).length;
  const detractors = filtered.filter((review) => (review.rating ?? 3) <= 2).length;
  stats.nps = stats.total ? Math.round(((promoters - detractors) / stats.total) * 100) : 0;
  stats.satisfactionScore = stats.total ? Math.round((stats.positive * 100 + stats.neutral * 50) / stats.total) : 0;
  stats.vaderAgreement = stats.total ? Math.round((vaderMatches / stats.total) * 100) : 0;
  stats.vaderSplit = [{ name: "Positive", value: vaderCounts.positive, sentiment: "positive" }, { name: "Neutral", value: vaderCounts.neutral, sentiment: "neutral" }, { name: "Negative", value: vaderCounts.negative, sentiment: "negative" }];
  return stats;
}

export function getUniqueProducts(reviews: Review[]) { return Array.from(new Set(reviews.map((review) => review.product))).sort(); }

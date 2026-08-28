import { analyzeVader, getEffectiveSentiment, type AppFilters, type Review, type Role, type Sentiment } from "./data";

export type WidgetId = "trend" | "sentiment" | "themes" | "heatmap" | "language" | "evidence";
export type LayoutPreset = { id: string; name: string; role: Role; widgets: WidgetId[] };

export function getVaderLabel(review: Review): Sentiment {
  return review.vaderSentiment ?? analyzeVader(review.text).vaderSentiment;
}

export function isVaderDisagreement(review: Review): boolean {
  return getEffectiveSentiment(review) !== getVaderLabel(review);
}

export function filterVaderDisagreements(reviews: Review[], filters?: Partial<AppFilters>): Review[] {
  return reviews.filter((review) => {
    const sentiment = getEffectiveSentiment(review);
    return isVaderDisagreement(review)
      && (!filters?.dateFrom || review.date >= filters.dateFrom)
      && (!filters?.dateTo || review.date <= filters.dateTo)
      && (!filters?.product || filters.product === "all" || review.product === filters.product)
      && (!filters?.sentiment || filters.sentiment === "all" || sentiment === filters.sentiment)
      && (!filters?.rating || filters.rating === "all" || review.rating === Number(filters.rating));
  });
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function buildDisagreementCsv(reviews: Review[]): string {
  const header = ["review_text", "rating", "date", "product", "customer", "original_sentiment", "effective_sentiment", "confidence", "vader_sentiment", "vader_compound", "themes", "source"];
  const rows = reviews.map((review) => [
    review.text,
    review.rating ?? "",
    review.date,
    review.product,
    review.customer,
    review.sentiment,
    getEffectiveSentiment(review),
    review.confidence,
    getVaderLabel(review),
    review.vaderCompound ?? analyzeVader(review.text).vaderCompound,
    review.themes.join(" | "),
    review.source,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function reorderWidgets(order: WidgetId[], source: WidgetId, target: WidgetId): WidgetId[] {
  const from = order.indexOf(source);
  const to = order.indexOf(target);
  if (from < 0 || to < 0 || from === to) return [...order];
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, source);
  return next;
}

export function moveWidget(order: WidgetId[], widget: WidgetId, direction: -1 | 1): WidgetId[] {
  const index = order.indexOf(widget);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return [...order];
  const next = [...order];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export function toggleWidget(order: WidgetId[], widget: WidgetId): WidgetId[] {
  return order.includes(widget) ? order.filter((item) => item !== widget) : [...order, widget];
}

export function canManagePreset(role: Role, preset: LayoutPreset): boolean {
  return role === "admin" && !preset.id.startsWith("admin-") && !preset.id.startsWith("viewer-");
}

export function filterPresets(presets: LayoutPreset[], query: string, role: Role | "all"): LayoutPreset[] {
  const normalized = query.trim().toLowerCase();
  return presets.filter((preset) => (!normalized || preset.name.toLowerCase().includes(normalized)) && (role === "all" || preset.role === role));
}

export function readPresetFilterParams(search: string): { query: string; role: Role | "all" } {
  const params = new URLSearchParams(search);
  const role = params.get("presetRole");
  return { query: params.get("presetSearch") ?? "", role: role === "admin" || role === "viewer" ? role : "all" };
}

export function writePresetFilterParams(search: string, query: string, role: Role | "all"): string {
  const params = new URLSearchParams(search);
  if (query.trim()) params.set("presetSearch", query.trim()); else params.delete("presetSearch");
  if (role === "all") params.delete("presetRole"); else params.set("presetRole", role);
  const next = params.toString();
  return next ? `?${next}` : "";
}

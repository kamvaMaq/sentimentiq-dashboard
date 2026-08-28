import { describe, expect, it } from "vitest";
import { computeStats, type Review } from "./data";
import { buildDisagreementCsv, canManagePreset, filterPresets, filterVaderDisagreements, isVaderDisagreement, moveWidget, readPresetFilterParams, reorderWidgets, toggleWidget, writePresetFilterParams, type LayoutPreset, type WidgetId } from "./testables";

const baseReview: Review = {
  id: "r-1",
  text: "The delivery was excellent and fast.",
  rating: 5,
  date: "2026-08-01T10:00:00.000Z",
  product: "Atlas",
  customer: "Fixture customer",
  sentiment: "positive",
  confidence: 0.92,
  themes: ["shipping"],
  source: "fixture.csv",
  importedAt: "2026-08-01T10:01:00.000Z",
  vaderSentiment: "positive",
  vaderCompound: 0.8,
};

const disagreement: Review = { ...baseReview, id: "r-2", text: "The delivery was terrible and late.", sentiment: "neutral", confidence: 0.55, rating: 2, vaderSentiment: "negative", vaderCompound: -0.7 };
const overriddenDisagreement: Review = { ...baseReview, id: "r-3", sentiment: "positive", override: "negative", vaderSentiment: "positive" };

const order: WidgetId[] = ["trend", "sentiment", "themes", "heatmap", "language", "evidence"];
const customPreset: LayoutPreset = { id: "custom-1", name: "QA command center", role: "admin", widgets: order };
const builtInPreset: LayoutPreset = { id: "admin-qa", name: "Built-in QA", role: "admin", widgets: order };


describe("VADER disagreement workflow", () => {
  it("does not flag agreement", () => expect(isVaderDisagreement(baseReview)).toBe(false));
  it("flags a disagreement against the effective sentiment", () => {
    expect(isVaderDisagreement(disagreement)).toBe(true);
    expect(isVaderDisagreement(overriddenDisagreement)).toBe(true);
  });
  it("filters disagreement rows without mutating the source list", () => {
    const reviews = [baseReview, disagreement, overriddenDisagreement];
    const result = filterVaderDisagreements(reviews, { product: "Atlas", rating: "2" });
    expect(result.map((review) => review.id)).toEqual(["r-2"]);
    expect(reviews).toHaveLength(3);
  });
  it("composes date, product, sentiment, and rating filters", () => {
    expect(filterVaderDisagreements([disagreement], { dateFrom: "2026-08-02" })).toHaveLength(0);
    expect(filterVaderDisagreements([disagreement], { sentiment: "negative" })).toHaveLength(0);
    expect(filterVaderDisagreements([disagreement], { sentiment: "neutral" })).toHaveLength(1);
  });
  it("exports model comparison fields and escapes CSV content", () => {
    const csv = buildDisagreementCsv([{ ...disagreement, text: 'Late, "damaged" package' }]);
    expect(csv).toContain("original_sentiment");
    expect(csv).toContain("effective_sentiment");
    expect(csv).toContain("vader_sentiment");
    expect(csv).toContain('"Late, ""damaged"" package"');
    expect(csv.split("\n")).toHaveLength(2);
  });
  it("produces an empty but valid export for no matches", () => {
    const csv = buildDisagreementCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
    expect(csv).toContain("vader_compound");
  });
  it("keeps aggregate VADER agreement consistent with the review set", () => {
    const stats = computeStats([baseReview, disagreement]);
    expect(stats.total).toBe(2);
    expect(stats.vaderAgreement).toBe(50);
    expect(stats.vaderSplit.find((item) => item.sentiment === "negative")?.value).toBe(1);
  });
});

describe("dashboard layout behavior", () => {
  it("reorders a source widget at a target position", () => {
    expect(reorderWidgets(order, "evidence", "sentiment")).toEqual(["trend", "evidence", "sentiment", "themes", "heatmap", "language"]);
  });
  it("does not mutate order for missing or identical targets", () => {
    expect(reorderWidgets(order, "trend", "trend")).toEqual(order);
    expect(reorderWidgets(order, "trend", "unknown" as WidgetId)).toEqual(order);
  });
  it("supports keyboard move boundaries", () => {
    expect(moveWidget(order, "trend", -1)).toEqual(order);
    expect(moveWidget(order, "trend", 1)[0]).toBe("sentiment");
    expect(moveWidget(order, "evidence", 1)).toEqual(order);
  });
  it("toggles visible widgets without duplicates", () => {
    const hidden = toggleWidget(order, "trend");
    expect(hidden).not.toContain("trend");
    expect(toggleWidget(hidden, "trend")).toContain("trend");
    expect(toggleWidget(order, "trend").filter((widget) => widget === "trend")).toHaveLength(0);
  });
});

describe("preset permissions and shareable filters", () => {
  it("allows administrators to manage custom presets only", () => {
    expect(canManagePreset("admin", customPreset)).toBe(true);
    expect(canManagePreset("viewer", customPreset)).toBe(false);
    expect(canManagePreset("admin", builtInPreset)).toBe(false);
  });
  it("filters presets by name and role", () => {
    const presets = [customPreset, { ...customPreset, id: "custom-2", name: "Viewer evidence", role: "viewer" as const }];
    expect(filterPresets(presets, "qa", "all").map((preset) => preset.id)).toEqual(["custom-1"]);
    expect(filterPresets(presets, "", "viewer").map((preset) => preset.id)).toEqual(["custom-2"]);
  });
  it("round-trips URL filter state and preserves unrelated parameters", () => {
    const query = writePresetFilterParams("?page=profile", " QA ", "admin");
    expect(query).toContain("page=profile");
    expect(readPresetFilterParams(query)).toEqual({ query: "QA", role: "admin" });
    expect(writePresetFilterParams(query, "", "all")).toBe("?page=profile");
  });
});

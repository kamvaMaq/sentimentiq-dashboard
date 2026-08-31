import { describe, expect, it } from "vitest";
import { autoDetectColumns, importRows, parseJSON, parseTXT, type ColumnMap } from "./parsers";

const map: ColumnMap = {
  text: "review",
  rating: "rating",
  date: "date",
  product: "product",
  customer: "customer",
};

describe("importRows", () => {
  it("retains short but non-empty feedback instead of skipping it", () => {
    const result = importRows([{ review: "Good", rating: "5", product: "Atlas" }], map, "short.csv");
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]?.text).toBe("Good");
    expect(result.skipped).toBe(0);
  });

  it("retains rows when the mapped text cell is missing but another cell contains text", () => {
    const result = importRows([{ review: "", comment: "Keep this record", rating: "4" }], map, "fallback.csv");
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]?.text).toBe("Keep this record");
  });

  it("only skips truly blank rows and reports why", () => {
    const result = importRows([{ review: "Valid row" }, { review: "  " }, { review: "Another" }], map, "mixed.csv");
    expect(result.imported.map((review) => review.text)).toEqual(["Valid row", "Another"]);
    expect(result.skipped).toBe(1);
    expect(result.errors).toEqual(["Row 2: no non-empty review text found."]);
  });

  it("does not discard a row because optional metadata is malformed", () => {
    const result = importRows([{ review: "Keep me", rating: "not-a-rating", date: "not-a-date" }], map, "metadata.csv");
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]?.text).toBe("Keep me");
    expect(result.imported[0]?.rating).toBeUndefined();
  });
});

describe("text and JSON parsing", () => {
  it("parses one non-empty review per TXT line without dropping short text", async () => {
    const result = await parseTXT(new File(["Good\nOK\n\nNeeds work"], "reviews.txt", { type: "text/plain" }));
    expect(result.rows).toEqual([{ review_text: "Good" }, { review_text: "OK" }, { review_text: "Needs work" }]);
    expect(result.headers).toEqual(["review_text"]);
  });

  it("parses JSON arrays and nested reviews into string records", async () => {
    const result = await parseJSON(new File([JSON.stringify({ reviews: [{ text: "Excellent", rating: 5 }, "Needs work", null] })], "reviews.json", { type: "application/json" }));
    expect(result.rows).toEqual([{ text: "Excellent", rating: "5" }, { review_text: "Needs work" }]);
    expect(result.headers).toEqual(["text", "rating", "review_text"]);
  });

  it("returns a useful error for empty JSON content", async () => {
    const result = await parseJSON(new File(["[]"], "empty.json", { type: "application/json" }));
    expect(result.rows).toEqual([]);
    expect(result.error).toBe("No review records found in JSON file.");
  });
});

describe("autoDetectColumns", () => {
  it("detects common review aliases and keeps the first header as a fallback text column", () => {
    expect(autoDetectColumns(["comment", "stars", "posted_at", "sku", "author"])).toEqual({
      text: "comment",
      rating: "stars",
      date: "posted_at",
      product: "sku",
      customer: "author",
    });
    expect(autoDetectColumns(["message"])).toEqual({ text: "message", rating: "", date: "", product: "", customer: "" });
  });
});

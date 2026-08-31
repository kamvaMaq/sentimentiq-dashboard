import Papa from "papaparse";
import { analyzeSentiment, analyzeVader, applyRatingBias, type Review } from "./data";

// ── Common schema ─────────────────────────────────────────────────────────────

export interface RawRow {
  text: string;
  rating?: number;
  date?: string;
  product?: string;
  customer?: string;
}

export interface ColumnMap {
  text: string;
  rating: string;
  date: string;
  product: string;
  customer: string;
}

export interface ParseResult {
  rows: Record<string, string>[];
  headers: string[];
  error?: string;
}

export interface ImportResult {
  imported: Review[];
  skipped: number;
  errors: string[];
}

// ── Row → Review ───────────────────────────────────────────────────────────────

function rowToReview(row: Record<string, string>, map: ColumnMap, source: string): Review | null {
  // Prefer the mapped text column, but fall back to the first non-empty cell so
  // a valid row is not discarded when a source file has an imperfect mapping.
  const mappedText = map.text ? String(row[map.text] ?? "").trim() : "";
  const fallbackText = Object.values(row).find((value) => String(value ?? "").trim().length > 0) ?? "";
  const text = (mappedText || String(fallbackText)).trim();
  // Only a genuinely blank record is invalid. Short but non-empty feedback is
  // still meaningful and must be retained rather than silently skipped.
  if (!text) return null;

  const ratingRaw = map.rating ? parseFloat(row[map.rating] ?? "") : NaN;
  const rating = isNaN(ratingRaw) || ratingRaw < 1 || ratingRaw > 5 ? undefined : Math.round(ratingRaw) as 1|2|3|4|5;

  const rawDate = map.date ? (row[map.date] ?? "").trim() : "";
  let date = new Date().toISOString().split("T")[0];
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) date = parsed.toISOString().split("T")[0];
  }

  const analysis = applyRatingBias(analyzeSentiment(text), rating);

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    text,
    rating,
    date,
    product: (row[map.product] ?? "").trim() || "General",
    customer: (row[map.customer] ?? "").trim() || "Anonymous",
    source,
    importedAt: new Date().toISOString(),
    ...analysis,
    ...analyzeVader(text),
  };
}

// ── CSV ───────────────────────────────────────────────────────────────────────

export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text?.trim()) { resolve({ rows: [], headers: [], error: "File is empty." }); return; }
      const result = Papa.parse<Record<string, string>>(text, {
        header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim(),
      });
      if (result.errors.length && result.data.length === 0) {
        resolve({ rows: [], headers: [], error: "CSV parse error: " + result.errors[0]?.message });
        return;
      }
      const headers = result.meta.fields ?? [];
      resolve({ rows: result.data, headers });
    };
    reader.onerror = () => resolve({ rows: [], headers: [], error: "Failed to read file." });
    reader.readAsText(file, "UTF-8");
  });
}

// ── DOCX ──────────────────────────────────────────────────────────────────────

export async function parseDOCX(file: File): Promise<ParseResult> {
  try {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    if (!text.trim()) return { rows: [], headers: [], error: "Document appears to be empty." };

    // Split on double newlines or numbered list patterns
    const lines = text
      .split(/\n{2,}|\r\n{2,}/)
      .map(l => l.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return { rows: [], headers: [], error: "No review text found in document." };

    const rows = lines.map(l => ({ review_text: l }));
    return { rows, headers: ["review_text"] };
  } catch (err) {
    return { rows: [], headers: [], error: "Failed to parse Word document: " + String(err) };
  }
}

// ── TXT ───────────────────────────────────────────────────────────────────────

export async function parseTXT(file: File): Promise<ParseResult> {
  try {
    const text = await file.text();
    if (!text.trim()) return { rows: [], headers: [], error: "Text file is empty." };
    const rows = text
      .split(/\r?\n{1,}/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((review_text) => ({ review_text }));
    return rows.length ? { rows, headers: ["review_text"] } : { rows: [], headers: [], error: "No review text found in text file." };
  } catch (err) {
    return { rows: [], headers: [], error: "Failed to parse text file: " + String(err) };
  }
}

// ── JSON ──────────────────────────────────────────────────────────────────────

export async function parseJSON(file: File): Promise<ParseResult> {
  try {
    const raw = await file.text();
    if (!raw.trim()) return { rows: [], headers: [], error: "JSON file is empty." };
    const parsed: unknown = JSON.parse(raw);
    const sourceRows = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" && Array.isArray((parsed as { reviews?: unknown[] }).reviews) ? (parsed as { reviews: unknown[] }).reviews : [parsed]);
    const rows = sourceRows.flatMap((item) => {
      if (typeof item === "string") return item.trim() ? [{ review_text: item.trim() }] : [];
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const normalized: Record<string, string> = {};
      Object.entries(record).forEach(([key, value]) => {
        if (value !== null && value !== undefined && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) normalized[key] = String(value);
      });
      return Object.values(normalized).some((value) => value.trim()) ? [normalized] : [];
    });
    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    return rows.length ? { rows, headers } : { rows: [], headers: [], error: "No review records found in JSON file." };
  } catch (err) {
    return { rows: [], headers: [], error: "Failed to parse JSON: " + String(err) };
  }
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export async function parsePDF(file: File): Promise<ParseResult> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      fullText += content.items.map((i: any) => i.str).join(" ") + "\n\n";
    }

    if (!fullText.trim()) return { rows: [], headers: [], error: "No readable text found in PDF." };

    const lines = fullText
      .split(/\n{2,}/)
      .map(l => l.replace(/\s+/g, " ").trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return { rows: [], headers: [], error: "No review text extracted from PDF." };

    const rows = lines.map(l => ({ review_text: l }));
    return { rows, headers: ["review_text"] };
  } catch (err) {
    return { rows: [], headers: [], error: "Failed to parse PDF: " + String(err) };
  }
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCSV(file);
  if (name.endsWith(".docx")) return parseDOCX(file);
  if (name.endsWith(".pdf")) return parsePDF(file);
  if (name.endsWith(".txt")) return parseTXT(file);
  if (name.endsWith(".json")) return parseJSON(file);
  return { rows: [], headers: [], error: `Unsupported file type. Please upload CSV, DOCX, PDF, TXT, or JSON.` };
}

// ── Import with column map ────────────────────────────────────────────────────

export function importRows(rows: Record<string, string>[], map: ColumnMap, source: string): ImportResult {
  const imported: Review[] = [];
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const review = rowToReview(rows[i], map, source);
      if (review) imported.push(review);
      else {
        skipped++;
        if (errors.length < 5) errors.push(`Row ${i + 1}: no non-empty review text found.`);
      }
    } catch (err) {
      skipped++;
      if (errors.length < 5) errors.push(`Row ${i + 1}: ${String(err)}`);
    }
  }

  return { imported, skipped, errors };
}

// ── Column-mapping auto-detect ────────────────────────────────────────────────

const TEXT_HINTS    = ["review","text","comment","feedback","body","content","message","description","review_text"];
const RATING_HINTS  = ["rating","score","stars","rate","star","grade","point"];
const DATE_HINTS    = ["date","time","created","posted","submitted","reviewed","timestamp","datetime"];
const PRODUCT_HINTS = ["product","item","sku","name","title","category","brand","model"];
const CUSTOMER_HINTS= ["customer","user","author","reviewer","name","id","email","buyer","person"];

function bestMatch(headers: string[], hints: string[]): string {
  const lh = headers.map(h => h.toLowerCase());
  for (const hint of hints) {
    const idx = lh.findIndex(h => h.includes(hint));
    if (idx !== -1) return headers[idx];
  }
  return "";
}

export function autoDetectColumns(headers: string[]): ColumnMap {
  return {
    text:     bestMatch(headers, TEXT_HINTS)     || headers[0] || "",
    rating:   bestMatch(headers, RATING_HINTS)   || "",
    date:     bestMatch(headers, DATE_HINTS)      || "",
    product:  bestMatch(headers, PRODUCT_HINTS)  || "",
    customer: bestMatch(headers, CUSTOMER_HINTS) || "",
  };
}

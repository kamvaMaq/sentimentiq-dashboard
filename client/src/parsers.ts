import Papa from "papaparse";
import { analyzeSentiment, applyRatingBias, type Review } from "./data";

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
  const text = (row[map.text] ?? "").trim();
  if (!text || text.length < 5) return null;

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
      .filter(l => l.length > 10);

    if (lines.length === 0) return { rows: [], headers: [], error: "No review text found in document." };

    const rows = lines.map(l => ({ review_text: l }));
    return { rows, headers: ["review_text"] };
  } catch (err) {
    return { rows: [], headers: [], error: "Failed to parse Word document: " + String(err) };
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
      .filter(l => l.length > 15);

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
  return { rows: [], headers: [], error: `Unsupported file type. Please upload CSV, DOCX, or PDF.` };
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
      else skipped++;
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

/**
 * Strict ticket parser for supermarket receipts.
 *
 * Goals:
 * - Extract only lines that clearly look like purchased products.
 * - Never invent products. When unsure, mark as "No reconocido" / "revisar".
 * - Provide a confidence score per item.
 * - Try to expand common Spanish receipt abbreviations, but always keep
 *   the original raw text so the user can verify.
 */

export type Confidence = "alta" | "media" | "baja";
export type ItemStatus = "confirmado" | "revisar";

export interface ParsedItem {
  texto_original: string;
  producto_detectado: string; // normalized name or "No reconocido"
  cantidad: string | null;
  precio: number | null;
  confianza: Confidence;
  estado: ItemStatus;
}

// Lines containing any of these tokens are NEVER considered a product.
// Matched as whole words / substrings, case-insensitive.
const IGNORE_PATTERNS: RegExp[] = [
  /\bTOTAL\b/i,
  /\bSUBTOTAL\b/i,
  /\bIVA\b/i,
  /\bI\.V\.A\.?/i,
  /\bBASE\s+IMPONIBLE\b/i,
  /\bIMPORTE\b/i,
  /\bA\s+PAGAR\b/i,
  /\bCAMBIO\b/i,
  /\bENTREGA\b/i,
  /\bEFECTIVO\b/i,
  /\bVUELTO\b/i,
  /\bTARJETA\b/i,
  /\bVISA\b/i,
  /\bMASTERCARD\b/i,
  /\bCONTACTLESS\b/i,
  /\bAUTORIZACI[OÓ]N\b/i,
  /\bAID\b/i,
  /\bC\.?I\.?F\.?\b/i,
  /\bN\.?I\.?F\.?\b/i,
  /\bCIF\b/i,
  /\bTEL[ÉE]FONO\b/i,
  /\bTEL\b\.?/i,
  /\bDIRECCI[OÓ]N\b/i,
  /\bCALLE\b/i,
  /\bAVDA\b\.?/i,
  /\bAVENIDA\b/i,
  /\bC\.?P\.?\b/i,
  /\bFACTURA\b/i,
  /\bSIMPLIFICADA\b/i,
  /\bTICKET\b/i,
  /\bN[ºO\.]\s*OPERAC/i,
  /\bOPERACI[OÓ]N\b/i,
  /\bCAJA\b/i,
  /\bCAJERO\b/i,
  /\bFECHA\b/i,
  /\bHORA\b/i,
  /\bGRACIAS\b/i,
  /\bATENDIDO\b/i,
  /\bDEVOLUCI[OÓ]N\b/i,
  /\bDESCUENTO\s+TOTAL\b/i,
  /\bDTO\.?\s+TOTAL\b/i,
  /\bAHORRO\b/i,
  /\bPROMOCI[OÓ]N\b/i,
  /\bPROMO\b/i,
  /\b3X2\b/i,
  /\b2X1\b/i,
  /\bMERCADONA\b/i, // store header
  /\bCARREFOUR\b/i,
  /\bLIDL\b/i,
  /\bDIA\s+S\.A\b/i,
  /\bALCAMPO\b/i,
  /\bEROSKI\b/i,
  /^[-=*_]{3,}$/, // separator lines
  /\bwww\./i,
  /\.com\b/i,
  /\bIBAN\b/i,
];

// Abbreviation dictionary. Order matters (longer keys first).
// Only EXPANDS when the abbreviation is unambiguous.
const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bLECH\s+SEMI\b/i, "Leche semidesnatada"],
  [/\bLECH\s+ENT(ERA)?\b/i, "Leche entera"],
  [/\bLECH\s+DESN\b/i, "Leche desnatada"],
  [/\bYOG\s+NAT\b/i, "Yogur natural"],
  [/\bYOG\s+FRESA\b/i, "Yogur de fresa"],
  [/\bYOG\s+GRIEGO\b/i, "Yogur griego"],
  [/\bTOM\s+RAF\b/i, "Tomate raf"],
  [/\bTOM\s+PERA\b/i, "Tomate pera"],
  [/\bTOM\s+CHERRY\b/i, "Tomate cherry"],
  [/\bPLAT\s+CAN(ARIAS)?\b/i, "Plátano de Canarias"],
  [/\bPECH\s+POLLO\b/i, "Pechuga de pollo"],
  [/\bMUSL\s+POLLO\b/i, "Muslo de pollo"],
  [/\bACEIT\s+OLIVA\b/i, "Aceite de oliva"],
  [/\bAC\s+OLIVA\b/i, "Aceite de oliva"],
  [/\bPAN\s+INT(EGRAL)?\b/i, "Pan integral"],
  [/\bPAN\s+BARRA\b/i, "Barra de pan"],
  [/\bQUE\s+RALL(ADO)?\b/i, "Queso rallado"],
  [/\bQUE\s+LONCH(AS)?\b/i, "Queso en lonchas"],
  [/\bMANT(EQUILLA)?\b/i, "Mantequilla"],
  [/\bHUEV(OS)?\s+L\b/i, "Huevos L"],
  [/\bHUEV(OS)?\s+M\b/i, "Huevos M"],
  [/\bZUMO\s+NAR(ANJA)?\b/i, "Zumo de naranja"],
  [/\bAGUA\s+MIN(ERAL)?\b/i, "Agua mineral"],
];

// Words that strongly indicate a real food product (used to boost confidence).
const FOOD_HINTS = [
  "leche", "yogur", "queso", "pan", "huevo", "huevos", "pollo", "carne",
  "pescado", "salmon", "salmón", "atun", "atún", "merluza",
  "tomate", "lechuga", "patata", "patatas", "cebolla", "ajo", "pimiento",
  "manzana", "platano", "plátano", "naranja", "limon", "limón", "fresa",
  "uva", "pera", "kiwi", "aguacate", "zanahoria",
  "arroz", "pasta", "harina", "azucar", "azúcar", "sal", "aceite", "vinagre",
  "yog", "lech", "tom", "plat", "pech", "musl", "que", "mant", "huev",
  "agua", "zumo", "cafe", "café", "te", "té", "cerveza", "vino",
  "jamon", "jamón", "chorizo", "salchich", "bacon", "atun",
  "galleta", "chocolate", "cereal", "mermelada", "miel", "yogurt",
  "verdura", "fruta", "carne", "pescado",
];

const QUANTITY_RE =
  /(\d+\s*[xX×]\s*\d+\s*(?:g|ml|gr|kg|l)?|\d+[.,]?\d*\s*(?:kg|g|gr|ml|l|ud|uds|unid|unidades|pack))/i;

// Price regex — supports "1,85", "1.85", "1,85 €", "€1,85", "1.234,56".
const PRICE_RE =
  /(?:€\s*)?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*(?:€|EUR)?/g;

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function parsePriceToken(raw: string): number {
  let v = raw.trim();
  if (v.includes(",") && v.includes(".")) {
    // 1.234,56 -> 1234.56
    v = v.replace(/\./g, "").replace(",", ".");
  } else {
    v = v.replace(",", ".");
  }
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function expandAbbreviations(name: string): { expanded: string; matched: boolean } {
  for (const [re, repl] of ABBREVIATIONS) {
    if (re.test(name)) return { expanded: name.replace(re, repl), matched: true };
  }
  return { expanded: name, matched: false };
}

function looksLikeFood(name: string): boolean {
  const lower = name.toLowerCase();
  return FOOD_HINTS.some((h) => new RegExp(`\\b${h}`, "i").test(lower));
}

function isMostlyAlpha(s: string): boolean {
  const letters = s.replace(/[^a-záéíóúñü]/gi, "").length;
  const total = s.replace(/\s/g, "").length || 1;
  return letters / total >= 0.5;
}

export interface ParseOptions {
  /** Minimum length of remaining name after stripping price/qty. */
  minNameLength?: number;
}

/**
 * Parse raw OCR text into structured items with confidence and status.
 * Strict: never invents products. Lines without a clearly identifiable price
 * are skipped. Lines whose name is ambiguous are returned as "revisar".
 */
export function parseTicketText(text: string, opts: ParseOptions = {}): ParsedItem[] {
  const minNameLength = opts.minNameLength ?? 3;
  const items: ParsedItem[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => normalizeWhitespace(l))
    .filter((l) => l.length > 0);

  for (const original of lines) {
    // Skip header/footer/meta lines outright.
    if (IGNORE_PATTERNS.some((re) => re.test(original))) continue;

    // Find prices in line. A product line should normally contain at least one price.
    const priceMatches = Array.from(original.matchAll(PRICE_RE));
    if (priceMatches.length === 0) {
      // No price -> likely not a purchased product line. Skip silently
      // (do NOT invent a product).
      continue;
    }

    // Use the rightmost price as the line total.
    const lastPrice = priceMatches[priceMatches.length - 1];
    const price = parsePriceToken(lastPrice[1]);

    // Strip ALL price tokens from the line to isolate the name part.
    let remainder = original;
    for (const m of priceMatches) {
      remainder = remainder.replace(m[0], " ");
    }
    remainder = normalizeWhitespace(remainder);

    // Extract a quantity if present.
    let cantidad: string | null = null;
    const qMatch = remainder.match(QUANTITY_RE);
    if (qMatch) {
      cantidad = qMatch[0].replace(/\s+/g, "");
      remainder = normalizeWhitespace(remainder.replace(qMatch[0], " "));
    }

    // Strip stray short tokens like "A", "B", trailing tax markers.
    remainder = remainder.replace(/\b[A-Z]\b\s*$/g, "").trim();

    // If, after stripping, almost nothing useful remains -> mark as revisar.
    const lettersOnly = remainder.replace(/[^a-záéíóúñü]/gi, "");
    if (
      remainder.length < minNameLength ||
      lettersOnly.length < 3 ||
      !isMostlyAlpha(remainder)
    ) {
      items.push({
        texto_original: original,
        producto_detectado: "No reconocido",
        cantidad,
        precio: price || null,
        confianza: "baja",
        estado: "revisar",
      });
      continue;
    }

    // Try to expand abbreviations.
    const { expanded, matched } = expandAbbreviations(remainder);
    const detectedName = matched
      ? expanded
      : remainder
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());

    // Confidence scoring.
    let confianza: Confidence;
    const hasFoodHint = looksLikeFood(remainder);
    const hasAbbrev = /\b[A-Z]{2,}\b/.test(remainder) && !matched;

    if (matched || (hasFoodHint && !hasAbbrev)) {
      confianza = "alta";
    } else if (hasFoodHint && hasAbbrev) {
      confianza = "media";
    } else if (hasFoodHint) {
      confianza = "media";
    } else {
      confianza = "baja";
    }

    const estado: ItemStatus = confianza === "baja" ? "revisar" : "confirmado";

    items.push({
      texto_original: original,
      producto_detectado: confianza === "baja" ? "No reconocido" : detectedName,
      cantidad,
      precio: price || null,
      confianza,
      estado,
    });
  }

  return items;
}

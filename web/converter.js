/**
 * Stripe CSV → QuickBooks Online bank import rows.
 * Runs entirely in the browser.
 */

const QBO_HEADERS = ["Date", "Description", "Amount"];

/** @typedef {{ date: string, description: string, amount: string }} QboRow */

/**
 * Parse CSV text into rows (handles quoted fields).
 * @param {string} text
 * @returns {string[][]}
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      cell = "";
      if (ch === "\r") i++;
      continue;
    }
    if (ch !== "\r") cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

/**
 * @param {string} header
 */
function normalizeHeader(header) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * @param {string[][]} rows
 */
function rowsToObjects(rows) {
  if (rows.length < 2) throw new Error("CSV has no data rows.");
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((cells) => {
    /** @type {Record<string, string>} */
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
    });
    return obj;
  });
}

/**
 * @param {Record<string, string>} row
 * @param {string[]} keys
 */
function pick(row, keys) {
  for (const k of keys) {
    const n = normalizeHeader(k);
    if (row[n] !== undefined && row[n] !== "") return row[n];
  }
  for (const key of Object.keys(row)) {
    for (const k of keys) {
      if (key.includes(normalizeHeader(k)) && row[key]) return row[key];
    }
  }
  return "";
}

/**
 * @param {string} raw
 */
function parseAmount(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[$,\s]/g, "").replace(/\((.*)\)/, "-$1");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {string} raw
 */
function parseDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  // Unix timestamp
  if (/^\d{10}$/.test(s)) return new Date(parseInt(s, 10) * 1000);
  if (/^\d{13}$/.test(s)) return new Date(parseInt(s, 10));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {Date} d
 * @param {"mdy"|"ymd"} format
 */
function formatDate(d, format) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (format === "ymd") return `${y}-${m}-${day}`;
  return `${m}/${day}/${y}`;
}

/**
 * @param {number} n
 */
function formatAmount(n) {
  return n.toFixed(2);
}

/**
 * Escape CSV cell.
 * @param {string} val
 */
function escapeCsv(val) {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

/**
 * @param {QboRow[]} rows
 */
function toCsv(rows) {
  const lines = [QBO_HEADERS.join(",")];
  for (const r of rows) {
    lines.push(
      [r.date, r.description, r.amount].map(escapeCsv).join(",")
    );
  }
  return lines.join("\r\n");
}

/**
 * @param {string} csvText
 * @param {{ splitFees: boolean, useNetOnly: boolean, dateFormat: "mdy"|"ymd" }} options
 * @returns {{ rows: QboRow[], warnings: string[], sourceCount: number }}
 */
function convertStripeToQbo(csvText, options) {
  const parsed = parseCsv(csvText);
  const records = rowsToObjects(parsed);
  /** @type {QboRow[]} */
  const out = [];
  const warnings = [];
  let skipped = 0;
  let failedStatusCount = 0;

  for (const rec of records) {
    // Skip transactions that are not successful
    const status = pick(rec, ["status", "transactionstatus"]);
    if (status && status.toLowerCase() !== "success") {
      failedStatusCount++;
      continue;
    }

    const dateRaw = pick(rec, [
      "created",
      "createdutc",
      "date",
      "availableon",
      "availableonutc",
    ]);
    const desc = pick(rec, [
      "description",
      "reportingcategory",
      "type",
      "source",
      "id",
    ]);
    const gross = parseAmount(
      pick(rec, ["gross", "amount", "chargeamount", "total"])
    );
    const fee = parseAmount(pick(rec, ["fee", "fees", "stripefee"]));
    const net = parseAmount(pick(rec, ["net", "netamount"]));

    const d = parseDate(dateRaw);
    if (!d) {
      skipped++;
      continue;
    }

    const dateStr = formatDate(d, options.dateFormat);
    const baseDesc = desc || "Stripe transaction";
    const hasFee = Math.abs(fee) > 0.001;
    const effectiveGross = gross !== 0 ? gross : net + fee;
    const effectiveNet = net !== 0 ? net : gross - fee;

    if (options.useNetOnly) {
      if (effectiveNet === 0 && effectiveGross === 0) {
        skipped++;
        continue;
      }
      out.push({
        date: dateStr,
        description: `Stripe: ${baseDesc}`,
        amount: formatAmount(effectiveNet !== 0 ? effectiveNet : effectiveGross),
      });
      continue;
    }

    if (options.splitFees && hasFee) {
      const paymentAmount = effectiveGross !== 0 ? effectiveGross : effectiveNet + fee;
      out.push({
        date: dateStr,
        description: `Stripe: ${baseDesc}`,
        amount: formatAmount(paymentAmount),
      });
      out.push({
        date: dateStr,
        description: `Stripe fee: ${baseDesc}`,
        amount: formatAmount(-Math.abs(fee)),
      });
    } else {
      const amt = effectiveNet !== 0 ? effectiveNet : effectiveGross;
      if (amt === 0) {
        skipped++;
        continue;
      }
      out.push({
        date: dateStr,
        description: `Stripe: ${baseDesc}`,
        amount: formatAmount(amt),
      });
    }
  }

  if (!out.length) {
    throw new Error(
      "No rows converted. Use Stripe Balance transactions export (CSV) with Created, Amount, and Fee columns."
    );
  }
  if (failedStatusCount > 0) {
    warnings.push(`${failedStatusCount} row(s) skipped (status not "success").`);
  }
  if (skipped > 0) {
    warnings.push(`${skipped} row(s) skipped (missing date or zero amount).`);
  }

  return { rows: out, warnings, sourceCount: records.length };
}

// Export for tests / app
if (typeof window !== "undefined") {
  window.LedgerBridgeConverter = {
    parseCsv,
    convertStripeToQbo,
    toCsv,
    QBO_HEADERS,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseCsv,
    convertStripeToQbo,
    toCsv,
    QBO_HEADERS,
  };
}
